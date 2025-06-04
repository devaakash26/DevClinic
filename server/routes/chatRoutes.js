const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getUserChats,
    getOrCreateChat,
    sendMessage,
    getChatMessages,
    getOnlineUsers
} = require('../controllers/chatController');

// Get all chats for the logged-in user
router.get('/chats', authMiddleware, getUserChats);

// Get or create a chat between two users
router.post('/chat', authMiddleware, getOrCreateChat);

// Send a message
router.post('/send-message', authMiddleware, sendMessage);

// Get chat messages
router.get('/messages/:chatId', authMiddleware, getChatMessages);

// Get online users (doctors and admins)
router.get('/online-users', authMiddleware, getOnlineUsers);

module.exports = router; 