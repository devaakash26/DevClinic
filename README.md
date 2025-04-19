# DevClinic - Healthcare Platform

## Project Overview

DevClinic is a comprehensive healthcare platform that connects patients with doctors, facilitating appointment scheduling, medical record management, and secure communications. The platform aims to streamline healthcare services through a user-friendly interface for both patients and healthcare providers.

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js and Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Email Service**: Nodemailer
- **File Storage**: Cloud-based storage for medical records
- **Third-party Authentication**: Google OAuth
- **Real-time Notifications**: Socket.io

## Project Structure

```
DevClinic/
├── client/                 # Frontend React application
│   ├── public/             # Static files
│   └── src/                # React source code
│       ├── api/            # API service calls
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page components
│       ├── admin/          # Admin dashboard components
│       ├── doctor/         # Doctor dashboard components
│       └── patient/        # Patient dashboard components
├── server/                 # Backend Node.js/Express application
│   ├── cloudConfig/        # Configuration for cloud storage
│   ├── middleware/         # Express middleware
│   ├── models/             # Mongoose data models
│   ├── routes/             # API routes
│   └── utils/              # Utility functions and services
```

## Core Features

### 1. User Authentication System

#### Registration and Login
- **Location**: `client/src/pages/Login.jsx`, `server/routes/userRoutes.js`
- **Features**:
  - Traditional email/password registration
  - Google OAuth integration for quick sign-up/sign-in
  - Email verification process with secure tokens
  - Password reset functionality
  - JWT-based authentication for API calls

#### Email Verification Flow
- **Location**: `server/routes/userRoutes.js` (verify-email endpoint)
- **Process**:
  - User registers and receives verification email
  - Click on verification link updates `isEmailVerified` flag
  - Unverified users cannot log in

### 2. User Roles and Access Control

- **Patient**: Regular users who can book appointments and access their records
- **Doctor**: Healthcare providers who can manage appointments and patient records
- **Admin**: System administrators with full access to manage users and system settings

#### Doctor Application Process
- **Location**: `server/routes/userRoutes.js` (apply-doctor endpoint)
- **Process**:
  - User submits doctor application with credentials
  - Admin reviews and approves/rejects application
  - Email notifications are sent on approval/rejection

### 3. Appointment Management System

#### For Patients
- **Booking**: `client/src/pages/BookAppointment.jsx`
- **Viewing**: `client/src/pages/Appointments.jsx`
- **Features**:
  - Search for doctors by specialization/location
  - Select available time slots
  - Provide reason for visit and medical history
  - Track appointment status (pending, approved, completed)
  - Cancel appointments with notifications to doctor

#### For Doctors
- **Management**: `client/src/doctor/AppointmentManagement.jsx`
- **Features**:
  - View incoming appointment requests
  - Approve or reject appointments with reason
  - Mark appointments as completed
  - Set availability hours and unavailable dates

### 4. Doctor Availability System

- **Location**: `server/models/Doctor.js`, `client/src/doctor/Availability.jsx`
- **Features**:
  - Doctors can set regular working hours
  - Mark dates as unavailable with reason
  - Automatic notification to admin
  - Patients cannot book appointments during unavailable times

### 5. Medical Records Management

- **Location**: `server/models/MedicalRecordModel.js`, `client/src/doctor/MedicalRecords.jsx`
- **Features**:
  - Doctors can upload medical records for patients
  - Different record types (clinical reports, lab tests, prescriptions)
  - Secure storage with access control
  - Email notifications to patients when records are shared

### 6. Notification System

- **In-App Notifications**: `server/routes/userRoutes.js` (notifications endpoint)
- **Email Notifications**: `server/utils/emailService.js`
- **Types**:
  - Appointment requests, approvals, rejections, completions
  - Medical record sharing
  - Doctor availability changes
  - Account status updates

### 7. Feedback and Testimonials

- **Location**: `server/models/FeedbackModel.js`, `client/src/patient/Feedback.jsx`
- **Features**:
  - Patients can rate and review doctors after appointments
  - Rating system with satisfaction levels
  - Option to share feedback as public testimonial
  - Doctors can view their ratings and feedback

## Email Notification System

The DevClinic platform features a comprehensive email notification system that keeps users informed about all platform activities. Every significant action triggers an appropriate email notification, ensuring users stay updated regardless of whether they're actively using the application.

### Email Infrastructure

- **Location**: `server/utils/emailService.js`
- **Template Management**: `server/utils/emailTemplates.js`
- **Features**:
  - Configurable SMTP settings via environment variables
  - Support for various email services (Gmail, Mailtrap, etc.)
  - Error handling with retries for failed emails
  - Logging for debugging purposes
  - Responsive HTML email templates with consistent branding

### Account Management Emails

#### 1. Email Verification
- **Function**: `getEmailVerificationTemplate`, `sendVerificationEmail`
- **Trigger**: New user registration
- **Content**: Verification link with 24-hour expiration
- **Implementation**:
  ```javascript
  // Send verification email
  await sendVerificationEmail(newUser.email, newUser.name, verificationToken);
  ```

#### 2. Password Reset
- **Function**: `getPasswordResetTemplate`, `sendPasswordResetEmail`
- **Trigger**: User requests password reset
- **Content**: Secure reset link with 1-hour expiration and security tips
- **Implementation**:
  ```javascript
  // Send password reset email
  await sendPasswordResetEmail(user.email, user.name, resetToken);
  ```

#### 3. Welcome Email
- **Function**: `welcomeEmailTemplate`, `sendWelcomeEmail`
- **Trigger**: First login after account verification
- **Content**: Platform introduction, feature highlights, getting started guide
- **Database Tracking**: Uses `welcomeEmailSent` boolean flag in user model
- **Implementation**:
  ```javascript
  // Check if welcome email should be sent
  if (!user.welcomeEmailSent) {
      await sendWelcomeEmail(user.email, user.name);
      user.welcomeEmailSent = true;
      await user.save();
  }
  ```

### Appointment Notification Emails

#### 1. Appointment Request
- **Functions**:
  - `appointmentRequestedPatientTemplate`, `sendAppointmentRequestedPatientEmail` (to patient)
  - `appointmentRequestedDoctorTemplate`, `sendAppointmentRequestedDoctorEmail` (to doctor)
- **Trigger**: Patient books new appointment
- **Content**: Appointment details, reason for visit, requested time
- **Implementation**:
  ```javascript
  // Send notification to patient
  await sendAppointmentRequestedPatientEmail(patient.email, patient.name, appointmentDetails);
  
  // Notify doctor about new request
  await sendAppointmentRequestedDoctorEmail(doctor.email, doctor.name, patient.name, appointmentDetails);
  ```

#### 2. Appointment Approval
- **Function**: `appointmentApprovedTemplate`, `sendAppointmentApprovedEmail`
- **Trigger**: Doctor approves appointment request
- **Content**: Confirmation details, appointment ID, preparation instructions
- **Implementation**:
  ```javascript
  await sendAppointmentApprovedEmail(patient.email, patient.name, appointment._id, appointmentDetails);
  ```

#### 3. Appointment Rejection
- **Function**: `appointmentRejectedTemplate`, `sendAppointmentRejectedEmail`
- **Trigger**: Doctor rejects appointment request
- **Content**: Rejection reason, alternative suggestions
- **Implementation**:
  ```javascript
  await sendAppointmentRejectedEmail(patient.email, patient.name, appointmentDetails, rejectionReason);
  ```

#### 4. Appointment Completion
- **Function**: `appointmentCompletedTemplate`, `sendAppointmentCompletedEmail`
- **Trigger**: Doctor marks appointment as completed
- **Content**: Thank you message, feedback request, follow-up information
- **Implementation**:
  ```javascript
  await sendAppointmentCompletedEmail(patient.email, patient.name, appointmentDetails);
  ```

### Doctor-specific Emails

#### 1. Doctor Account Approval
- **Function**: `doctorAccountApprovedTemplate`, `sendDoctorAccountApprovedEmail`
- **Trigger**: Admin approves doctor application
- **Content**: Congratulations, dashboard access instructions, feature overview
- **Implementation**:
  ```javascript
  await sendDoctorAccountApprovedEmail(doctor.email, `${doctor.firstname} ${doctor.lastname}`);
  ```

#### 2. Doctor Account Rejection
- **Function**: `doctorAccountRejectedTemplate`, `sendDoctorAccountRejectedEmail`
- **Trigger**: Admin rejects doctor application
- **Content**: Rejection reason, reapplication instructions, support contact
- **Implementation**:
  ```javascript
  await sendDoctorAccountRejectedEmail(doctor.email, `${doctor.firstname} ${doctor.lastname}`, rejectionReason);
  ```

#### 3. Doctor Unavailability Notifications
- **Functions**:
  - `doctorUnavailableAdminTemplate`, `sendDoctorUnavailableEmailToAdmin` (to admin)
  - `doctorUnavailableConfirmationTemplate`, `sendDoctorUnavailableConfirmationEmail` (to doctor)
- **Trigger**: Doctor marks themselves as unavailable
- **Content**: Unavailability period, reason, impact on appointments
- **Implementation**:
  ```javascript
  // Notify admin
  await sendDoctorUnavailableEmailToAdmin(adminEmails, doctorName, unavailableReason, unavailableDateFormatted);
  
  // Confirm to doctor
  await sendDoctorUnavailableConfirmationEmail(doctor.email, doctorName, unavailableReason, unavailableDateFormatted);
  ```

### Medical Record Emails

#### Medical Record Sharing
- **Function**: `medicalRecordEmailTemplate`, `sendMedicalRecordToPatientEmail`
- **Trigger**: Doctor shares medical record with patient
- **Content**: Record details, secure access link, contextual information
- **Implementation**:
  ```javascript
  await sendMedicalRecordToPatientEmail(patient.email, patient.name, medicalRecord, doctorName);
  ```

### Email Template Design

All email templates follow a consistent design pattern:
- Responsive HTML layout (works on mobile and desktop)
- DevClinic branding with gradient header
- Clear, action-oriented content
- Contextual styling (success messages in green, warnings in orange/red)
- Call-to-action buttons for required user actions
- Fallback text links for accessibility
- Footer with copyright information and additional help resources

## Database Models

### User Model
- **Location**: `server/models/user.js`
- **Fields**:
  - Authentication info (email, password, isEmailVerified)
  - Role info (isDoctor, isAdmin)
  - Notification arrays (seen and unseen)
  - Third-party auth (googleId)
  - Email verification and password reset tokens
  - Welcome email tracking

### Doctor Model
- **Location**: `server/models/Doctor.js`
- **Fields**:
  - Professional info (name, specialization, experience)
  - Contact details (email, phone, website)
  - Location data (address, coordinates)
  - Availability settings (timing, unavailable dates)
  - Consultation fee
  - Approval status

### Appointment Model
- **Location**: `server/models/AppointmentModel.js`
- **Fields**:
  - Patient and doctor references
  - Date and time
  - Reason for visit
  - Medical information (symptoms, history)
  - Status (pending, approved, rejected, completed)
  - Feedback status

### Medical Record Model
- **Location**: `server/models/MedicalRecordModel.js`
- **Fields**:
  - Patient and doctor references
  - Record type (clinical, lab, prescription)
  - File information (URL, type, name)
  - Description and metadata
  - Access control settings

### Feedback Model
- **Location**: `server/models/FeedbackModel.js`
- **Fields**:
  - Appointment reference
  - Rating and satisfaction level
  - Comments
  - Testimonial visibility settings

## API Routes

### User Routes
- **Location**: `server/routes/userRoutes.js`
- **Endpoints**:
  - `/register`: New user registration
  - `/login`: User authentication
  - `/google-signin`: Google OAuth authentication
  - `/verify-email/:token`: Email verification
  - `/reset-password`: Password reset process
  - `/get-user-info`: Fetch user profile data
  - `/apply-doctor`: Doctor application submission

### Doctor Routes
- **Location**: `server/routes/doctorRoutes.js` (if separate)
- **Endpoints**:
  - Getting doctor profiles and listings
  - Managing doctor availability
  - Approving/rejecting doctor applications (admin)
  - Toggling doctor availability status

### Appointment Routes
- **Location**: Within `server/routes/userRoutes.js` or separate
- **Endpoints**:
  - `/book-appointment`: Create new appointment request
  - `/appointments`: Get user appointments
  - `/approve-appointment`: Doctor approval endpoint
  - `/reject-appointment`: Doctor rejection endpoint
  - `/complete-appointment`: Mark as completed
  - `/cancel-appointment`: Patient cancellation

### Medical Record Routes
- **Location**: Within user routes or separate
- **Endpoints**:
  - Upload and management of medical records
  - Sharing records with patients
  - Patient access to their records

## Frontend Pages and Components

### Public Pages
- Login/Register: `client/src/pages/Login.jsx`
- Home/Landing: `client/src/pages/Home.jsx`
- Doctor Listings: `client/src/pages/Doctors.jsx`
- Email Verification: `client/src/pages/VerifyEmail.jsx`

### Patient Dashboard
- Appointment Booking: `client/src/pages/BookAppointment.jsx`
- My Appointments: `client/src/pages/Appointments.jsx`
- Medical Records: `client/src/patient/MedicalRecords.jsx`
- Profile Management: `client/src/patient/Profile.jsx`

### Doctor Dashboard
- Appointment Management: `client/src/doctor/AppointmentManagement.jsx`
- Patient Records: `client/src/doctor/PatientRecords.jsx`
- Availability Settings: `client/src/doctor/Availability.jsx`
- Profile Management: `client/src/doctor/Profile.jsx`

### Admin Dashboard
- User Management: `client/src/admin/Users.jsx`
- Doctor Applications: `client/src/admin/DoctorApplications.jsx`
- System Settings: `client/src/admin/Settings.jsx`

## Security Features

- JWT-based authentication with expiration
- Password hashing with bcrypt
- CORS protection
- Input validation and sanitization
- Protected routes with middleware
- Email verification requirement
- Secure password reset flow

## Deployment Configuration

### Environment Variables
- Database connection: `MONGODB_URI`
- JWT secret: `JWT_SECRET`
- Email configuration:
  - `EMAIL_HOST`: SMTP server host
  - `EMAIL_PORT`: SMTP server port
  - `EMAIL_USER`: SMTP username
  - `EMAIL_PASS`: SMTP password
  - `EMAIL_FROM`: From address for emails
- Google OAuth:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- App configuration:
  - `CLIENT_URL`: Frontend URL
  - `PORT`: Backend server port

## Getting Started

### Installation
1. Clone the repository
2. Install dependencies for both client and server:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```
3. Create `.env` file in server directory with required environment variables
4. Start development servers:
   ```bash
   # In server directory
   npm run dev
   
   # In client directory
   npm start
   ```

### Development Workflow
1. Backend API changes should be made in the appropriate route files
2. Frontend changes should follow the component structure
3. New email templates should be added to `emailTemplates.js` and exposed through `emailService.js`
4. Database model changes require careful consideration of existing data

## Troubleshooting

### Common Issues
1. **Email Not Sending**:
   - Check email server configuration in `.env`
   - Verify SMTP credentials
   - Look for errors in server logs
   
2. **Authentication Problems**:
   - Ensure JWT_SECRET is properly set
   - Check token expiration settings
   - Verify email verification status for the user

3. **Appointment Booking Issues**:
   - Confirm doctor availability for selected time
   - Check if all required fields are provided
   - Verify user has completed profile information

## Contributing

1. Create feature branches from `develop`
2. Follow the established code patterns and naming conventions
3. Add appropriate tests for new functionality
4. Create pull requests with clear descriptions of changes

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is prohibited. 