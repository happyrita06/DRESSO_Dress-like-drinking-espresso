const express = require('express');
const { createBusinessInquiry } = require('../controllers/businessInquiryController');

const router = express.Router();

router.post('/', createBusinessInquiry);

module.exports = router;
