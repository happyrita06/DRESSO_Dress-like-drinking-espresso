const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const User = require('../models/User');

const SOURCES = ['combo', 'upload'];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const createPost = async (req, res) => {
  try {
    const { source, imageUrl, items, outfitCombo, description, weatherTag, styleTags } = req.body;

    if (!source || !SOURCES.includes(source)) {
      return res.status(400).json({ message: `source must be one of: ${SOURCES.join(', ')}` });
    }

    if (!description) {
      return res.status(400).json({ message: 'description is required' });
    }

    const post = await Post.create({
      user: req.user.userId,
      source,
      imageUrl,
      items,
      outfitCombo,
      description,
      weatherTag,
      styleTags,
    });

    await post.populate('user', 'nickname');

    return res.status(201).json(post);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPosts = async (req, res) => {
  try {
    const { sort, author, following } = req.query;

    let limit = Number(req.query.limit) || DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const filter = {};

    if (author) {
      filter.user = author;
    }

    if (following === 'true') {
      const currentUser = await User.findById(req.user.userId).select('following');
      const followingIds = currentUser ? currentUser.following : [];
      filter.user = { $in: followingIds };
    }

    const sortOption =
      sort === 'popular' ? { likesCount: -1, createdAt: -1 } : { createdAt: -1 };

    const posts = await Post.find(filter)
      .sort(sortOption)
      .limit(limit)
      .populate('user', 'nickname');

    return res.status(200).json({ posts });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const EDITABLE_FIELDS = ['description', 'weatherTag', 'styleTags'];

const updatePost = async (req, res) => {
  try {
    const { id } = req.params;

    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in req.body) updates[field] = req.body[field];
    }

    if (updates.description !== undefined && !updates.description) {
      return res.status(400).json({ message: 'description is required' });
    }

    const post = await Post.findOneAndUpdate({ _id: id, user: req.user.userId }, updates, {
      new: true,
    }).populate('user', 'nickname');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    return res.status(200).json(post);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Post.findOneAndDelete({ _id: id, user: req.user.userId });

    if (!deleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await Promise.all([
      Like.deleteMany({ post: id }),
      Comment.deleteMany({ post: id }),
    ]);

    return res.status(200).json({ message: 'deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;

    const existingLike = await Like.findOne({ user: req.user.userId, post: id });

    let liked;
    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      await Post.findByIdAndUpdate(id, { $inc: { likesCount: -1 } });
      liked = false;
    } else {
      await Like.create({ user: req.user.userId, post: id });
      await Post.findByIdAndUpdate(id, { $inc: { likesCount: 1 } });
      liked = true;
    }

    const post = await Post.findById(id).select('likesCount');
    const likesCount = post ? Math.max(0, post.likesCount) : 0;

    return res.status(200).json({ liked, likesCount });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getComments = async (req, res) => {
  try {
    const { id } = req.params;

    const comments = await Comment.find({ post: id })
      .sort({ createdAt: 1 })
      .populate('user', 'nickname');

    return res.status(200).json({ comments });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'text is required' });
    }

    const comment = await Comment.create({
      post: id,
      user: req.user.userId,
      text,
    });

    await Post.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });
    await comment.populate('user', 'nickname');

    return res.status(201).json(comment);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createPost,
  getPosts,
  updatePost,
  deletePost,
  toggleLike,
  getComments,
  createComment,
};
