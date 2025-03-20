
# Chatbot Server

This is the backend server for the chatbot application. It provides API endpoints for:
- User authentication and management
- Question and answer management
- Chatbot functionality

## Setup

1. Install dependencies:
```
npm install
```

2. Create a `.env` file with the following variables:
```
MONGODB_URI=mongodb+srv://akshaypareekwork:78elKENOOZ5pysmp@cahtbot.iifcp.mongodb.net/?retryWrites=true&w=majority&appName=cahtbot
JWT_SECRET=your-secret-key
PORT=5000
```

3. Start the server:
```
npm start
```

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login

### User Management (Admin)
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

### Q&A Management
- `GET /api/qa/:userId` - Get all QAs for a user
- `POST /api/admin/qa` - Create new QA
- `PUT /api/admin/qa/:id` - Update QA
- `DELETE /api/admin/qa/:id` - Delete QA

### Chatbot
- `GET /api/chatbot/:userId` - Get chatbot data for a user
- `POST /api/chatbot/log` - Log unanswered question
- `POST /api/chatbot/frequency` - Update QA frequency
