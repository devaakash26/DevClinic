import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { FaUserMd, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';

const LandingPage = () => {
  const [doctors, setDoctors] = useState([]);
  
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await axios.get('http://localhost:4000/api/user/get-all-aproved-doctor');
        const approvedDoctors = res.data.data.filter(doctor => doctor.status === "approved");
        setDoctors(approvedDoctors.slice(0, 3));
      } catch (error) {
        console.error("Error fetching doctors:", error);
      }
    };
    
    fetchDoctors();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">DevClinic</div>
          <div className="flex space-x-4">
            <Link to="/login" className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors duration-300">Login</Link>
            <Link to="/register" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4 leading-tight">
                Your Health, <span className="text-blue-600">Our Priority</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8">Connect with the best doctors in your area and book appointments instantly.</p>
              <div className="flex space-x-4">
                <Link to="/register" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-300">Get Started</Link>
                <Link to="/doctors" className="px-6 py-3 border border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-300">Find Doctors</Link>
              </div>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://img.freepik.com/free-photo/team-young-specialist-doctors-standing-corridor-hospital_1303-21202.jpg" 
                alt="Medical team" 
                className="rounded-lg shadow-xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">How It Works</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-5 text-2xl">
                <FaUserMd />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Find Doctors</h3>
              <p className="text-gray-600">Browse through our network of qualified healthcare professionals</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-5 text-2xl">
                <FaCalendarAlt />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Book Appointment</h3>
              <p className="text-gray-600">Select a convenient time slot and book your appointment</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-5 text-2xl">
                <FaCheckCircle />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Get Treatment</h3>
              <p className="text-gray-600">Visit the doctor and receive quality healthcare services</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Doctors */}
      {doctors.length > 0 && (
        <section className="py-16 bg-blue-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Meet Our Top Doctors</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {doctors.map((doctor) => (
                <div key={doctor._id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 hover:scale-102 duration-300">
                  <div className="h-60 overflow-hidden">
                    <img 
                      src={doctor.image || "https://img.freepik.com/free-photo/pleased-young-female-doctor-wearing-medical-robe-stethoscope-around-neck-standing-with-closed-posture_409827-254.jpg"} 
                      alt={doctor.firstName} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{doctor.firstName} {doctor.lastName}</h3>
                    <p className="text-blue-600 font-medium mb-1">{doctor.specialization}</p>
                    <p className="text-gray-600 mb-3">{doctor.experience} Years Experience</p>
                    <div className="bg-blue-50 p-2 rounded text-blue-800 font-medium">
                      <span className="font-bold">₹{(doctor.feePerConsultation).toLocaleString()}</span> per consultation
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/doctors" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-300">View All Doctors</Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to prioritize your health?</h2>
            <p className="text-lg mb-8 opacity-90">Join thousands of patients who found the right doctors through DevClinic</p>
            <Link to="/register" className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300">Get Started Now</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold">DevClinic</h3>
              <p className="text-gray-400">Your health, our priority</p>
            </div>
            <div className="text-gray-400">
              <p>&copy; {new Date().getFullYear()} DevClinic. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 