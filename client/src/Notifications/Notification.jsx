import React, { useEffect, useCallback, useState } from 'react';
import Layout from '../components/Layout';
import { Tabs, Badge, Empty, Spin, Tooltip } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { hideLoading, showLoading } from '../redux/loader';
import toast from 'react-hot-toast';
import { setUser } from '../redux/userInfo';
import bell from "/assets/bell.png";
import "./noti.css";
import { useSocket } from '../context/SocketContext';
import { 
    FaBell, FaCheckDouble, FaTrash, FaSync, FaSearch, 
    FaFilter, FaCalendarAlt, FaCheck, FaEye, FaRegBell,
    FaExclamationCircle, FaInfoCircle, FaCheckCircle
} from 'react-icons/fa';

const { TabPane } = Tabs;

const Notification = () => {
    const { user } = useSelector((state) => state.user);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { socket, isConnected } = useSocket();
    const { userId } = useParams();
    const currentUserId = userId || user?._id;
    
    // Use state to track if we've already fetched notifications
    const [initialFetchDone, setInitialFetchDone] = useState(false);
    // Track if we're currently fetching
    const [isFetching, setIsFetching] = useState(false);
    // Search filter
    const [searchText, setSearchText] = useState('');
    // Filter type
    const [filterType, setFilterType] = useState('all');

    // Fetch notifications without causing infinite loops
    const fetchNotifications = useCallback(async (force = false) => {
        // Prevent fetch if we've already done it or if one is in progress
        if ((!force && initialFetchDone) || isFetching || !currentUserId) return;
        
        try {
            setIsFetching(true);
            dispatch(showLoading());
            
            const response = await axios.get(`http://localhost:4000/api/user/notifications/${currentUserId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            
            dispatch(hideLoading());
            
            if (response.data.success) {
                // Only update if the data is different to prevent re-renders
                if (!user?.unseenNotification || 
                    JSON.stringify(user.unseenNotification) !== JSON.stringify(response.data.data)) {
                    const updatedUser = {
                        ...user,
                        unseenNotification: response.data.data,
                        seenNotification: response.data.seenNotifications || []
                    };
                    dispatch(setUser(updatedUser));
                }
                // Mark that we've done the initial fetch
                setInitialFetchDone(true);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            toast.error("Failed to fetch notifications");
        } finally {
            setIsFetching(false);
            dispatch(hideLoading());
        }
    }, [currentUserId, dispatch, user, initialFetchDone, isFetching]);
    
    // Effect for initial fetch - only run once when component mounts
    useEffect(() => {
        if (!initialFetchDone && currentUserId) {
            fetchNotifications();
        }
    }, [fetchNotifications, currentUserId, initialFetchDone]);
    
    // Socket listener setup - separate from data fetching
    useEffect(() => {
        if (!socket || !user?._id) return;
        
        const handleNewNotification = (data) => {
            // Skip notifications not meant for this user
            if (data.userId && data.userId !== user._id.toString()) {
                console.log(`Ignoring notification for user ${data.userId} (current user: ${user._id})`);
                return;
            }
            
            if (data.notification && user) {
                // Only update if the user is loaded
                const updatedUser = {
                    ...user,
                    unseenNotification: [
                        ...(user.unseenNotification || []),
                        data.notification
                    ]
                };
                dispatch(setUser(updatedUser));
                toast.success("New notification received!");
            }
        };
        
        socket.on('receive_notification', handleNewNotification);
        
        return () => {
            socket.off('receive_notification', handleNewNotification);
        };
    }, [socket, user, dispatch]);
    
    // Manual refresh function - this can force a fetch
    const refreshNotifications = () => {
        toast.success("Refreshing notifications...");
        fetchNotifications(true);
    };

    const markAllSeen = async () => {
        if (!currentUserId) return;
        
        try {
            dispatch(showLoading());

            const response = await fetch("http://localhost:4000/api/user/mark-as-all-seen", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ userId: currentUserId })
            });

            const data = await response.json();
            dispatch(hideLoading());

            if (data.success) {
                toast.success(data.message);
                dispatch(setUser(data.user));
                
                // Emit notification seen event
                if (socket && isConnected) {
                    socket.emit('notifications_seen', { userId: currentUserId });
                }
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            dispatch(hideLoading());
            toast.error("Something went wrong");
        }
    };
    
    // Mark a single notification as seen
    const markNotificationAsSeen = async (notificationId) => {
        if (!currentUserId || !notificationId) {
            console.error("Missing required data:", { currentUserId, notificationId });
            return Promise.reject("Missing userId or notificationId");
        }
        
        console.log("Marking notification as seen:", notificationId);
        
        try {
            dispatch(showLoading());

            const response = await fetch("http://localhost:4000/api/user/mark-notification-seen", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ 
                    userId: currentUserId,
                    notificationId: notificationId.toString() // Ensure ID is a string
                })
            });

            const data = await response.json();
            dispatch(hideLoading());

            if (data.success) {
                console.log("Successfully marked notification as seen:", notificationId);
                dispatch(setUser(data.user));
                
                // Emit notification seen event
                if (socket && isConnected) {
                    socket.emit('notification_seen', { 
                        userId: currentUserId,
                        notificationId
                    });
                }
                
                return Promise.resolve(data); // Return resolved promise with data
            } else {
                console.error("Error marking notification as seen:", data.message);
                toast.error(`Failed to mark notification as seen: ${data.message}`);
                return Promise.reject(data.message);
            }
        } catch (error) {
            dispatch(hideLoading());
            console.error("Error marking notification as seen:", error);
            toast.error("Error marking notification as seen. Please try again.");
            return Promise.reject(error);
        }
    };
    
    const DeleteAllSeen = async () => {
        if (!currentUserId) return;
        
        try {
            dispatch(showLoading());

            const response = await fetch("http://localhost:4000/api/user/delete-all-notification", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ userId: currentUserId })
            });

            const data = await response.json();
            dispatch(hideLoading());

            if (data.success) {
                toast.success(data.message);
                dispatch(setUser(data.user));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            dispatch(hideLoading());
            toast.error("Something went wrong");
        }
    };
    
    // Format the notification time
    const formatNotificationTime = (notification) => {
        if (notification && notification.createdAt) {
            try {
                const date = new Date(notification.createdAt);
                
                // Verify the date is valid
                if (isNaN(date.getTime())) {
                    console.warn("Invalid notification date format:", notification.createdAt);
                    return 'Unknown date';
                }
                
                // Check if the notification is from today
                const today = new Date();
                if (date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear()) {
                    
                    const hours = date.getHours();
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const hours12 = hours % 12 || 12; // Convert to 12-hour format
                    
                    return `Today at ${hours12}:${minutes} ${ampm}`;
                }
                
                // Check if the notification is from yesterday
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                if (date.getDate() === yesterday.getDate() && 
                    date.getMonth() === yesterday.getMonth() && 
                    date.getFullYear() === yesterday.getFullYear()) {
                    
                    const hours = date.getHours();
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const hours12 = hours % 12 || 12; // Convert to 12-hour format
                    
                    return `Yesterday at ${hours12}:${minutes} ${ampm}`;
                }
                
                // Format for older dates
                const hours = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const hours12 = hours % 12 || 12; // Convert to 12-hour format
                
                return `${date.toLocaleDateString()} at ${hours12}:${minutes} ${ampm}`;
            } catch (error) {
                console.error("Error formatting notification time:", error);
                return 'Unknown date';
            }
        }
        return 'Unknown date';
    };

    // Get icon based on notification type
    const getNotificationIcon = (type) => {
        switch(type) {
            case 'appointment':
                return <FaCalendarAlt className="notification-icon appointment" />;
            case 'info':
                return <FaInfoCircle className="notification-icon info" />;
            case 'success':
                return <FaCheckCircle className="notification-icon success" />;
            case 'warning':
                return <FaExclamationCircle className="notification-icon warning" />;
            default:
                return <FaBell className="notification-icon default" />;
        }
    };

    // Filter notifications by search text
    const getFilteredNotifications = (notifications) => {
        if (!notifications) return [];
        
        return notifications.filter(notification => {
            // Apply search filter
            const matchesSearch = !searchText || 
                notification.message.toLowerCase().includes(searchText.toLowerCase());
            
            // Apply type filter
            const matchesType = filterType === 'all' || notification.type === filterType;
            
            return matchesSearch && matchesType;
        });
    };

    // Handle clicking on a notification item
    const handleNotificationClick = (notification) => {
        // Skip if no notification or missing ID
        if (!notification || !notification._id) {
            console.error("Invalid notification object or missing ID:", notification);
            return;
        }
        
        console.log("Handling notification click:", {
            id: notification._id,
            type: notification.type,
            message: notification.message
        });
        
        // Store notification details before marking as seen
        const notificationData = typeof notification.data === 'string' 
            ? JSON.parse(notification.data) 
            : notification.data;
        
        const notificationType = notification.type;
        const clickPath = notification.onClickPath;
        const doctorId = notificationData?.doctorId;
        
        // First mark as seen to ensure it's not lost
        markNotificationAsSeen(notification._id.toString())
            .then(() => {
                // Show success toast
                toast.success("Notification marked as read");
                
                // Navigate only after notification is marked as seen
                if (clickPath) {
                    navigate(clickPath);
                } else if (doctorId) {
                    // Navigate based on user role for doctor-related notifications
                    if (user?.isAdmin) {
                        navigate(`/admin/doctor-application/${doctorId}`);
                    } else if (user?.isDoctor || notificationType === 'new-doctor-request-changed') {
                        navigate('/profile');
                    } else {
                        navigate('/doctors');
                    }
                } else if (notificationType === 'appointment') {
                    if (user?.isDoctor) {
                        navigate('/doctor/appointments');
                    } else {
                        navigate('/appointments');
                    }
                } else {
                    console.log("No specific navigation path for this notification");
                }
            })
            .catch(error => {
                console.error("Error handling notification click:", error);
                // Try to navigate even if marking as seen fails
                if (clickPath) navigate(clickPath);
            });
    };

    // If user is not loaded yet, show loading
    if (!user) {
        return (
            <Layout>
                <div className="notification-loading">
                    <Spin size="large" />
                    <p className="mt-4 text-gray-600">Loading notifications...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="notification-container bg-white rounded-xl shadow-md">
                <div className="notification-header">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                            <div className="notification-title-icon">
                                <FaBell />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-800 m-0">
                                Your Notifications
                            </h1>
                        </div>
                        <div className="flex items-center">
                            <div className="connection-status mr-4">
                                <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
                                    <span className="status-dot"></span>
                                    <span className="status-text">
                                        {isConnected ? 'Connected' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                            <Tooltip title="Refresh notifications">
                                <button 
                                    onClick={refreshNotifications} 
                                    className="refresh-button"
                                    disabled={isFetching}
                                >
                                    <FaSync className={isFetching ? "spinning" : ""} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                    
                    <div className="notification-filters">
                        <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-4 mb-4">
                            <div className="search-box">
                                <FaSearch className="search-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Search notifications..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Types</option>
                                    <option value="appointment">Appointments</option>
                                    <option value="info">Information</option>
                                    <option value="success">Success</option>
                                    <option value="warning">Warnings</option>
                                </select>
                                
                                <Tooltip title="Mark all as seen">
                                    <button 
                                        onClick={markAllSeen} 
                                        className="action-button seen-button"
                                        disabled={!user?.unseenNotification?.length}
                                    >
                                        <FaCheckDouble />
                                    </button>
                                </Tooltip>
                                
                                <Tooltip title="Delete all notifications">
                                    <button 
                                        onClick={DeleteAllSeen} 
                                        className="action-button delete-button"
                                        disabled={!(user?.unseenNotification?.length || user?.seenNotification?.length)}
                                    >
                                        <FaTrash />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="notification-content">
                    <Tabs defaultActiveKey="1" className="custom-tabs">
                        <TabPane 
                            tab={
                                <span className="tab-item">
                                    <FaEye className="mr-2" />
                                    Unread
                                    {user?.unseenNotification?.length > 0 && (
                                        <Badge 
                                            count={user.unseenNotification.length} 
                                            className="ml-2 badge-custom"
                                        />
                                    )}
                                </span>
                            } 
                            key="1"
                        >
                            {!user?.unseenNotification || user.unseenNotification.length === 0 ? (
                                <div className="empty-state">
                                    <Empty
                                        image={<img src={bell} alt="Notification Bell" className="empty-bell flex justify-center" />}
                                        description={
                                            <span className="empty-text">
                                                You're all caught up! No new notifications.
                                            </span>
                                        }
                                    />
                                </div>
                            ) : (
                                <div className="notification-list">
                                    {getFilteredNotifications(user.unseenNotification).map((notification, index) => (
                                        <div 
                                            key={index} 
                                            className={`notification-item ${notification.type || 'default'}`}
                                        >
                                            <div className="notification-content-wrapper">
                                                <div className="notification-icon-wrapper">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="notification-details">
                                                    <p className="notification-message">{notification.message}</p>
                                                    <div className="notification-meta">
                                                        <span className="notification-time">
                                                            <FaCalendarAlt className="inline-icon" /> 
                                                            {formatNotificationTime(notification)}
                                                        </span>
                                                        <button 
                                                            className="mark-seen-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevent notification click
                                                                handleNotificationClick(notification);
                                                            }}
                                                        >
                                                            <FaCheck className="inline-icon" /> Mark as read
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabPane>
                        
                        <TabPane 
                            tab={
                                <span className="tab-item">
                                    <FaCheckDouble className="mr-2" />
                                    Read
                                    {user?.seenNotification?.length > 0 && (
                                        <Badge 
                                            count={user.seenNotification.length} 
                                            className="ml-2 badge-custom"
                                            style={{ backgroundColor: '#52c41a' }}
                                        />
                                    )}
                                </span>
                            } 
                            key="2"
                        >
                            {!user?.seenNotification || user.seenNotification.length === 0 ? (
                                <div className="empty-state">
                                    <Empty
                                        image={<FaRegBell size={64} className="text-gray-300" />}
                                        description={
                                            <span className="empty-text">
                                                No read notifications yet.
                                            </span>
                                        }
                                    />
                                </div>
                            ) : (
                                <div className="notification-list">
                                    {getFilteredNotifications(user.seenNotification).map((notification, index) => (
                                        <div 
                                            key={index} 
                                            className={`notification-item seen ${notification.type || 'default'}`}
                                        >
                                            <div className="notification-content-wrapper">
                                                <div className="notification-icon-wrapper">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="notification-details">
                                                    <p className="notification-message">{notification.message}</p>
                                                    <div className="notification-meta">
                                                        <span className="notification-time">
                                                            <FaCalendarAlt className="inline-icon" /> 
                                                            {formatNotificationTime(notification)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabPane>
                    </Tabs>
                </div>
            </div>
        </Layout>
    );
};

export default Notification;
