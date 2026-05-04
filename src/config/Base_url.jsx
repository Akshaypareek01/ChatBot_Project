// Production: https://chatbot.nvhotech.in (frontend) → https://apis.chatbot.nvhotech.in/api (backend)
export const Base_url = "https://apis.chatbot.nvhotech.in/api"
// Local dev: uncomment below and comment above
 //export const Base_url = "http://localhost:5001/api"

/** Socket.io base URL (no /api) for live chat handoff */
export const SOCKET_URL = Base_url.replace(/\/api\/?$/, '')