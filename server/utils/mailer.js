const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

// Fire-and-forget: logs and swallows errors so a broken/unconfigured SMTP
// setup never breaks the actual form submission (which already succeeded
// by being saved to the DB).
async function sendNotificationEmail({ subject, text }) {
  const t = getTransporter();
  if (!t) {
    console.log('[mailer] SMTP not configured — skipping email, submission was still saved to DB.');
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.CONTACT_NOTIFY_TO || process.env.SMTP_USER,
      subject,
      text,
    });
  } catch (error) {
    console.error('[mailer] failed to send notification email:', error.message);
  }
}

module.exports = { sendNotificationEmail };
