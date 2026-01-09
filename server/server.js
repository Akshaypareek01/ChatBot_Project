const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
// const subscriptionRoutes = require('./routes/subscriptionRoutes'); // Removed
const adminRoutes = require('./routes/adminRoutes');
// const planRoutes = require('./routes/planRoutes'); // Removed
const paymentRoutes = require('./routes/paymentRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

// Configure environment variables
// Configure environment variables (moved to top)

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // Secure HTTP headers with cross-origin access

// CORS: Allow all for development, but in production, restrict this:
// app.use(cors({ origin: 'https://your-frontend-domain.com' }));
app.use(cors());

// Rate Limiting: 100 requests per 15 mins
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter); // Apply to API routes

app.use(express.json({ limit: '10mb' })); // Limit body size to prevents DOS
app.use(express.static('public'));

// Connect to MongoDB
connectDB();

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Mount API routes
// Mount API routes
app.use('/api', authRoutes);
app.use('/api', chatbotRoutes);
app.use('/api', userRoutes);
// app.use('/api', subscriptionRoutes); // Removed
app.use('/api', adminRoutes);
// app.use('/api', planRoutes); // Removed
app.use('/api', paymentRoutes);

// Cron Job for Subscription Expiration (Removed - Token System)
// checkSubscriptionExpiration();
// setInterval(checkSubscriptionExpiration, 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
