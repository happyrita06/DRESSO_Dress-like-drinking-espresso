const express = require('express');
const { createCombo, getCombos, updateCombo, deleteCombo } = require('../controllers/outfitComboController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, createCombo);
router.get('/', verifyToken, getCombos);
router.patch('/:id', verifyToken, updateCombo);
router.delete('/:id', verifyToken, deleteCombo);

module.exports = router;
