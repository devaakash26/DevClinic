import React, { useState, useEffect, useRef } from 'react';
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
    
    // Close sidebar when route changes (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    const toggleSidebar = () => {
        setSidebarOpen(prevState => !prevState);
        
        // Control body scroll when sidebar is open/closed
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

    const logout = () => {
        dispatch(showLoading());
        localStorage.clear();
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
            <header className="bg-white shadow-sm navbar-fixed header">
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
                                    <svg className="w-4 h-4 ml-1 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>

                                {/* Dropdown */}
                                {dropdownVisible && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 z-50 text-sm border border-gray-100 animate-fadeIn">
                                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm mr-3">
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
                                                <div>
                                                    <p className="font-semibold text-gray-800">{user?.name}</p>
                                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {user?.isAdmin ? 'Admin' : user?.isDoctor ? 'Doctor' : 'Patient'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Dropdown Items */}
                                        <ul className="py-1">
                                            <li className="hover:bg-gray-50">
                                                <Link to="/profile" className="flex items-center px-4 py-2 text-gray-700 hover:text-blue-600">
                                                    <FaUserCog className="w-4 h-4 mr-3 text-gray-500" />
                                                    Profile Settings
                                                </Link>
                                            </li>
                                            
                                            <li className="hover:bg-gray-50">
                                                <Link to={`/notifications/${user?._id}`} className="flex items-center px-4 py-2 text-gray-700 hover:text-blue-600">
                                                    <div className="flex items-center">
                                                        <FaRegBell className="w-4 h-4 mr-3 text-gray-500" />
                                                        <span>Notifications</span>
                                                    </div>
                                                    {getNotificationCount() > 0 && (
                                                        <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                                                            {getNotificationCount()}
                                                        </span>
                                                    )}
                                                </Link>
                                            </li>
                                            
                                            {!user?.isAdmin && !user?.isDoctor && (
                                                <li className="hover:bg-gray-50">
                                                    <Link to="/appointments" className="flex items-center px-4 py-2 text-gray-700 hover:text-blue-600">
                                                        <svg className="w-4 h-4 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                        </svg>
                                                        My Appointments
                                                    </Link>
                                                </li>
                                            )}
                                            
                                            <li className="hover:bg-gray-50">
                                                <button 
                                                    className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50"
                                                    onClick={logout}
                                                >
                                                    <FaSignOutAlt className="w-4 h-4 mr-3 text-red-500" />
                                                    Logout
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Sidebar overlay - darkens the background when sidebar is open on mobile */}
            <div 
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} 
                onClick={toggleSidebar}
            ></div>

            <div className="flex-1 flex">
                {/* Sidebar - desktop (hidden on mobile) */}
                <aside className="hidden lg:block lg:w-64 flex-shrink-0 sidebar">
                    <Sidebar collapseClass="hidden-mobile" />
                </aside>

                {/* Mobile Sidebar */}
                <aside 
                    ref={sidebarRef}
                    className={`lg:hidden mobile-sidebar ${sidebarOpen ? 'open' : ''} sidebar`}
                >
                    <div className="flex justify-between p-4 lg:hidden border-b border-gray-700">
                        <Link to="/" className="flex items-center">
                            <div className="flex items-center">
                                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-md mr-2">
                                    <span className="text-white font-bold text-sm">DC</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        <span className="text-blue-300">Dev</span>
                                        <span className="text-indigo-300">Clinic</span>
                                    </h3>
                                </div>
                            </div>
                        </Link>
                        <button 
                            onClick={toggleSidebar}
                            className="text-white hover:text-blue-400 focus:outline-none transition-colors duration-200"
                            aria-label="Close menu"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>
                    <Sidebar collapseClass="" />
                </aside>

                {/* Main Content */}
                <div className="flex-1 content-with-sidebar">
                    <main className="p-4 sm:p-6 lg:p-6 w-full transition-all duration-300 mt-2">
                        <div className="content-container rounded-lg shadow bg-white p-4 sm:p-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>

            <style jsx="true">{`
                .pulse-animation {
                    animation: pulse 1s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default Layout;
