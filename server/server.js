const dotenv = require('dotenv');
dotenv.config();
const { validateEnv } = require('./config/envValidation');
validateEnv();

if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development' });
}

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
const supportRoutes = require('./routes/supportRoutes');
const csrfGuard = require('./middleware/csrfGuard');

// Configure environment variables
// Configure environment variables (moved to top)

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Middleware
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.requestHandler());
}
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // Secure HTTP headers with cross-origin access

// CORS: Allow all for development, but in production, restrict this:
// app.use(cors({ origin: 'https://your-frontend-domain.com' }));
app.use(cors());

// Rate Limiting: 100 requests per 15 mins
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests from this IP, please try again later.' },
  skip: (req) => {
    // Skip rate limiting for admin login
    return req.path === '/admin/login';
  }
});
app.use('/api', limiter);
app.use('/api', csrfGuard);

// Capture raw body for request signing verification on /api/chat
app.use(express.json({
  limit: '2mb',
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
// Serve widget script with CSP (script-src allows inline if needed by widget)
app.get('/chatbot.js', (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://translate.google.com; connect-src *");
  res.sendFile(__dirname + '/public/chatbot.js');
});
app.use(express.static('public'));

// Connect to MongoDB
connectDB();

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes (current)
app.use('/api', authRoutes);
app.use('/api', paymentRoutes); // This must be before userRoutes/adminRoutes to prevent auth logic conflicts
app.use('/api', chatbotRoutes);
app.use('/api', userRoutes);
app.use('/api', adminRoutes);
app.use('/api', supportRoutes);

// Mount same routes under /api/v1 for versioned API (backward compat: keep /api for 3+ months)
app.use('/api/v1', authRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/v1', chatbotRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1', supportRoutes);

// Scheduled re-scrape for website sources (daily/weekly)
const { runScheduledScrapes } = require('./jobs/scheduledScrape');
runScheduledScrapes().catch((e) => console.error('Scheduled scrape error:', e));
setInterval(() => {
    runScheduledScrapes().catch((e) => console.error('Scheduled scrape error:', e));
}, 60 * 60 * 1000);

// Phase 3.2: Onboarding email sequence (Day 1, 3, 7) — run once per day
const { runOnboardingEmails } = require('./jobs/onboardingEmails');
runOnboardingEmails().catch((e) => console.error('Onboarding emails error:', e));
setInterval(() => runOnboardingEmails().catch((e) => console.error('Onboarding emails error:', e)), 24 * 60 * 60 * 1000);

// Phase 3.4: Daily/weekly summary emails — run once per day
const { runSummaryEmails } = require('./jobs/summaryEmails');
runSummaryEmails().catch((e) => console.error('Summary emails error:', e));
setInterval(() => runSummaryEmails().catch((e) => console.error('Summary emails error:', e)), 24 * 60 * 60 * 1000);

if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.errorHandler());
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
