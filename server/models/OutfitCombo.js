const mongoose = require('mongoose');

const comboItemSchema = new mongoose.Schema(
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
    wardrobeItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wardrobe',
    },
  },
  { _id: false }
);

const outfitComboSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [comboItemSchema],
      default: [],
    },
    isShared: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('OutfitCombo', outfitComboSchema);
