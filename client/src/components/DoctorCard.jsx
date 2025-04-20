import React, { useState, useEffect } from 'react'
import { BsFillTelephoneFill, BsFillStarFill } from "react-icons/bs";
import { FaLocationDot, FaCalendarCheck } from "react-icons/fa6";
import { FaRupeeSign, FaChevronRight } from "react-icons/fa";
import { MdAccessTimeFilled, MdVerified } from "react-icons/md";
import { useNavigate } from "react-router-dom"
import axios from 'axios';
import { useSelector } from 'react-redux';

function DoctorCard({ doctor }) {
    const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [rating, setRating] = useState(3.5);
  const [reviewCount, setReviewCount] = useState(0);
  
  // Check if doctor is available
  const isAvailable = doctor.isAvailable !== false;
  
  // Get doctor's experience number only
  const experienceYears = doctor.experience ? doctor.experience.toString().replace(/\D/g, '') : '5+';

  // Format fee with commas
  const formatFee = (fee) => {
    if (fee === undefined || fee === null) return "0";
    return fee.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Format specialization to string instead of array
  const formatSpecialization = (specialization) => {
    if (!specialization) return doctor.department || doctor.profession || "";
    
    // If it's an array, convert it to a clean string without brackets/quotes
    if (Array.isArray(specialization)) {
      return specialization.join(", ");
    }
    
    // If it's a string but looks like JSON, try to parse it
    if (typeof specialization === 'string' && 
        (specialization.startsWith('[') || specialization.startsWith('{"'))) {
      try {
        const parsed = JSON.parse(specialization);
        if (Array.isArray(parsed)) {
          return parsed.join(", ");
        }
        return parsed.toString();
      } catch (e) {
        // If parsing fails, return the string as is
        return specialization;
      }
    }
    
    // Return as string for any other type
    return String(specialization);
  };

  // Fetch doctor ratings and reviews
  useEffect(() => {
    const fetchDoctorRatings = async () => {
      if (!doctor.userId) return;
      
      try {
        const response = await axios.get(
          `http://localhost:4000/api/doctor/get-doctor-testimonials`,
          {
            params: { doctorId: doctor.userId },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        
        if (response.data.success) {
          const { averageRating, totalReviews } = response.data.data;
          setRating(averageRating > 0 ? parseFloat(averageRating) : 3.5);
          setReviewCount(totalReviews || 0);
        }
      } catch (error) {
        console.error("Error fetching doctor ratings:", error);
      }
    };
    
    fetchDoctorRatings();
  }, [doctor.userId]);
  
  return (
    <div 
      className="doctor-card-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => isAvailable && navigate(`/bookAppointment/${doctor.userId}`)}
      style={{ cursor: isAvailable ? 'pointer' : 'default' }}
    >
      <div className={`doctor-card bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 ${isHovered ? 'transform-active' : ''}`}>
        {/* Header with gradient background */}
        <div className="card-header relative h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
          <div className="absolute inset-0 bg-pattern opacity-20"></div>
          
          <div className="doctor-image absolute -bottom-14 left-1/2 transform -translate-x-1/2 flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-70"></div>
              <img 
                src={doctor.image || "/assets/profile.jpg"} 
                alt={`Dr. ${doctor.firstname} ${doctor.lastname}`} 
                className="relative w-28 h-28 rounded-full border-4 border-white object-cover shadow-lg hover:border-blue-100 transition-all duration-300"
                onError={(e) => {
                  console.error("Failed to load doctor image:", doctor.image);
                  e.target.onerror = null;
                  e.target.src = "/assets/profile.jpg";
                }}
              />
              {Math.random() > 0.3 && (
                <div className="absolute -right-2 -bottom-1 bg-blue-600 text-white p-1 rounded-full border-2 border-white">
                  <MdVerified size={16} />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Availability badge */}
        <div className="absolute top-4 left-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} shadow-sm`}>
            <span className={`h-2 w-2 mr-1 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'} ${isAvailable ? 'animate-pulse' : ''}`}></span>
            {isAvailable ? 'Available Today' : 'Unavailable Today'}
          </span>
        </div>
        
        {/* Doctor info */}
        <div className="pt-16 px-6 pb-6">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 mb-1">{`Dr. ${doctor.firstname} ${doctor.lastname}`}</h3>
            <p className="text-sm text-indigo-600 font-semibold">{doctor.department || doctor.profession}</p>
            
            <div className="flex justify-center items-center mt-2">
              <div className="bg-yellow-50 px-2.5 py-1 rounded-lg flex items-center border border-yellow-100">
                <BsFillStarFill className="text-yellow-400 mr-1.5" size={14} />
                <span className="text-sm font-semibold text-gray-800">{rating.toFixed(1)}</span>
                <span className="text-xs text-gray-500 ml-1">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center mb-5">
            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">
              {formatSpecialization(doctor.specialization)}
            </span>
            <span className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
              {experienceYears}+ Yrs Exp
            </span>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-3.5 mb-5">
            <div className="grid grid-cols-2 gap-3">
              {/* Consultation Fee */}
              <div className="fee-box flex flex-col items-center justify-center bg-white py-2.5 px-3 rounded-lg shadow-sm border border-gray-100">
                <span className="text-xs text-gray-500 mb-1">Consultation</span>
                <div className="flex items-center text-gray-800">
                  <FaRupeeSign className="mr-0.5 text-blue-600" />
                  <span className="font-bold text-lg">{formatFee(doctor.feePerConsultation)}</span>
                </div>
              </div>
              
              {/* Availability */}
              <div className="availability-box flex flex-col items-center justify-center bg-white py-2.5 px-3 rounded-lg shadow-sm border border-gray-100">
                <span className="text-xs text-gray-500 mb-1">Available</span>
                <div className="flex items-center text-gray-800">
                  <MdAccessTimeFilled className={`mr-1 ${isAvailable ? 'text-blue-600' : 'text-red-500'}`} />
                  <span className={`font-medium text-sm ${!isAvailable ? 'text-red-500' : ''}`}>{isAvailable ? 'Today' : 'Unavailable'}</span>
                </div>
              </div>

            </div>
          </div>
          
          {/* Doctor details */}
          <div className="space-y-3 text-sm mb-5">
            <div className="flex items-start text-gray-600">
              <FaLocationDot className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{doctor.address || "Consultation available online"}</span>
            </div>
            
            <div className="flex items-center text-gray-600">
              <BsFillTelephoneFill className="text-blue-600 mr-2 flex-shrink-0" />
              <span>{doctor.mobile || "Contact via booking"}</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-5 gap-3">
            <button 
              className={`book-btn col-span-3 px-4 py-3 ${isAvailable 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800' 
                : 'bg-gray-400 cursor-not-allowed'} text-white rounded-xl transition-all font-medium text-sm flex items-center justify-center shadow-md hover:shadow-lg`}
              onClick={(e) => {
                e.stopPropagation();
                if (isAvailable) {
                  navigate(`/bookAppointment/${doctor.userId}`);
                }
              }}
              disabled={!isAvailable}
            >
              <FaCalendarCheck className="mr-2" />
              {isAvailable ? 'Book Appointment' : 'Currently Unavailable'}
            </button>
            
            <button 
              className={`profile-btn col-span-2 px-4 py-3  bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all font-medium text-sm flex items-center justify-center`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/bookAppointment/${doctor.userId}`);
              }}
              disabled={!isAvailable}

            >
              {isAvailable ? 'View Profile' : 'View Details'} <FaChevronRight className="ml-1" size={10} />
            </button>
          </div>
        </div>

        {/* Hover Indicator */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
      </div>
      
      <style jsx="true">{`
        .doctor-card-container {
          max-width: 380px;
          margin: 0 auto;
          cursor: pointer;
          transform: translateY(0);
          transition: all 0.3s ease;
        }
        
        .doctor-card-container:hover {
          transform: translateY(-8px);
        }
        
        .doctor-card {
          opacity: 1;
          transform: translateY(0);
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .bg-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .fee-box, .availability-box {
          transition: all 0.3s ease;
        }
        
        .doctor-card-container:hover .fee-box,
        .doctor-card-container:hover .availability-box {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .book-btn, .profile-btn {
          transition: all 0.2s ease;
        }
        
        .book-btn:hover {
          transform: translateY(-2px);
        }
        
        .profile-btn:hover {
          transform: translateY(-2px);
        }
        
        @media (max-width: 640px) {
          .doctor-card-container {
            max-width: 100%;
          }
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

export default DoctorCard;