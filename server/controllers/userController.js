const User = require('../models/User');

const getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      nickname: user.nickname,
      gender: user.gender,
      preferredStyles: user.preferredStyles,
      profileImage: user.profileImage,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      isFollowedByMe: user.followers.some((followerId) => followerId.equals(req.user.userId)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];

const updateMe = async (req, res) => {
  try {
    const { nickname, gender, preferredStyles, profileImage } = req.body;
    const updates = {};

    if (nickname !== undefined) {
      if (!nickname.trim()) {
        return res.status(400).json({ message: 'nickname cannot be empty' });
      }
      updates.nickname = nickname.trim();
    }

    if (gender !== undefined) {
      if (!GENDERS.includes(gender)) {
        return res.status(400).json({ message: `gender must be one of: ${GENDERS.join(', ')}` });
      }
      updates.gender = gender;
    }

    if (preferredStyles !== undefined) {
      if (!Array.isArray(preferredStyles)) {
        return res.status(400).json({ message: 'preferredStyles must be an array' });
      }
      updates.preferredStyles = preferredStyles;
    }

    // profileImage may be explicitly set to null to remove the photo, so
    // check for the key rather than truthiness.
    if ('profileImage' in req.body) {
      updates.profileImage = profileImage;
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const toggleFollow = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.userId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const alreadyFollowing = targetUser.followers.some((followerId) =>
      followerId.equals(req.user.userId)
    );

    if (alreadyFollowing) {
      await Promise.all([
        User.findByIdAndUpdate(id, { $pull: { followers: req.user.userId } }),
        User.findByIdAndUpdate(req.user.userId, { $pull: { following: id } }),
      ]);
      return res.status(200).json({ following: false });
    }

    await Promise.all([
      User.findByIdAndUpdate(id, { $addToSet: { followers: req.user.userId } }),
      User.findByIdAndUpdate(req.user.userId, { $addToSet: { following: id } }),
    ]);

    return res.status(200).json({ following: true });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getProfile, updateMe, toggleFollow };
