/**
 * Email templates for DevClinic application
 * These templates can be used on the server side to send emails
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

export { getEmailVerificationTemplate, getPasswordResetTemplate }; 