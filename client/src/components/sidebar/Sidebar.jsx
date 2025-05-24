import React, { useEffect, useState, useLayoutEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { hideLoading, showLoading } from '../../redux/loader';
import {
    FaUserMd, FaHome, FaCalendarCheck, FaUserPlus, FaUserCog,
    FaUsers, FaClinicMedical, FaCog, FaIdCard, FaStethoscope,
    FaTachometerAlt, FaNotesMedical, FaBell, FaHeadset, FaVideo,
    FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

// Global variable to track collapsed state across rerenders and navigation
if (typeof window !== 'undefined') {
    window.sidebarCollapsedState = window.sidebarCollapsedState || localStorage.getItem('sidebarCollapsed') === 'true';
}

const Sidebar = ({ collapseClass }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading } = useSelector((state) => state.user);
    const [activeMenu, setActiveMenu] = useState('');
    
    // Get collapsed state from global state instead of local state
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.sidebarCollapsedState || false;
        }
        return false;
    });

    // Use layoutEffect to prevent flash of uncollapsed content
    useLayoutEffect(() => {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState !== null) {
            const newState = savedState === 'true';
            setIsCollapsed(newState);
            window.sidebarCollapsedState = newState;
        }
    }, []);

    useEffect(() => {
        // Set active menu based on current path
        setActiveMenu(location.pathname);
    }, [location]);

    useEffect(() => {
        let timeoutId;
        if (loading) {
            timeoutId = setTimeout(() => {
                dispatch(hideLoading());
            }, 3000);
        }
        return () => clearTimeout(timeoutId);
    }, [loading, dispatch]);

    // Get notification count safely
    const getNotificationCount = () => {
        if (user?.unseenNotification && Array.isArray(user.unseenNotification)) {
            return user.unseenNotification.length;
        }
        return 0;
    };

    const menu = [
        {
            name: "Dashboard",
            path: "/",
            icon: <FaHome className="w-5 h-5" />
        },
        {
            name: "Find Doctors",
            path: "/doctors",
            icon: <FaUserMd className="w-5 h-5" />
        },
        {
            name: "Appointments",
            path: "/appointments",
            icon: <FaCalendarCheck className="w-5 h-5" />
        },
        {
            name: "Video Consultations",
            path: "/video-consultations",
            icon: <FaVideo className="w-5 h-5" />
        },
        {
            name: "Medical Records",
            path: "/medical-records",
            icon: <FaNotesMedical className="w-5 h-5" />
        },
        {
            name: "Apply as Doctor",
            path: "/apply-doctor",
            icon: <FaUserPlus className="w-5 h-5" />
        },
        {
            name: "Profile",
            path: "/profile",
            icon: <FaUserCog className="w-5 h-5" />
        },
        {
            name: "Contact Support",
            path: "/contact",
            icon: <FaHeadset className="w-5 h-5" />
        }
    ];

    const Adminmenu = [
        {
            name: "Dashboard",
            path: "/",
            icon: <FaTachometerAlt className="w-5 h-5" />
        },
        {
            name: "Users",
            path: "/admin/user-list",
            icon: <FaUsers className="w-5 h-5" />
        },
        {
            name: "Doctor Applications",
            path: "/admin/doctor-list",
            icon: <FaStethoscope className="w-5 h-5" />
        },
        {
            name: "Appointments",
            path: "/admin/appointments",
            icon: <FaCalendarCheck className="w-5 h-5" />
        },
        {
            name: "Patient Records",
            path: "/admin/patient-records",
            icon: <FaIdCard className="w-5 h-5" />
        },
        {
            name: "Medical Records",
            path: "/admin/medical-records",
            icon: <FaNotesMedical className="w-5 h-5" />
        },
        {
            name: "Video Consultations",
            path: "/admin/video-consultations",
            icon: <FaVideo className="w-5 h-5" />
        },
        {
            name: "Settings",
            path: "/profile",
            icon: <FaCog className="w-5 h-5" />
        },
        {
            name: "Support Center",
            path: "/contact",
            icon: <FaHeadset className="w-5 h-5" />
        }
    ];

    const DoctorMenu = [
        {
            name: "Dashboard",
            path: "/",
            icon: <FaTachometerAlt className="w-5 h-5" />
        },
        {
            name: "Appointments",
            path: "/doctor/appointments",
            icon: <FaCalendarCheck className="w-5 h-5" />
        },
        {
            name: "Video Consultations",
            path: "/doctor/video-consultations",
            icon: <FaVideo className="w-5 h-5" />
        },
        {
            name: "Patients",
            path: `/doctor/patient/${user?._id}`,
            icon: <FaIdCard className="w-5 h-5" />
        },
        {
            name: "Medical Records",
            path: `/doctor/medical-records`,
            icon: <FaNotesMedical className="w-5 h-5" />
        },
        {
            name: "Profile",
            path: `/doctor/doctor-profile/${user?._id}`,
            icon: <FaUserCog className="w-5 h-5" />
        },
        {
            name: "Contact Support",
            path: "/contact",
            icon: <FaHeadset className="w-5 h-5" />
        }
    ];

    const menutoBeRendered = user?.isAdmin
        ? Adminmenu
        : user?.isDoctor
            ? DoctorMenu
            : menu;

    const toggleSidebar = () => {
        const newCollapsedState = !isCollapsed;
        
        // Update global state first
        window.sidebarCollapsedState = newCollapsedState;
        
        // Then update local state and localStorage
        setIsCollapsed(newCollapsedState);
        localStorage.setItem('sidebarCollapsed', newCollapsedState);
        
        // Dispatch custom event to notify layout component
        window.dispatchEvent(
            new CustomEvent('sidebarCollapseChange', {
                detail: { isCollapsed: newCollapsedState }
            })
        );
    };

    const sidebarClass = `h-full flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 shadow-lg sidebar-fixed 
                         ${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 ease-in-out
                         ${collapseClass === 'hidden-mobile' ? 'lg:flex hidden' : 'flex'} 
                         ${collapseClass === 'hidden-mobile' ? '' : 'z-40'}`;

    return (
        <div className={sidebarClass}>
            {/* Collapse Toggle Button */}
            <button 
                onClick={toggleSidebar}
                className="absolute -right-3 top-20 bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-full shadow-lg 
                           z-10 border-2 border-gray-800 transform transition-all duration-300 
                           hover:scale-110 focus:outline-none"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? 
                    <FaChevronRight className="w-4 h-4" /> : 
                    <FaChevronLeft className="w-4 h-4" />
                }
            </button>

            {/* Header Section with improved mobile styling */}
            <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800 flex justify-center items-center">
                <Link to="/" className="block">
                    <div className="flex items-center mb-1 justify-center">
                        {/* <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-md transform transition-all duration-300 hover:scale-105">
                            <span className="text-white font-bold text-lg">DC</span>
                        </div>
                        {!isCollapsed && (
                            <div className="ml-2">
                                <h3 className="text-lg font-semibold">
                                    <span className="text-blue-400">Dev</span>
                                    <span className="text-indigo-300">Clinic</span>
                                </h3>
                            </div>
                        )} */}
                    </div>
                    {!isCollapsed ? (
                        <p className="text-xs text-center text-gray-400 mt-1">
                            {user?.isAdmin ? 'Admin Panel' : user?.isDoctor ? 'Doctor Panel' : 'Patient Portal'}
                        </p>
                    ) : (
                        <p className="text-xs text-center text-gray-400 mt-1">
                            {user?.isAdmin ? 'Admin' : user?.isDoctor ? 'Doctor' : 'Patient'}
                        </p>
                    )}
                </Link>
            </div>

            {/* User Info Section - Enhanced for better mobile experience */}
            <div className={`px-4 py-3 border-b border-gray-800 text-white backdrop-filter backdrop-blur-sm bg-opacity-70 bg-gray-800 ${isCollapsed ? 'flex justify-center' : ''}`}>
                <div className={`flex ${isCollapsed ? 'justify-center' : 'items-center'}`}>
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </div>
                    {!isCollapsed && (
                        <div className="ml-3 truncate">
                            <p className="text-sm font-medium text-gray-100">{user?.name}</p>
                            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Menu with improved touch targets for mobile */}
            <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
                <ul className="space-y-2">
                    {menutoBeRendered.map((menuItem, index) => (
                        <li key={index}>
                            <Link
                                to={menuItem.path}
                                className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 text-sm rounded-lg group transition-all duration-200 
                                           ${activeMenu === menuItem.path
                                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-md'
                                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                           }`}
                                title={isCollapsed ? menuItem.name : ''}
                            >
                                <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                                    <span className={`${isCollapsed ? 'mr-0' : 'mr-3'} flex-shrink-0 transition-all duration-300 
                                                     ${activeMenu === menuItem.path ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                        {menuItem.icon}
                                    </span>
                                    {!isCollapsed && <span className="font-medium">{menuItem.name}</span>}
                                </div>

                                {!isCollapsed && menuItem.badge > 0 && (
                                    <span className={`px-2 py-1 text-xs rounded-full font-semibold 
                                                     ${activeMenu === menuItem.path
                                                        ? 'bg-white bg-opacity-20 text-white'
                                                        : 'bg-blue-500 text-white'
                                                     }`}>
                                        {menuItem.badge}
                                    </span>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            <footer className={`p-4 text-xs ${isCollapsed ? 'text-center' : 'text-center'} text-gray-500 border-t border-gray-800 bg-gray-900 bg-opacity-50`}>
                {isCollapsed ? '©' : '© DevClinic 2023'}
            </footer>
        </div>
    );
};

export default Sidebar;
