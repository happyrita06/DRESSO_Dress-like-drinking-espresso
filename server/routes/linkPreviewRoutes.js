const express = require('express');
const { getLinkPreview } = require('../controllers/linkPreviewController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, getLinkPreview);

module.exports = router;
