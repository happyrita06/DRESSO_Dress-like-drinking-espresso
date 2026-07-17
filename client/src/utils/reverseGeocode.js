/**
 * Reverse geocoding via BigDataCloud's free client-side API — no API key,
 * no server proxy needed. Turns raw geolocation coordinates into a real
 * place name (e.g. "서울특별시 중구") instead of just showing lat/lon.
 */
export async function reverseGeocode({ lat, lon }) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('위치 이름을 가져오지 못했어요.')
  }

  const data = await response.json()

  const parts = [data.principalSubdivision, data.city, data.locality].filter(Boolean)
  // Metro cities often repeat (city === principalSubdivision, e.g. both "서울특별시") — drop consecutive dupes.
  const unique = parts.filter((part, index) => part !== parts[index - 1])

  if (unique.length === 0) {
    throw new Error('이 위치의 지역명을 찾을 수 없어요.')
  }

  return unique.join(' ')
}
