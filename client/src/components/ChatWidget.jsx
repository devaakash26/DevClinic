import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  Button, Drawer, Input, List, Avatar, Badge, 
  Tabs, Typography, Spin, Empty, Tooltip, Modal, 
  message
} from 'antd';
import { 
  MessageOutlined, SendOutlined, CloseOutlined, 
  UserOutlined, MedicineBoxOutlined, TeamOutlined,
  SmileOutlined, LoadingOutlined, InfoCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';
import { 
  initializeSocket, getSocket, getUserChats, 
  getOrCreateChat, sendMessage, getChatMessages, 
  getOnlineUsers, isSocketConnected, pingServer
} from '../utils/socketUtils';
import '../styles/ChatWidget.css';

const { Text } = Typography;
const { TabPane } = Tabs;

const ChatWidget = () => {
  const { user } = useSelector(state => state.user);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [unreadCount, setUnreadCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);
  const pingIntervalRef = useRef(null);

  // Function to setup socket listeners
  const setupSocketListeners = useCallback(() => {
    if (!socket.current || !user) return;

    // Clear any existing listeners first to prevent duplicates
    socket.current.off('receive_message');
    socket.current.off('online_users');
    socket.current.off('typing');
    socket.current.off('pong');
    
    // Listen for connection status changes
    socket.current.on('connect', () => {
      console.log('Socket connected in component:', socket.current.id);
      setSocketConnected(true);
      
      // Refetch data on reconnection
      fetchChats();
      fetchOnlineUsers();
    });
    
    socket.current.on('disconnect', () => {
      console.log('Socket disconnected in component');
      setSocketConnected(false);
    });

    // Listen for new messages
    socket.current.on('receive_message', (messageData) => {
      console.log('Received message:', messageData);
      
      if (activeChat && activeChat._id === messageData.chatId) {
        // Update messages immediately if in the same chat
        setMessages(prev => [...prev, messageData]);
        
        // Mark the chat as read immediately
        const updatedChats = chats.map(chat => {
          if (chat._id === messageData.chatId) {
            return { ...chat, unreadCount: 0 };
          }
          return chat;
        });
        setChats(updatedChats);
      } else {
        // Increment unread count for the specific chat
        const updatedChats = chats.map(chat => {
          if (chat._id === messageData.chatId) {
            return { 
              ...chat, 
              unreadCount: (chat.unreadCount || 0) + 1,
              lastMessage: messageData.message,
              lastMessageTimestamp: messageData.timestamp
            };
          }
          return chat;
        });
        setChats(updatedChats);
        
        // Increment global unread count for notification
        setUnreadCount(prev => prev + 1);
        
        // Show notification
        message.info({
          content: (
            <div className="message-notification">
              <div className="notification-title">
                New message from {messageData.sender.name}
              </div>
              <div className="notification-content">{messageData.message}</div>
            </div>
          ),
          duration: 4,
          icon: <MessageOutlined style={{ color: '#1890ff' }} />,
          onClick: () => {
            // Find the chat and open it
            const chatToOpen = updatedChats.find(c => c._id === messageData.chatId);
            if (chatToOpen) {
              handleChatSelect(chatToOpen);
              setVisible(true);
            }
          }
        });
      }
    });
    
    // Listen for online users updates
    socket.current.on('online_users', (users) => {
      console.log('Received online users update:', users);
      setOnlineUsers(users);
    });
    
    // Listen for typing indicator
    socket.current.on('typing', (data) => {
      if (activeChat && activeChat._id === data.chatId && data.userId !== user._id) {
        setTypingUser(data.userName);
        setTyping(true);
        
        // Clear typing indicator after 3 seconds of inactivity
        setTimeout(() => {
          setTyping(false);
          setTypingUser(null);
        }, 3000);
      }
    });
    
    // Listen for server pong
    socket.current.on('pong', () => {
      console.log('Received pong from server');
      setSocketConnected(true);
    });
    
  }, [user, activeChat, chats]);

  // Initialize socket connection
  useEffect(() => {
    if (user) {
      const userData = {
        userId: user._id,
        userName: user.name,
        isDoctor: user.isDoctor,
        isAdmin: user.isAdmin
      };
      
      socket.current = initializeSocket(userData);
      setSocketConnected(isSocketConnected());
      
      // Setup listeners
      setupSocketListeners();
      
      // Setup ping interval to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        pingServer();
        setSocketConnected(isSocketConnected());
      }, 30000); // Ping every 30 seconds
      
      // Get existing chats and online users
      fetchChats();
      fetchOnlineUsers();
    }
    
    return () => {
      // Clear ping interval on unmount
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      // Remove socket listeners on unmount
      if (socket.current) {
        socket.current.off('receive_message');
        socket.current.off('online_users');
        socket.current.off('typing');
        socket.current.off('pong');
      }
    };
  }, [user, setupSocketListeners]);

  // Re-setup socket listeners when active chat changes
  useEffect(() => {
    setupSocketListeners();
  }, [activeChat, setupSocketListeners]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset unread count when widget is opened
  useEffect(() => {
    if (visible) {
      setUnreadCount(0);
    }
  }, [visible]);
  
  // Fetch user's chats
  const fetchChats = async () => {
    // Avoid excessive fetching (throttle to once every 5 seconds)
    const now = Date.now();
    if (now - lastFetchTime < 5000 && chats.length > 0) return;
    
    try {
      setLoading(true);
      const response = await getUserChats();
      
      if (response.success) {
        setChats(response.data);
        setLastFetchTime(now);
        
        // Calculate total unread count
        const totalUnread = response.data.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch online users
  const fetchOnlineUsers = async () => {
    try {
      const response = await getOnlineUsers();
      
      if (response.success) {
        // Filter out users who are already in chats
        const existingChatUserIds = chats.flatMap(chat => 
          chat.participants.map(p => p._id)
        );
        
        const filteredUsers = response.data.filter(
          user => !existingChatUserIds.includes(user._id)
        );
        
        setOnlineUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };
  
  // Load chat messages
  const loadChatMessages = async (chatId) => {
    try {
      setLoading(true);
      const response = await getChatMessages(chatId);
      
      if (response.success) {
        setMessages(response.data.messages);
        
        // Join socket room for this chat
        if (socket.current && socket.current.connected) {
          socket.current.emit('join_chat', chatId);
        }
        
        // Update the chat's unread count to zero
        const updatedChats = chats.map(chat => {
          if (chat._id === chatId) {
            return { ...chat, unreadCount: 0 };
          }
          return chat;
        });
        setChats(updatedChats);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    
    try {
      const receiverId = activeChat.participants.find(p => p._id !== user._id)?._id;
      
      if (!receiverId) {
        message.error('Could not identify receiver');
        return;
      }
      
      const messageData = {
        chatId: activeChat._id,
        message: newMessage,
        receiverId
      };
      
      // Add message optimistically to UI
      const optimisticMessage = {
        _id: Date.now().toString(),
        sender: {
          _id: user._id,
          name: user.name
        },
        receiver: {
          _id: receiverId
        },
        message: newMessage,
        timestamp: new Date(),
        read: false
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      setShowEmojiPicker(false);
      
      // Send message to server
      const response = await sendMessage(
        messageData.chatId, 
        messageData.message, 
        messageData.receiverId
      );
      
      // Update the chat's last message info
      const updatedChats = chats.map(chat => {
        if (chat._id === activeChat._id) {
          return { 
            ...chat, 
            lastMessage: newMessage,
            lastMessageTimestamp: new Date()
          };
        }
        return chat;
      });
      setChats(updatedChats);
      
      // Emit socket event for real-time update
      if (socket.current && socket.current.connected) {
        socket.current.emit('send_message', {
          ...messageData,
          sender: {
            _id: user._id,
            name: user.name
          },
          timestamp: new Date()
        });
      } else {
        message.warning('Socket disconnected. Message saved but not delivered in real-time.');
        // Try to reconnect
        if (socket.current) {
          socket.current.connect();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      message.error('Failed to send message');
    }
  };
  
  // Start a new chat with a user
  const startChat = async (userId) => {
    try {
      setLoading(true);
      const response = await getOrCreateChat(userId);
      
      if (response.success) {
        // Add to chats if not already there
        if (!chats.some(chat => chat._id === response.data._id)) {
          setChats(prev => [response.data, ...prev]);
        }
        
        // Set as active chat and load messages
        setActiveChat(response.data);
        await loadChatMessages(response.data._id);
        setActiveTab('chats');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      message.error('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle chat selection
  const handleChatSelect = async (chat) => {
    setActiveChat(chat);
    await loadChatMessages(chat._id);
  };
  
  // Toggle the chat widget
  const toggleWidget = () => {
    setVisible(!visible);
    if (!visible) {
      fetchChats();
      fetchOnlineUsers();
    }
  };
  
  // Manual refresh for chats and online users
  const handleRefresh = () => {
    fetchChats();
    fetchOnlineUsers();
    message.success('Refreshed chat data');
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socket.current && socket.current.connected && activeChat) {
      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Emit typing event
      socket.current.emit('typing', {
        chatId: activeChat._id,
        userId: user._id,
        userName: user.name
      });
      
      // Set timeout to clear typing indicator
      const timeout = setTimeout(() => {
        // Stop typing indicator after 2 seconds of inactivity
      }, 2000);
      
      setTypingTimeout(timeout);
    }
  };
  
  // Add emoji to message
  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };
  
  // Render user avatar
  const renderAvatar = (participant) => {
    if (!participant) return <Avatar style={{ backgroundColor: '#ccc' }} icon={<UserOutlined />} />;
    
    if (participant.isAdmin) {
      return <Avatar style={{ backgroundColor: '#f56a00' }} icon={<TeamOutlined />} />;
    } else if (participant.isDoctor) {
      return <Avatar style={{ backgroundColor: '#87d068' }} icon={<MedicineBoxOutlined />} />;
    } else {
      return <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />;
    }
  };
  
  // Render user status badge
  const renderUserStatus = (userId) => {
    if (!userId) return <Badge status="default" />;
    
    const isOnline = onlineUsers.some(user => user.userId === userId || user._id === userId);
    return isOnline ? (
      <Badge status="success" />
    ) : (
      <Badge status="default" />
    );
  };
  
  // Format date for message grouping
  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };
  
  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      const date = formatMessageDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };
  
  // Render message item
  const renderMessageItem = (message) => {
    const isCurrentUser = message.sender._id === user._id;
    
    return (
      <div 
        key={message._id} 
        className={`message-item ${isCurrentUser ? 'current-user' : 'other-user'}`}
      >
        {!isCurrentUser && (
          <Avatar 
            size="small" 
            icon={<UserOutlined />} 
            className="message-avatar"
          />
        )}
        <div className={`message-bubble ${isCurrentUser ? 'current-user' : 'other-user'}`}>
          <div className="message-content">{message.message}</div>
          <div className="message-time">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    );
  };
  
  // Render messages with date separators
  const renderMessagesWithDateSeparators = () => {
    if (messages.length === 0) {
      return <Empty description="No messages yet" />;
    }
    
    const groupedMessages = groupMessagesByDate(messages);
    
    return Object.entries(groupedMessages).map(([date, messagesInGroup]) => (
      <div key={date}>
        <div className="date-separator">
          <div className="date-line"></div>
          <div className="date-text">{date}</div>
          <div className="date-line"></div>
        </div>
        {messagesInGroup.map(renderMessageItem)}
      </div>
    ));
  };

  return (
    <>
      {/* Chat Button */}
      <Button
        type="primary"
        shape="circle"
        icon={<MessageOutlined />}
        size="large"
        onClick={toggleWidget}
        className="chat-widget-button"
      >
        {unreadCount > 0 && (
          <Badge 
            count={unreadCount} 
            className="chat-badge"
          />
        )}
      </Button>
      
      {/* Chat Drawer */}
      <Drawer
        title={
          <div className="chat-drawer-header">
            {activeChat && activeTab === 'chats' ? (
              <div className="active-chat-header">
                <Button 
                  type="text" 
                  icon={<CloseOutlined />} 
                  onClick={() => setActiveChat(null)}
                />
                <div className="active-chat-user">
                  {renderAvatar(activeChat.participants.find(p => p._id !== user._id))}
                  <div className="active-chat-user-info">
                    <Text strong>
                      {activeChat.participants.find(p => p._id !== user._id)?.name}
                    </Text>
                    <div className="user-status">
                      {renderUserStatus(activeChat.participants.find(p => p._id !== user._id)?._id)}
                      <Text type="secondary">
                        {onlineUsers.some(u => 
                          u.userId === activeChat.participants.find(p => p._id !== user._id)?._id ||
                          u._id === activeChat.participants.find(p => p._id !== user._id)?._id
                        ) 
                          ? 'Online' 
                          : 'Offline'}
                      </Text>
                    </div>
                  </div>
                </div>
                <Button 
                  type="text"
                  icon={<SyncOutlined />}
                  onClick={handleRefresh}
                  className="refresh-button"
                />
              </div>
            ) : (
              <div className="tabs-header">
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  className="chat-tabs"
                >
                  <TabPane tab="Chats" key="chats" />
                  <TabPane tab="Online" key="online" />
                </Tabs>
                <Button 
                  type="text"
                  icon={<SyncOutlined />}
                  onClick={handleRefresh}
                  className="refresh-button"
                />
              </div>
            )}
          </div>
        }
        placement="right"
        onClose={() => setVisible(false)}
        visible={visible}
        width={350}
        className="chat-drawer"
        bodyStyle={{ padding: 0 }}
      >
        <div className="connection-status">
          <Badge status={socketConnected ? "success" : "error"} />
          <Text type="secondary" className="connection-text">
            {socketConnected ? "Connected" : "Disconnected"}
          </Text>
        </div>
        
        {activeChat && activeTab === 'chats' ? (
          <div className="chat-messages-container">
            <div className="messages-list">
              {loading ? (
                <div className="loading-container">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                </div>
              ) : (
                renderMessagesWithDateSeparators()
              )}
              
              {typing && (
                <div className="typing-indicator">
                  <div className="typing-bubble">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  <div className="typing-text">{typingUser} is typing...</div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            <div className="message-input-container">
              {showEmojiPicker && (
                <div className="emoji-picker-container">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    lazyLoadEmojis={true}
                    width="100%"
                  />
                </div>
              )}
              
              <div className="message-input">
                <Button
                  type="text"
                  icon={<SmileOutlined />}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                />
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleTyping}
                  onPressEnter={handleSendMessage}
                  autoComplete="off"
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !socketConnected}
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            {activeTab === 'chats' ? (
              <>
                {chats.length === 0 && !loading ? (
                  <div className="empty-state">
                    <Empty 
                      description={
                        <span>
                          No conversations yet. Start a chat with an online doctor or admin.
                        </span>
                      }
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                    <Button 
                      type="primary" 
                      onClick={() => setActiveTab('online')}
                      icon={<UserOutlined />}
                    >
                      Find someone to chat with
                    </Button>
                  </div>
                ) : (
                  <List
                    loading={loading}
                    dataSource={chats}
                    renderItem={(chat) => {
                      const otherParticipant = chat.participants.find(
                        (p) => p._id !== user._id
                      );
                      
                      return (
                        <List.Item
                          onClick={() => handleChatSelect(chat)}
                          className="chat-list-item"
                        >
                          <List.Item.Meta
                            avatar={renderAvatar(otherParticipant)}
                            title={
                              <div className="chat-list-title">
                                <Text strong>{otherParticipant?.name}</Text>
                                {renderUserStatus(otherParticipant?._id)}
                              </div>
                            }
                            description={
                              <div className="chat-list-message">
                                <Text type="secondary" ellipsis>
                                  {chat.lastMessage || 'No messages yet'}
                                </Text>
                                {chat.lastMessageTimestamp && (
                                  <Text type="secondary" className="chat-time">
                                    {new Date(chat.lastMessageTimestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </Text>
                                )}
                              </div>
                            }
                          />
                          {chat.unreadCount > 0 && (
                            <Badge count={chat.unreadCount} />
                          )}
                        </List.Item>
                      );
                    }}
                    locale={{
                      emptyText: <Empty description="No conversations yet" />
                    }}
                  />
                )}
              </>
            ) : (
              <>
                {onlineUsers.length === 0 && !loading ? (
                  <div className="empty-state">
                    <Empty 
                      description={
                        <span>
                          No online users at the moment. Check back later.
                        </span>
                      }
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                    <div className="online-info">
                      <InfoCircleOutlined /> 
                      <Text type="secondary">
                        Users will appear here when they come online.
                      </Text>
                    </div>
                  </div>
                ) : (
                  <List
                    loading={loading}
                    dataSource={onlineUsers}
                    renderItem={(user) => (
                      <List.Item
                        onClick={() => startChat(user._id)}
                        className="chat-list-item"
                      >
                        <List.Item.Meta
                          avatar={renderAvatar(user)}
                          title={
                            <div className="chat-list-title">
                              <Text strong>{user.name}</Text>
                              <Badge status="success" />
                            </div>
                          }
                          description={
                            <Text type="secondary">
                              {user.isAdmin 
                                ? 'Administrator' 
                                : user.isDoctor 
                                  ? 'Doctor' 
                                  : 'Patient'}
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
                    locale={{
                      emptyText: <Empty description="No online users" />
                    }}
                  />
                )}
              </>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
};

export default ChatWidget; 