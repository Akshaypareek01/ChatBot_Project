# ChatBot SaaS - Product Roadmap & Task Tracker

> **Goal:** Ship a production-ready, secure, competitive AI chatbot SaaS product.  
> **Status:** Pre-launch  
> **Last Updated:** 2026-02-27

---

## How to Use This Document

- [x] = Done
- [ ] = To Do
- **When you finish a task:** change `[ ]` to `[x]` for that line.
- Each phase should be completed before moving to the next
- Items marked 🔴 are blockers — fix before any public launch
- Items marked 🟡 are important but not blocking
- Items marked 🟢 are nice-to-have / growth features

---

## ▶️ START HERE: Phase 1 (Security Hardening)

Complete Phase 1 before moving to Phase 2. Track progress by marking items `[x]` when done.

---

## PHASE 1: Security Hardening 🔒

> **Priority:** CRITICAL — Complete before any client onboarding  
> **Timeline:** Week 1-2

### 1.1 Authentication & Authorization

- [x] 🔴 Replace 7-day JWT expiry with short-lived access tokens (1 hour) + refresh tokens (7 days)
- [x] 🔴 Add refresh token rotation (invalidate old refresh token on use)
- [x] 🔴 Add brute force protection — lock account after 5 failed login attempts (15-min cooldown)
- [x] 🔴 Enforce strong password policy (min 8 chars, 1 uppercase, 1 number, 1 special char)
- [x] 🔴 Remove default admin credentials from `.env.example` — force setup on first run
- [x] 🔴 Validate JWT_SECRET strength on server startup — reject weak/default values
- [x] 🟡 Add OTP attempt limit (max 3 tries per OTP, then regenerate)
- [x] 🟡 Add session management — allow users to see active sessions and revoke them
- [x] 🟡 Add 2FA option for admin accounts (TOTP via Google Authenticator)

### 1.2 Input Validation & Sanitization

- [x] 🔴 Sanitize all user inputs (chat messages, form fields) — strip HTML/scripts using `DOMPurify` or `sanitize-html`
- [x] 🔴 Add server-side message length limit for chat (max 1000 chars)
- [x] 🔴 Validate and sanitize file uploads — check MIME type (not just extension), reject executables
- [x] 🔴 Validate ObjectId format on all route params to prevent MongoDB injection
- [x] 🔴 Reduce global body parser limit from 10MB to 2MB — keep 10MB only on `/api/upload` route
- [x] 🟡 Add input validation library (`joi` or `zod`) for all API request bodies
- [x] 🟡 Sanitize filenames on upload (remove special chars, normalize)

### 1.3 Prompt Injection Protection

- [x] 🔴 Add prompt injection detection layer — reject messages containing known injection patterns
- [x] 🔴 Separate system instructions from user context using OpenAI's message roles properly
- [x] 🔴 Add output validation — ensure AI responses don't contain system prompt leaks
- [x] 🟡 Add a guardrail service that checks both input and output for policy violations
- [x] 🟡 Log all flagged/blocked messages for review

### 1.4 API & Network Security

- [x] 🔴 Fix chat endpoint — `POST /api/chat` currently accepts `userId` from request body, anyone can drain another user's tokens. Validate ownership server-side
- [x] 🔴 Add CSRF protection for all state-changing authenticated endpoints
- [x] 🔴 Add per-user rate limiting (not just global IP-based) — use `userId + IP` combo
- [x] 🔴 Add rate limiting specifically on `/api/chat` — max 30 messages/minute per userId
- [x] 🟡 Add API key authentication for widget endpoints (instead of just userId in script tag)
- [x] 🟡 Strengthen domain allowlist — validate `Origin` header server-side, don't rely on client-side `Referer`
- [x] 🟡 Add Content Security Policy (CSP) headers for the widget
- [x] 🟡 Add request signing for widget-to-server communication

### 1.5 Data Protection

- [x] 🔴 Add audit logging — log all admin actions, login attempts, payment events, data deletions
- [x] 🔴 Encrypt sensitive fields at rest (API keys, payment details) using AES-256
- [x] 🟡 Add data retention policy — auto-delete old chat logs after configurable period
- [x] 🟡 Add GDPR compliance — data export and deletion endpoints for users
- [x] 🟡 Add terms of service and privacy policy acceptance tracking

### 1.6 Infrastructure Security

- [x] 🔴 Delete duplicate legacy directories (`chatbot_backend/`, `chatbot_frontend/`) — reduce attack surface
- [x] 🔴 Add environment variable validation on server startup — fail fast if required vars are missing
- [x] 🟡 Add error tracking with Sentry (or similar) for production monitoring
- [x] 🟡 Set up automated security scanning (npm audit, Snyk)
- [x] 🟡 Add health check endpoint (`/health`) for uptime monitoring

---

---

## PHASE 2: Core Product Improvements ⚡

> **Priority:** HIGH — Required for competitive parity  
> **Timeline:** Week 2-4

### 2.1 Streaming Responses (SSE)

- [x] Replace current request-response chat with Server-Sent Events (SSE)
- [x] Stream OpenAI responses token-by-token to the widget
- [x] Add typing indicator animation in widget while streaming
- [ ] Handle stream interruption and reconnection gracefully
- [x] Update token counting to work with streamed responses

### 2.2 Chatbot Widget Customization

- [x] Add customization options saved per user:
  - [x] Primary color / accent color
  - [ ] Bot avatar / logo upload
  - [x] Chat bubble position (bottom-left / bottom-right)
  - [x] Welcome message (customizable text)
  - [x] Bot name / display name
  - [x] Chat window size (compact / standard / large)
  - [x] Auto-open delay (open chat after X seconds)
  - [ ] Custom CSS injection option
- [x] Build customization UI in user dashboard with live preview
- [x] Update `chatbot.js` to load and apply user's customization config
- [x] Add "Powered by [YourBrand]" badge (removable on paid plans)

### 2.3 Conversation History & Management

- [x] Create `Conversation` model to store full chat sessions:
  - [x] `visitorId` (anonymous fingerprint or session ID)
  - [x] `userId` (chatbot owner)
  - [x] `messages[]` (role, content, timestamp)
  - [x] `metadata` (page URL, browser, location, duration)
  - [x] `status` (active / ended / escalated)
  - [ ] `rating` (visitor feedback)
  - [ ] `leadInfo` (email, phone if captured)
- [x] Build conversation list view in user dashboard
- [x] Add conversation detail view with full message history
- [ ] Add search and filter (by date, status, rating, keyword)
- [x] Add export to CSV functionality

### 2.4 Lead Capture System

- [ ] Add pre-chat form configuration:
  - [ ] Enable/disable per user
  - [ ] Configurable fields (name, email, phone — each optional/required)
  - [ ] Custom welcome message before form
- [ ] Store captured leads linked to conversations
- [ ] Build leads management page in user dashboard
- [ ] Add lead export (CSV, JSON)
- [ ] Send email notification to user when new lead is captured
- [ ] Add webhook trigger on new lead capture

### 2.5 Suggested Questions / Quick Replies

- [ ] Auto-generate starter questions from knowledge base (top 3-5 common topics)
- [ ] Allow users to manually set starter questions in dashboard
- [ ] Display as clickable buttons in chat widget on first open
- [ ] Add in-chat quick reply buttons for follow-up suggestions

### 2.6 Chat Feedback System

- [ ] Add thumbs up/down buttons on each bot response in widget
- [ ] Store feedback linked to conversation and message
- [ ] Show feedback analytics in user dashboard (% positive, common negative responses)
- [ ] Flag low-rated responses for user to review and improve knowledge base

### 2.7 Knowledge Base Improvements

- [ ] Multi-page website scraping (crawl entire site via sitemap.xml or link following)
- [ ] Set crawl depth limit (1-3 levels)
- [ ] Show scraping progress in real-time (pages found, pages scraped, pages indexed)
- [ ] Support more file types: CSV, Excel, plain text, markdown
- [ ] Add manual text/paste-in knowledge source
- [ ] Add scheduled re-scraping (daily/weekly) to keep knowledge fresh
- [ ] Show knowledge base health — how many chunks, coverage, last updated

### 2.8 API Versioning

- [ ] Add `/api/v1/` prefix to all routes
- [ ] Keep backward compatibility on old routes for 3 months
- [ ] Document API version policy

---

---

## PHASE 3: User Experience & Dashboard 🎨

> **Priority:** HIGH — Directly impacts user retention  
> **Timeline:** Week 4-6

### 3.1 Analytics Dashboard for Users

- [ ] Chat volume over time (daily/weekly/monthly chart)
- [ ] Total conversations, messages, unique visitors
- [ ] Average response time
- [ ] Most asked questions (word cloud or ranked list)
- [ ] Unanswered / escalated questions list
- [ ] Lead capture conversion rate
- [ ] Token usage breakdown (chat vs upload vs scrape)
- [ ] Peak hours heatmap
- [ ] Chat satisfaction score (from feedback)

### 3.2 Improved Onboarding Flow

- [ ] Step-by-step setup wizard after registration:
  - [ ] Step 1: Enter website URL
  - [ ] Step 2: Auto-scrape and show preview
  - [ ] Step 3: Customize appearance
  - [ ] Step 4: Test the chatbot live
  - [ ] Step 5: Copy embed code
- [ ] Add progress indicator
- [ ] Add "skip" option for experienced users
- [ ] Send onboarding email sequence (Day 1, 3, 7)

### 3.3 Embed Code & Installation

- [ ] Generate clean embed snippet in dashboard
- [ ] One-click copy button
- [ ] Platform-specific instructions (WordPress, Shopify, Wix, Squarespace, HTML)
- [ ] Add installation verification — detect if widget is successfully installed on user's site
- [ ] Provide WordPress plugin for one-click install

### 3.4 Notification System

- [ ] In-app notifications (new leads, low balance, support replies)
- [ ] Email notification preferences (toggle per event type)
- [ ] Daily/weekly summary email (chat stats, leads captured)
- [ ] Low balance warnings with one-click recharge

### 3.5 Multi-Bot Support

- [ ] Allow users to create multiple chatbots per account
- [ ] Each bot has its own knowledge base, customization, and embed code
- [ ] Separate analytics per bot
- [ ] Bot switching in dashboard

### 3.6 Mobile Responsive Dashboard

- [ ] Ensure all dashboard pages work on mobile
- [ ] Responsive tables, charts, and forms
- [ ] Mobile-friendly conversation viewer

---

---

## PHASE 4: Monetization & Billing 💰

> **Priority:** HIGH — Required for revenue  
> **Timeline:** Week 5-7

### 4.1 Subscription Plans (Replace Pure Token Model)

- [ ] Create `Plan` model:
  - [ ] `name` (Free, Starter, Growth, Business, Enterprise)
  - [ ] `price` (monthly/yearly)
  - [ ] `chatLimit` (per month)
  - [ ] `sourcesLimit`
  - [ ] `features[]` (which features are included)
  - [ ] `whitelabel` (boolean)
  - [ ] `supportLevel` (email / priority / dedicated)
- [ ] Build plan selection UI with feature comparison table
- [ ] Implement plan upgrade/downgrade flow
- [ ] Add usage tracking against plan limits
- [ ] Show usage vs limit in dashboard (e.g., "1,245 / 5,000 chats used")
- [ ] Keep token top-ups as add-on for overages

### 4.2 Billing & Invoicing

- [ ] Auto-generate invoices (PDF) on successful payment
- [ ] Add GST/tax support for Indian businesses
- [ ] Build billing history page
- [ ] Add recurring subscription via Cashfree/Razorpay
- [ ] Implement auto-renewal with failure handling
- [ ] Add coupon/promo code system
- [ ] Add referral program (give ₹X credit for each referral)

### 4.3 Free Tier

- [ ] Allow registration without payment
- [ ] Free tier: 100 chats/month, 1 knowledge source, branded widget
- [ ] Show upgrade prompts when nearing limits
- [ ] Auto-disable chatbot when free limit is hit (show "upgrade" message in widget)

### 4.4 Pricing Page

- [ ] Build public pricing page with plan comparison
- [ ] Add FAQ section
- [ ] Add "Contact Sales" for enterprise
- [ ] Add annual billing discount (2 months free)
- [ ] Add trust badges and social proof

---

---

## PHASE 5: Competitive Edge Features 🚀

> **Priority:** MEDIUM — Differentiators for growth  
> **Timeline:** Week 7-10

### 5.1 Live Chat Handoff

- [ ] Add "Talk to Human" button in widget
- [ ] Real-time notification to user/agent when escalated
- [ ] Build simple live chat interface in dashboard
- [ ] Agent can see full conversation history before taking over
- [ ] Auto-switch back to AI when agent goes offline
- [ ] Use WebSockets (Socket.io) for real-time messaging

### 5.2 Webhook & Integration System

- [ ] Allow users to configure webhook URLs in dashboard
- [ ] Trigger webhooks on events:
  - [ ] New conversation started
  - [ ] Lead captured
  - [ ] Chat escalated to human
  - [ ] Feedback received
  - [ ] Token balance low
- [ ] Add webhook retry logic (3 attempts with exponential backoff)
- [ ] Add webhook logs (success/failure) in dashboard

### 5.3 Native Indian Language Support

- [ ] Go beyond Google Translate — add native Hindi, Tamil, Telugu, Bengali, Marathi prompts
- [ ] Detect visitor language from browser settings
- [ ] Allow users to set default bot language
- [ ] Translate knowledge base chunks into target language before RAG
- [ ] Test response quality in top 5 Indian languages

### 5.4 Advanced AI Features

- [ ] Add conversation memory — bot remembers context within a session
- [ ] Add intent detection — classify queries (FAQ, complaint, purchase intent, support)
- [ ] Add sentiment analysis — flag negative sentiment conversations
- [ ] Add auto-learning — suggest new Q&A entries from unanswered questions
- [ ] Add confidence scoring — show "I'm not sure about this" when similarity is low
- [ ] Support multiple AI models (GPT-4o, Gemini Flash, Claude) — let users choose

### 5.5 White-Label Solution

- [ ] Remove all branding for Business/Enterprise plans
- [ ] Custom domain for dashboard (CNAME support)
- [ ] Custom email sender (user's domain)
- [ ] Reseller admin panel — agencies can manage multiple client chatbots

### 5.6 Chat Flows / Decision Trees

- [ ] Visual flow builder (drag-and-drop)
- [ ] Support button-based responses alongside AI
- [ ] Pre-built templates (appointment booking, pricing inquiry, support routing)
- [ ] Conditional logic (if user says X, go to step Y)
- [ ] Mix AI responses with structured flows

---

---

## PHASE 6: Go-To-Market 📣

> **Priority:** HIGH — Run parallel with Phase 3-4  
> **Timeline:** Week 4-8

### 6.1 Landing Page & Website

- [ ] Build conversion-optimized landing page:
  - [ ] Hero section with live chatbot demo
  - [ ] Feature showcase with screenshots/GIFs
  - [ ] Pricing table
  - [ ] Testimonials / case studies (use beta users)
  - [ ] FAQ section
  - [ ] CTA: "Try Free — No Credit Card Required"
- [ ] SEO optimization (meta tags, structured data, blog)
- [ ] Add live chatbot on your own website (eat your own dog food)

### 6.2 Product Hunt Launch

- [ ] Prepare Product Hunt listing:
  - [ ] Tagline, description, screenshots, demo video
  - [ ] Maker comment with story
  - [ ] Schedule for Tuesday-Thursday (best days)
- [ ] Build a "hunter" network — reach out to top hunters 2 weeks before
- [ ] Prepare social media blitz for launch day

### 6.3 Content Marketing

- [ ] Start blog: "AI Chatbot for Indian Businesses" (SEO play)
- [ ] Create YouTube tutorials (setup in 2 minutes, use cases by industry)
- [ ] LinkedIn content — daily posts about AI chatbots, customer support automation
- [ ] Create comparison pages: "[YourProduct] vs Tidio", "[YourProduct] vs Chatbase"

### 6.4 Direct Outreach (First 10 Clients)

- [ ] Identify 100 target businesses (local restaurants, clinics, coaching, real estate, D2C)
- [ ] Build outreach template (email + WhatsApp)
- [ ] Offer free 30-day trial with full setup
- [ ] Personally set up chatbot for each prospect (don't ask them to self-serve)
- [ ] Follow up after 7 days with usage stats
- [ ] Convert to paid after trial with special "founding customer" discount
- [ ] Ask for testimonial/case study in exchange for extended discount

### 6.5 Partnerships

- [ ] Partner with web development agencies — offer reseller margins (20-30%)
- [ ] Partner with digital marketing freelancers
- [ ] List on agency/tool directories
- [ ] Create affiliate program with tracking links

### 6.6 Marketplace Listings

- [ ] WordPress plugin on WordPress.org
- [ ] Shopify app on Shopify App Store
- [ ] List on G2, Capterra, GetApp
- [ ] AppSumo lifetime deal (for initial traction + reviews)

---

---

## PHASE 7: Scale & Infrastructure 🏗️

> **Priority:** MEDIUM — After first 50+ clients  
> **Timeline:** Week 10-16

### 7.1 Performance at Scale

- [ ] Add Redis for caching (hot cache for chat, sessions, rate limiting)
- [ ] Move file processing to background job queue (BullMQ + Redis)
- [ ] Add database connection pooling
- [ ] Implement database read replicas for analytics queries
- [ ] Add CDN for static assets (widget JS, images)
- [ ] Load test with k6 or Artillery — target 100 concurrent chats per server
- [ ] Add auto-scaling (PM2 cluster mode or Kubernetes)

### 7.2 Monitoring & Observability

- [ ] Application Performance Monitoring (APM) — Sentry or Datadog
- [ ] Uptime monitoring — Better Uptime or UptimeRobot
- [ ] Log aggregation — Winston + CloudWatch or Loki
- [ ] Custom metrics dashboard (Grafana):
  - [ ] Chat response times (p50, p95, p99)
  - [ ] Token usage trends
  - [ ] Error rates by endpoint
  - [ ] Active users / concurrent chats
- [ ] Alerting on anomalies (spike in errors, response time degradation)

### 7.3 Database Optimization

- [ ] Add compound indexes on high-query collections (Vector, Usage, Conversation)
- [ ] Implement data archival — move old conversations to cold storage
- [ ] Add MongoDB Atlas Search for full-text search on conversations
- [ ] Monitor and optimize slow queries
- [ ] Consider time-series collection for analytics data

### 7.4 CI/CD & DevOps

- [ ] Set up GitHub Actions (or GitLab CI):
  - [ ] Lint on PR
  - [ ] Run tests on PR
  - [ ] Auto-deploy to staging on merge to `develop`
  - [ ] Auto-deploy to production on merge to `main`
- [ ] Add staging environment
- [ ] Add database migration strategy (versioned migrations)
- [ ] Add rollback procedures
- [ ] Containerize with Docker (Dockerfile + docker-compose)

### 7.5 Testing

- [ ] Backend: Jest + Supertest for API integration tests
- [ ] Frontend: Vitest + React Testing Library for component tests
- [ ] E2E: Playwright for critical user flows (signup → setup → chat)
- [ ] Target 70%+ code coverage on critical paths
- [ ] Add pre-commit hooks (lint + test)

---

---

## PHASE 8: Third-Party Services & API Integrations 🔌

> **Priority:** LOW-MEDIUM — Add as client demand grows  
> **Timeline:** Ongoing after launch

### 8.1 AI / LLM Providers

| Service | Purpose | Priority | Cost |
|---------|---------|----------|------|
| **OpenAI GPT-4o-mini** | Primary chat model (already integrated) | ✅ Done | ~$0.15/1M input tokens |
| **OpenAI GPT-4o** | Premium tier for better responses | High | ~$2.50/1M input tokens |
| **Google Gemini Flash** | Cheaper fallback for simple queries | High | ~$0.075/1M input tokens |
| **Anthropic Claude** | Alternative premium model | Medium | ~$3/1M input tokens |
| **OpenAI Whisper** | Voice-to-text input in widget | Low | ~$0.006/min |
| **OpenAI TTS / ElevenLabs** | Text-to-speech output | Low | Variable |

### 8.2 Communication Channels

| Service | Purpose | Priority | Cost |
|---------|---------|----------|------|
| **WhatsApp Business API (via Meta / Gupshup)** | WhatsApp chatbot channel | High | ~₹0.50-1.00/message |
| **Telegram Bot API** | Telegram chatbot channel | Medium | Free |
| **Instagram Messaging API** | Instagram DM chatbot | Medium | Free (requires Meta approval) |
| **Facebook Messenger API** | Messenger chatbot | Low | Free |
| **Twilio** | SMS notifications | Low | ~₹0.50/SMS |

### 8.3 CRM & Business Integrations

| Service | Purpose | Priority | Cost |
|---------|---------|----------|------|
| **Zoho CRM API** | Push leads to Zoho CRM | High | Free tier available |
| **HubSpot API** | Push leads to HubSpot | High | Free tier available |
| **Google Sheets API** | Export leads/data to Sheets | High | Free |
| **Zapier / Make (Integromat)** | Connect to 5000+ apps via webhook | High | Free tier available |
| **Slack API** | Send notifications to Slack | Medium | Free |
| **Calendly API** | Book appointments from chatbot | Medium | Free tier available |
| **Google Calendar API** | Schedule meetings | Medium | Free |

### 8.4 Payment Gateways

| Service | Purpose | Priority | Cost |
|---------|---------|----------|------|
| **Cashfree** | Primary payment gateway (already integrated) | ✅ Done | 1.90% + ₹3/txn |
| **Razorpay** | Alternative gateway (more popular in India) | High | 2% + GST/txn |
| **Stripe** | International payments (USD, EUR) | Medium | 2.9% + 30¢/txn |
| **PayPal** | International alternative | Low | 2.9% + fixed fee |

### 8.5 Email & Notification Services

| Service | Purpose | Priority | Cost |
|---------|---------|----------|------|
| **Zoho SMTP** | Transactional emails (already integrated) | ✅ Done | Free tier |
| **SendGrid / Resend** | Scalable transactional email | Medium | Free tier up to 100/day |
| **AWS SES** | High-volume email at scale | Medium | $0.10/1000 emails |
| **Firebase Cloud Messaging** | Push notifications (if mobile app) | Low | Free |
| **OneSignal** | Web push notifications | Low | Free tier |

### 8.6 Storage & Infrastructure

| Service | Purpose | Priority | Cost |
|---------|---------|----------|------|
| **Cloudflare R2** | Object storage (already integrated) | ✅ Done | $0.015/GB/month |
| **MongoDB Atlas** | Primary database (already integrated) | ✅ Done | Free tier → $57/mo |
| **Redis Cloud / Upstash** | Caching, rate limiting, job queues | High | Free tier available |
| **Pinecone / Qdrant** | Dedicated vector DB (if Atlas vector search isn't enough) | Medium | Free tier available |
| **Cloudflare CDN** | Static asset delivery | Medium | Free tier |
| **AWS CloudFront** | CDN alternative | Low | Pay per use |

### 8.7 Analytics & Monitoring

| Service | Purpose | Priority | Cost |
|---------|---------|----------|------|
| **Sentry** | Error tracking & monitoring | High | Free tier (5K events/mo) |
| **PostHog** | Product analytics (self-hostable) | Medium | Free tier |
| **Google Analytics 4** | Landing page analytics | Medium | Free |
| **Mixpanel** | User behavior analytics | Low | Free tier |
| **Better Uptime / UptimeRobot** | Uptime monitoring | High | Free tier |
| **Grafana Cloud** | Metrics & dashboards | Medium | Free tier |

### 8.8 Security Services

| Service | Purpose | Priority | Cost |
|---------|---------|----------|------|
| **Cloudflare** | DDoS protection, WAF, SSL | High | Free tier |
| **Snyk** | Dependency vulnerability scanning | Medium | Free for open source |
| **Let's Encrypt** | SSL certificates | High | Free |
| **Auth0 / Clerk** | Managed auth (if you want to outsource auth) | Low | Free tier |

### 8.9 WordPress & CMS Plugins

| Platform | Purpose | Priority |
|----------|---------|----------|
| **WordPress Plugin** | One-click install for WP sites | High |
| **Shopify App** | Shopify store integration | High |
| **Wix App** | Wix website integration | Medium |
| **Squarespace** | Code injection guide | Low |
| **Webflow** | Custom code embed guide | Low |

---

---

## MILESTONE TRACKER

| Milestone | Target Date | Status |
|-----------|------------|--------|
| Phase 1: Security Hardening complete | Week 2 | ✅ Complete |
| Phase 2: Core Product Improvements complete | Week 4 | ⬜ Not Started |
| Phase 3: UX & Dashboard polished | Week 6 | ⬜ Not Started |
| Phase 4: Billing & Plans live | Week 7 | ⬜ Not Started |
| First beta client onboarded | Week 5 | ⬜ Not Started |
| 10 paying clients | Week 10 | ⬜ Not Started |
| Phase 5: Competitive features shipped | Week 10 | ⬜ Not Started |
| Product Hunt launch | Week 8 | ⬜ Not Started |
| Phase 6: GTM in full swing | Week 8 | ⬜ Not Started |
| 50 paying clients | Week 16 | ⬜ Not Started |
| Phase 7: Scale infrastructure | Week 16 | ⬜ Not Started |
| Phase 8: Third-party integrations | Ongoing | ⬜ Not Started |

---

## NOTES

- **Start selling at Phase 2 completion** — don't wait for perfection
- **Phase 1 is non-negotiable** — security holes will kill trust instantly
- **Phase 6 (GTM) runs parallel** with Phase 3-5 — don't build in a vacuum
- **Phase 8 is demand-driven** — only add integrations clients actually ask for
- **Track client feedback** in a separate doc — it drives priority for Phases 5 and 8

---
