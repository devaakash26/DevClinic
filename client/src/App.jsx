import React, { useEffect } from 'react';
import { Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import ApplyDoctor from './applyDoctor/ApplyDoctor';
import Notification from './Notifications/Notification';
import User from './admin/user/User';
import DoctorList from './admin/doctorList/DoctorList';
import DoctorApplicationReview from './admin/doctorList/DoctorApplicationReview';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { Toaster } from 'react-hot-toast';
import './index.css';
import './App.css';
import Profile from './doctor/Profile';
import BookAppoitnment from './pages/BookAppoitnment';
import Patient from './doctor/Patient';
import Doctors from './pages/Doctors';
import LandingPage from './pages/LandingPage';
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyEmailNotice from "./pages/VerifyEmailNotice";
import UserProfile from './pages/UserProfile';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import AppointmentsManagement from './pages/admin/AppointmentsManagement';
import PatientRecords from './pages/admin/PatientRecords';
import PatientAppointments from './pages/patient/PatientAppointments';
import DoctorMedicalRecords from './pages/DoctorMedicalRecords';
import PatientMedicalRecords from './pages/patient/PatientMedicalRecords';
import Contact from './pages/Contact';
import AdminMedicalRecords from './pages/admin/AdminMedicalRecords';

const App = () => {
  const { loading } = useSelector((state) => state.loading);
  const { user } = useSelector((state) => state.user);
  const isAuthenticated = localStorage.getItem("token") !== null;

  return (
    <>
      {loading && (
        <div className="spinner-parent">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      <Toaster position="top-center" reverseOrder={false} />

      <Routes>
        {/* Public routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/verify-email-notice" element={<VerifyEmailNotice />} />
        
        {/* Home route - shows authenticated Home or LandingPage based on authentication */}
        <Route path="/home" element={
          isAuthenticated ? <ProtectedRoute><Home /></ProtectedRoute> : <LandingPage />
        } />
        
        {/* Other protected routes */}
        <Route path="/apply-doctor" element={<ProtectedRoute><ApplyDoctor /></ProtectedRoute>} />
        {/* <Route path="/notification" element={<ProtectedRoute><Notification /></ProtectedRoute>} /> */}
        <Route path="/notifications/:userId" element={<ProtectedRoute><Notification /></ProtectedRoute>} />
        <Route path="/bookAppointment/:doctorId" element={<ProtectedRoute><BookAppoitnment /></ProtectedRoute>} />
        <Route path="/doctors" element={<ProtectedRoute><Doctors /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><PatientAppointments /></ProtectedRoute>} />
        <Route path="/medical-records" element={<ProtectedRoute><PatientMedicalRecords /></ProtectedRoute>} />
        <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />

        <Route path="/admin/*" element={<AdminRoute user={user} />} />
        <Route path="/doctor/*" element={<DoctorRoute user={user} />} />

        {/* Root path redirects to /home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
};

const AdminRoute = ({ user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate('/home');
    }
  }, [user, navigate]);

  return (
    <Routes>
      <Route path="user-list" element={<ProtectedRoute><User /></ProtectedRoute>} />
      <Route path="doctor-list" element={<ProtectedRoute><DoctorList /></ProtectedRoute>} />
      <Route path="doctor-application/:doctorId" element={<ProtectedRoute><DoctorApplicationReview /></ProtectedRoute>} />
      <Route path="appointments" element={<ProtectedRoute><AppointmentsManagement /></ProtectedRoute>} />
      <Route path="patient-records" element={<ProtectedRoute><PatientRecords /></ProtectedRoute>} />
      <Route path="medical-records" element={<ProtectedRoute><AdminMedicalRecords /></ProtectedRoute>} />
      <Route path="*" element={<ProtectedRoute><Home /></ProtectedRoute>} />
    </Routes>
  );
};

const DoctorRoute = ({ user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user.isDoctor) {
      navigate("/home");
    }
  }, [user, navigate]);
  return (
    <Routes>
      <Route path="doctor-profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="patient/:id" element={<ProtectedRoute><Patient /></ProtectedRoute>} />
      <Route path="appointments" element={<ProtectedRoute><DoctorAppointments /></ProtectedRoute>} />
      <Route path="medical-records" element={<ProtectedRoute><DoctorMedicalRecords /></ProtectedRoute>} />
    </Routes>

  )
}
export default App;
