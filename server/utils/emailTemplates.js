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
      <li><strong>Doctor:</strong> Dr. ${appointmentDetails.doctorInfo.firstname} ${appointmentDetails.doctorInfo.lastname}</li>
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
      <li><strong>Doctor:</strong> Dr. ${appointmentDetails.doctorInfo.firstname} ${appointmentDetails.doctorInfo.lastname}</li>
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

// Doctor Account Approved Template
const doctorAccountApprovedTemplate = (doctorName) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Doctor Account Has Been Approved</title>
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
      .success-box {
        background-color: #ecfdf5;
        border-left: 4px solid #10b981;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .info-box {
        background-color: #f0f9ff;
        border-left: 4px solid #3b82f6;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .button {
        display: inline-block;
        background: linear-gradient(135deg, #3b82f6, #4f46e5);
        color: white;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        margin: 20px 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .feature-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin: 25px 0;
      }
      .feature-item {
        background-color: #f9fafb;
        border-radius: 6px;
        padding: 15px;
        text-align: center;
      }
      .feature-item h3 {
        margin-top: 0;
        color: #4f46e5;
        font-size: 16px;
      }
      .check-icon {
        color: #10b981;
        font-size: 18px;
        margin-right: 5px;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>DevClinic</h1>
      </div>
      <div class="email-content">
        <h2>Congratulations! Your Doctor Account Has Been Approved</h2>
        <p>Dear Dr. ${doctorName},</p>
        
        <div class="success-box">
          <p><strong>Good news!</strong> Your application to join DevClinic as a healthcare provider has been reviewed and approved by our administrative team.</p>
        </div>
        
        <p>We're thrilled to welcome you to our growing network of healthcare professionals. Your expertise and qualifications will be invaluable to our platform and the patients who seek quality healthcare services.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0;">What's Next?</h3>
          <p>You can now access your doctor dashboard to:
            <ul>
              <li>Complete your profile information</li>
              <li>Set your availability hours</li>
              <li>Manage appointment requests</li>
              <li>Access patient medical records</li>
            </ul>
          </p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/doctor/profile" class="button">Access Your Dashboard</a>
        </div>
        
        <h3>Key Features Available to You</h3>
        <div class="feature-grid">
          <div class="feature-item">
            <h3>✓ Appointment Management</h3>
            <p>Accept, reschedule or reject appointment requests</p>
          </div>
          <div class="feature-item">
            <h3>✓ Patient Records</h3>
            <p>Securely access and manage patient information</p>
          </div>
          <div class="feature-item">
            <h3>✓ Availability Control</h3>
            <p>Set your working hours and unavailable dates</p>
          </div>
          <div class="feature-item">
            <h3>✓ Professional Profile</h3>
            <p>Showcase your expertise and credentials</p>
          </div>
        </div>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
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

// Doctor Account Rejected Template
const doctorAccountRejectedTemplate = (doctorName, rejectionReason) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Update on Your Doctor Account Application</title>
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
      .notice-box {
        background-color: #fff0f0;
        border-left: 4px solid #ef4444;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .reason-box {
        background-color: #f9fafb;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
        border: 1px solid #e5e7eb;
      }
      .button {
        display: inline-block;
        background: linear-gradient(135deg, #3b82f6, #4f46e5);
        color: white;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        margin: 20px 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .help-section {
        background-color: #f0f9ff;
        border-radius: 6px;
        padding: 15px;
        margin: 25px 0;
      }
      .help-section h3 {
        margin-top: 0;
        color: #3b82f6;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>DevClinic</h1>
      </div>
      <div class="email-content">
        <h2>Update on Your Doctor Account Application</h2>
        <p>Dear Dr. ${doctorName},</p>
        
        <div class="notice-box">
          <p>After careful review, we regret to inform you that your application to join DevClinic as a healthcare provider has not been approved at this time.</p>
        </div>
        
        <div class="reason-box">
          <h3>Reason for Decision:</h3>
          <p>${rejectionReason || "Your application did not meet our current requirements for healthcare providers on our platform."}</p>
        </div>
        
        <p>We understand this may be disappointing, but please know that this decision does not reflect on your professional capabilities or qualifications.</p>
        
        <div class="help-section">
          <h3>What You Can Do Next</h3>
          <p>You may address the concerns mentioned above and reapply in the future. Our requirements and needs evolve, and we welcome you to try again after addressing the feedback.</p>
          <p>If you believe there has been a misunderstanding or would like to provide additional information, please contact our support team.</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/contact" class="button">Contact Support</a>
        </div>
        
        <p>We appreciate your interest in DevClinic and wish you the best in your professional endeavors.</p>
        
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

// Welcome email template sent on first login
const welcomeEmailTemplate = (userName) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to DevClinic</title>
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
      .welcome-banner {
        background-color: #ecfdf5;
        border-left: 4px solid #10b981;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .feature-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin: 25px 0;
      }
      .feature-item {
        background-color: #f9fafb;
        border-radius: 6px;
        padding: 15px;
        text-align: center;
      }
      .feature-item h3 {
        margin-top: 0;
        color: #4f46e5;
        font-size: 16px;
      }
      .button {
        display: inline-block;
        background: linear-gradient(135deg, #3b82f6, #4f46e5);
        color: white;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        margin: 20px 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .signature {
        margin-top: 30px;
        font-style: italic;
      }
      .founder {
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>DevClinic</h1>
      </div>
      <div class="email-content">
        <h2>Welcome to DevClinic!</h2>
        <p>Dear ${userName},</p>
        
        <div class="welcome-banner">
          <p><strong>Thank you for choosing DevClinic!</strong> We're thrilled to have you as part of our healthcare community.</p>
        </div>
        
        <p>I wanted to personally welcome you to our platform and guide you through some of the key features that will help you make the most of your healthcare journey with us:</p>
        
        <div class="feature-grid">
          <div class="feature-item">
            <h3>🔍 Find Doctors</h3>
            <p>Search for specialists by symptoms, specialization, or location</p>
          </div>
          <div class="feature-item">
            <h3>📅 Book Appointments</h3>
            <p>Schedule consultations at your convenience</p>
          </div>
          <div class="feature-item">
            <h3>📋 Medical Records</h3>
            <p>Access all your health information in one place</p>
          </div>
          <div class="feature-item">
            <h3>💬 Consultations</h3>
            <p>Connect with healthcare providers securely</p>
          </div>
        </div>
        
        <p>Getting started is easy:</p>
        <ol>
          <li>Complete your profile with your medical history for better care</li>
          <li>Browse our network of qualified doctors</li>
          <li>Book your first appointment</li>
        </ol>
        
        <div style="text-align: center;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" class="button">Go to Dashboard</a>
        </div>
        
        <p>If you have any questions or need assistance, our support team is always ready to help.</p>
        
        <div class="signature">
          <p>Wishing you the best of health,</p>
          <p class="founder">Aakash - CEO & Founder</p>
          <p>DevClinic</p>
        </div>
      </div>
      <div class="email-footer">
        <p>&copy; ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

/**
 * Video Consultation Email Template for Patients
 */
const videoConsultationPatientTemplate = (patientName, appointmentDetails) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Video Consultation Appointment</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #ddd; }
        .section { margin-bottom: 20px; }
        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #666; }
        .button { display: inline-block; background-color: #4CAF50; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; margin-top: 10px; }
        .meeting-link { font-weight: bold; color: #1a73e8; word-break: break-all; }
        .info-box { background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 10px 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Video Consultation Appointment Confirmed</h2>
      </div>
      <div class="content">
        <div class="section">
          <p>Hello ${patientName},</p>
          <p>Your video consultation appointment has been scheduled successfully. Please find the details below:</p>
        </div>
        
        <div class="section">
          <h3>Appointment Details</h3>
          <p><strong>Doctor:</strong> Dr. ${appointmentDetails.doctorInfo.firstname} ${appointmentDetails.doctorInfo.lastname}</p>
          <p><strong>Date:</strong> ${appointmentDetails.formattedDate || appointmentDetails.date}</p>
          <p><strong>Time:</strong> ${appointmentDetails.formattedTime || appointmentDetails.time}</p>
          <p><strong>Reason:</strong> ${appointmentDetails.reason}</p>
        </div>
        
        <div class="section info-box">
          <h3>Join your video consultation</h3>
          <p>You can join the video consultation by clicking the button below at your scheduled appointment time:</p>
          <div style="text-align: center;">
            <a href="${appointmentDetails.videoConsultation.meetingLink}" class="button">Join Video Call</a>
          </div>
          <p style="margin-top: 15px;">Or copy and paste this link into your browser:</p>
          <p class="meeting-link">${appointmentDetails.videoConsultation.meetingLink}</p>
        </div>
        
        <div class="section">
          <h3>Important Information</h3>
          <ul>
            <li>Please join 5 minutes before your scheduled time</li>
            <li>Ensure you have a stable internet connection</li>
            <li>Test your camera and microphone before joining</li>
            <li>Choose a quiet and private location for your call</li>
            <li>Have any relevant medical documents ready to share</li>
          </ul>
        </div>
        
        <div class="section">
          <p>If you need to reschedule or cancel this appointment, please contact us at least 24 hours in advance.</p>
          <p>Thank you for choosing DevClinic for your healthcare needs.</p>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated email, please do not reply. If you have any questions, please contact our support team.</p>
        <p>&copy; ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Video Consultation Email Template for Doctors
 */
const videoConsultationDoctorTemplate = (doctorName, patientName, appointmentDetails) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Upcoming Video Consultation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1976D2; color: white; padding: 10px 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #ddd; }
        .section { margin-bottom: 20px; }
        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #666; }
        .button { display: inline-block; background-color: #1976D2; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; margin-top: 10px; }
        .meeting-link { font-weight: bold; color: #1a73e8; word-break: break-all; }
        .info-box { background-color: #e3f2fd; border-left: 4px solid #1976D2; padding: 10px 15px; margin: 15px 0; }
        .patient-info { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Upcoming Video Consultation</h2>
      </div>
      <div class="content">
        <div class="section">
          <p>Hello Dr. ${doctorName},</p>
          <p>You have a video consultation appointment scheduled with a patient. Here are the details:</p>
        </div>
        
        <div class="section">
          <h3>Appointment Details</h3>
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Date:</strong> ${appointmentDetails.formattedDate || appointmentDetails.date}</p>
          <p><strong>Time:</strong> ${appointmentDetails.formattedTime || appointmentDetails.time}</p>
          <p><strong>Reason:</strong> ${appointmentDetails.reason}</p>
        </div>
        
        <div class="section patient-info">
          <h3>Patient Information</h3>
          <p><strong>Email:</strong> ${appointmentDetails.userInfo.email}</p>
          <p><strong>Phone:</strong> ${appointmentDetails.userInfo.phone || 'Not provided'}</p>
          ${appointmentDetails.symptoms ? `<p><strong>Symptoms:</strong> ${appointmentDetails.symptoms}</p>` : ''}
          ${appointmentDetails.medicalHistory ? `<p><strong>Medical History:</strong> ${appointmentDetails.medicalHistory}</p>` : ''}
          ${appointmentDetails.additionalNotes ? `<p><strong>Additional Notes:</strong> ${appointmentDetails.additionalNotes}</p>` : ''}
        </div>
        
        <div class="section info-box">
          <h3>Join the video consultation</h3>
          <p>You can join the video consultation by clicking the button below at the scheduled appointment time:</p>
          <div style="text-align: center;">
            <a href="${appointmentDetails.videoConsultation.meetingLink}" class="button">Join Video Call</a>
          </div>
          <p style="margin-top: 15px;">Or copy and paste this link into your browser:</p>
          <p class="meeting-link">${appointmentDetails.videoConsultation.meetingLink}</p>
        </div>
        
        <div class="section">
          <h3>Important Reminders</h3>
          <ul>
            <li>Please join 5 minutes before the scheduled time</li>
            <li>Ensure you have a stable internet connection</li>
            <li>Test your camera and microphone before joining</li>
            <li>Choose a quiet and professional setting for the call</li>
            <li>Have the patient's records ready for reference</li>
          </ul>
        </div>
        
        <div class="section">
          <p>This appointment has also been added to your Google Calendar.</p>
          <p>Thank you for your continued service at DevClinic.</p>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated email, please do not reply. If you have any questions, please contact the admin team.</p>
        <p>&copy; ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Video Consultation Reminder Template
 */
const videoConsultationReminderTemplate = (name, appointmentDetails, userType) => {
  const isDoctor = userType === 'doctor';
  const headerColor = isDoctor ? '#1976D2' : '#4CAF50';
  const buttonColor = isDoctor ? '#1976D2' : '#4CAF50';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Video Consultation Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${headerColor}; color: white; padding: 10px 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #ddd; }
        .section { margin-bottom: 20px; }
        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #666; }
        .button { display: inline-block; background-color: ${buttonColor}; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; margin-top: 10px; }
        .meeting-link { font-weight: bold; color: #1a73e8; word-break: break-all; }
        .reminder-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Video Consultation Reminder</h2>
      </div>
      <div class="content">
        <div class="section">
          <p>Hello ${isDoctor ? 'Dr. ' : ''}${name},</p>
          <p>This is a reminder for your upcoming video consultation appointment:</p>
        </div>
        
        <div class="section reminder-box">
          <h3>Appointment Details</h3>
          <p><strong>${isDoctor ? 'Patient' : 'Doctor'}:</strong> ${isDoctor ? appointmentDetails.userInfo.name : `Dr. ${appointmentDetails.doctorInfo.firstname} ${appointmentDetails.doctorInfo.lastname}`}</p>
          <p><strong>Date:</strong> ${appointmentDetails.formattedDate || appointmentDetails.date}</p>
          <p><strong>Time:</strong> ${appointmentDetails.formattedTime || appointmentDetails.time} (in about 1 hour)</p>
          <p><strong>Reason:</strong> ${appointmentDetails.reason}</p>
        </div>
        
        <div class="section">
          <h3>Join your video consultation</h3>
          <p>You can join the video consultation by clicking the button below at the scheduled time:</p>
          <div style="text-align: center;">
            <a href="${appointmentDetails.videoConsultation.meetingLink}" class="button">Join Video Call</a>
          </div>
          <p style="margin-top: 15px;">Or copy and paste this link into your browser:</p>
          <p class="meeting-link">${appointmentDetails.videoConsultation.meetingLink}</p>
        </div>
        
        <div class="section">
          <h3>Quick Checklist Before Joining</h3>
          <ul>
            <li>Test your camera and microphone</li>
            <li>Ensure you have a stable internet connection</li>
            <li>Find a quiet and private location</li>
            ${isDoctor ? '<li>Have the patient\'s records ready for reference</li>' : '<li>Have any relevant medical documents ready to share</li>'}
          </ul>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated reminder, please do not reply. If you need to reschedule, please contact ${isDoctor ? 'the admin team' : 'us'} as soon as possible.</p>
        <p>&copy; ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
      </div>
    </body>
    </html>
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
  medicalRecordEmailTemplate: exports.medicalRecordEmailTemplate,
  doctorAccountApprovedTemplate,
  doctorAccountRejectedTemplate,
  welcomeEmailTemplate,
  videoConsultationPatientTemplate,
  videoConsultationDoctorTemplate,
  videoConsultationReminderTemplate
};