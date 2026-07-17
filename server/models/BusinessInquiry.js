const mongoose = require('mongoose');

const businessInquirySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    contactName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    proposalType: {
      type: String,
      enum: ['광고', '제휴', '입점', '기타'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BusinessInquiry', businessInquirySchema);
