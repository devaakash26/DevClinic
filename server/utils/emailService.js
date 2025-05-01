const nodemailer = require('nodemailer');
const { getEmailVerificationTemplate, getPasswordResetTemplate, appointmentRequestedPatientTemplate, appointmentRequestedDoctorTemplate, appointmentApprovedTemplate, appointmentRejectedTemplate, appointmentCompletedTemplate, doctorUnavailableAdminTemplate, doctorUnavailableConfirmationTemplate, medicalRecordEmailTemplate, doctorAccountApprovedTemplate, doctorAccountRejectedTemplate, welcomeEmailTemplate, videoConsultationPatientTemplate, videoConsultationDoctorTemplate, videoConsultationReminderTemplate } = require('./emailTemplates');
const moment = require('moment');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // For development/testing purposes, you can use services like Mailtrap
  // In production, you'd use an actual email service like Gmail, SendGrid, etc.
  const host = process.env.EMAIL_HOST || 'smtp.mailtrap.io';
  const port = process.env.EMAIL_PORT || 2525;
  const user = process.env.EMAIL_USER || 'your_mailtrap_user';
  const pass = process.env.EMAIL_PASS || 'your_mailtrap_password';
  
  console.log('Email configuration:', {
    host,
    port,
    auth: {
      user: user ? (user.length > 3 ? user.substring(0, 3) + '...' : user) : 'not set',
      pass: pass ? '********' : 'not set'
    }
  });
  
  // Common retry options for connection resilience
  const transporterOptions = {
    pool: true, // Use connection pool
    maxConnections: 3,
    maxMessages: 50,
    rateDelta: 1000,
    rateLimit: 3, // Limit to 3 messages per second (reduced from 5)
    socketTimeout: 60000, // 60 seconds timeout (increased from 30)
    connectionTimeout: 60000, // 60 seconds connection timeout (increased from 30)
  };
  
  // Gmail specific configuration
  if (host.includes('gmail')) {
    console.log('Using Gmail specific configuration with port:', port);
    return nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: parseInt(port, 10),
      secure: port == 465, // Use SSL only if port is 465
      auth: {
        user,
        pass
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false
      },
      debug: true, // Enable debug output
      logger: true, // Log information to the console
      ...transporterOptions
    });
  }
  
  // Default SMTP configuration for other providers
  return nodemailer.createTransport({
    host,
    port,
    auth: {
      user,
      pass
    },
    ...transporterOptions
  });
};

/**
 * Send Email Verification Link
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (email, name, token) => {
  // Validate and clean up email address
  if (!email || typeof email !== 'string') {
    console.error(`Invalid email address: ${email}`);
    return false;
  }
  
  // Trim whitespace and validate basic email format
  const cleanedEmail = email.trim();
  if (!cleanedEmail.includes('@') || !cleanedEmail.includes('.')) {
    console.error(`Email has invalid format: ${cleanedEmail}`);
    return false;
  }
  
  console.log(`Attempting to send verification email to: ${cleanedEmail}`);
  
  // Set up retry logic
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount < maxRetries) {
    try {
      const transporter = createTransporter();
      
      // Generate verification link
      const verificationLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${token}`;
      
      // Get HTML email template
      const htmlContent = getEmailVerificationTemplate(name, verificationLink);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
        to: cleanedEmail,
        subject: 'Verify Your DevClinic Account',
        html: htmlContent,
        text: `Hello ${name},\n\nPlease verify your email by clicking on the following link: ${verificationLink}\n\nThis link will expire in 24 hours.\n\nThank you,\nThe DevClinic Team`,
        priority: 'high'
      };
      
      console.log(`Mail options prepared for verification email (attempt ${retryCount + 1}): ${cleanedEmail}`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`Verification email sent to: ${cleanedEmail}, messageId: ${info.messageId}`);
      return true;
    } catch (error) {
      lastError = error;
      retryCount++;
      console.error(`Error sending verification email (attempt ${retryCount}):`, error.message);
      
      // If we still have retries left, wait before trying again
      if (retryCount < maxRetries) {
        console.log(`Retrying in ${retryCount * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
      }
    }
  }
  
  // If we get here, all retries failed
  console.error(`Failed to send verification email after ${maxRetries} attempts. Last error:`, lastError);
  console.error('Error details:', {
    code: lastError.code,
    command: lastError.command,
    responseCode: lastError.responseCode,
    message: lastError.message
  });
  return false;
};

/**
 * Send Password Reset Link
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} token - Reset token
 */
const sendPasswordResetEmail = async (email, name, token) => {
  try {
    const transporter = createTransporter();
    
    // Generate reset link
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}?email=${email}`;
    
    // Get HTML email template
    const htmlContent = getPasswordResetTemplate(name, resetLink);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: email,
      subject: 'Reset Your DevClinic Password',
      html: htmlContent,
      text: `Hello ${name},\n\nYou requested a password reset. Please click the following link to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nThank you,\nThe DevClinic Team`
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

// Send appointment request confirmation to patient
const sendAppointmentRequestedPatientEmail = async (patientEmail, patientName, appointmentDetails) => {
  // Validate and clean up email address
  if (!patientEmail || typeof patientEmail !== 'string') {
    console.error(`Invalid patient email address: ${patientEmail}`);
    return false;
  }
  
  // Trim whitespace and validate basic email format
  const cleanedEmail = patientEmail.trim();
  if (!cleanedEmail.includes('@') || !cleanedEmail.includes('.')) {
    console.error(`Patient email has invalid format: ${cleanedEmail}`);
    return false;
  }
  
  console.log(`Attempting to send email to patient: ${cleanedEmail}`);
  console.log('Appointment details for email:', JSON.stringify(appointmentDetails, null, 2));
  
  // Set up retry logic
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount < maxRetries) {
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
        to: cleanedEmail,
        subject: 'Your Appointment Request - DevClinic',
        html: appointmentRequestedPatientTemplate(patientName, appointmentDetails),
        // Add high priority for better delivery
        priority: 'high'
      };

      console.log(`Mail options prepared for patient email (attempt ${retryCount + 1}): ${cleanedEmail}`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`Appointment request confirmation email sent to patient: ${cleanedEmail}, messageId: ${info.messageId}`);
      return true;
    } catch (error) {
      lastError = error;
      retryCount++;
      console.error(`Error sending patient email (attempt ${retryCount}):`, error.message);
      
      // If we still have retries left, wait before trying again
      if (retryCount < maxRetries) {
        console.log(`Retrying in ${retryCount * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
      }
    }
  }
  
  // If we get here, all retries failed
  console.error(`Failed to send patient email after ${maxRetries} attempts. Last error:`, lastError);
  console.error('Error details:', {
    code: lastError.code,
    command: lastError.command,
    responseCode: lastError.responseCode,
    message: lastError.message
  });
  return false;
};

// Notify doctor about new appointment request
const sendAppointmentRequestedDoctorEmail = async (doctorEmail, doctorName, patientName, appointmentDetails) => {
  try {
    // Validate and clean up email address
    if (!doctorEmail || typeof doctorEmail !== 'string') {
      console.error(`Invalid doctor email address: ${doctorEmail}`);
      return false;
    }
    
    // Trim whitespace and validate basic email format
    const cleanedEmail = doctorEmail.trim();
    if (!cleanedEmail.includes('@') || !cleanedEmail.includes('.')) {
      console.error(`Doctor email has invalid format: ${cleanedEmail}`);
      return false;
    }
    
    console.log(`Attempting to send email to doctor: ${cleanedEmail}`);
    console.log('Appointment details for email:', JSON.stringify(appointmentDetails, null, 2));
    
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: cleanedEmail,
      subject: 'New Appointment Request - DevClinic',
      html: appointmentRequestedDoctorTemplate(doctorName, patientName, appointmentDetails)
    };

    console.log(`Mail options prepared for doctor email: ${cleanedEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Appointment request notification email sent to doctor: ${cleanedEmail}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending appointment request email to doctor ${doctorEmail}:`, error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message
    });
    return false;
  }
};

// Send appointment approval notification to patient
const sendAppointmentApprovedEmail = async (patientEmail, patientName, appointmentId, appointmentDetails) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: patientEmail,
      subject: 'Appointment Approved - DevClinic',
      html: appointmentApprovedTemplate(patientName, appointmentId, appointmentDetails)
    };

    await transporter.sendMail(mailOptions);
    console.log(`Appointment approval email sent to patient: ${patientEmail}`);
    return true;
  } catch (error) {
    console.error(`Error sending appointment approval email: ${error.message}`);
    return false;
  }
};

// Send appointment rejection notification to patient
const sendAppointmentRejectedEmail = async (patientEmail, patientName, appointmentDetails, rejectionReason) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: patientEmail,
      subject: 'Appointment Update - DevClinic',
      html: appointmentRejectedTemplate(patientName, appointmentDetails, rejectionReason)
    };

    await transporter.sendMail(mailOptions);
    console.log(`Appointment rejection email sent to patient: ${patientEmail}`);
    return true;
  } catch (error) {
    console.error(`Error sending appointment rejection email: ${error.message}`);
    return false;
  }
};

// Send appointment completion notification to patient
const sendAppointmentCompletedEmail = async (patientEmail, patientName, appointmentDetails) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: patientEmail,
      subject: 'Treatment Completed - DevClinic',
      html: appointmentCompletedTemplate(patientName, appointmentDetails)
    };

    await transporter.sendMail(mailOptions);
    console.log(`Appointment completion email sent to patient: ${patientEmail}`);
    return true;
  } catch (error) {
    console.error(`Error sending appointment completion email: ${error.message}`);
    return false;
  }
};

// Send notification to admin when doctor marks themselves as unavailable
const sendDoctorUnavailableEmailToAdmin = async (adminEmails, doctorName, unavailableReason, unavailableUntil) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: adminEmails.join(','), // Send to multiple admin emails
      subject: 'Doctor Unavailability Notification - DevClinic',
      html: doctorUnavailableAdminTemplate(doctorName, unavailableReason, unavailableUntil)
    };

    await transporter.sendMail(mailOptions);
    console.log(`Doctor unavailability notification email sent to admin(s): ${adminEmails.join(', ')}`);
    return true;
  } catch (error) {
    console.error(`Error sending doctor unavailability email to admin: ${error.message}`);
    return false;
  }
};

// Send confirmation to doctor about their unavailability status
const sendDoctorUnavailableConfirmationEmail = async (doctorEmail, doctorName, unavailableReason, unavailableUntil) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: doctorEmail,
      subject: 'Service Unavailability Confirmation - DevClinic',
      html: doctorUnavailableConfirmationTemplate(doctorName, unavailableReason, unavailableUntil)
    };

    await transporter.sendMail(mailOptions);
    console.log(`Unavailability confirmation email sent to doctor: ${doctorEmail}`);
    return true;
  } catch (error) {
    console.error(`Error sending unavailability confirmation email to doctor: ${error.message}`);
    return false;
  }
};

// Send medical record to patient
const sendMedicalRecordToPatientEmail = async (patientEmail, patientName, medicalRecord, doctorName) => {
  // Validate and clean up email address
  if (!patientEmail || typeof patientEmail !== 'string') {
    console.error(`Invalid patient email address: ${patientEmail}`);
    return false;
  }
  
  // Trim whitespace and validate basic email format
  const cleanedEmail = patientEmail.trim();
  if (!cleanedEmail.includes('@') || !cleanedEmail.includes('.')) {
    console.error(`Patient email has invalid format: ${cleanedEmail}`);
    return false;
  }
  
  console.log(`Attempting to send medical record email to patient: ${cleanedEmail}`);
  console.log(`Medical record details: ID=${medicalRecord._id}, Title=${medicalRecord.title}, Type=${medicalRecord.recordType}`);
  
  // Set up retry logic
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount < maxRetries) {
    try {
      const transporter = createTransporter();
      
      // Generate HTML content
      const htmlContent = medicalRecordEmailTemplate(patientName, medicalRecord, doctorName);
      console.log(`Generated email HTML content (length: ${htmlContent.length} characters)`);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
        to: cleanedEmail,
        subject: `Medical Record: ${medicalRecord.title} - DevClinic`,
        html: htmlContent,
        // Add high priority for better delivery
        priority: 'high'
      };

      console.log(`Mail options prepared for medical record email (attempt ${retryCount + 1}): ${cleanedEmail}`);
      
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log(`Medical record email sent to patient: ${cleanedEmail}, messageId: ${info.messageId}`);
      return true;
    } catch (error) {
      lastError = error;
      retryCount++;
      console.error(`Error sending medical record email (attempt ${retryCount}):`, error.message);
      console.error('SMTP Error details:', {
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response,
        rejected: error.rejected
      });
      
      // If we still have retries left, wait before trying again
      if (retryCount < maxRetries) {
        console.log(`Retrying in ${retryCount * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
      }
    }
  }
  
  // If we get here, all retries failed
  console.error(`Failed to send medical record email after ${maxRetries} attempts. Last error:`, lastError?.message);
  if (lastError) {
    console.error('Error details:', {
      code: lastError.code,
      command: lastError.command,
      responseCode: lastError.responseCode,
      message: lastError.message
    });
  }
  return false;
};

/**
 * Send doctor account approval notification email
 * @param {string} doctorEmail - Doctor's email address
 * @param {string} doctorName - Doctor's name
 */
const sendDoctorAccountApprovedEmail = async (doctorEmail, doctorName) => {
  try {
    // Validate and clean up email address
    if (!doctorEmail || typeof doctorEmail !== 'string') {
      console.error(`Invalid doctor email address: ${doctorEmail}`);
      return false;
    }
    
    // Trim whitespace and validate basic email format
    const cleanedEmail = doctorEmail.trim();
    if (!cleanedEmail.includes('@') || !cleanedEmail.includes('.')) {
      console.error(`Doctor email has invalid format: ${cleanedEmail}`);
      return false;
    }
    
    console.log(`Attempting to send approval email to doctor: ${cleanedEmail}`);
    
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: cleanedEmail,
      subject: 'Congratulations! Your Doctor Account Has Been Approved - DevClinic',
      html: doctorAccountApprovedTemplate(doctorName),
      priority: 'high' // High priority for important notification
    };

    console.log(`Preparing to send approval email to doctor: ${cleanedEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Doctor account approval email sent: ${cleanedEmail}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending doctor account approval email to ${doctorEmail}:`, error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message
    });
    return false;
  }
};

/**
 * Send doctor account rejection notification email
 * @param {string} doctorEmail - Doctor's email address
 * @param {string} doctorName - Doctor's name
 * @param {string} rejectionReason - Reason for the rejection
 */
const sendDoctorAccountRejectedEmail = async (doctorEmail, doctorName, rejectionReason) => {
  try {
    // Validate and clean up email address
    if (!doctorEmail || typeof doctorEmail !== 'string') {
      console.error(`Invalid doctor email address: ${doctorEmail}`);
      return false;
    }
    
    // Trim whitespace and validate basic email format
    const cleanedEmail = doctorEmail.trim();
    if (!cleanedEmail.includes('@') || !cleanedEmail.includes('.')) {
      console.error(`Doctor email has invalid format: ${cleanedEmail}`);
      return false;
    }
    
    console.log(`Attempting to send rejection email to doctor: ${cleanedEmail}`);
    
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: cleanedEmail,
      subject: 'Update on Your Doctor Account Application - DevClinic',
      html: doctorAccountRejectedTemplate(doctorName, rejectionReason),
      priority: 'high' // High priority for important notification
    };

    console.log(`Preparing to send rejection email to doctor: ${cleanedEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Doctor account rejection email sent: ${cleanedEmail}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending doctor account rejection email to ${doctorEmail}:`, error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message
    });
    return false;
  }
};

/**
 * Send Welcome Email on first login
 * @param {string} email - User's email address
 * @param {string} name - User's name
 */
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();
    
    // Get HTML email template
    const htmlContent = welcomeEmailTemplate(name);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: email,
      subject: 'Welcome to DevClinic - Get Started Guide',
      html: htmlContent,
      text: `Hello ${name},\n\nWelcome to DevClinic! We're thrilled to have you join our healthcare community.\n\nHere's how to get started:\n1. Complete your profile\n2. Browse our network of doctors\n3. Book your first appointment\n\nIf you have any questions, our support team is here to help.\n\nWishing you the best of health,\nAakash - CEO & Founder\nDevClinic`
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

/**
 * Send Video Consultation Email to Patient
 * @param {string} patientEmail - Patient's email address
 * @param {string} patientName - Patient's name
 * @param {object} appointmentDetails - Appointment details including video link
 */
const sendVideoConsultationPatientEmail = async (patientEmail, patientName, appointmentDetails) => {
  try {
    // Validate and clean up email address
    if (!patientEmail || typeof patientEmail !== 'string' || 
        !patientEmail.includes('@') || !patientEmail.includes('.')) {
      console.error(`Invalid patient email address: ${patientEmail}`);
      return false;
    }
    
    // Format the appointment details for email display with explicit format parsing
    const formattedAppointment = {
      ...appointmentDetails,
      // Use explicit format for parsing the date to avoid deprecation warnings
      formattedDate: moment(appointmentDetails.date, "DD-MM-YYYY").format('dddd, MMMM D, YYYY'),
      formattedTime: moment(appointmentDetails.time, 'HH:mm').format('h:mm A')
    };
    
    // Check if the video consultation details exist
    if (!appointmentDetails.videoConsultation || !appointmentDetails.videoConsultation.meetingLink) {
      console.error('Missing video consultation link in appointment details');
      return false;
    }
    
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: patientEmail.trim(),
      subject: 'Your Video Consultation Appointment - DevClinic',
      html: videoConsultationPatientTemplate(patientName, formattedAppointment),
      priority: 'high'
    };

    console.log(`Sending video consultation email to patient: ${patientEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Video consultation email sent to patient: ${patientEmail}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending video consultation email to patient:', error);
    return false;
  }
};

/**
 * Send Video Consultation Email to Doctor
 * @param {string} doctorEmail - Doctor's email address
 * @param {string} doctorName - Doctor's name
 * @param {string} patientName - Patient's name
 * @param {object} appointmentDetails - Appointment details including video link
 */
const sendVideoConsultationDoctorEmail = async (doctorEmail, doctorName, patientName, appointmentDetails) => {
  try {
    // Validate and clean up email address
    if (!doctorEmail || typeof doctorEmail !== 'string' || 
        !doctorEmail.includes('@') || !doctorEmail.includes('.')) {
      console.error(`Invalid doctor email address: ${doctorEmail}`);
      return false;
    }
    
    // Format the appointment details for email display with explicit format parsing
    const formattedAppointment = {
      ...appointmentDetails,
      // Use explicit format for parsing the date to avoid deprecation warnings
      formattedDate: moment(appointmentDetails.date, "DD-MM-YYYY").format('dddd, MMMM D, YYYY'),
      formattedTime: moment(appointmentDetails.time, 'HH:mm').format('h:mm A')
    };
    
    // Check if the video consultation details exist
    if (!appointmentDetails.videoConsultation || !appointmentDetails.videoConsultation.meetingLink) {
      console.error('Missing video consultation link in appointment details');
      return false;
    }
    
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: doctorEmail.trim(),
      subject: 'Upcoming Video Consultation - DevClinic',
      html: videoConsultationDoctorTemplate(doctorName, patientName, formattedAppointment),
      priority: 'high'
    };

    console.log(`Sending video consultation email to doctor: ${doctorEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Video consultation email sent to doctor: ${doctorEmail}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending video consultation email to doctor:', error);
    return false;
  }
};

/**
 * Send Video Consultation Reminder Email
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {object} appointmentDetails - Appointment details including video link
 * @param {string} userType - 'doctor' or 'patient'
 */
const sendVideoConsultationReminderEmail = async (email, name, appointmentDetails, userType) => {
  try {
    // Validate and clean up email address
    if (!email || typeof email !== 'string' || 
        !email.includes('@') || !email.includes('.')) {
      console.error(`Invalid email address for reminder: ${email}`);
      return false;
    }
    
    // Format the appointment details for email display with explicit format parsing
    const formattedAppointment = {
      ...appointmentDetails,
      // Use explicit format for parsing the date to avoid deprecation warnings
      formattedDate: moment(appointmentDetails.date, "DD-MM-YYYY").format('dddd, MMMM D, YYYY'),
      formattedTime: moment(appointmentDetails.time, 'HH:mm').format('h:mm A')
    };
    
    // Check if the video consultation details exist
    if (!appointmentDetails.videoConsultation || !appointmentDetails.videoConsultation.meetingLink) {
      console.error('Missing video consultation link in appointment details');
      return false;
    }
    
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevClinic" <no-reply@devclinic.com>',
      to: email.trim(),
      subject: 'Reminder: Upcoming Video Consultation - DevClinic',
      html: videoConsultationReminderTemplate(name, formattedAppointment, userType),
      priority: 'high'
    };

    console.log(`Sending video consultation reminder to ${userType}: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Video consultation reminder sent to ${userType}: ${email}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending video consultation reminder to ${userType}:`, error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAppointmentRequestedPatientEmail,
  sendAppointmentRequestedDoctorEmail,
  sendAppointmentApprovedEmail,
  sendAppointmentRejectedEmail,
  sendAppointmentCompletedEmail,
  sendDoctorUnavailableEmailToAdmin,
  sendDoctorUnavailableConfirmationEmail,
  sendMedicalRecordToPatientEmail,
  sendDoctorAccountApprovedEmail,
  sendDoctorAccountRejectedEmail,
  sendWelcomeEmail,
  sendVideoConsultationPatientEmail,
  sendVideoConsultationDoctorEmail,
  sendVideoConsultationReminderEmail
}; 