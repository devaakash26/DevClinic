const moment = require('moment');

/**
 * Email templates for DevClinic application
 * Server-side email templates (duplicate of client-side templates)
 */

// Email Verification Template
const getEmailVerificationTemplate = (userName, verificationLink) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your DevClinic Account</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .email-header {
        background: linear-gradient(135deg, #3b82f6, #4f46e5);
        color: #ffffff;
        padding: 30px;
        text-align: center;
      }
      .email-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }
      .email-content {
        padding: 30px;
        background-color: #ffffff;
      }
      .email-footer {
        background-color: #f9fafb;
        padding: 20px;
        text-align: center;
        font-size: 12px;
        color: #6b7280;
      }
      .button {
        display: inline-block;
        background: linear-gradient(135deg, #3b82f6, #4f46e5);
        color: #ffffff;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        margin: 20px 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .info-box {
        background-color: #f0f9ff;
        border-left: 4px solid #3b82f6;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>DevClinic</h1>
      </div>
      <div class="email-content">
        <h2>Verify Your Email Address</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for registering with DevClinic. To complete your registration and access our healthcare services, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center;">
          <a href="${verificationLink}" class="button">Verify Email Address</a>
        </div>
        
        <div class="info-box">
          <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>
        </div>
        
        <p>If you did not create an account with DevClinic, please ignore this email or contact our support team if you have concerns.</p>
        
        <p>Best regards,<br/>The DevClinic Team</p>
      </div>
      <div class="email-footer">
        <p>&copy; ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
        <p>If you're having trouble clicking the "Verify Email Address" button, copy and paste the URL below into your web browser:</p>
        <p style="word-break: break-all;">${verificationLink}</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// Password Reset Template
const getPasswordResetTemplate = (userName, resetLink) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your DevClinic Password</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .email-header {
        background: linear-gradient(135deg, #3b82f6, #4f46e5);
        color: #ffffff;
        padding: 30px;
        text-align: center;
      }
      .email-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }
      .email-content {
        padding: 30px;
        background-color: #ffffff;
      }
      .email-footer {
        background-color: #f9fafb;
        padding: 20px;
        text-align: center;
        font-size: 12px;
        color: #6b7280;
      }
      .button {
        display: inline-block;
        background: linear-gradient(135deg, #3b82f6, #4f46e5);
        color: #ffffff;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        margin: 20px 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .warning-box {
        background-color: #fff7ed;
        border-left: 4px solid #f97316;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .security-tips {
        background-color: #f0f9ff;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>DevClinic</h1>
      </div>
      <div class="email-content">
        <h2>Reset Your Password</h2>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password for your DevClinic account. Click the button below to create a new password:</p>
        
        <div style="text-align: center;">
          <a href="${resetLink}" class="button">Reset Password</a>
        </div>
        
        <div class="warning-box">
          <p><strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        
        <div class="security-tips">
          <h3 style="margin-top: 0;">Security Tips:</h3>
          <ul>
            <li>Create a strong password with a mix of letters, numbers, and symbols</li>
            <li>Don't reuse passwords across multiple sites</li>
            <li>Never share your password with anyone</li>
          </ul>
        </div>
        
        <p>Best regards,<br/>The DevClinic Team</p>
      </div>
      <div class="email-footer">
        <p>&copy; ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
        <p>If you're having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser:</p>
        <p style="word-break: break-all;">${resetLink}</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// Templates for appointment confirmation
exports.appointmentRequestedPatientTemplate = (patientName, appointmentDetails) => {
  // Use moment to parse the date-time string in format 'DD-MM-YYYY HH:mm'
  const formattedDateTime = appointmentDetails.startTime 
    ? moment(appointmentDetails.startTime, 'DD-MM-YYYY HH:mm').isValid() 
      ? moment(appointmentDetails.startTime, 'DD-MM-YYYY HH:mm').format('MMMM D, YYYY [at] h:mm A')
      : appointmentDetails.startTime // Fallback to original value if parsing fails
    : 'Not specified';

  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #3b82f6;">DevClinic - Appointment Requested</h2>
    </div>
    <p>Dear ${patientName},</p>
    <p>Thank you for using DevClinic for your healthcare needs. We have received your appointment request.</p>
    <p>Your appointment details:</p>
    <ul>
      <li><strong>Reason:</strong> ${appointmentDetails.reason}</li>
      <li><strong>Requested date:</strong> ${formattedDateTime}</li>
    </ul>
    <p>The doctor will review your request shortly. You'll receive another notification once the doctor has made a decision.</p>
    <p>If you have any questions, please contact our support team.</p>
    <p>Best regards,<br>The DevClinic Team</p>
  </div>
  `;
};

exports.appointmentRequestedDoctorTemplate = (doctorName, patientName, appointmentDetails) => {
  // Use moment to parse the date-time string in format 'DD-MM-YYYY HH:mm'
  const formattedDateTime = appointmentDetails.startTime 
    ? moment(appointmentDetails.startTime, 'DD-MM-YYYY HH:mm').isValid() 
      ? moment(appointmentDetails.startTime, 'DD-MM-YYYY HH:mm').format('MMMM D, YYYY [at] h:mm A')
      : appointmentDetails.startTime // Fallback to original value if parsing fails
    : 'Not specified';

  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #3b82f6;">DevClinic - New Appointment Request</h2>
    </div>
    <p>Dear Dr. ${doctorName},</p>
    <p>You have received a new appointment request from a patient.</p>
    <p>Appointment details:</p>
    <ul>
      <li><strong>Patient:</strong> ${patientName}</li>
      <li><strong>Reason:</strong> ${appointmentDetails.reason}</li>
      <li><strong>Requested date:</strong> ${formattedDateTime}</li>
      ${appointmentDetails.symptoms ? `<li><strong>Symptoms:</strong> ${appointmentDetails.symptoms}</li>` : ''}
      ${appointmentDetails.medicalHistory ? `<li><strong>Medical History:</strong> ${appointmentDetails.medicalHistory}</li>` : ''}
    </ul>
    <p>Please log in to your DevClinic dashboard to approve or reject this appointment request.</p>
    <p>Best regards,<br>The DevClinic Team</p>
  </div>
  `;
};

exports.appointmentApprovedTemplate = (patientName, appointmentId, appointmentDetails) => {
  // Format the appointment ID to be more user-friendly
  const formattedAppointmentId = `dev_${String(appointmentId).slice(-3).padStart(3, '0')}`;
  
  // Use moment to parse the date-time string in format 'DD-MM-YYYY HH:mm'
  const formattedDateTime = appointmentDetails.startTime 
    ? moment(appointmentDetails.startTime, 'DD-MM-YYYY HH:mm').isValid() 
      ? moment(appointmentDetails.startTime, 'DD-MM-YYYY HH:mm').format('MMMM D, YYYY [at] h:mm A')
      : appointmentDetails.startTime // Fallback to original value if parsing fails
    : 'Not specified';
  
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #22c55e;">DevClinic - Appointment Approved</h2>
    </div>
    <p>Dear ${patientName},</p>
    <p>We're pleased to inform you that your appointment request has been approved.</p>
    <p>Your appointment details:</p>
    <ul>
      <li><strong>Appointment ID:</strong> ${formattedAppointmentId}</li>
      <li><strong>Date and Time:</strong> ${formattedDateTime}</li>
      <li><strong>Reason:</strong> ${appointmentDetails.reason}</li>
      <li><strong>Doctor:</strong> Dr. ${appointmentDetails.doctorName}</li>
    </ul>
    <p>Please arrive 15 minutes before your scheduled appointment time. If you need to cancel or reschedule, please do so at least 24 hours in advance.</p>
    <p>We look forward to seeing you!</p>
    <p>Best regards,<br>The DevClinic Team</p>
  </div>
  `;
};

exports.appointmentRejectedTemplate = (patientName, appointmentDetails, rejectionReason) => {
  // Use moment to parse the date-time string in format 'DD-MM-YYYY HH:mm'
  const formattedDateTime = appointmentDetails.startTime 
    ? moment(appointmentDetails.startTime, 'DD-MM-YYYY HH:mm').isValid() 
      ? moment(appointmentDetails.startTime, 'DD-MM-YYYY HH:mm').format('MMMM D, YYYY [at] h:mm A')
      : appointmentDetails.startTime // Fallback to original value if parsing fails
    : 'Not specified';
    
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #ef4444;">DevClinic - Appointment Update</h2>
    </div>
    <p>Dear ${patientName},</p>
    <p>We regret to inform you that your appointment request for ${formattedDateTime} has been declined.</p>
    <p><strong>Reason:</strong> ${rejectionReason || 'The doctor is unavailable at the requested time.'}</p>
    <p>We encourage you to book another appointment at a different time. If you need immediate assistance, please contact our support team.</p>
    <p>Thank you for your understanding.</p>
    <p>Best regards,<br>The DevClinic Team</p>
  </div>
  `;
};

// Template for completed appointment
exports.appointmentCompletedTemplate = (patientName, appointmentDetails) => {
  // Use moment to parse the date-time string in format 'DD-MM-YYYY HH:mm'
  const formattedDateTime = appointmentDetails.startTime 
    ? moment(appointmentDetails.startTime, 'DD-MM-YYYY HH:mm').isValid() 
      ? moment(appointmentDetails.startTime, 'DD-MM-YYYY HH:mm').format('MMMM D, YYYY [at] h:mm A')
      : appointmentDetails.startTime // Fallback to original value if parsing fails
    : 'Not specified';
    
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #3b82f6;">DevClinic - Treatment Completed</h2>
    </div>
    <p>Dear ${patientName},</p>
    <p>We're pleased to inform you that your appointment has been successfully completed.</p>
    <p><strong>Appointment Details:</strong></p>
    <ul>
      <li><strong>Date:</strong> ${formattedDateTime}</li>
      <li><strong>Doctor:</strong> Dr. ${appointmentDetails.doctorName}</li>
      <li><strong>Reason:</strong> ${appointmentDetails.reason}</li>
    </ul>
    <p>Thank you for choosing DevClinic for your healthcare needs. We hope your experience was satisfactory.</p>
    
    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h3 style="margin-top: 0; color: #1e40af;">Share Your Feedback</h3>
      <p>Your feedback is important to us! It helps us improve our services and assists other patients in choosing the right healthcare provider.</p>
      <p>Please take a moment to rate your experience and provide feedback by logging into your DevClinic account and visiting the Appointments section.</p>
      <p>Your honest feedback will help us serve you better in the future and will be valuable for other patients.</p>
    </div>
    
    <p>If you need any further assistance, please don't hesitate to contact us.</p>
    <p>We look forward to serving you again.</p>
    <p>Best regards,<br>The DevClinic Team</p>
  </div>
  `;
};

// Doctor Unavailability Admin Notification Template
const doctorUnavailableAdminTemplate = (doctorName, unavailableReason, unavailableUntil) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Doctor Unavailability Notification</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .email-header {
        background: linear-gradient(135deg, #3b82f6, #4f46e5);
        color: #ffffff;
        padding: 30px;
        text-align: center;
      }
      .email-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }
      .email-content {
        padding: 30px;
        background-color: #ffffff;
      }
      .email-footer {
        background-color: #f9fafb;
        padding: 20px;
        text-align: center;
        font-size: 12px;
        color: #6b7280;
      }
      .info-box {
        background-color: #fef2f2;
        border-left: 4px solid #ef4444;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .detail-row {
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e5e7eb;
      }
      .detail-label {
        font-weight: 600;
        color: #4b5563;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>DevClinic Admin</h1>
      </div>
      <div class="email-content">
        <h2>Doctor Unavailability Notification</h2>
        
        <div class="info-box">
          <p><strong>Doctor ${doctorName}</strong> has marked themselves as unavailable.</p>
        </div>
        
        <div class="details-section">
          <h3>Unavailability Details:</h3>
          
          <div class="detail-row">
            <span class="detail-label">Doctor:</span>
            <span>${doctorName}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Reason:</span>
            <span>${unavailableReason}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Unavailable Until:</span>
            <span>${unavailableUntil}</span>
          </div>
        </div>
        
        <p>You may need to manage any scheduled appointments for this doctor during their unavailability period.</p>
        
        <p>Best regards,<br/>DevClinic System</p>
      </div>
      <div class="email-footer">
        <p>&copy; ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// Doctor Unavailability Confirmation Template
const doctorUnavailableConfirmationTemplate = (doctorName, unavailableReason, unavailableUntil) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Service Unavailability Confirmation</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .email-header {
        background: linear-gradient(135deg, #3b82f6, #4f46e5);
        color: #ffffff;
        padding: 30px;
        text-align: center;
      }
      .email-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }
      .email-content {
        padding: 30px;
        background-color: #ffffff;
      }
      .email-footer {
        background-color: #f9fafb;
        padding: 20px;
        text-align: center;
        font-size: 12px;
        color: #6b7280;
      }
      .confirmation-box {
        background-color: #f0f9ff;
        border-left: 4px solid #3b82f6;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .detail-row {
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e5e7eb;
      }
      .detail-label {
        font-weight: 600;
        color: #4b5563;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>DevClinic</h1>
      </div>
      <div class="email-content">
        <h2>Service Unavailability Confirmation</h2>
        <p>Dear Dr. ${doctorName},</p>
        
        <div class="confirmation-box">
          <p>Your availability status has been updated to <strong>UNAVAILABLE</strong> in the DevClinic system.</p>
        </div>
        
        <div class="details-section">
          <h3>Unavailability Details:</h3>
          
          <div class="detail-row">
            <span class="detail-label">Reason:</span>
            <span>${unavailableReason}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Unavailable Until:</span>
            <span>${unavailableUntil}</span>
          </div>
        </div>
        
        <p>During this period, patients will not be able to book new appointments with you. The admin team has been notified of your unavailability.</p>
        
        <p>If you need to make any changes to your availability status, please log in to your DevClinic account.</p>
        
        <p>Best regards,<br/>The DevClinic Team</p>
      </div>
      <div class="email-footer">
        <p>&copy; ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// Medical record shared email template
exports.medicalRecordEmailTemplate = (patientName, medicalRecord, doctorName) => {
  // Format date for display
  const recordDate = medicalRecord.recordDate 
    ? moment(medicalRecord.recordDate).format('MMMM D, YYYY')
    : moment(medicalRecord.createdAt).format('MMMM D, YYYY');
  
  // Get record type in a user-friendly format
  const recordTypeMap = {
    'clinical_report': 'Clinical Report',
    'lab_test': 'Laboratory Test',
    'prescription': 'Prescription',
    'imaging': 'Imaging Results',
    'other': 'Medical Document'
  };
  
  const recordTypeName = recordTypeMap[medicalRecord.recordType] || 'Medical Document';
  
  // Customize button text based on file type
  const isPdf = medicalRecord.fileType === 'application/pdf' || 
                medicalRecord.fileUrl.toLowerCase().endsWith('.pdf');
  
  const isImage = medicalRecord.fileType && medicalRecord.fileType.startsWith('image/');
  
  let buttonText = 'View Document';
  if (isPdf) buttonText = 'View PDF Document';
  if (isImage) buttonText = 'View Image';
  
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #3b82f6;">Medical Record Shared With You</h2>
    </div>
    <p>Dear ${patientName},</p>
    <p>${doctorName} has shared a medical record with you from DevClinic.</p>
    
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #333;">${medicalRecord.title}</h3>
      <p><strong>Type:</strong> ${recordTypeName}</p>
      <p><strong>Date:</strong> ${recordDate}</p>
      ${medicalRecord.description ? `<p><strong>Description:</strong> ${medicalRecord.description}</p>` : ''}
    </div>
    
    ${medicalRecord.fileUrl ? `
    <div style="text-align: center; margin: 25px 0;">
      <a href="${medicalRecord.fileUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;" target="_blank">
        ${buttonText}
      </a>
    </div>
    ` : ''}
    
    <p>You can also log in to your DevClinic account to view all your medical records.</p>
    
    <p>Best regards,<br>The DevClinic Team</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center;">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
    </div>
  </div>
  `;
};

module.exports = { 
  getEmailVerificationTemplate, 
  getPasswordResetTemplate,
  appointmentRequestedPatientTemplate: exports.appointmentRequestedPatientTemplate,
  appointmentRequestedDoctorTemplate: exports.appointmentRequestedDoctorTemplate,
  appointmentApprovedTemplate: exports.appointmentApprovedTemplate,
  appointmentRejectedTemplate: exports.appointmentRejectedTemplate,
  appointmentCompletedTemplate: exports.appointmentCompletedTemplate,
  doctorUnavailableAdminTemplate,
  doctorUnavailableConfirmationTemplate,
  medicalRecordEmailTemplate: exports.medicalRecordEmailTemplate
};