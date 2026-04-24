const dotenv = require('dotenv');
dotenv.config();
const { validateEnv } = require('./config/envValidation');
validateEnv();

if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development' });
}

const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { Server: SocketServer } = require('socket.io');
const { attachSocket } = require('./socket');
// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
// const subscriptionRoutes = require('./routes/subscriptionRoutes'); // Removed
const adminRoutes = require('./routes/adminRoutes');
// const planRoutes = require('./routes/planRoutes'); // Removed
const paymentRoutes = require('./routes/paymentRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const supportRoutes = require('./routes/supportRoutes');
const planRoutes = require('./routes/planRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const csrfGuard = require('./middleware/csrfGuard');

// Configure environment variables
// Configure environment variables (moved to top)

// Initialize Express app and HTTP server (for Socket.io)
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

const io = new SocketServer(server, {
  cors: { origin: true },
  path: '/socket.io'
});
app.set('io', io);
attachSocket(io);

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

/* -------------------------------------------------------------------------- */
/* Trust proxy                                                                 */
/* -------------------------------------------------------------------------- */
// Deployment context: single EC2 instance. nginx may or may not be installed
// in front of Node. We use the Express-recommended "only trust loopback /
// private-range hops" setting, which is safe in both cases:
//
//   - If nginx is in front on the same EC2 → it forwards from 127.0.0.1
//     (loopback), so X-Forwarded-For is trusted → req.ip = real client IP.
//   - If Node is serving directly → no X-Forwarded-For header exists, so
//     req.ip falls back to the socket IP (still the real client IP).
//   - If an external attacker spoofs X-Forwarded-For → their origin is NOT
//     loopback/private, so the header is IGNORED → they can't spoof their way
//     into a different rate-limit bucket.
//
// This is strictly safer than `trust proxy: 1` and works across both setups
// without reconfiguration. See https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

/* -------------------------------------------------------------------------- */
/* Rate limiters                                                               */
/* -------------------------------------------------------------------------- */
// Single global 100/15min was locking legitimate dashboard users out — the
// dashboard makes 4+ API calls on load alone. We now split limiting by risk
// class: strict on auth endpoints (brute-force surface), lenient on the
// authenticated dashboard, and we skip limits entirely for things that must
// never be dropped (payment webhooks, health checks, widget script).

/** Do not rate-limit payment-provider webhooks, health checks, or public assets. */
const skipUnlimitedPaths = (req) => {
  const p = req.path || '';
  // Strip /api or /api/v1 prefix — the limiter is mounted on those, so req.path
  // is relative ("/users/login", "/payment/webhook", …).
  return (
    p === '/health' ||
    p.startsWith('/payment/webhook') ||        // Cashfree callbacks — never block
    p.startsWith('/webhooks/') ||              // Outgoing webhook retry callbacks
    p === '/chatbot/widget-ping'               // Widget install verification
  );
};

/** Generous limiter for the authenticated dashboard + widget API surface. */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600, // ~40 req/min sustained per IP — covers a heavy dashboard user
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipUnlimitedPaths,
  handler: (req, res) => {
    const retryAfter = Math.max(1, Math.ceil((req.rateLimit?.resetTime?.getTime() - Date.now()) / 1000) || 60);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      message: 'Too many requests. Please wait a moment and try again.',
      retryAfter
    });
  }
});

/** Strict limiter for auth routes — protects against credential stuffing. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,                           // 30 auth attempts per IP per 15 min
  skipSuccessfulRequests: true,      // Only count failed attempts (2xx/3xx don't count)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.max(1, Math.ceil((req.rateLimit?.resetTime?.getTime() - Date.now()) / 1000) || 60);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      message: 'Too many attempts. Please try again in a few minutes.',
      retryAfter
    });
  }
});

// Auth endpoints — paths here match BOTH /api and /api/v1 because Express
// treats /api/v1 as a subpath of /api. Mounting on /api covers both.
const AUTH_PATHS = [
  '/users/login',
  '/users/register',
  '/users/verify-otp',
  '/users/resend-otp',
  '/users/forgot-password',
  '/users/reset-password',
  '/admin/login',
  '/admin/login/totp',
];
AUTH_PATHS.forEach((p) => {
  app.use(`/api${p}`, authLimiter);
  app.use(`/api/v1${p}`, authLimiter);
});

// Lenient limiter for everything else on the API
app.use('/api', generalLimiter);
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
app.use('/api', planRoutes);
app.use('/api', webhookRoutes);

// Seed plans on startup (Phase 4.1)
const { seedPlans } = require('./jobs/seedPlans');
seedPlans().catch((e) => console.error('Seed plans error:', e));
// Seed sample coupons (Phase 4.2, optional)
const { seedCoupons } = require('./jobs/seedCoupons');
seedCoupons().catch((e) => console.error('Seed coupons error:', e));

// Mount same routes under /api/v1 for versioned API (backward compat: keep /api for 3+ months)
app.use('/api/v1', authRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/v1', chatbotRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1', supportRoutes);
app.use('/api/v1', planRoutes);
app.use('/api/v1', webhookRoutes);

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

// Start server (HTTP + Socket.io)
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
