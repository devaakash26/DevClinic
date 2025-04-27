import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../redux/userInfo';
import toast from 'react-hot-toast';
import axios from 'axios';
import { SOCKET_URL, getApiUrl } from '../services/apiService';

// Create context
const SocketContext = createContext();

// Custom hook to use socket context
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user } = useSelector((state) => state.user);
    const dispatch = useDispatch();
    
    // Use ref to track whether listeners are already set up
    const listenersSetupRef = useRef(false);
    // Use ref to track the current path to avoid redundant notifications when already on notification page
    const currentPathRef = useRef(window.location.pathname);
    // Ref to track connection attempts
    const connectionAttemptsRef = useRef(0);
    
    // Initialize socket connection only once with reconnection options
    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['websocket', 'polling'],
            path: '/socket.io/',
            withCredentials: false,
            forceNew: true,
            autoConnect: true,
            reconnection: true,
            extraHeaders: {},
            upgrade: true
        });
        
        // Debug socket connection errors in detail
        newSocket.on('connect_error', (err) => {
            console.error('Socket.IO connection error details:', {
                message: err.message,
                description: err.description,
                type: err.type,
                stack: err.stack
            });
        });
        
        setSocket(newSocket);
        
        return () => {
            console.log("Cleaning up socket connection");
            if (newSocket) newSocket.disconnect();
        };
    }, []);
    
    // Connect user with their ID when user data is available
    useEffect(() => {
        if (!socket || !user?._id) return;
        
        const connectUser = () => {
            console.log(`Registering user ${user._id} with socket server...`);
            // Register the user with their ID
            socket.emit('user_connected', user._id);
        };
        
        // Set up event listeners
        socket.on('connect', () => {
            console.log('Connected to socket server with ID:', socket.id);
            setIsConnected(true);
            connectionAttemptsRef.current = 0;
            connectUser();
        });
        
        socket.on('connection_success', (data) => {
            console.log('Connection successful with user ID:', data.userId);
            setIsConnected(true);
            // Show toast only for reconnections
            if (connectionAttemptsRef.current > 0) {
                toast.success("Reconnected to notification server!");
            }
        });
        
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setIsConnected(false);
            connectionAttemptsRef.current += 1;
            
            // Only show error after multiple attempts
            if (connectionAttemptsRef.current >= 3) {
                toast.error("Unable to connect to notification server. Retrying...");
            }
        });
        
        socket.on('disconnect', (reason) => {
            console.log('Disconnected from socket server. Reason:', reason);
            setIsConnected(false);
            
            // Show toast for unexpected disconnections
            if (reason !== 'io client disconnect') {
                toast.error("Lost connection to notification server. Reconnecting...");
            }
        });
        
        socket.on('reconnect', (attemptNumber) => {
            console.log(`Reconnected to socket server after ${attemptNumber} attempts`);
            setIsConnected(true);
            connectUser(); // Re-register user after reconnection
        });
        
        socket.on('reconnect_failed', () => {
            // console.log("Failed to reconnect to socket server");
            toast.error("Could not reconnect to notification server. Please refresh the page.");
        });
        
        // If already connected, register the user
        if (socket.connected) {
            // console.log("Socket already connected, registering user immediately");
            connectUser();
            setIsConnected(true);
        } else {
            // console.log("Socket not connected yet, will register when connected");
        }
        
        return () => {
            socket.off('connect');
            socket.off('connection_success');
            socket.off('connect_error');
            socket.off('disconnect');
            socket.off('reconnect');
            socket.off('reconnect_failed');
        };
    }, [socket, user?._id]);
    
    // Handle notifications - set up only once per user session
    useEffect(() => {
        if (!socket || !user?._id || listenersSetupRef.current) return;
        
        
        const handleNotification = (data) => {
            // Check if we're already on the notifications page to avoid redundant toasts
            const isOnNotificationPage = currentPathRef.current.includes('notification');
            
            // Update the current path ref
            currentPathRef.current = window.location.pathname;
            
            console.log("Received notification:", data);
            
            // Skip notifications not meant for this user
            if (data.userId && user && data.userId !== user._id.toString()) {
                return;
            }
            
            if (data.notification) {
                // Ensure notification has a unique ID if not provided
                const notification = {
                    ...data.notification,
                    _id: data.notification._id || new Date().getTime().toString()
                };
                
                // If the notification contains the full notification object
                if (user) {
                    // Check if notification already exists
                    const existingNotification = user.unseenNotification?.find(n => 
                        n._id && n._id.toString() === notification._id.toString()
                    );
                    
                    if (!existingNotification) {
                        const updatedUser = {
                            ...user,
                            unseenNotification: [...(user.unseenNotification || []), notification]
                        };
                        dispatch(setUser(updatedUser));
                        
                        // Only show toast if not already on the notifications page
                        if (!isOnNotificationPage) {
                            toast.success('New notification received!');
                        }
                    } else {
                        // console.log("Duplicate notification detected, not adding:", notification._id);
                    }
                }
            }
        };
        
        socket.on('receive_notification', handleNotification);
        
        // Track that we've set up the listeners
        listenersSetupRef.current = true;
        console.log("Notification listeners set up successfully");
        
        return () => {
            console.log("Cleaning up notification listeners");
            socket.off('receive_notification', handleNotification);
        };
    }, [socket, user, dispatch]);
    
    // Track page changes
    useEffect(() => {
        const handleLocationChange = () => {
            currentPathRef.current = window.location.pathname;
            console.log("Page changed to:", window.location.pathname);
        };
        
        window.addEventListener('popstate', handleLocationChange);
        
        return () => {
            window.removeEventListener('popstate', handleLocationChange);
        };
    }, []);
    
    // Fetch latest notifications
    const fetchLatestNotifications = async () => {
        if (!user?._id) return;
        
        try {
            console.log("Fetching latest notifications for user:", user._id);
            const response = await axios.get(getApiUrl(`user/notifications/${user._id}`), {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.data.success) {
                console.log("Notifications fetched successfully");
                // Only update if different to avoid unnecessary re-renders
                if (JSON.stringify(user.unseenNotification) !== JSON.stringify(response.data.data)) {
                    const updatedUser = {
                        ...user,
                        unseenNotification: response.data.data
                    };
                    dispatch(setUser(updatedUser));
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return false;
        }
    };
    
    // Send notification function
    const sendNotification = (userId, notification) => {
        if (!socket) {
            console.error("Cannot send notification: Socket not initialized");
            return false;
        }
        
        if (!isConnected) {
            console.error("Cannot send notification: Socket not connected");
            return false;
        }
        
        console.log(`Sending notification to user ${userId}:`, notification);
        socket.emit('send_notification', { userId, notification });
        return true;
    };
    
    // Function to manually check connection and reconnect if needed
    const checkConnection = () => {
        if (socket && !isConnected) {
            console.log("Manually reconnecting socket...");
            socket.connect();
            return true;
        }
        return false;
    };
    
    return (
        <SocketContext.Provider value={{ 
            socket, 
            isConnected, 
            sendNotification,
            fetchLatestNotifications,
            checkConnection
        }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider; 