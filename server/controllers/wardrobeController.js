const Wardrobe = require('../models/Wardrobe');

const CATEGORIES = ['outer', 'top', 'bottom', 'shoes', 'accessory'];

const createItem = async (req, res) => {
  try {
    const { category, name, imageUrl, sourceUrl } = req.body;

    if (!category || !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `category must be one of: ${CATEGORIES.join(', ')}` });
    }

    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    const item = await Wardrobe.create({
      user: req.user.userId,
      category,
      name,
      imageUrl,
      sourceUrl,
    });

    return res.status(201).json(item);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getItems = async (req, res) => {
  try {
    const { category } = req.query;

    const filter = { user: req.user.userId };
    if (category && CATEGORIES.includes(category)) {
      filter.category = category;
    }

    const items = await Wardrobe.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ items });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Wardrobe.findOneAndDelete({ _id: id, user: req.user.userId });

    if (!deleted) {
      return res.status(404).json({ message: 'Item not found' });
    }

    return res.status(200).json({ message: 'deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createItem, getItems, deleteItem };
