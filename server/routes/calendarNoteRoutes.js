const express = require('express');
const { getNotes, upsertNote, deleteNote } = require('../controllers/calendarNoteController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, getNotes);
router.put('/:date', verifyToken, upsertNote);
router.delete('/:date', verifyToken, deleteNote);

module.exports = router;
