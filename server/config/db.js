const dns = require('dns');
const mongoose = require('mongoose');

// Some ISP/router DNS resolvers (seen with at least one Korean ISP during
// local dev) fail Node's SRV/TXT lookups for `mongodb+srv://` URIs even
// though the same records resolve fine via the OS resolver (`nslookup`).
// Pointing Node's resolver at public DNS sidesteps it; harmless in
// production (Vercel) where the default resolver already works fine.
dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);

// Cached across invocations so Vercel's serverless functions reuse the same
// connection on warm starts instead of opening a new one per request (which
// would quickly exhaust MongoDB Atlas's connection limit). Harmless locally
// too — `npm run dev` just reuses the same cached promise on every request.
let cachedConnectionPromise = null;

const connectDB = async () => {
  if (cachedConnectionPromise) {
    return cachedConnectionPromise;
  }

  cachedConnectionPromise = mongoose
    .connect(process.env.MONGO_URI)
    .then((connection) => {
      console.log('MongoDB connected successfully');
      return connection;
    })
    .catch((error) => {
      // Don't take down the whole process — routes that don't touch the
      // database should keep working even before MONGO_URI is configured.
      console.error(`MongoDB connection error: ${error.message}`);
      cachedConnectionPromise = null; // allow the next request to retry
      throw error;
    });

  return cachedConnectionPromise;
};

module.exports = connectDB;
