const express = require('express');
const {
  createPost,
  getPosts,
  updatePost,
  deletePost,
  toggleLike,
  getComments,
  createComment,
} = require('../controllers/postController');
const { deleteComment } = require('../controllers/commentController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, createPost);
router.get('/', verifyToken, getPosts);
router.delete('/comments/:commentId', verifyToken, deleteComment);
router.patch('/:id', verifyToken, updatePost);
router.delete('/:id', verifyToken, deletePost);
router.post('/:id/like', verifyToken, toggleLike);
router.get('/:id/comments', verifyToken, getComments);
router.post('/:id/comments', verifyToken, createComment);

module.exports = router;
