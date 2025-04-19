// API endpoint configuration for the application
import { getApiUrl } from './apiService';

// Define all API endpoints here for better maintainability
const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: 'user/login',
    REGISTER: 'user/register',
    GOOGLE_LOGIN: 'user/google-signin',
    VERIFY_EMAIL: (token) => `user/verify-email/${token}`,
    RESEND_VERIFICATION: 'user/resend-verification',
    FORGOT_PASSWORD: 'user/forgot-password',
    RESET_PASSWORD: 'user/reset-password',
    VERIFY_RESET_TOKEN: (token) => `user/verify-reset-token/${token}`,
  },
  
  // User endpoints
  USER: {
    PROFILE: 'user/update-profile',
    UPLOAD_PROFILE_PICTURE: 'user/upload-profile-picture',
    UPDATE_PASSWORD: 'user/update-password',
    DELETE_ACCOUNT: 'user/delete-account',
    PATIENT_MEDICAL_RECORDS: 'user/patient-medical-records',
    GET_APPOINTMENTS: 'user/get-user-appointments',
    CANCEL_APPOINTMENT: 'user/cancel-appointment',
    GET_APPOINTMENT_FEEDBACK: (appointmentId) => `user/get-appointment-feedback?appointmentId=${appointmentId}`,
    SUBMIT_FEEDBACK: 'user/submit-feedback',
    BOOK_APPOINTMENT: 'user/book-appointment',
    CHECK_BOOKED_SLOTS: 'user/check-booked-slots',
    CHECK_BOOK_AVAILABILITY: 'user/check-book-availability',
    GET_PATIENT_INFO: 'user/get-patient-info',
  },
  
  // Doctor endpoints
  DOCTOR: {
    GET_ALL_APPROVED: 'user/get-all-aproved-doctor',
    GET_DOCTOR_INFO: 'doctor/get-doctor-info',
    GET_DOCTOR_BY_ID: (doctorId) => `doctor/get-doctor-info-by-id?doctorId=${doctorId}`,
    UPDATE_PROFILE: 'doctor/update-doctor-profile',
    GET_APPOINTMENTS: 'doctor/appointments',
    APPROVED_APPOINTMENTS: 'doctor/approved-appointments',
    GET_DOCTOR_APPOINTMENTS: (doctorId) => `doctor/get-doctor-appointments/${doctorId}`,
    UPDATE_APPOINTMENT_STATUS: 'doctor/update-appointment-status',
    DELETE_APPOINTMENT: 'doctor/delete-appointment',
    GET_PATIENT_LIST: 'doctor/get-patient-list',
    DOWNLOAD_PATIENTS_EXCEL: 'doctor/download-patients-excel',
    MEDICAL_RECORDS: 'doctor/medical-records',
    PATIENT_MEDICAL_RECORDS: 'doctor/patient-medical-records',
    MEDICAL_RECORDS_BY_APPOINTMENT: (appointmentId) => `doctor/medical-records-by-appointment/${appointmentId}`,
    EMAIL_MEDICAL_RECORD: (recordId) => `doctor/email-medical-record/${recordId}`,
    UPDATE_AVAILABILITY: 'doctor/update-availability',
    GET_TESTIMONIALS: 'doctor/get-doctor-testimonials',
  },
  
  // Admin endpoints
  ADMIN: {
    GET_ALL_DOCTORS: 'admin/get-all-doctors',
    APPOINTMENTS: 'admin/appointments',
    PATIENT_RECORDS: 'admin/patient-records',
    MEDICAL_RECORDS: 'admin/medical-records',
  },
  
  // Notification endpoints
  NOTIFICATIONS: {
    GET_USER_NOTIFICATIONS: (userId) => `user/notifications/${userId}`,
    MARK_ALL_SEEN: 'user/mark-as-all-seen',
    MARK_SEEN: 'user/mark-notification-seen',
    DELETE_ALL: 'user/delete-all-notification',
    DELETE_ONE: 'user/delete-notification',
    GET_USER_BY_ID: 'user/get-user-info-by-id',
    TEST_NOTIFICATION: 'user/test-notification',
  },
  
  // Support endpoints
  SUPPORT: {
    CONTACT: 'support/contact',
  },
  
  // Debug endpoints
  DEBUG: {
    SOCKET_STATUS: 'debug/socket-status',
  }
};

// Helper function to get complete URLs with base URL included
export const getUrl = (endpoint) => {
  return getApiUrl(endpoint);
};

// Create a function that returns the endpoint from this config
export const getEndpoint = (category, name, ...params) => {
  const endpoint = API_ENDPOINTS[category][name];
  
  // If endpoint is a function (for parameterized URLs), call it with params
  if (typeof endpoint === 'function') {
    return endpoint(...params);
  }
  
  return endpoint;
};

export default API_ENDPOINTS; 