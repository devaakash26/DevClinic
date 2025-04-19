import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { hideLoading, showLoading } from '../../redux/loader';
import {
    FaUserMd, FaHome, FaCalendarCheck, FaUserPlus, FaUserCog,
    FaUsers, FaClinicMedical, FaCog, FaIdCard, FaStethoscope,
    FaTachometerAlt, FaNotesMedical, FaBell, FaHeadset
} from 'react-icons/fa';

const Sidebar = ({ collapseClass }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading } = useSelector((state) => state.user);
    const [activeMenu, setActiveMenu] = useState('');

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

    const sidebarClass = `h-full flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 shadow-lg sidebar-fixed sidebar-transition
                          ${collapseClass === 'hidden-mobile' ? 'lg:block hidden' : 'block'} 
                          ${collapseClass === 'hidden-mobile' ? '' : 'z-40'}`;

    return (
        <div className={sidebarClass}>
            {/* Header Section with improved mobile styling */}
            <div className="p-4  border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800">
                <Link to="/" className="block">
                    <div className="flex items-center mb-1">
                        {/* <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-md mr-2 transform transition-all duration-300 hover:scale-105">
                            <span className="text-white font-bold text-lg">DC</span>
                        </div> */}
                        {/* <div>
                            <h3 className="text-lg font-semibold">
                                <span className="text-blue-400">Dev</span>
                                <span className="text-indigo-300">Clinic</span>
                            </h3>
                            <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full opacity-80"></div>
                        </div> */}
                    </div>
                    <p className="text-xs text-center underline text-gray-400 mt-1 ml-1">
                        {user?.isAdmin ? 'Admin Panel' : user?.isDoctor ? 'Doctor Panel' : 'Patient Portal'}
                    </p>
                </Link>
            </div>

            {/* User Info Section - Enhanced for better mobile experience */}
            <div className="px-4 py-3  border-b border-gray-800 text-white backdrop-filter backdrop-blur-sm bg-opacity-70 bg-gray-800">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </div>
                    <div className="ml-3 truncate">
                        <p className="text-sm font-medium text-gray-100">{user?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Menu with improved touch targets for mobile */}
            <div className="flex-1 overflow-y-auto py-4 px-3 mt-3">
                <ul className="space-y-2">
                    {menutoBeRendered.map((menuItem, index) => (
                        <li key={index}>
                            <Link
                                to={menuItem.path}
                                className={`flex items-center justify-between px-4 py-3 text-sm rounded-lg group transition-all duration-200 ${activeMenu === menuItem.path
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-md'
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center">
                                    <span className={`mr-3 flex-shrink-0 transition-all duration-300 ${activeMenu === menuItem.path ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                        }`}>{menuItem.icon}</span>
                                    <span className="font-medium">{menuItem.name}</span>
                                </div>

                                {menuItem.badge > 0 && (
                                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${activeMenu === menuItem.path
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

            <footer className=" absolute bottom-0 left-0 right-0 p-4 text-xs text-center text-gray-500 border-t border-gray-800 bg-gray-900 bg-opacity-50">
               
                © {new Date().getFullYear()} DevClinic
            </footer>


        </div>
    );
};

export default Sidebar;
