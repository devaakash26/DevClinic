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
- **Real-time Communications**: 
  - Socket.io for real-time chat system
  - Real-time notifications and status updates
- **Testing**:
  - **Frontend Testing**: Vitest, React Testing Library, jsdom
  - **Backend Testing**: Supertest, Jest
  - **Test Coverage**: V8 Coverage
  - **UI Component Testing**: Testing Library
  - **Mocking**: Vitest mocking utilities

## Project Structure

```
DevClinic/
├── client/                      # Frontend React application
│   ├── public/                  # Static files and assets
│   └── src/                     # React source code
│       ├── api/                 # API service calls
│       ├── components/          # Reusable UI components
│       │   ├── sidebar/         # Sidebar navigation components
│       │   ├── payment/         # Payment related components
│       │   └── ChatWidget/      # Chat system components
│       ├── pages/               # Page components
│       ├── admin/               # Admin dashboard components
│       ├── doctor/              # Doctor dashboard components
│       ├── patient/             # Patient dashboard components
│       ├── utils/               # Utility functions
│       │   └── socketUtils.js   # Socket.io connection management
│       ├── services/            # Service layer for business logic
│       ├── styles/              # CSS stylesheets
│       │   └── ChatWidget.css   # Chat system styling
│       ├── test/                # Test files
│       │   ├── components/      # Component tests
│       │   ├── pages/           # Page component tests
│       │   └── utils/           # Utility function tests
│       └── store/               # Redux store configuration
├── server/                      # Backend Node.js/Express application
│   ├── cloudConfig/             # Configuration for cloud storage
│   ├── middleware/              # Express middleware
│   ├── models/                  # Mongoose data models
│   │   └── ChatModel.js         # Chat and message schema
│   ├── routes/                  # API routes
│   │   └── chatRoutes.js        # Chat-related API endpoints
│   ├── controllers/             # API controllers
│   │   └── chatController.js    # Chat functionality implementation
│   ├── utils/                   # Utility functions and services
│   └── tests/                   # Server-side tests
│       ├── unit/                # Unit tests
│       └── integration/         # API integration tests
└── docs/                        # Documentation files
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

### 8. Real-Time Chat System

The DevClinic platform includes a professional WhatsApp-like chat system that enables real-time communication between patients, doctors, and administrators.

#### Architecture
- **Frontend**: `client/src/components/ChatWidget.jsx`, `client/src/styles/ChatWidget.css`
- **Backend**: `server/controllers/chatController.js`, `server/models/ChatModel.js`, `server/routes/chatRoutes.js`
- **Socket Connection**: `client/src/utils/socketUtils.js`
- **Real-time Integration**: Socket.io for instant message delivery and online status

#### Features
- **WhatsApp-like Interface**: Professional and familiar chat design
- **Real-time Messaging**: Instant message delivery with read receipts
- **User Status Indicators**: Shows online/offline status for all users
- **Typing Indicators**: Displays when someone is typing a message
- **Message Grouping**: Groups messages by date (Today, Yesterday, etc.)
- **Notification System**: Previews of new messages with sender information
- **Persistent History**: All messages are stored and retrieved from database
- **Unread Message Counter**: Shows number of unread messages per conversation
- **Emoji Support**: Full emoji picker for expressive communication
- **Mobile Responsive**: Works seamlessly on all device sizes

#### Technical Implementation
- **Socket.io Integration**:
  ```javascript
  // Server-side socket setup
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // User authenticated and connected
    socket.on('user_connected', (userData) => {
      // Add user to online users list
      onlineUsers.set(userData.userId, {
        socketId: socket.id,
        userId: userData.userId,
        userName: userData.userName
      });
      
      // Broadcast updated online users list
      io.emit('online_users', Array.from(onlineUsers.values()));
    });
    
    // Handle real-time messaging
    socket.on('send_message', async (messageData) => {
      // Emit to specific chat room
      io.to(messageData.chatId).emit('receive_message', messageData);
    });
    
    // Typing indicators
    socket.on('typing', (data) => {
      socket.to(data.chatId).emit('typing', data);
    });
  });
  ```

- **Database Schema**:
  ```javascript
  // Chat Model Schema
  const chatSchema = new mongoose.Schema({
    participants: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'user' 
    }],
    messages: [{
      sender: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        name: String
      },
      message: String,
      timestamp: { type: Date, default: Date.now },
      read: { type: Boolean, default: false }
    }],
    lastMessage: String,
    lastMessageTimestamp: Date,
    unreadCount: { type: Number, default: 0 }
  }, { timestamps: true });
  ```

#### User Experience
- **Floating Chat Widget**: Pinned to the bottom-right corner for easy access
- **Message Bubbles**: Different styles for sent vs received messages
- **Empty States**: Helpful guidance when no conversations exist
- **Conversation List**: Shows recent conversations with message previews and timestamps
- **Modern UI Elements**: Gradient backgrounds, animations, and shadows
- **Error Handling**: Automatic reconnection and graceful degradation if connection is lost

#### Security Considerations
- **Authentication Required**: Only authenticated users can access chat system
- **Private Conversations**: Messages are only visible to conversation participants
- **Secure Connections**: All socket communications occur over secure WebSocket connections
- **Database Protection**: Chat data is protected with the same security as medical records

#### API Endpoints
- `GET /api/chat/chats`: Retrieves all chats for the current user
- `POST /api/chat/chat`: Creates or retrieves a chat between two users
- `POST /api/chat/send-message`: Saves a new message to the database
- `GET /api/chat/messages/:chatId`: Gets all messages for a specific chat
- `GET /api/chat/online-users`: Returns list of currently online users

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

### Environment Variables Reference

The DevClinic application requires the following environment variables to be set up properly. Create a `.env` file in the server directory with these variables:

```
# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend URL (for CORS and email links)
CLIENT_URL=http://localhost:5173

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/devclinic
MONGODB_TEST_URI=mongodb://localhost:27017/devclinic_test

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d
# Email Configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
EMAIL_FROM=noreply@devclinic.com
EMAIL_FROM_NAME=DevClinic

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# File Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payment Gateway (if applicable)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Testing Configuration
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword

# Socket.io Configuration (for Chat System)
SOCKET_CORS_ORIGIN=http://localhost:5173
SOCKET_PATH=/socket.io
SOCKET_PING_INTERVAL=25000
SOCKET_PING_TIMEOUT=10000
SOCKET_RECONNECTION_ATTEMPTS=5
```

#### Required vs Optional Variables

- **Required for basic functionality**:
  - `PORT`, `NODE_ENV`, `CLIENT_URL`
  - `MONGODB_URI`
  - `JWT_SECRET`, `JWT_EXPIRY`
  - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`

- **Required for chat functionality**:
  - `SOCKET_CORS_ORIGIN`: The allowed origin for Socket.io connections
  - `SOCKET_PATH`: The endpoint path for Socket.io (default: /socket.io)
  - `SOCKET_PING_INTERVAL`: How often to ping clients to maintain connection
  - `SOCKET_PING_TIMEOUT`: How long to wait for a ping response before disconnecting
  - `SOCKET_RECONNECTION_ATTEMPTS`: Number of reconnection attempts before giving up

- **Required for specific features**:
  - Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  - File uploads: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - Payments: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

#### Development vs Production

In production environments, additional considerations apply:

1. Use strong, unique secrets for `JWT_SECRET`, `COOKIE_SECRET`
2. Set `NODE_ENV=production`
3. Configure proper CORS settings with production URLs
4. Use secure email credentials with appropriate rate limits
5. Enable HTTPS for all endpoints

#### Testing Environment

For testing, the application uses separate configurations:

1. `MONGODB_TEST_URI` points to a separate test database
2. `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are used for API testing
3. In test mode, email sending is typically mocked

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

## Testing Framework

DevClinic implements a comprehensive testing strategy to ensure code quality, reliability, and a smooth user experience. The project leverages modern testing tools and methodologies for both frontend and backend components.

### Testing Stack

- **Testing Library**: Vitest with React Testing Library
- **Coverage Reports**: V8 for code coverage analytics
- **Component Testing**: Unit and integration tests for React components
- **API Testing**: Backend API endpoint testing with supertest
- **Mock Data**: Fixtures and mock services for consistent test environments

### Test Structure

```
DevClinic/
├── client/                          # Frontend React application
│   ├── src/                         
│       ├── test/                    # Test directory
│           ├── setup.js             # Global test setup
│           ├── components/          # Component tests
│           ├── pages/               # Page tests
│           ├── hooks/               # Custom hooks tests
│           └── utils/               # Utility function tests
├── server/                          # Backend Node.js/Express application
    ├── tests/                       
        ├── unit/                    # Unit tests for backend functions
        ├── integration/             # API integration tests
        ├── fixtures/                # Test data fixtures
        └── setup.js                 # Test environment setup
```

### Frontend Testing (Client)

The frontend tests are located in `client/src/test/` and are organized to mirror the application structure. Each test file focuses on a specific component, page, or utility function.

#### Test Categories

Our frontend testing approach divides tests into key categories:

1. **Unit Tests**: Verify that individual components and functions work correctly in isolation.
2. **Integration Tests**: Test how components interact with each other and external services.
3. **Performance Tests**: Ensure components render efficiently within specified time constraints.
4. **Security Tests**: Validate that components handle sensitive data appropriately.

#### Component Test Structure

Each component test file follows a consistent structure:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentName from '../../components/ComponentName';

describe('ComponentName Tests', () => {
  // Unit Tests
  describe('Unit Tests', () => {
    it('should render correctly', () => {
      // Test component rendering
    });
    
    it('should handle user interactions', () => {
      // Test button clicks, form submissions, etc.
    });
  });

  // Integration Tests
  describe('Integration Tests', () => {
    it('should work with Redux store', () => {
      // Test component with Redux integration
    });
  });

  // Performance Tests
  describe('Performance Tests', () => {
    it('should render within performance budget', () => {
      // Test rendering performance
    });
  });

  // Security Tests
  describe('Security Tests', () => {
    it('should not expose sensitive data', () => {
      // Test proper handling of sensitive information
    });
  });
});
```

#### Test Setup

The global test setup in `client/src/test/setup.js` configures the testing environment:

```javascript
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Add custom matchers
expect.extend(matchers);

// Mock browser APIs that might not be available in test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Clean up after each test
afterEach(() => {
  cleanup();
});
```

#### Testing External Dependencies

For components that use external dependencies (APIs, Redux, etc.), we implement mocks:

```javascript
// Mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      user: (state = { user: null }, action) => {
        // Mock reducer logic
      },
    },
    preloadedState: initialState,
  });
};

// Mock API calls
vi.mock('axios');
vi.mock('../../utils/apiUtils', () => ({
  api: { 
    post: vi.fn(),
    get: vi.fn()
  }
}));
```

#### Running Tests

Frontend tests can be run with:

```bash
# Run all tests
cd client
npm test

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- src/test/components/ComponentName.test.jsx
```

### Backend Testing (Server)

Backend tests focus on API endpoints, data models, and utility functions. They ensure the server responds correctly to different requests and handles edge cases appropriately.

#### Test Categories

1. **Unit Tests**: Focus on individual functions and middleware.
2. **Integration Tests**: Test complete API flows across multiple endpoints.
3. **Model Tests**: Validate data models, schemas, and validators.
4. **Authentication Tests**: Ensure proper protection of routes and resources.

#### Example API Test

```javascript
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/userModel');

describe('User API', () => {
  beforeAll(async () => {
    // Set up test database connection
  });

  afterAll(async () => {
    // Clean up test database
  });

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/user/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'securepassword',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('registered successfully');
  });
});
```

### Continuous Integration

Tests are integrated into our CI/CD pipeline to ensure code quality before deployment:

1. **Pre-commit Hooks**: Run tests related to changed files.
2. **CI Pipeline**: Run complete test suite on pull requests.
3. **Coverage Reports**: Generate and track test coverage metrics.

### Best Practices for Testing

1. **Isolate Tests**: Each test should be independent with no shared state.
2. **Mock External Dependencies**: Use mocks for APIs, databases, and third-party services.
3. **Test User Workflows**: Focus on key user journeys through the application.
4. **Avoid Implementation Details**: Test behavior, not implementation.
5. **Maintain Test Data**: Keep test fixtures updated as the application evolves.

With this comprehensive testing approach, DevClinic maintains high code quality and reliability even as the codebase grows and evolves. 