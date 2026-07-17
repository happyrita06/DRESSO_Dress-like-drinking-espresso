const express = require('express');
const { createItem, getItems, deleteItem } = require('../controllers/wardrobeController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, createItem);
router.get('/', verifyToken, getItems);
router.delete('/:id', verifyToken, deleteItem);

module.exports = router;
