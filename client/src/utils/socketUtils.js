import { io } from 'socket.io-client';
import { api } from './apiUtils';
import { SOCKET_URL } from '../services/apiService';

// Initialize socket connection
let socket;

export const initializeSocket = (userData) => {
  if (!socket || !socket.connected) {
    // Close previous socket if it exists but is not connected
    if (socket) {
      socket.close();
      socket = null;
    }
    
    console.log('Initializing socket connection to:', SOCKET_URL);
    
    // Create new socket connection with default namespace
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      autoConnect: true,
      forceNew: true,
      query: userData ? {
        userId: userData.userId,
        userName: userData.userName
      } : {}
    });
    
    socket.on('connect', () => {
      console.log('Socket connected with ID:', socket.id);
      
      // Emit user connected event with user data
      if (userData && userData.userId) {
        socket.emit('user_connected', userData);
      }
    });
    
    socket.on('reconnect', (attempt) => {
      console.log(`Socket reconnected after ${attempt} attempts`);
      
      // Re-emit user connected event on reconnection
      if (userData && userData.userId) {
        socket.emit('user_connected', userData);
      }
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Log more details about the error
      console.error('Error details:', {
        message: error.message,
        description: error.description,
        type: error.type,
        context: 'Check if server is running and Socket.IO is properly configured',
        url: SOCKET_URL
      });
    });
    
    // Force reconnection if connection was lost
    if (!socket.connected) {
      socket.connect();
    }
  } else {
    // If socket is already connected, just update user data
    if (userData && userData.userId) {
      socket.emit('user_connected', userData);
    }
  }
  
  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Function to check if socket is connected
export const isSocketConnected = () => {
  return socket && socket.connected;
};

// Ping server to maintain connection
export const pingServer = () => {
  if (socket && socket.connected) {
    socket.emit('ping');
  }
};

// Chat API functions
export const getUserChats = async () => {
  try {
    const response = await api.get('chat/chats', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting user chats:', error);
    throw error;
  }
};

export const getOrCreateChat = async (receiverId) => {
  try {
    const response = await api.post('chat/chat', 
      { receiverId },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting/creating chat:', error);
    throw error;
  }
};

export const sendMessage = async (chatId, message, receiverId) => {
  try {
    const response = await api.post('chat/send-message', 
      { chatId, message, receiverId },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getChatMessages = async (chatId) => {
  try {
    const response = await api.get(`chat/messages/${chatId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
};

export const getOnlineUsers = async () => {
  try {
    const response = await api.get('chat/online-users', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting online users:', error);
    throw error;
  }
}; 