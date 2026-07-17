const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Headers a real Chrome navigation sends alongside User-Agent. Bot managers
// (Akamai/Cloudflare/PerimeterX/...) key off the *combination* being absent,
// not just User-Agent, so a bare UA header is an easy tell. This won't beat
// TLS/JS-fingerprinting bot checks (fetch() can't fake those), but it avoids
// being an obvious naive-scraper on lighter bot-detection.
// Deliberately no Accept-Encoding: undici sets/negotiates that itself and
// transparently decompresses; overriding it risks requesting an encoding we
// then fail to decode.
const BROWSER_REQUEST_HEADERS = {
  'User-Agent': BROWSER_USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

// Extracts the `content` attribute of a <meta property="..."> or
// <meta name="..."> tag, regardless of attribute order or quote style.
// Not a full HTML parser — just handles the common og:/twitter: meta shapes.
// The `\s` before each attribute name matters: without it, "content=" or
// "name=" can match mid-word inside an unrelated attribute like
// data-content="..." or data-name="..." (real attributes on Next.js-style
// pages), silently pulling the wrong value.
const extractMetaContent = (html, property) => {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const patterns = [
    // property/name attribute first, content second
    new RegExp(
      `<meta\\b[^>]*?\\s(?:property|name)=["']${escapedProperty}["'][^>]*?\\scontent=["']([^"']*)["'][^>]*?>`,
      'i'
    ),
    // content attribute first, property/name second
    new RegExp(
      `<meta\\b[^>]*?\\scontent=["']([^"']*)["'][^>]*?\\s(?:property|name)=["']${escapedProperty}["'][^>]*?>`,
      'i'
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

const extractTitleTag = (html) => {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match && match[1] ? match[1].trim() : null;
};

// Basic SSRF guard: this endpoint lets an authenticated user make the
// server fetch an arbitrary URL, so refuse anything that targets the
// server's own host or a private/internal network range.
const isBlockedHostname = (hostname) => {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0') return true;
  if (host === '::1') return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
  }

  return false;
};

// POST /api/link-preview
// Body: { url }
// Fetches the given product page server-side and extracts og:image/og:title
// (falling back to twitter:image / <title>) so the client can preview it
// before saving to the wardrobe.
const getLinkPreview = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'url is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ message: 'url is not a valid URL' });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ message: 'url must be an http(s) URL' });
    }

    if (isBlockedHostname(parsedUrl.hostname)) {
      return res.status(400).json({ message: 'url is not allowed' });
    }

    let response;
    try {
      response = await fetch(parsedUrl, {
        headers: BROWSER_REQUEST_HEADERS,
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // Network failure, DNS failure, or our own timeout — not the site
      // actively refusing us, so a "try again" message is the honest one.
      return res.status(502).json({ message: '연결에 실패했어요. 잠시 후 다시 시도해주세요.' });
    }

    if (response.status === 404 || response.status === 410) {
      return res.status(404).json({ message: '링크를 찾을 수 없어요. 주소를 다시 확인해주세요.' });
    }

    // 401/403/429 are the standard status codes bot-management layers
    // (Akamai, Cloudflare, PerimeterX, ...) return to a naive server-side
    // fetch. We can't get past those from here — fetch() can't execute JS
    // or pass TLS/behavioral fingerprint checks — so say so plainly and
    // point at the manual-entry fields the form already offers.
    if ([401, 403, 429].includes(response.status)) {
      return res.status(200).json({
        imageUrl: null,
        title: null,
        notice: '이 쇼핑몰은 자동 정보 가져오기를 차단하고 있어요. 이름을 직접 입력해서 등록해주세요.',
      });
    }

    if (!response.ok) {
      return res.status(502).json({ message: '해당 링크에서 정보를 가져오지 못했어요.' });
    }

    const html = await response.text();

    const rawImageUrl = extractMetaContent(html, 'og:image') || extractMetaContent(html, 'twitter:image');
    const title = extractMetaContent(html, 'og:title') || extractTitleTag(html);

    // og:image is frequently a path relative to the page (or protocol-relative,
    // `//cdn.example.com/...`), not an absolute URL — resolving it against
    // parsedUrl handles both and leaves an already-absolute URL unchanged.
    // Left unresolved, the client would request it against its own origin
    // instead of the shopping site's, which 404s — this was silently
    // breaking the wardrobe item's photo for every site that emits a
    // relative og:image.
    let imageUrl = null;
    if (rawImageUrl) {
      try {
        imageUrl = new URL(rawImageUrl, parsedUrl).href;
      } catch {
        imageUrl = null;
      }
    }

    return res.status(200).json({ imageUrl, title: title || null });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getLinkPreview, extractMetaContent };
