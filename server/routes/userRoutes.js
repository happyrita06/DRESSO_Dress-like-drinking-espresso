const express = require('express');
const { getProfile, updateMe, toggleFollow } = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Must come before the /:id routes so "me" isn't swallowed as an :id param.
router.patch('/me', verifyToken, updateMe);
router.get('/:id', verifyToken, getProfile);
router.post('/:id/follow', verifyToken, toggleFollow);

module.exports = router;
