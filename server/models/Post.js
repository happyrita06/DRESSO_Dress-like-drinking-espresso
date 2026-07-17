const mongoose = require('mongoose');

const postItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['outer', 'top', 'bottom', 'shoes', 'accessory'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['combo', 'upload'],
      required: true,
    },
    imageUrl: {
      type: String,
    },
    items: {
      type: [postItemSchema],
      default: [],
    },
    outfitCombo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutfitCombo',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    weatherTag: {
      type: String,
    },
    styleTags: {
      type: [String],
      default: [],
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Post', postSchema);
