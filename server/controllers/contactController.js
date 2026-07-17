const Contact = require('../models/Contact');
const { sendNotificationEmail } = require('../utils/mailer');

const INQUIRY_TYPES = ['일반 문의', '버그 신고', '계정 문의', '기타'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createContact = async (req, res) => {
  try {
    const { name, email, inquiryType, message } = req.body;

    if (!name || !email || !inquiryType || !message) {
      return res.status(400).json({ message: 'name, email, inquiryType, and message are required' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'email is invalid' });
    }

    if (!INQUIRY_TYPES.includes(inquiryType)) {
      return res.status(400).json({ message: `inquiryType must be one of: ${INQUIRY_TYPES.join(', ')}` });
    }

    await Contact.create({ name, email, inquiryType, message });

    sendNotificationEmail({
      subject: `[Dresso] 새 문의: ${inquiryType}`,
      text: `이름: ${name}\n이메일: ${email}\n문의 유형: ${inquiryType}\n내용: ${message}`,
    });

    return res.status(201).json({ message: '문의가 접수됐어요.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createContact };
