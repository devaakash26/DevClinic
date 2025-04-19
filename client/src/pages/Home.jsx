import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import DoctorCard from '../components/DoctorCard';
import { 
  FaCalendarCheck, FaUserMd, FaHospital, FaPhone, FaSearch, 
  FaArrowRight, FaChevronRight, FaStethoscope, FaHeartbeat,
  FaMedkit, FaRegClock, FaIdCard, FaVideo, FaCommentDots, FaTimes,
  FaChartLine, FaShieldAlt, FaClipboardCheck, FaTachometerAlt,
  FaBriefcaseMedical, FaMapMarkerAlt, FaUserInjured, FaRegCalendarAlt,
  FaUserPlus
} from 'react-icons/fa';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import moment from 'moment';

const Home = () => {
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pendingDoctorApplications, setPendingDoctorApplications] = useState(0);
  const [healthMetrics, setHealthMetrics] = useState({
    weeklyActivity: [65, 72, 68, 82, 75, 78, 90],
    medicationAdherence: 92,
    appointmentsAttended: 100,
    // Doctor metrics
    patientSatisfaction: 98,
    appointmentsCompleted: 85,
    totalPatients: 0 // Will be updated in useEffect
  });
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);

  // Update doctor metrics after user is loaded
  useEffect(() => {
    if (user?.isDoctor) {
      setHealthMetrics(prev => ({
        ...prev,
        totalPatients: 124
      }));
    }
    
    // Fetch pending doctor applications count if user is admin
    if (user?.isAdmin) {
      fetchPendingDoctorApplications();
    }
  }, [user]);
  
  // Fetch pending doctor applications for admin
  const fetchPendingDoctorApplications = async () => {
    try {
      const response = await axios.get("http://localhost:4000/api/admin/get-all-doctors", {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      });
      
      if (response.data.success) {
        const pendingCount = response.data.data.filter(doc => doc.status === 'pending').length;
        setPendingDoctorApplications(pendingCount);
      }
    } catch (error) {
      console.error("Error fetching pending doctor applications:", error);
    }
  };

  // Get user appointments
  const getAppointments = async () => {
    if (user?._id) {
      try {
        console.log("Fetching appointments for user:", user._id, "isDoctor:", user?.isDoctor);
        
        // Helper to try the fallback endpoint
        const tryFallbackEndpoint = async () => {
          try {
            console.log("Trying fallback endpoint");
            
            // Different fallback endpoints for doctor vs patient
            let fallbackEndpoint = `http://localhost:4000/api/user/appointments/${user._id}`;
            
            if (user?.isDoctor) {
              fallbackEndpoint = `http://localhost:4000/api/doctor/get-doctor-appointments/${user._id}`;
              console.log("Using doctor fallback endpoint");
            }
            
            const fallbackResponse = await axios.get(fallbackEndpoint, {
              headers: {
                Authorization: 'Bearer ' + localStorage.getItem('token'),
              },
            });
            
            console.log("Fallback API Response:", fallbackResponse.data);
            
            if (fallbackResponse.data.success) {
              let allAppointments = [];
              
              if (user?.isDoctor) {
                // Extract appointments from doctor response
                if (fallbackResponse.data.data && fallbackResponse.data.data.patients) {
                  allAppointments = fallbackResponse.data.data.patients;
                } else if (fallbackResponse.data.patients) {
                  allAppointments = fallbackResponse.data.patients;
                } else if (Array.isArray(fallbackResponse.data.data)) {
                  allAppointments = fallbackResponse.data.data;
                }
              } else {
                // Extract appointments from patient response
                if (Array.isArray(fallbackResponse.data.data)) {
                  allAppointments = fallbackResponse.data.data;
                } else if (fallbackResponse.data.data && Array.isArray(fallbackResponse.data.data.appointments)) {
                  allAppointments = fallbackResponse.data.data.appointments;
                }
              }
              
              console.log("Fallback appointments:", allAppointments);
              
              const upcoming = allAppointments.filter(apt => {
                // Try to parse date regardless of format
                const aptDate = moment(apt.date || apt.appointmentDate);
                const isUpcoming = aptDate.isValid() ? aptDate.isAfter(moment().startOf('day')) : false;
                
                console.log(`Fallback Appointment: Date: ${apt.date || apt.appointmentDate}, Valid: ${aptDate.isValid()}, Format: ${aptDate.format('YYYY-MM-DD')}, Status: ${apt.status || 'unknown'}, IsUpcoming: ${isUpcoming}`);
                
                return isUpcoming;
              }).sort((a, b) => moment(a.date || a.appointmentDate).diff(moment(b.date || b.appointmentDate)));
              
              console.log("Fallback filtered appointments:", upcoming);
              setUpcomingAppointments(upcoming);
            }
          } catch (fallbackError) {
            console.error("Fallback endpoint also failed:", fallbackError);
          }
        };
        
        // Use different endpoints based on user role
        let endpoint = "http://localhost:4000/api/user/get-user-appointments";
        
        // If the user is a doctor, use the doctor appointments endpoint
        if (user?.isDoctor) {
          endpoint = "http://localhost:4000/api/doctor/appointments";
          console.log("Using doctor endpoint for appointments:", endpoint);
          
          // Doctor-specific appointment fetch
          try {
            const doctorResponse = await axios.get(endpoint, {
              headers: {
                Authorization: 'Bearer ' + localStorage.getItem('token'),
              },
            });
            
            console.log("Doctor API Response:", doctorResponse.data);
            
            if (doctorResponse.data.success) {
              // Extract patients (appointments) with multiple fallbacks
              let allAppointments = [];
              
              if (doctorResponse.data.data && doctorResponse.data.data.patients) {
                allAppointments = doctorResponse.data.data.patients;
              } else if (doctorResponse.data.patients) {
                allAppointments = doctorResponse.data.patients;
              } else if (Array.isArray(doctorResponse.data.data)) {
                allAppointments = doctorResponse.data.data;
              }
              
              console.log("All doctor appointments:", allAppointments);
              
              // For doctors, we want to show pending and approved appointments
              const upcoming = allAppointments.filter(apt => {
                console.log("Doctor appointment details:", apt);
                
                // For doctors, accept approved appointments
                const validStatus = apt.status === 'approved' || apt.status === 'pending';
                console.log(`Appointment status: ${apt.status}, Valid: ${validStatus}`);
                
                // Try multiple date formats
                let aptDate;
                if (apt.date) {
                  if (typeof apt.date === 'string') {
                    if (apt.date.includes('-')) {
                      aptDate = moment(apt.date, "DD-MM-YYYY");
                    } else if (apt.date.includes('/')) {
                      aptDate = moment(apt.date, "MM/DD/YYYY");
                    } else {
                      aptDate = moment(apt.date);
                    }
                  } else {
                    aptDate = moment(apt.date);
                  }
                } else if (apt.appointmentDate) {
                  aptDate = moment(apt.appointmentDate);
                } else {
                  aptDate = null;
                }
                
                // Check if date is valid and in the future or today
                const isUpcoming = aptDate && aptDate.isValid() ? 
                  aptDate.isSameOrAfter(moment().startOf('day')) : false;
                
                console.log(`Date: ${apt.date || apt.appointmentDate}, Parsed: ${aptDate ? aptDate.format('YYYY-MM-DD') : 'Invalid'}, IsUpcoming: ${isUpcoming}`);
                
                // Accept if it's upcoming and has valid status
                return validStatus && isUpcoming;
              });
              
              console.log("Filtered doctor appointments:", upcoming);
              
              if (upcoming.length > 0) {
                setUpcomingAppointments(upcoming);
                return; // Exit early if we found appointments
              }
            }
            
            // Try secondary doctor endpoint for approved appointments
            console.log("No appointments from primary endpoint, trying secondary doctor endpoint");
            const secondaryEndpoint = "http://localhost:4000/api/doctor/approved-appointments";
            const secondaryResponse = await axios.get(secondaryEndpoint, {
              headers: {
                Authorization: 'Bearer ' + localStorage.getItem('token'),
              },
            });
            
            console.log("Secondary Doctor API Response:", secondaryResponse.data);
            
            if (secondaryResponse.data.success) {
              let secondaryAppointments = [];
              
              if (secondaryResponse.data.data) {
                if (Array.isArray(secondaryResponse.data.data)) {
                  secondaryAppointments = secondaryResponse.data.data;
                } else if (secondaryResponse.data.data.appointments) {
                  secondaryAppointments = secondaryResponse.data.data.appointments;
                }
              } else if (secondaryResponse.data.appointments) {
                secondaryAppointments = secondaryResponse.data.appointments;
              }
              
              console.log("Secondary doctor appointments:", secondaryAppointments);
              
              const upcomingSecondary = secondaryAppointments.filter(apt => {
                // Check if the appointment has a valid date and status
                let aptDate = null;
                if (apt.date) {
                  aptDate = moment(apt.date);
                } else if (apt.appointmentDate) {
                  aptDate = moment(apt.appointmentDate);
                }
                
                const isUpcoming = aptDate && aptDate.isValid() ? 
                  aptDate.isSameOrAfter(moment().startOf('day')) : false;
                
                console.log(`Secondary Apt - Date: ${apt.date || apt.appointmentDate}, IsUpcoming: ${isUpcoming}, Status: ${apt.status || 'unknown'}`);
                
                return isUpcoming;
              });
              
              console.log("Filtered secondary appointments:", upcomingSecondary);
              
              if (upcomingSecondary.length > 0) {
                setUpcomingAppointments(upcomingSecondary);
                return;
              }
            }
            
            console.log("No upcoming doctor appointments found, trying fallback");
            await tryFallbackEndpoint();
          } catch (doctorError) {
            console.error("Error fetching doctor appointments:", doctorError);
            await tryFallbackEndpoint();
          }
        } else {
          // Patient appointment logic
          const response = await axios.get(endpoint, {
            headers: {
              Authorization: 'Bearer ' + localStorage.getItem('token'),
            },
          });
          
          if (response.data.success) {
            console.log("API Response:", response.data);
            
            // Extract appointments with multiple fallbacks for different response structures
            let allAppointments = [];
            
            if (response.data.data && response.data.data.appointments) {
              allAppointments = response.data.data.appointments;
            } else if (Array.isArray(response.data.data)) {
              allAppointments = response.data.data;
            } else if (response.data.appointments) {
              allAppointments = response.data.appointments;
            } else if (response.data.data && response.data.data.data && Array.isArray(response.data.data.data)) {
              allAppointments = response.data.data.data;
            }
            
            console.log("All appointments extracted:", allAppointments);
            
            // Filter for valid upcoming appointments with a more flexible check
            const upcoming = allAppointments.filter(apt => {
              // Get the appointment date
              let aptDate;
              
              if (apt.date) {
                // Try different ways this date might be formatted
                if (typeof apt.date === 'string') {
                  // Try DD-MM-YYYY format first (common in this API)
                  if (apt.date.includes('-')) {
                    aptDate = moment(apt.date, "DD-MM-YYYY");
                  } 
                  // Try MM/DD/YYYY format
                  else if (apt.date.includes('/')) {
                    aptDate = moment(apt.date, "MM/DD/YYYY");
                  }
                  // Default to ISO format
                  else {
                    aptDate = moment(apt.date);
                  }
                } else {
                  // Try as Date object
                  aptDate = moment(apt.date);
                }
              } else if (apt.appointmentDate) {
                aptDate = moment(apt.appointmentDate);
              }
              
              // Make sure it's a valid date and it's in the future
              const isUpcoming = aptDate && aptDate.isValid() ? 
                aptDate.isAfter(moment().startOf('day')) : false;
              
              // Check the status - accept pending, approved, or if status is missing
              const hasValidStatus = !apt.status || 
                                   apt.status === 'pending' || 
                                   apt.status === 'approved' ||
                                   apt.status === 'active';
              
              console.log(`Appointment: Date: ${apt.date || apt.appointmentDate}, Valid: ${aptDate ? aptDate.isValid() : false}, Format: ${aptDate ? aptDate.format('YYYY-MM-DD') : 'Invalid'}, Status: ${apt.status || 'unknown'}, IsUpcoming: ${isUpcoming}, IsValidStatus: ${hasValidStatus}`);
              
              // Accept if it's upcoming and has valid status (or no status specified)
              return isUpcoming && hasValidStatus;
            }).sort((a, b) => {
              // Sort by date
              const dateA = moment(a.date || a.appointmentDate);
              const dateB = moment(b.date || b.appointmentDate);
              return dateA.diff(dateB);
            });
            
            console.log("Filtered upcoming appointments:", upcoming);
            
            if (upcoming.length > 0) {
              setUpcomingAppointments(upcoming);
            } else {
              // Try alternative endpoint if no appointments found
              tryFallbackEndpoint();
            }
          } else {
            // If the first endpoint fails, try the alternative
            tryFallbackEndpoint();
          }
        }
      } catch (error) {
        console.error("Error fetching appointments:", error);
        // Try alternative endpoint if there's an error
        tryFallbackEndpoint();
      }
    }
  };

  const getData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:4000/api/user/get-all-aproved-doctor', {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      });

      if (response.data.success) {
        setDoctors(response.data.data);
      } else {
        toast.error(response.data.message || 'Failed to fetch doctors');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
    if (user?._id) {
      getAppointments();
    }
  }, [user]);

  // Format date helper
  const formatAppointmentDate = (dateString) => {
    if (!dateString) return '';
    
    // Try multiple date formats since the API might return different formats
    let date;
    
    // Check if it's already a moment object
    if (moment.isMoment(dateString)) {
      date = dateString;
    } 
    // Try parsing as DD-MM-YYYY format (common in the API)
    else if (typeof dateString === 'string' && dateString.includes('-')) {
      date = moment(dateString, "DD-MM-YYYY");
      if (!date.isValid()) {
        // Fallback to ISO format
        date = moment(dateString);
      }
    } 
    // Try as Date object or ISO string
    else {
      date = moment(dateString);
    }
    
    // If we still don't have a valid date, return unknown
    if (!date.isValid()) {
      console.warn("Invalid date format:", dateString);
      return "Unknown date";
    }
    
    const today = moment().startOf('day');
    const tomorrow = moment().add(1, 'day').startOf('day');
    
    // Check if date is today
    if (date.isSame(today, 'day')) {
      return `Today`;
    }
    // Check if date is tomorrow
    else if (date.isSame(tomorrow, 'day')) {
      return `Tomorrow`;
    }
    // Otherwise return the formatted date
    else {
      return date.format('ddd, MMM D');
    }
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

  // Get current time of day to personalize greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <Layout>
      {/* Enhanced Hero Section with Advanced UI/UX */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-indigo-900 to-purple-900 rounded-2xl shadow-2xl mb-10">
        {/* Animated Geometric Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-15">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grid-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <path d="M0 0 L50 0 L50 50 L0 50 Z" fill="url(#grid-gradient)" className="animate-pulse-slow" />
              <path d="M50 0 L100 0 L100 50 L50 50 Z" fill="url(#grid-gradient)" className="animate-pulse-slow" />
              <path d="M0 50 L50 50 L50 100 L0 100 Z" fill="url(#grid-gradient)" className="animate-pulse-slow" />
              <path d="M50 50 L100 50 L100 100 L50 100 Z" fill="url(#grid-gradient)" className="animate-pulse-slow" />
            </svg>
          </div>
          <div className="absolute top-0 -right-40 w-80 h-80 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 -left-20 w-60 h-60 bg-indigo-600 rounded-full opacity-20 blur-3xl"></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Welcome Message and Dashboard Metrics */}
            <div className="lg:col-span-7 space-y-6">
              {user && (
                <div className="mb-6 animate-fade-in-up">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full opacity-75 blur-sm animate-pulse-slow"></div>
                      <img 
                        src={getUserProfilePic()} 
                        alt="Profile" 
                        className="relative w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/assets/profile.png";
                        }}
                      />
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="text-left">
                      <h2 className="text-2xl md:text-3xl font-bold text-white">
                        <span className="opacity-90">{getGreeting()},</span> <span className="text-blue-200">{user?.isDoctor && "Dr. "}   { user.name?.split(' ')[0]}</span>
                      </h2>
                      <p className="text-blue-200 opacity-90 text-sm md:text-base">
                        {user?.isAdmin ? 'Hospital Admin Dashboard' : user?.isDoctor ? 'Doctor Management Portal' : 'Personal Health Dashboard'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dashboard Quick Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-in-up animation-delay-200">
                    {/* First Card - Appointments or Doctor Applications based on user role */}
                    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-md rounded-xl p-4 border border-white border-opacity-20 hover:bg-opacity-15 hover:border-opacity-30 transition-all duration-300 transform hover:-translate-y-1 group">
                      <div className="flex flex-col">
                        <div className="text-blue-100 mb-2">
                          {user?.isAdmin ? (
                            <FaUserPlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                          ) : (
                            <FaRegCalendarAlt className="w-6 h-6 group-hover:scale-110 transition-transform" />
                          )}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white">
                          {user?.isAdmin ? pendingDoctorApplications : upcomingAppointments?.length || 0}
                        </h3>
                        <p className="text-blue-200 text-xs mt-1">
                          {user?.isAdmin 
                            ? 'Doctor Applications' 
                            : user?.isDoctor 
                              ? 'Upcoming Patients' 
                              : 'Upcoming Appointments'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {/* Doctors Card */}
                    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-md rounded-xl p-4 border border-white border-opacity-20 hover:bg-opacity-15 hover:border-opacity-30 transition-all duration-300 transform hover:-translate-y-1 group">
                      <div className="flex flex-col">
                        <div className="text-blue-100 mb-2">
                          <FaUserMd className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white">{doctors.length}</h3>
                        <p className="text-blue-200 text-xs mt-1">
                          {user?.isDoctor ? 'Colleague Specialists' : 'Available Specialists'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Notifications Card */}
                    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-md rounded-xl p-4 border border-white border-opacity-20 hover:bg-opacity-15 hover:border-opacity-30 transition-all duration-300 transform hover:-translate-y-1 group">
                      <div className="flex flex-col">
                        <div className="text-blue-100 mb-2">
                          <FaClipboardCheck className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white">{user?.unseenNotification?.length || 0}</h3>
                        <p className="text-blue-200 text-xs mt-1">New Notifications</p>
                      </div>
                    </div>
                    
                    {/* Health Score Card */}
                    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-md rounded-xl p-4 border border-white border-opacity-20 hover:bg-opacity-15 hover:border-opacity-30 transition-all duration-300 transform hover:-translate-y-1 group">
                      <div className="flex flex-col">
                        <div className="text-blue-100 mb-2">
                          <FaHeartbeat className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white">{healthMetrics.medicationAdherence}<span className="text-sm">%</span></h3>
                        <p className="text-blue-200 text-xs mt-1">Health Score</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up animation-delay-300">
                    {user?.isAdmin ? (
                      // Admin buttons
                      <>
                        <Link 
                          to="/admin/doctor-list"
                          className="flex items-center justify-center px-6 py-3.5 bg-white bg-opacity-90 text-blue-700 rounded-xl font-medium hover:bg-opacity-100 transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transform hover:-translate-y-1 group"
                        >
                          <FaUserMd className="mr-2 group-hover:scale-110 transition-transform" /> 
                          <span>Manage Doctors</span>
                        </Link>
                        
                        <Link 
                          to="/admin/appointments"
                          className="flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transform hover:-translate-y-1 group"
                        >
                          <FaCalendarCheck className="mr-2 group-hover:scale-110 transition-transform" /> 
                          <span>Manage Appointments</span>
                        </Link>
                      </>
                    ) : user?.isDoctor ? (
                      // Doctor buttons
                      <>
                        <Link 
                          to="/doctor/appointments"
                          className="flex items-center justify-center px-6 py-3.5 bg-white bg-opacity-90 text-blue-700 rounded-xl font-medium hover:bg-opacity-100 transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transform hover:-translate-y-1 group"
                        >
                          <FaBriefcaseMedical className="mr-2 group-hover:scale-110 transition-transform" /> 
                          <span>Manage Appointments</span>
                        </Link>
                        
                        <Link 
                          to="/doctor/medical-records"
                          className="flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transform hover:-translate-y-1 group"
                        >
                          <FaClipboardCheck className="mr-2 group-hover:scale-110 transition-transform" /> 
                          <span>Quick Access</span>
                        </Link>
                      </>
                    ) : (
                      // Patient buttons
                      <>
                        <Link 
                          to="/appointments"
                          className="flex items-center justify-center px-6 py-3.5 bg-white bg-opacity-90 text-blue-700 rounded-xl font-medium hover:bg-opacity-100 transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transform hover:-translate-y-1 group"
                        >
                          <FaCalendarCheck className="mr-2 group-hover:scale-110 transition-transform" /> 
                          <span>Manage Appointments</span>
                        </Link>
                        
                        <Link 
                          to="/doctors"
                          className="flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transform hover:-translate-y-1 group"
                        >
                          <FaSearch className="mr-2 group-hover:scale-110 transition-transform" /> 
                          <span>Find Specialists</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}

              {!user && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="space-y-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-700 bg-opacity-50 border border-blue-500 border-opacity-50 text-blue-200 text-sm font-medium">
                      <div className="h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></div>
                      HEALTHCARE MANAGEMENT SYSTEM
                    </div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                      Your Complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-200">Healthcare Solution</span>
                    </h1>
                    <p className="text-blue-100 text-lg max-w-xl opacity-90">
                      Manage appointments, connect with specialists, and access your medical records seamlessly in one place.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-fade-in-up animation-delay-300">
                    <Link 
                      to="/login"
                      className="inline-flex items-center justify-center px-6 py-3.5 bg-white text-blue-700 rounded-xl font-medium hover:bg-blue-50 transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transform hover:-translate-y-1 group"
                    >
                      <span>Sign In to Dashboard</span>
                    </Link>
                    <Link 
                      to="/register"
                      className="inline-flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transform hover:-translate-y-1 border border-white border-opacity-20 group"
                    >
                      <span>Register Now</span> <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Interactive Dashboard Visualization */}
            <div className="lg:col-span-5 animate-fade-in-up animation-delay-300">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl blur opacity-50"></div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 relative rounded-xl overflow-hidden border border-white border-opacity-10 p-1 shadow-2xl">
                  <div className="flex items-center justify-between bg-gray-800 rounded-t-lg px-4 py-2 border-b border-gray-700">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-gray-400 mr-[176px] text-xs font-mono">DevClinic Dashboard</div>
                    <div></div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-gray-900 to-gray-800">
                    {/* Dashboard Visualization Content */}
                    <div className="grid grid-cols-6 gap-3">
                      <div className="col-span-6 bg-gray-800 p-3 rounded-lg border border-gray-700 shadow-inner mb-1">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-white text-sm font-medium">
                            {user?.isDoctor ? 'Weekly Appointments' : 'Weekly Activity'}
                          </h4>
                          <div className="text-blue-400 text-xs font-mono">{new Date().toLocaleDateString('en-US', {month: 'short', year: 'numeric'})}</div>
                        </div>
                        <div className="flex items-end h-20 space-x-1">
                          {healthMetrics.weeklyActivity.map((value, i) => (
                            <div 
                              key={i} 
                              className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-sm hover:opacity-80 transition-opacity"
                              style={{ height: `${value}%` }}
                            ></div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>Mon</span>
                          <span>Tue</span>
                          <span>Wed</span>
                          <span>Thu</span>
                          <span>Fri</span>
                          <span>Sat</span>
                          <span>Sun</span>
                        </div>
                      </div>
                      
                      <div className="col-span-6 bg-gray-800 rounded-lg border border-gray-700 p-3 shadow-inner mb-1">
                        <h4 className="text-white text-sm font-medium mb-3 flex items-center justify-between">
                          <span>
                            {user?.isAdmin ? 'Doctor Applications' : 'Upcoming Appointments'}
                          </span>
                          <Link 
                            to={
                              user?.isAdmin 
                                ? "/admin/doctor-list" 
                                : user?.isDoctor 
                                  ? "/doctor/appointments" 
                                  : "/appointments"
                            } 
                            className="text-xs text-blue-400 hover:text-blue-300 font-normal flex items-center"
                          >
                            View All <FaChevronRight className="ml-1 h-2 w-2" />
                          </Link>
                        </h4>
                        {user?.isAdmin ? (
                          // For admin: Show doctor applications summary
                          <div className="p-4 bg-gray-900 bg-opacity-50 rounded-lg border border-gray-700 border-opacity-50 flex flex-col items-center justify-center">
                            <div className="text-gray-400 mb-2">
                              <FaUserPlus className="h-8 w-8 opacity-50" />
                            </div>
                            <p className="text-gray-400 text-sm text-center">
                              {pendingDoctorApplications > 0 
                                ? `${pendingDoctorApplications} pending doctor application${pendingDoctorApplications !== 1 ? 's' : ''}` 
                                : 'No pending doctor applications'}
                            </p>
                            <Link to="/admin/doctor-list" className="mt-2 text-blue-400 text-xs hover:text-blue-300 inline-flex items-center px-3 py-1 bg-blue-900 bg-opacity-30 rounded-full">
                              Manage Applications <FaArrowRight className="ml-1 h-2 w-2" />
                            </Link>
                          </div>
                        ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
                          // For doctor/patient: Show upcoming appointments
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-2 custom-scrollbar">
                            {upcomingAppointments.slice(0, 2).map((apt, index) => {
                              // For doctor view: show patient info
                              // For patient view: show doctor info
                              let nameDisplay = '';
                              let iconElement = null;
                              
                              if (user.isDoctor) {
                                // Doctor is viewing - show patient info
                                const patientName = apt.userInfo?.name || apt.userName || apt.patientName || 'Patient';
                                nameDisplay = patientName;
                                iconElement = <FaUserInjured className="h-4 w-4 text-indigo-400" />;
                              } else {
                                // Patient is viewing - show doctor info
                                const doctorFirstName = apt.doctorInfo?.firstname || apt.doctorName?.split(' ')[0] || apt.doctor?.firstname || '';
                                const doctorLastName = apt.doctorInfo?.lastname || (apt.doctorName?.split(' ').length > 1 ? apt.doctorName?.split(' ')[1] : '') || apt.doctor?.lastname || '';
                                nameDisplay = doctorFirstName ? `Dr. ${doctorFirstName} ${doctorLastName}` : 'Doctor';
                                iconElement = <FaUserMd className="h-4 w-4 text-indigo-400" />;
                              }
                              
                              // Get time in a flexible way
                              const appointmentTime = apt.time || 
                                (apt.appointmentTime ? moment(apt.appointmentTime, "HH:mm").format("h:mm A") : '');
                              
                              return (
                                <div key={apt._id || index} className="flex items-center p-2 bg-gray-900 bg-opacity-50 rounded-lg hover:bg-opacity-70 transition-colors border border-gray-700 border-opacity-50">
                                  <div className="p-2 bg-indigo-900 rounded-md mr-3 flex-shrink-0">
                                    {iconElement}
                                  </div>
                                  <div className="overflow-hidden">
                                    <div className="text-white text-sm font-medium truncate">
                                      {nameDisplay}
                                    </div>
                                    <div className="text-gray-400 text-xs font-mono flex items-center">
                                      <FaRegCalendarAlt className="mr-1 text-blue-400 h-3 w-3" />
                                      <span>{formatAppointmentDate(apt.date)} {appointmentTime && `• ${appointmentTime}`}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // No upcoming appointments
                          <div className="p-4 bg-gray-900 bg-opacity-50 rounded-lg border border-gray-700 border-opacity-50 flex flex-col items-center justify-center">
                            <div className="text-gray-400 mb-2">
                              <FaRegCalendarAlt className="h-8 w-8 opacity-50" />
                            </div>
                            <p className="text-gray-400 text-sm text-center">No upcoming appointments</p>
                            <Link to={user.isDoctor ? "/doctor/appointments" : "/doctors"} className="mt-2 text-blue-400 text-xs hover:text-blue-300 inline-flex items-center px-3 py-1 bg-blue-900 bg-opacity-30 rounded-full">
                              {user.isDoctor ? "View All Appointments" : "Book an appointment"} <FaArrowRight className="ml-1 h-2 w-2" />
                            </Link>
                          </div>
                        )}
                      </div>
                      
                      <div className="col-span-6 bg-gray-800 rounded-lg border border-gray-700 p-3 shadow-inner">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-white text-sm font-medium">
                            {user?.isDoctor ? 'Patient Satisfaction' : 'Health Status'}
                          </div>
                          <div className="text-blue-400 text-xs font-mono">
                            {user?.isDoctor ? `${healthMetrics.patientSatisfaction}%` : `${healthMetrics.medicationAdherence}% optimal`}
                          </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full" 
                            style={{ 
                              width: `${user?.isDoctor ? healthMetrics.patientSatisfaction : healthMetrics.medicationAdherence}%` 
                            }}
                          ></div>
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <div className="text-xs text-gray-400">
                            {user?.isDoctor 
                              ? `${healthMetrics.appointmentsCompleted} completed appointments` 
                              : "Last checkup: 2 weeks ago"
                            }
                          </div>
                          <Link 
                            to={user?.isDoctor ? "/doctor/patient/reviews" : "/medical-records"} 
                            className="text-blue-400 text-xs hover:text-blue-300 inline-flex items-center"
                          >
                            {user?.isDoctor ? "View feedback" : "View details"} <FaChevronRight className="ml-1 h-2 w-2" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Info Cards */}
                <div className="absolute -bottom-[26px] -left-3 bg-white rounded-lg shadow-xl p-3 hidden md:flex items-center backdrop-filter backdrop-blur-sm bg-opacity-90 transition-all duration-300 hover:shadow-blue-500/20 hover:translate-y-[-2px] z-10">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <FaShieldAlt className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-500 text-xs">Data Protection</p>
                    <p className="text-gray-800 font-semibold text-sm">HIPAA Compliant</p>
                  </div>
                </div>
                
                <div className="absolute -top-3 -right-3 bg-white rounded-lg shadow-xl p-3 hidden md:flex items-center backdrop-filter backdrop-blur-sm bg-opacity-90 transition-all duration-300 hover:shadow-blue-500/20 hover:translate-y-[-2px] z-10">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <FaChartLine className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-500 text-xs">Health Analytics</p>
                    <p className="text-gray-800 font-semibold text-sm">Personalized Insights</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add animated waves divider */}
      <div className="relative h-16 md:h-24 bg-white -mt-1">
        <svg className="absolute top-0 w-full h-full" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path fill="#3b82f6" fillOpacity="0.2" d="M0,256L48,229.3C96,203,192,149,288,122.7C384,96,480,96,576,117.3C672,139,768,181,864,197.3C960,213,1056,203,1152,186.7C1248,171,1344,149,1392,138.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>

      {/* Stats Section - Redesigned with cards */}
      <section className="bg-white py-10 -mt-6">
        <div className="container mx-auto px-4">
          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="text-blue-600 flex justify-center mb-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FaUserMd className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-center text-gray-800">{doctors.length}+</h3>
                <p className="text-gray-500 text-sm text-center font-medium mt-1">Doctors</p>
                <div className="h-1 w-12 bg-blue-500 mx-auto mt-3 rounded-full"></div>
              </div>
              
              <div className="bg-gradient-to-br from-white to-indigo-50 rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="text-indigo-600 flex justify-center mb-3">
                  <div className="p-3 bg-indigo-100 rounded-full">
                    <FaStethoscope className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-center text-gray-800">15+</h3>
                <p className="text-gray-500 text-sm text-center font-medium mt-1">Specialties</p>
                <div className="h-1 w-12 bg-indigo-500 mx-auto mt-3 rounded-full"></div>
              </div>
              
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="text-blue-600 flex justify-center mb-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FaHospital className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-center text-gray-800">5000+</h3>
                <p className="text-gray-500 text-sm text-center font-medium mt-1">Patients</p>
                <div className="h-1 w-12 bg-blue-500 mx-auto mt-3 rounded-full"></div>
              </div>
              
              <div className="bg-gradient-to-br from-white to-indigo-50 rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="text-indigo-600 flex justify-center mb-3">
                  <div className="p-3 bg-indigo-100 rounded-full">
                    <FaHeartbeat className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-center text-gray-800">98%</h3>
                <p className="text-gray-500 text-sm text-center font-medium mt-1">Satisfaction</p>
                <div className="h-1 w-12 bg-indigo-500 mx-auto mt-3 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Redesigned */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50" id="features">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4">
              <div className="h-1 w-4 bg-blue-500 mr-2 rounded-full"></div>
              OUR SERVICES
              <div className="h-1 w-4 bg-blue-500 ml-2 rounded-full"></div>
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Why Choose DevClinic?</h2>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto mb-6 rounded-full"></div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We provide comprehensive healthcare services with a focus on patient comfort and satisfaction.
              Our team of experts is dedicated to delivering the highest quality of care.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
            {/* Expert Doctors Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-all duration-300 group-hover:scale-150 group-hover:opacity-50"></div>
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full w-16 h-16 flex items-center justify-center mb-6 mx-auto text-white transform transition-all duration-500 hover:scale-110 relative z-10 shadow-lg shadow-blue-200">
                <FaUserMd className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center mb-3 text-gray-800 relative z-10">Expert Doctors</h3>
              <p className="text-gray-600 text-center mb-4 relative z-10">Access to board-certified medical professionals across all specialties and departments.</p>
              <div className="mt-4 flex justify-center relative z-10">
                <Link to="/doctors" className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium transition-all duration-300 hover:translate-x-1 group/link">
                  Learn More <FaChevronRight className="ml-1 text-xs transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
            
            {/* Easy Scheduling Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 transition-all duration-300 group-hover:scale-150 group-hover:opacity-50"></div>
              <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center mb-6 mx-auto text-white transform transition-all duration-500 hover:scale-110 relative z-10 shadow-lg shadow-indigo-200">
                <FaCalendarCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center mb-3 text-gray-800 relative z-10">Easy Scheduling</h3>
              <p className="text-gray-600 text-center mb-4 relative z-10">Book appointments in minutes with our intuitive scheduling system. No waiting in lines.</p>
              <div className="mt-4 flex justify-center relative z-10">
                <Link to="/appointments" className="text-indigo-600 hover:text-indigo-700 flex items-center text-sm font-medium transition-all duration-300 hover:translate-x-1 group/link">
                  Book Now <FaChevronRight className="ml-1 text-xs transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
            
            {/* Direct Connect Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-all duration-300 group-hover:scale-150 group-hover:opacity-50"></div>
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full w-16 h-16 flex items-center justify-center mb-6 mx-auto text-white transform transition-all duration-500 hover:scale-110 relative z-10 shadow-lg shadow-blue-200">
                <FaCommentDots className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center mb-3 text-gray-800 relative z-10">Direct Connect with Doctors</h3>
              <p className="text-gray-600 text-center mb-4 relative z-10">Communicate directly with your healthcare providers for personalized care.</p>
              <div className="mt-4 flex justify-center relative z-10">
                <Link to="/doctors" className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium transition-all duration-300 hover:translate-x-1 group/link">
                  Connect Now <FaChevronRight className="ml-1 text-xs transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
            
            {/* 24/7 Support Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 transition-all duration-300 group-hover:scale-150 group-hover:opacity-50"></div>
              <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center mb-6 mx-auto text-white transform transition-all duration-500 hover:scale-110 relative z-10 shadow-lg shadow-indigo-200">
                <FaPhone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center mb-3 text-gray-800 relative z-10">24/7 Support</h3>
              <p className="text-gray-600 text-center mb-4 relative z-10">Our team is always available to assist you with any questions or concerns about your health.</p>
              <div className="mt-4 flex justify-center relative z-10">
                <Link to="/contact" className="text-indigo-600 hover:text-indigo-700 flex items-center text-sm font-medium transition-all duration-300 hover:translate-x-1 group/link">
                  Contact Us <FaChevronRight className="ml-1 text-xs transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filters Section */}
      <section className="py-12 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-2">HEALTHCARE PROFESSIONALS</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">Find Your Doctor</h2>
              <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto mb-4 rounded-full"></div>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Connect with specialized healthcare professionals and book your appointment today.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, specialty, or department..."
                  className="w-full px-5 py-4 pl-12 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 hover:bg-gray-100 transition-all duration-200"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                <span className="text-gray-500 mr-1 my-1">Popular Specialties:</span>
                {['Cardiology', 'Dermatology', 'Orthopedics', 'Pediatrics', 'Neurology'].map((specialty) => (
                  <button
                    key={specialty}
                    onClick={() => setSearchTerm(specialty)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      searchTerm === specialty
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {specialty}
                  </button>
                ))}
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-600">Searching for the best doctors...</p>
              </div>
            ) : (
              <>
                {doctors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {doctors
                      .filter(doctor => {
                        if (searchTerm === '') return true;
                        
                        const searchLower = searchTerm.toLowerCase();
                        const fullName = `${doctor.firstname || ''} ${doctor.lastname || ''}`.toLowerCase();
                        const specialization = typeof doctor.specialization === 'string' 
                          ? doctor.specialization.toLowerCase() 
                          : Array.isArray(doctor.specialization)
                            ? doctor.specialization.join(', ').toLowerCase()
                            : '';
                        const department = typeof doctor.department === 'string' 
                          ? doctor.department.toLowerCase() 
                          : '';
                        
                        return fullName.includes(searchLower) || 
                               specialization.includes(searchLower) || 
                               department.includes(searchLower);
                      })
                      .slice(0, 6)
                      .map((doctor) => (
                        <DoctorCard key={doctor._id} doctor={doctor} />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-white rounded-xl shadow-md">
                    <div className="text-blue-400 mb-4">
                      <FaUserMd className="w-16 h-16 mx-auto opacity-50" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Doctors Available</h3>
                    <p className="text-gray-500 max-w-md mx-auto">Our team of doctors will be available soon. Please check back later or try a different search term.</p>
                  </div>
                )}

                {doctors.length > 6 && (
                  <div className="flex justify-center mt-10">
                    <Link 
                      to="/doctors" 
                      className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                      View All Doctors <FaArrowRight className="ml-2" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4">TESTIMONIALS</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">What Our Patients Say</h2>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto mb-6 rounded-full"></div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Don't just take our word for it - hear what our satisfied patients have to say about their experiences at DevClinic.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all duration-300 hover:shadow-xl relative">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                </svg>
              </div>
              <div className="text-gray-600 mb-4 italic">
                "DevClinic has completely transformed my healthcare experience. The doctors are not only highly skilled but also genuinely caring. The online booking system is so convenient!"
              </div>
              <div className="flex items-center mt-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">SP</div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-800">Sagar Prajapati</p>
                  <p className="text-gray-500 text-sm">Patient since 2024</p>
                </div>
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all duration-300 hover:shadow-xl relative">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                </svg>
              </div>
              <div className="text-gray-600 mb-4 italic">
                "I was hesitant about telemedicine at first, but DevClinic made it so easy and comfortable. The doctors take their time to listen, and the follow-up care is exceptional."
              </div>
              <div className="flex items-center mt-6">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">A</div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-800">Akshay</p>
                  <p className="text-gray-500 text-sm">Patient since 2024</p>
                </div>
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all duration-300 hover:shadow-xl relative">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                </svg>
              </div>
              <div className="text-gray-600 mb-4 italic">
                "As someone with a busy schedule, the ability to schedule appointments online and get reminders has been a game-changer. The staff is professional and the facilities are top-notch."
              </div>
              <div className="flex items-center mt-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">ST</div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-800">Sahil Tanwar</p>
                  <p className="text-gray-500 text-sm">Patient since 2025</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-800 opacity-90"></div>
        <div className="absolute inset-0 opacity-30">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
            <path fill="#ffffff" fillOpacity="0.2" d="M0,128L48,144C96,160,192,192,288,197.3C384,203,480,181,576,154.7C672,128,768,96,864,101.3C960,107,1056,149,1152,160C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to experience better healthcare?</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied patients who have made DevClinic their trusted healthcare provider.
              Get started today with access to quality care from the comfort of your home.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to={user ? "/appointment" : "/register"}
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full sm:w-auto"
              >
                {user ? 'Book Appointment' : 'Create Account'} <FaArrowRight className="ml-2" />
              </Link>
              <Link 
                to="/doctors"
                className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white border-2 border-white rounded-lg font-medium hover:bg-white hover:bg-opacity-10 transition-all duration-300 w-full sm:w-auto"
              >
                Browse Doctors
              </Link>
            </div>
            
            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <div className="flex items-center text-white">
                <FaUserMd className="mr-2 text-blue-200" /> 
                <span>Expert Doctors</span>
              </div>
              <div className="flex items-center text-white">
                <FaCalendarCheck className="mr-2 text-blue-200" /> 
                <span>Easy Scheduling</span>
              </div>
              <div className="flex items-center text-white">
                <FaRegClock className="mr-2 text-blue-200" /> 
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center text-white">
                <FaIdCard className="mr-2 text-blue-200" /> 
                <span>Digital Records</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add custom CSS for animations */}
      <style jsx="true">{`
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient 15s ease infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .hover-float:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        
        @media (max-width: 768px) {
          .grid-cols-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default Home;
