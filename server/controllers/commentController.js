const Comment = require('../models/Comment');
const Post = require('../models/Post');

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const deleted = await Comment.findOneAndDelete({ _id: commentId, user: req.user.userId });

    if (!deleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await Post.findByIdAndUpdate(deleted.post, { $inc: { commentsCount: -1 } });

    return res.status(200).json({ message: 'deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { deleteComment };
