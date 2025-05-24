import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { hideLoading, showLoading } from '../redux/loader';
import toast from 'react-hot-toast';
import { FaBars, FaTimes, FaUserCircle, FaBell, FaSignOutAlt, FaUserCog, FaTachometerAlt, FaRegBell } from 'react-icons/fa';
import Sidebar from "./sidebar/Sidebar";
import { Badge } from 'antd';
import { useSocket } from '../context/SocketContext';
import Logo from "/assets/logo.jpg";
import './layout.css';
import {
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const dispatch = useDispatch();
    const location = useLocation();
    const { user, loading } = useSelector((state) => state.user);
    const navigate = useNavigate();
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const dropdownRef = useRef(null);
    const sidebarRef = useRef(null);
    const { socket, isConnected } = useSocket();
    
    // Use global variable for sidebar collapsed state to prevent flash during navigation
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.sidebarCollapsedState || localStorage.getItem('sidebarCollapsed') === 'true';
        }
        return false;
    });

    // Use layout effect to synchronize with global state immediately
    useLayoutEffect(() => {
        const updateFromGlobal = () => {
            if (typeof window !== 'undefined') {
                setIsSidebarCollapsed(window.sidebarCollapsedState || false);
            }
        };
        updateFromGlobal();
    }, []);
    
    // Close mobile sidebar when route changes, but maintain collapsed state
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    const toggleSidebar = () => {
        setSidebarOpen(prevState => !prevState);
        
        // Control body scroll when sidebar is open/closed on mobile
        if (!sidebarOpen) {
            document.body.style.overflow = 'hidden'; // Prevent scrolling when sidebar is open
        } else {
            document.body.style.overflow = ''; // Re-enable scrolling when sidebar is closed
        }
    };
    
    // Close sidebar when clicking outside
    const handleClickOutsideSidebar = (event) => {
        if (sidebarRef.current && 
            !sidebarRef.current.contains(event.target) && 
            sidebarOpen &&
            // Ensure we're not clicking on the menu toggle button which has its own handler
            !event.target.closest('button[aria-label="Open menu"]') &&
            !event.target.closest('button[aria-label="Close menu"]')) {
            setSidebarOpen(false);
            document.body.style.overflow = ''; // Re-enable scrolling
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutsideSidebar);
        return () => {
            document.removeEventListener('mousedown', handleClickOutsideSidebar);
        };
    }, [sidebarOpen]);

    // Listen for real-time notifications
    useEffect(() => {
        if (socket && user?._id) {
            const handleNewNotification = (data) => {
                if (data.notification) {
                    // Add blinking effect to the bell icon when new notification arrives
                    const bellIcon = document.querySelector('.notification-bell-icon');
                    if (bellIcon) {
                        bellIcon.classList.add('bell-blink-animation');
                        setTimeout(() => {
                            bellIcon.classList.remove('bell-blink-animation');
                        }, 3000);
                    }
                }
            };

            socket.on('receive_notification', handleNewNotification);
            
            return () => {
                socket.off('receive_notification', handleNewNotification);
            };
        }
    }, [socket, user?._id]);

    // Custom event to detect sidebar collapse from within the app
    useEffect(() => {
        const handleSidebarCollapse = (e) => {
            setIsSidebarCollapsed(e.detail.isCollapsed);
        };
        
        window.addEventListener('sidebarCollapseChange', handleSidebarCollapse);
        
        return () => {
            window.removeEventListener('sidebarCollapseChange', handleSidebarCollapse);
        };
    }, []);

    const logout = () => {
        dispatch(showLoading());
        localStorage.clear();
        window.sidebarCollapsedState = false; // Reset sidebar state when logging out
        toast.success("Logout Successfully");
        navigate("/");
        dispatch(hideLoading());
    };

    const toggleDropdown = () => {
        setDropdownVisible(!dropdownVisible);
    };

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setDropdownVisible(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Get notification count
    const getNotificationCount = () => {
        if (user?.unseenNotification && Array.isArray(user.unseenNotification)) {
            return user.unseenNotification.length;
        }
        return 0;
    };

    // Get user profile picture
    const getUserProfilePic = () => {
        if (user?.profilePicture) {
            return user.profilePicture;
        } else if (user?.googleId) {
            return `https://lh3.googleusercontent.com/a-/${user.googleId}`;
        }
        return "/assets/profile.png";
    };

    // Handle loading timeouts
    useEffect(() => {
        let timeoutId;
        if (loading) {
            timeoutId = setTimeout(() => {
                dispatch(hideLoading());
            }, 3000);
        }
        return () => clearTimeout(timeoutId);
    }, [loading, dispatch]);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Loading Spinner */}
            {loading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {/* Header */}
            <header className={`bg-white shadow-sm navbar-fixed header transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20 lg:w-[calc(100%-5rem)]' : 'lg:ml-64 lg:w-[calc(100%-16rem)]'}`}>
                <div className="px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center justify-between">
                        {/* Left: Logo and menu button */}
                        <div className="flex items-center">
                            <button
                                type="button"
                                className="text-gray-600 hover:text-blue-600 focus:outline-none p-2 mr-2 lg:hidden z-50 relative"
                                onClick={toggleSidebar}
                                aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                            >
                                {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                            </button>
                            
                            {/* Desktop Logo */}
                            <Link to="/" className="hidden lg:flex items-center">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-md mr-2 transform transition-all duration-300 hover:scale-105">
                                        <span className="text-white font-bold text-sm">DC</span>
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold flex items-center">
                                            <span className="text-blue-600">Dev</span>
                                            <span className="text-indigo-700">Clinic</span>
                                            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">
                                                {user?.isAdmin ? 'Admin' : user?.isDoctor ? 'Doctor' : 'Patient'}
                                            </span>
                                        </h1>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Right: Notifications and User menu */}
                        <div className="flex items-center space-x-4">
                            {/* Notifications */}
                            <div className="relative">
                                <Link 
                                    to={`/notifications/${user?._id}`}
                                    className="relative flex items-center p-2 text-gray-600 hover:text-blue-600 transition-colors"
                                >
                                    <FaBell size={20} className="notification-bell-icon" />
                                    {getNotificationCount() > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                            {getNotificationCount() > 9 ? '9+' : getNotificationCount()}
                                        </span>
                                    )}
                                </Link>
                            </div>

                            {/* User Menu */}
                            <div className="relative" ref={dropdownRef}>
                                <button 
                                    className="flex items-center focus:outline-none group"
                                    onClick={toggleDropdown}
                                >
                                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 transition-all duration-200 group-hover:border-blue-400 shadow-sm">
                                        <img 
                                            src={getUserProfilePic()} 
                                            alt="Profile" 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null; 
                                                e.target.src = "/assets/profile.png";
                                            }}
                                        />
                                    </div>
                                    <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline-block group-hover:text-blue-600">
                                        {user?.name?.split(' ')[0]}
                                    </span>
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownVisible && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50">
                                        <Link 
                                            to="/profile" 
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            onClick={() => setDropdownVisible(false)}
                                        >
                                            <div className="flex items-center">
                                                <FaUserCog className="mr-2" /> Profile Settings
                                            </div>
                                        </Link>
                                        
                                        <button 
                                            onClick={logout}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <div className="flex items-center text-red-500">
                                                <FaSignOutAlt className="mr-2" /> Sign out
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content area with sidebar */}
            <div className="flex flex-1 relative">
                {/* Sidebar - placed in a div for handling click outside */}
                <div ref={sidebarRef} className="sidebar-wrapper">
                    <Sidebar collapseClass={sidebarOpen ? '' : 'hidden-mobile'} />
                </div>

                {/* Mobile overlay to capture clicks outside sidebar when open */}
                {sidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-gray-900 bg-opacity-50 z-30 lg:hidden"
                        onClick={toggleSidebar}
                        aria-hidden="true"
                    ></div>
                )}

                {/* Main Content - adjusted for sidebar width with transitions */}
                <main className={`flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 min-h-[calc(100vh-120px)]">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
