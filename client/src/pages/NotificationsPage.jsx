import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Tabs, Badge, Spin, Empty, Button, Input, 
  Dropdown, Menu, Tooltip, Switch, Select, DatePicker 
} from 'antd';
import { 
  FaBell, FaCheck, FaTrash, FaSync, FaFilter, 
  FaSortAmountDown, FaSortAmountUp, FaSearch, 
  FaCheckDouble, FaEllipsisH, FaCalendarAlt 
} from 'react-icons/fa';
import { showLoading, hideLoading } from '../redux/loader';
import { setUser } from '../redux/userInfo';
import Layout from '../components/Layout';
import { useSocket } from '../context/SocketContext';
import '../Notifications/noti.css';
import bell from "/assets/bell.png";

const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

const NotificationsPage = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  
  // State for notifications management
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('unseen');
  const [filterType, setFilterType] = useState('all');
  const [sortDirection, setSortDirection] = useState('desc');
  const [dateRange, setDateRange] = useState(null);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Derived states for notifications
  const unseenNotifications = user?.unseenNotification || [];
  const seenNotifications = user?.seenNotification || [];
  
  // Apply filters and sorting
  const getFilteredNotifications = useCallback(() => {
    let notifications = selectedTab === 'unseen' 
      ? [...unseenNotifications] 
      : [...seenNotifications];
      
    // Apply search filter
    if (searchQuery) {
      notifications = notifications.filter(notification => 
        notification.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      notifications = notifications.filter(notification => 
        notification.type === filterType
      );
    }
    
    // Apply date filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day').valueOf();
      const endDate = dateRange[1].endOf('day').valueOf();
      
      notifications = notifications.filter(notification => {
        const notifDate = new Date(notification.createdAt).getTime();
        return notifDate >= startDate && notifDate <= endDate;
      });
    }
    
    // Apply sorting
    notifications.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return notifications;
  }, [unseenNotifications, seenNotifications, selectedTab, searchQuery, filterType, dateRange, sortDirection]);
  
  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  // Socket listeners
  useEffect(() => {
    if (!socket || !user?._id) return;
    
    const handleNewNotification = (data) => {
      // Skip notifications not meant for this user
      if (data.userId && data.userId !== user._id.toString()) {
        console.log(`Ignoring notification for user ${data.userId} (current user: ${user._id})`);
        return;
      }
      
      if (data.notification && user) {
        // Update user state with new notification
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
  
  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?._id) return;
    
    try {
      setIsLoading(true);
      dispatch(showLoading());
      
      const response = await axios.get(`http://localhost:4000/api/user/notifications/${user._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.data.success) {
        // Update user with fetched notifications
        const updatedUser = {
          ...user,
          unseenNotification: response.data.data,
          seenNotification: response.data.seenNotifications
        };
        dispatch(setUser(updatedUser));
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
      dispatch(hideLoading());
    }
  };
  
  // Mark all as seen
  const markAllAsSeen = async () => {
    if (!user?._id) return;
    
    try {
      setIsLoading(true);
      dispatch(showLoading());
      
      const response = await axios.post(
        "http://localhost:4000/api/user/mark-as-all-seen",
        { userId: user._id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      
      if (response.data.success) {
        dispatch(setUser(response.data.user));
        toast.success("All notifications marked as seen");
        
        if (socket && isConnected) {
          socket.emit('notifications_seen', { userId: user._id });
        }
      }
    } catch (error) {
      console.error("Error marking notifications as seen:", error);
      toast.error("Failed to mark notifications as seen");
    } finally {
      setIsLoading(false);
      dispatch(hideLoading());
      setSelectedNotifications([]);
    }
  };
  
  // Delete all notifications
  const deleteAllNotifications = async () => {
    if (!user?._id) return;
    
    try {
      setIsLoading(true);
      dispatch(showLoading());
      
      const response = await axios.post(
        "http://localhost:4000/api/user/delete-all-notification",
        { userId: user._id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      
      if (response.data.success) {
        dispatch(setUser(response.data.user));
        toast.success("All notifications deleted");
      }
    } catch (error) {
      console.error("Error deleting notifications:", error);
      toast.error("Failed to delete notifications");
    } finally {
      setIsLoading(false);
      dispatch(hideLoading());
      setSelectedNotifications([]);
    }
  };
  
  // Mark notification as seen
  const markNotificationSeen = async (notificationId) => {
    if (!user?._id || !notificationId) {
      toast.error("Unable to identify notification");
      return;
    }
    
    try {
      setIsLoading(true);
      dispatch(showLoading());
      
      console.log("Marking notification as seen:", notificationId);
      
      const response = await axios.post(
        "http://localhost:4000/api/user/mark-notification-seen",
        { 
          userId: user._id,
          notificationId: notificationId.toString() // Ensure ID is a string
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      
      if (response.data.success) {
        // Update the user state with the updated notification lists
        dispatch(setUser(response.data.user));
        toast.success("Notification marked as seen");
        
        // Emit notification seen event if socket is connected
        if (socket && isConnected) {
          socket.emit('notification_seen', { 
            userId: user._id,
            notificationId
          });
        }
      } else {
        console.error("Failed to mark notification as seen:", response.data.message);
        toast.error(response.data.message || "Failed to mark notification as seen");
      }
    } catch (error) {
      console.error("Error marking notification as seen:", error);
      toast.error("Error marking notification as seen");
    } finally {
      setIsLoading(false);
      dispatch(hideLoading());
    }
  };
  
  // Delete specific notification
  const deleteNotification = async (notificationId) => {
    if (!user?._id || !notificationId) return;
    
    try {
      setIsLoading(true);
      
      const response = await axios.post(
        "http://localhost:4000/api/user/delete-notification",
        { 
          userId: user._id,
          notificationId
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      
      if (response.data.success) {
        dispatch(setUser(response.data.user));
        toast.success("Notification deleted");
        
        if (socket && isConnected) {
          socket.emit('notification_deleted', { 
            userId: user._id,
            notificationId
          });
        }
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Parse data if it's a string (sometimes data comes as JSON string)
    let notificationData = notification.data;
    if (typeof notification.data === 'string') {
      try {
        notificationData = JSON.parse(notification.data);
      } catch (error) {
        console.error("Error parsing notification data:", error);
      }
    }
    
    // Store notification details before marking as seen
    const notificationType = notification.type;
    const clickPath = notification.onClickPath;
    const doctorId = notificationData?.doctorId;
    const status = notificationData?.status;
    
    // Mark notification as seen first to prevent it from disappearing
    if (notification._id) {
      markNotificationSeen(notification._id);
    }
    
    // Now navigate based on saved notification data
    if (clickPath) {
      navigate(clickPath);
    } else if (doctorId) {
      // Navigate based on user role
      if (user?.isAdmin) {
        // Admin users view the doctor application review page
        console.log("Navigating to doctor application:", doctorId);
        navigate(`/admin/doctor-application/${doctorId}`);
      } else if (user?.isDoctor || notificationType === 'new-doctor-request-changed') {
        // Doctor users or users with changed doctor status view their profile
        navigate('/profile');
      } else {
        // For normal users, navigate to doctors page
        navigate('/doctors');
      }
    } else if (notificationType === 'doctor') {
      // For general doctor notifications without specific data
      if (user?.isAdmin) {
        navigate('/admin/doctor-list');
      } else if (user?.isDoctor) {
        navigate('/profile');
      } else {
        // For normal users, navigate to the doctors page
        navigate('/doctors');
      }
    } else if (notificationType === 'appointment') {
      // For appointment notifications
      if (user?.isAdmin) {
        navigate('/admin/appointments');
      } else if (user?.isDoctor) {
        navigate('/doctor/appointments');
      } else {
        navigate('/appointments');
      }
    } else {
      // Default: stay on notifications page
      console.log("No specific navigation path for this notification");
    }
  };
  
  // Format notification time
  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return 'Recent';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      // Within a week
      return `${diffDays} days ago`;
    } else {
      // More than a week
      return date.toLocaleDateString([], { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };
  
  // Get notification type display name
  const getNotificationTypeDisplay = (type) => {
    const typeMap = {
      'appointment': 'Appointment',
      'admin': 'Admin',
      'doctor': 'Doctor',
      'system': 'System',
      'account': 'Account'
    };
    
    return typeMap[type] || 'General';
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <FaCalendarAlt className="notification-icon appointment" />;
      case 'admin':
        return <FaCheckDouble className="notification-icon admin" />;
      case 'doctor':
        return <FaCheck className="notification-icon doctor" />;
      case 'system':
        return <FaSync className="notification-icon system" />;
      default:
        return <FaBell className="notification-icon" />;
    }
  };
  
  // Toggle notification selection
  const toggleNotificationSelection = (notification) => {
    const notificationId = notification._id;
    
    if (selectedNotifications.includes(notificationId)) {
      setSelectedNotifications(selectedNotifications.filter(id => id !== notificationId));
    } else {
      setSelectedNotifications([...selectedNotifications, notificationId]);
    }
  };
  
  // Handle bulk actions on selected notifications
  const handleBulkAction = async (action) => {
    if (selectedNotifications.length === 0) {
      toast.error("No notifications selected");
      return;
    }
    
    // Implement bulk actions here
    switch (action) {
      case 'mark-seen':
        // Bulk mark as seen
        toast.success(`Marked ${selectedNotifications.length} notifications as seen`);
        setSelectedNotifications([]);
        break;
      case 'delete':
        // Implement bulk delete functionality
        for (const notificationId of selectedNotifications) {
          await axios.post(
            "http://localhost:4000/api/user/delete-notification",
            { 
              userId: user._id,
              notificationId
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
              }
            }
          );
        }
        
        // Refresh user data to update notification lists
        const deleteResponse = await axios.post(
          "http://localhost:4000/api/user/get-user-info-by-id",
          { userId: user._id },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );
        
        if (deleteResponse.data.success) {
          dispatch(setUser(deleteResponse.data.data));
          toast.success(`Deleted ${selectedNotifications.length} notifications`);
          
          // Emit socket event if connected
          if (socket && isConnected) {
            socket.emit('notifications_deleted_bulk', { 
              userId: user._id,
              notificationIds: selectedNotifications
            });
          }
        }
        break;
      default:
        break;
    }
  };
  
  const filteredNotifications = getFilteredNotifications();
  
  return (
    <Layout>
      <div className="notification-container bg-white rounded-lg shadow-md p-4">
        <div className="notification-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center">
            <h1 className="m-0 text-primary d-flex align-items-center">
              <FaBell className="me-2" /> 
              Notifications
              {unseenNotifications.length > 0 && (
                <Badge 
                  count={unseenNotifications.length} 
                  style={{ backgroundColor: '#ff4d4f', marginLeft: '8px' }}
                />
              )}
            </h1>
          </div>
          
          <div className="d-flex align-items-center">
            <div className="notification-status me-3">
              <span className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></span>
              {isConnected ? 'Real-time active' : 'Offline mode'}
              {!isConnected && (
                <Tooltip title="Try to reconnect">
                  <Button 
                    size="small"
                    type="primary"
                    ghost
                    className="ms-2"
                    onClick={() => socket?.connect()}
                    icon={<FaSync />}
                  />
                </Tooltip>
              )}
            </div>
            <Tooltip title="Refresh notifications">
              <Button 
                type="primary"
                shape="circle"
                icon={<FaSync className={isLoading ? "rotate-animation" : ""} />}
                onClick={fetchNotifications}
                loading={isLoading}
              />
            </Tooltip>
          </div>
        </div>
        
        {/* Search and filter bar */}
        <div className="notification-filters mb-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <div className="d-flex align-items-center flex-grow-1">
              <Input
                placeholder="Search notifications..."
                prefix={<FaSearch className="text-muted" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="me-2"
                allowClear
              />
              
              <Tooltip title={sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}>
                <Button
                  type="default"
                  icon={sortDirection === 'desc' ? <FaSortAmountDown /> : <FaSortAmountUp />}
                  onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                />
              </Tooltip>
              
              <Tooltip title="Toggle advanced filters">
                <Button
                  type={showAdvancedFilters ? "primary" : "default"}
                  icon={<FaFilter />}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="ms-2"
                />
              </Tooltip>
            </div>
            
            <div className="d-flex">
              {selectedTab === 'unseen' && unseenNotifications.length > 0 && (
                <Button
                  type="primary"
                  onClick={markAllAsSeen}
                  icon={<FaCheckDouble />}
                  className="me-2"
                >
                  Mark all as seen
                </Button>
              )}
              
              {((selectedTab === 'unseen' && unseenNotifications.length > 0) || 
                (selectedTab === 'seen' && seenNotifications.length > 0)) && (
                <Button
                  type="primary"
                  danger
                  onClick={deleteAllNotifications}
                  icon={<FaTrash />}
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
          
          {/* Advanced filters */}
          {showAdvancedFilters && (
            <div className="advanced-filters p-3 mb-3 bg-light rounded border">
              <div className="d-flex flex-wrap gap-3 align-items-center">
                <div>
                  <label className="me-2 text-muted">Type:</label>
                  <Select
                    style={{ width: 140 }}
                    value={filterType}
                    onChange={setFilterType}
                  >
                    <Option value="all">All types</Option>
                    <Option value="appointment">Appointment</Option>
                    <Option value="admin">Admin</Option>
                    <Option value="doctor">Doctor</Option>
                    <Option value="system">System</Option>
                    <Option value="account">Account</Option>
                  </Select>
                </div>
                
                <div>
                  <label className="me-2 text-muted">Date range:</label>
                  <RangePicker
                    onChange={setDateRange}
                    allowClear
                  />
                </div>
                
                <Button
                  type="default"
                  size="small"
                  onClick={() => {
                    setFilterType('all');
                    setDateRange(null);
                    setSearchQuery('');
                  }}
                >
                  Reset filters
                </Button>
              </div>
            </div>
          )}
          
          {/* Selected notifications actions */}
          {selectedNotifications.length > 0 && (
            <div className="selected-actions p-2 mb-3 bg-light rounded border">
              <div className="d-flex align-items-center justify-content-between">
                <span>{selectedNotifications.length} notifications selected</span>
                <div>
                  <Button
                    type="default"
                    size="small"
                    onClick={() => handleBulkAction('mark-seen')}
                    className="me-2"
                  >
                    Mark as seen
                  </Button>
                  <Button
                    type="default"
                    danger
                    size="small"
                    onClick={() => handleBulkAction('delete')}
                  >
                    Delete
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setSelectedNotifications([])}
                  >
                    Clear selection
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Notifications content */}
        <Tabs 
          defaultActiveKey="unseen" 
          className="notification-tabs"
          onChange={setSelectedTab}
        >
          <TabPane 
            tab={
              <span>
                Unseen
                {unseenNotifications.length > 0 && (
                  <Badge count={unseenNotifications.length} style={{ marginLeft: '8px' }} />
                )}
              </span>
            } 
            key="unseen"
          >
            {isLoading ? (
              <div className="text-center py-5">
                <Spin size="large" />
              </div>
            ) : unseenNotifications.length === 0 || filteredNotifications.length === 0 ? (
              <div className="empty-notifications">
                <Empty 
                  image={bell} 
                  imageStyle={{ height: 100, display: 'block', margin: '0 auto' }}
                  description={
                    <span className="text-muted">
                      {searchQuery ? "No matching notifications found" : "No new notifications"}
                    </span>
                  }
                />
              </div>
            ) : (
              <div className="notification-list">
                {filteredNotifications.map((notification, index) => (
                  <div 
                    key={notification._id || index}
                    className={`notification-item ${selectedNotifications.includes(notification._id) ? 'selected' : ''}`}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div 
                        className="notification-content-wrapper d-flex align-items-start"
                        onClick={() => handleNotificationClick(notification)}
                        style={{ cursor: 'pointer', flexGrow: 1 }}
                      >
                        <div className="notification-icon-wrapper me-3 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div>
                          <div className="notification-message">{notification.message}</div>
                          <div className="d-flex align-items-center mt-1">
                            <span className="notification-time text-muted">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                            {notification.type && (
                              <span className="notification-type badge bg-light text-dark ms-2">
                                {getNotificationTypeDisplay(notification.type)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="notification-actions d-flex align-items-center">
                        <Checkbox
                          checked={selectedNotifications.includes(notification._id)}
                          onChange={() => toggleNotificationSelection(notification)}
                          onClick={(e) => e.stopPropagation()}
                          className="me-2"
                        />
                        <Dropdown
                          overlay={
                            <Menu>
                              <Menu.Item 
                                key="mark"
                                icon={<FaCheck />}
                                onClick={(e) => {
                                  e.stopPropagation(); // Stop propagation to prevent parent click
                                  markNotificationSeen(notification._id);
                                }}
                              >
                                Mark as seen
                              </Menu.Item>
                              <Menu.Item 
                                key="delete" 
                                icon={<FaTrash />}
                                danger
                                onClick={(e) => {
                                  e.stopPropagation(); // Stop propagation to prevent parent click
                                  deleteNotification(notification._id);
                                }}
                              >
                                Delete
                              </Menu.Item>
                            </Menu>
                          }
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            icon={<FaEllipsisH />}
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                Seen
                {seenNotifications.length > 0 && (
                  <Badge count={seenNotifications.length} style={{ marginLeft: '8px', backgroundColor: '#52c41a' }} />
                )}
              </span>
            } 
            key="seen"
          >
            {isLoading ? (
              <div className="text-center py-5">
                <Spin size="large" />
              </div>
            ) : seenNotifications.length === 0 || filteredNotifications.length === 0 ? (
              <div className="empty-notifications">
                <Empty 
                  image={bell}
                  imageStyle={{ height: 100, display: 'block', margin: '0 auto' }}
                  description={
                    <span className="text-muted">
                      {searchQuery ? "No matching notifications found" : "No seen notifications"}
                    </span>
                  }
                />
              </div>
            ) : (
              <div className="notification-list">
                {filteredNotifications.map((notification, index) => (
                  <div 
                    key={notification._id || index}
                    className={`notification-item seen ${selectedNotifications.includes(notification._id) ? 'selected' : ''}`}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div 
                        className="notification-content-wrapper d-flex align-items-start"
                        onClick={() => handleNotificationClick(notification)}
                        style={{ cursor: 'pointer', flexGrow: 1 }}
                      >
                        <div className="notification-icon-wrapper me-3 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div>
                          <div className="notification-message">{notification.message}</div>
                          <div className="d-flex align-items-center mt-1">
                            <span className="notification-time text-muted">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                            {notification.type && (
                              <span className="notification-type badge bg-light text-dark ms-2">
                                {getNotificationTypeDisplay(notification.type)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="notification-actions d-flex align-items-center">
                        <Checkbox
                          checked={selectedNotifications.includes(notification._id)}
                          onChange={() => toggleNotificationSelection(notification)}
                          onClick={(e) => e.stopPropagation()}
                          className="me-2"
                        />
                        <Dropdown
                          overlay={
                            <Menu>
                              <Menu.Item 
                                key="delete" 
                                icon={<FaTrash />}
                                danger
                                onClick={(e) => {
                                  e.stopPropagation(); // Stop propagation to prevent parent click
                                  deleteNotification(notification._id);
                                }}
                              >
                                Delete
                              </Menu.Item>
                            </Menu>
                          }
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            icon={<FaEllipsisH />}
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabPane>
        </Tabs>
      </div>
    </Layout>
  );
};

export default NotificationsPage; 