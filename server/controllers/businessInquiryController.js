const BusinessInquiry = require('../models/BusinessInquiry');
const { sendNotificationEmail } = require('../utils/mailer');

const PROPOSAL_TYPES = ['광고', '제휴', '입점', '기타'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createBusinessInquiry = async (req, res) => {
  try {
    const { companyName, contactName, email, proposalType, message } = req.body;

    if (!companyName || !contactName || !email || !proposalType || !message) {
      return res
        .status(400)
        .json({ message: 'companyName, contactName, email, proposalType, and message are required' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'email is invalid' });
    }

    if (!PROPOSAL_TYPES.includes(proposalType)) {
      return res.status(400).json({ message: `proposalType must be one of: ${PROPOSAL_TYPES.join(', ')}` });
    }

    await BusinessInquiry.create({ companyName, contactName, email, proposalType, message });

    sendNotificationEmail({
      subject: `[Dresso] 새 제안: ${proposalType}`,
      text: `회사명: ${companyName}\n담당자: ${contactName}\n이메일: ${email}\n제안 유형: ${proposalType}\n내용: ${message}`,
    });

    return res.status(201).json({ message: '제안이 접수됐어요.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createBusinessInquiry };
