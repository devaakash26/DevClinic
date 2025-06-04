const Chat = require('../models/ChatModel');
const User = require('../models/user');

// Get all chats for a user
const getUserChats = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Find all chats where the user is a participant
        const chats = await Chat.find({
            participants: { $in: [userId] }
        })
        .populate('participants', 'name email isDoctor isAdmin status')
        .sort({ lastMessageTimestamp: -1 });
        
        res.status(200).send({
            success: true,
            message: "Chats fetched successfully",
            data: chats
        });
    } catch (error) {
        console.error("Error getting user chats:", error);
        res.status(500).send({
            success: false,
            message: "Error fetching chats",
            error: error.message
        });
    }
};

// Get or create a chat between two users
const getOrCreateChat = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.userId;
        
        if (!receiverId) {
            return res.status(400).send({
                success: false,
                message: "Receiver ID is required"
            });
        }
        
        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).send({
                success: false,
                message: "Receiver not found"
            });
        }
        
        // Check if chat already exists
        let chat = await Chat.findOne({
            participants: { $all: [senderId, receiverId] }
        })
        .populate('participants', 'name email isDoctor isAdmin status');
        
        // If chat doesn't exist, create a new one
        if (!chat) {
            chat = new Chat({
                participants: [senderId, receiverId],
                messages: [],
                lastMessage: '',
                lastMessageTimestamp: new Date()
            });
            
            await chat.save();
            
            // Populate the newly created chat
            chat = await Chat.findById(chat._id)
                .populate('participants', 'name email isDoctor isAdmin status');
        }
        
        res.status(200).send({
            success: true,
            message: "Chat fetched successfully",
            data: chat
        });
    } catch (error) {
        console.error("Error getting/creating chat:", error);
        res.status(500).send({
            success: false,
            message: "Error getting/creating chat",
            error: error.message
        });
    }
};

// Send a message
const sendMessage = async (req, res) => {
    try {
        const { chatId, message, receiverId } = req.body;
        const senderId = req.userId;
        
        if (!message) {
            return res.status(400).send({
                success: false,
                message: "Message content is required"
            });
        }
        
        if (!chatId && !receiverId) {
            return res.status(400).send({
                success: false,
                message: "Either chat ID or receiver ID is required"
            });
        }
        
        let chat;
        
        // If chatId is provided, find the existing chat
        if (chatId) {
            chat = await Chat.findById(chatId);
            if (!chat) {
                return res.status(404).send({
                    success: false,
                    message: "Chat not found"
                });
            }
            
            // Ensure sender is a participant
            if (!chat.participants.includes(senderId)) {
                return res.status(403).send({
                    success: false,
                    message: "You are not a participant in this chat"
                });
            }
        } 
        // If receiverId is provided, find or create a chat
        else if (receiverId) {
            // Check if receiver exists
            const receiver = await User.findById(receiverId);
            if (!receiver) {
                return res.status(404).send({
                    success: false,
                    message: "Receiver not found"
                });
            }
            
            // Find existing chat
            chat = await Chat.findOne({
                participants: { $all: [senderId, receiverId] }
            });
            
            // Create new chat if not exists
            if (!chat) {
                chat = new Chat({
                    participants: [senderId, receiverId],
                    messages: []
                });
            }
        }
        
        // Create and add new message
        const newMessage = {
            sender: senderId,
            receiver: receiverId || chat.participants.find(id => id.toString() !== senderId.toString()),
            message,
            timestamp: new Date(),
            read: false
        };
        
        chat.messages.push(newMessage);
        chat.lastMessage = message;
        chat.lastMessageTimestamp = new Date();
        chat.unreadCount = chat.unreadCount + 1;
        
        await chat.save();
        
        // Populate the updated chat
        const populatedChat = await Chat.findById(chat._id)
            .populate('participants', 'name email isDoctor isAdmin status')
            .populate('messages.sender', 'name email isDoctor isAdmin')
            .populate('messages.receiver', 'name email isDoctor isAdmin');
        
        res.status(200).send({
            success: true,
            message: "Message sent successfully",
            data: {
                chat: populatedChat,
                newMessage: populatedChat.messages[populatedChat.messages.length - 1]
            }
        });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).send({
            success: false,
            message: "Error sending message",
            error: error.message
        });
    }
};

// Get chat messages
const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.userId;
        
        if (!chatId) {
            return res.status(400).send({
                success: false,
                message: "Chat ID is required"
            });
        }
        
        // Find the chat
        const chat = await Chat.findById(chatId)
            .populate('participants', 'name email isDoctor isAdmin status')
            .populate('messages.sender', 'name email isDoctor isAdmin')
            .populate('messages.receiver', 'name email isDoctor isAdmin');
        
        if (!chat) {
            return res.status(404).send({
                success: false,
                message: "Chat not found"
            });
        }
        
        // Ensure user is a participant
        if (!chat.participants.some(p => p._id.toString() === userId)) {
            return res.status(403).send({
                success: false,
                message: "You are not a participant in this chat"
            });
        }
        
        // Mark messages as read
        chat.messages.forEach(msg => {
            if (msg.receiver._id.toString() === userId && !msg.read) {
                msg.read = true;
            }
        });
        
        // Reset unread count
        chat.unreadCount = 0;
        
        await chat.save();
        
        res.status(200).send({
            success: true,
            message: "Chat messages fetched successfully",
            data: chat
        });
    } catch (error) {
        console.error("Error getting chat messages:", error);
        res.status(500).send({
            success: false,
            message: "Error fetching chat messages",
            error: error.message
        });
    }
};

// Get online users (doctors and admins)
const getOnlineUsers = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get current user to determine their role
        const currentUser = await User.findById(userId);
        
        if (!currentUser) {
            return res.status(404).send({
                success: false,
                message: "User not found"
            });
        }
        
        let query = {};
        
        // If user is a patient, they can only chat with doctors and admins
        if (!currentUser.isDoctor && !currentUser.isAdmin) {
            query = {
                $or: [
                    { isDoctor: true },
                    { isAdmin: true }
                ],
                _id: { $ne: userId }, // Exclude current user
                status: { $ne: 'blocked' } // Exclude blocked users
            };
        } 
        // If user is a doctor, they can chat with patients and admins
        else if (currentUser.isDoctor && !currentUser.isAdmin) {
            query = {
                $or: [
                    { isDoctor: false, isAdmin: false }, // Patients
                    { isAdmin: true } // Admins
                ],
                _id: { $ne: userId }, // Exclude current user
                status: { $ne: 'blocked' } // Exclude blocked users
            };
        } 
        // If user is an admin, they can chat with everyone
        else if (currentUser.isAdmin) {
            query = {
                _id: { $ne: userId }, // Exclude current user
                status: { $ne: 'blocked' } // Exclude blocked users
            };
        }
        
        // Find users based on the query
        const users = await User.find(query)
            .select('name email isDoctor isAdmin status');
        
        res.status(200).send({
            success: true,
            message: "Online users fetched successfully",
            data: users
        });
    } catch (error) {
        console.error("Error getting online users:", error);
        res.status(500).send({
            success: false,
            message: "Error fetching online users",
            error: error.message
        });
    }
};

module.exports = {
    getUserChats,
    getOrCreateChat,
    sendMessage,
    getChatMessages,
    getOnlineUsers
}; 