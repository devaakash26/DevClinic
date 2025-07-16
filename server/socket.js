const { Server } = require("socket.io");

const createSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Store online users
  const onlineUsers = new Map();

  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // User authenticated and connected
    socket.on('user_connected', (userData) => {
      console.log('User connected:', userData.userId);
      
      onlineUsers.set(userData.userId, {
        socketId: socket.id,
        userId: userData.userId,
        userName: userData.userName,
        isDoctor: userData.isDoctor,
        isAdmin: userData.isAdmin
      });
      
      io.emit('online_users', Array.from(onlineUsers.values()));
    });
    
    // Join a chat room
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });
    
    // Send a message
    socket.on('send_message', async (messageData) => {
      console.log('New message:', messageData);
      
      io.to(messageData.chatId).emit('receive_message', messageData);
      
      const receiver = onlineUsers.get(messageData.receiverId);
      if (receiver) {
        socket.to(receiver.socketId).emit('new_message_notification', {
          message: messageData.message,
          sender: messageData.sender,
          chatId: messageData.chatId
        });
      }
    });
    
    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(data.chatId).emit('typing', data);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      for (const [userId, user] of onlineUsers.entries()) {
        if (user.socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      
      io.emit('online_users', Array.from(onlineUsers.values()));
    });
  });

  return io;
};

module.exports = createSocketServer; 