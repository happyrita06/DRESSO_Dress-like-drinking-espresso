const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const wardrobeRoutes = require('./routes/wardrobeRoutes');
const combosRoutes = require('./routes/outfitComboRoutes');
const linkPreviewRoutes = require('./routes/linkPreviewRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const businessInquiryRoutes = require('./routes/businessInquiryRoutes');
const calendarNoteRoutes = require('./routes/calendarNoteRoutes');

const app = express();

// CORS_ORIGIN lets a deployed frontend (e.g. https://dresso.vercel.app) be
// locked in explicitly; unset (local dev / not yet configured) allows any
// origin so nothing breaks before that env var is set.
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
// Default body-parser limit (100kb) is too small for the base64 data-URL
// images posts/combos/profile photos send as JSON — bump it to fit those.
app.use(express.json({ limit: '5mb' }));

// Fire-and-forget at cold start — errors are already logged inside
// connectDB(); this .catch() only exists so a rejected promise here doesn't
// crash the process (connectDB() rethrows so *awaiting* callers can retry).
connectDB().catch(() => {});

app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/combos', combosRoutes);
app.use('/api/link-preview', linkPreviewRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/business-inquiries', businessInquiryRoutes);
app.use('/api/calendar-notes', calendarNoteRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// On Vercel, @vercel/node imports this file and calls the exported app as a
// serverless function — it never runs `node index.js` directly, so
// app.listen() must only happen for local dev / a traditional Node host.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;
