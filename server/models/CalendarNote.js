const mongoose = require('mongoose');

const calendarNoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

calendarNoteSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CalendarNote', calendarNoteSchema);
