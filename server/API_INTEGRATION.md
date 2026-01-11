# API Integration Guide: Token-Based Chatbot System

This document outlines the API endpoints and integration details for the new Pay-As-You-Go Token System.

## 🔑 Base URL
`http://localhost:5001/api` (Development)
`https://your-domain.com/api` (Production)

---

## 🟢 Authentication (unchanged)
Headers: `Authorization: Bearer <token>` (Required for all protected routes)

---

## 💰 Wallet & Payments

### 1. Get User Balance & Transactions
**Endpoint:** `GET /payments/transactions`
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
[
  {
    "_id": "...",
    "amount": 500,
    "status": "success",
    "orderId": "...",
    "createdAt": "2024-01-10T..."
  }
]
```
*Note: User's current token balance is available in their User Profile (`GET /auth/me` or specific user endpoint).*

### 2. Recharge Wallet (Create Order)
**Endpoint:** `POST /payments/create-order`
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "amount": 500  // Amount in INR (Min: 100)
}
```
**Response:** Returns Cashfree Order Token & Transaction ID.

### 3. Payment Callback (Webhook/Redirect)
**Endpoint:** `GET /payments/callback`
**Query Params:** `orderId`
*Note: This is handled automatically by Cashfree redirect. On success, user tokens are credited immediately.*

---

## 🤖 Chatbot & Usage

### 1. Chat (RAG AI) - **COSTS TOKENS**
**Endpoint:** `POST /chat`
**Headers:** `Content-Type: application/json`
**Body:**
```json
{
  "userId": "USER_ID",
  "message": "Hello world"
}
```
**Cost:** ~1 Token per AI word (Variable).
**Logic:**
1. Checks if `User.tokenBalance` > 100.
2. If yes, processes chat.
3. Deducts actual tokens used from wallet.
4. Returns Answer.

### 2. Upload File - **COSTS TOKENS**
**Endpoint:** `POST /upload`
**Form-Data:** `file` (PDF/Doc), `userId`
**Cost:** 10,000 Tokens per file.
**Logic:**
1. Checks wallet > 10,000.
2. Deducts 10,000.
3. Processes & Embeds file.

### 3. Add Website - **COSTS TOKENS**
**Endpoint:** `POST /scrape`
**Body:** `{ "userId": "...", "url": "..." }`
**Cost:** 5,000 Tokens per URL.

---

## � Super Admin & Master Management

### 1. Super Admin Login
**Credentials:**
- **Email**: `superadmin@gmail.com`
- **Password**: `Akshay@0111`
- **Endpoint**: `POST /auth/admin/login`
- **Body**: `{ "email": "...", "password": "..." }`
- **Response**: `{ "token": "...", "user": { "role": "admin", ... } }`
*Note: This token gives access to all `/api/admin/*` routes.*

### 2. Dashboard Analytics (New)
**Endpoint**: `GET /admin/analytics`
**Headers**: `Authorization: Bearer <admin_token>`
**Response**:
```json
{
  "totalUsers": 120,
  "totalTokens": 5000000,
  "totalRevenue": 25000
}
```

### 3. Manage Users & Tokens
**Get All Users**: `GET /admin/users`
**Edit User (Add/Remove Tokens)**:
**Endpoint**: `PUT /admin/users/:id`
**Body**:
```json
{
  "tokenBalance": 100000, // Update wallet directly
  "isActive": true
}
```

### 4. View All System Transactions
**Endpoint:** `GET /admin/transactions`
**Headers:** `Authorization: Bearer <admin_token>`

---

## 📧 Notifications (Automated)
The system automatically sends emails via EmailJS when:
1. **Low Balance**: User has < 10,000 tokens.
2. **Expired**: User has 0 tokens (Chat stops).


kill -9 $(lsof -t -i :5001)
