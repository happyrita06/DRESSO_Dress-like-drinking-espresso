const CalendarNote = require('../models/CalendarNote');

const MONTH_REGEX = /^\d{4}-\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const getNotes = async (req, res) => {
  try {
    const { month } = req.query;

    if (!month || !MONTH_REGEX.test(month)) {
      return res.status(400).json({ message: 'month must be in YYYY-MM format' });
    }

    const notes = await CalendarNote.find({
      user: req.user.userId,
      date: { $regex: '^' + month },
    });

    return res.status(200).json({ notes });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const upsertNote = async (req, res) => {
  try {
    const { date } = req.params;
    const { note } = req.body;

    if (!DATE_REGEX.test(date)) {
      return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
    }

    if (!note) {
      return res.status(400).json({ message: 'note is required' });
    }

    const saved = await CalendarNote.findOneAndUpdate(
      { user: req.user.userId, date },
      { note },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(saved);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteNote = async (req, res) => {
  try {
    const { date } = req.params;

    await CalendarNote.findOneAndDelete({ user: req.user.userId, date });

    return res.status(200).json({ message: 'deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getNotes, upsertNote, deleteNote };
