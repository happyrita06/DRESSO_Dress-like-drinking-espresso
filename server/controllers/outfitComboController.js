const OutfitCombo = require('../models/OutfitCombo');

const CATEGORIES = ['outer', 'top', 'bottom', 'shoes', 'accessory'];

const createCombo = async (req, res) => {
  try {
    const { items, name } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items must be a non-empty array' });
    }

    for (const item of items) {
      if (!item || !item.category || !CATEGORIES.includes(item.category)) {
        return res.status(400).json({ message: `each item must have a category of: ${CATEGORIES.join(', ')}` });
      }
      if (!item.name) {
        return res.status(400).json({ message: 'each item must have a name' });
      }
    }

    const combo = await OutfitCombo.create({
      user: req.user.userId,
      items,
      name: typeof name === 'string' ? name.trim() : '',
    });

    return res.status(201).json(combo);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }

    const combo = await OutfitCombo.findOneAndUpdate(
      { _id: id, user: req.user.userId },
      { name: name.trim() },
      { new: true }
    );

    if (!combo) {
      return res.status(404).json({ message: 'Combo not found' });
    }

    return res.status(200).json(combo);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteCombo = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await OutfitCombo.findOneAndDelete({ _id: id, user: req.user.userId });

    if (!deleted) {
      return res.status(404).json({ message: 'Combo not found' });
    }

    return res.status(200).json({ message: 'deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getCombos = async (req, res) => {
  try {
    const combos = await OutfitCombo.find({ user: req.user.userId }).sort({ createdAt: -1 });

    return res.status(200).json({ combos });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createCombo, getCombos, updateCombo, deleteCombo };
