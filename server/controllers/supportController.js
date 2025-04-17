const User = require('../models/user');
const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // For development/testing purposes, you can use services like Mailtrap
  // In production, you'd use an actual email service like Gmail, SendGrid, etc.
  const host = process.env.EMAIL_HOST || 'smtp.mailtrap.io';
  const port = process.env.EMAIL_PORT || 2525;
  const user = process.env.EMAIL_USER || 'your_mailtrap_user';
  const pass = process.env.EMAIL_PASS || 'your_mailtrap_password';
  
  // Common retry options for connection resilience
  const transporterOptions = {
    pool: true, // Use connection pool
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5, // Limit to 5 messages per second
    socketTimeout: 30000, // 30 seconds timeout
    connectionTimeout: 30000, // 30 seconds connection timeout
  };
  
  // Gmail specific configuration
  if (host.includes('gmail')) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Use SSL
      auth: {
        user,
        pass
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false
      },
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

// Generate support ticket email template
const getSupportTicketTemplate = (name, email, subject, message, priority) => {
  // Convert priority to user-friendly text and color
  const priorityText = {
    low: 'Low - General Question',
    normal: 'Normal - Support Needed',
    high: 'High - Important Issue',
    urgent: 'Urgent - Critical Problem'
  }[priority] || 'Normal';
  
  const priorityColor = {
    low: '#4caf50',
    normal: '#2196f3',
    high: '#ff9800',
    urgent: '#f44336'
  }[priority] || '#2196f3';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .container {
          border: 1px solid #e0e0e0;
          border-radius: 5px;
          padding: 20px;
        }
        .header {
          background-color: #3b82f6;
          color: white;
          padding: 15px;
          border-radius: 5px 5px 0 0;
          text-align: center;
        }
        .content {
          padding: 20px;
        }
        .footer {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 0 0 5px 5px;
          font-size: 12px;
          text-align: center;
        }
        .priority-badge {
          display: inline-block;
          background-color: ${priorityColor};
          color: white;
          padding: 5px 10px;
          border-radius: 3px;
          font-size: 14px;
          margin-top: 5px;
        }
        .field {
          margin-bottom: 15px;
        }
        .field label {
          font-weight: bold;
          display: block;
          margin-bottom: 5px;
        }
        .message-box {
          background-color: #f9f9f9;
          border-left: 3px solid #3b82f6;
          padding: 15px;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Support Request</h2>
        </div>
        <div class="content">
          <div class="priority-badge" style="background-color: ${priorityColor};">
            ${priorityText}
          </div>
          
          <div class="field">
            <label>From:</label>
            ${name} (${email})
          </div>
          
          <div class="field">
            <label>Subject:</label>
            ${subject}
          </div>
          
          <div class="field">
            <label>Message:</label>
            <div class="message-box">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <p>
            This support request was submitted through the DevClinic contact form.
            Please respond to the user as soon as possible.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Handle contact form submissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message, priority, userId } = req.body;
    
    console.log('Processing contact form submission:', { name, email, subject, priority });
    
    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, subject, and message'
      });
    }
    
    // Get admin emails to send notifications
    const adminUsers = await User.find({ isAdmin: true });
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found, using default support email');
      adminUsers.push({ email: 'pgrm.aakash@gmail.com' });
    }
    
    // Create list of admin email addresses
    const adminEmails = adminUsers.map(admin => admin.email).filter(email => email);
    
    // Send email to admins
    try {
      const transporter = createTransporter();
      
      const htmlContent = getSupportTicketTemplate(
        name,
        email,
        subject,
        message,
        priority || 'normal'
      );
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"DevClinic Support" <no-reply@devclinic.com>',
        to: adminEmails.join(', '),
        cc: 'pgrm.aakash@gmail.com', // Always CC the emergency contact
        replyTo: email, // Set reply-to as the user's email
        subject: `Support Request: ${subject}`,
        html: htmlContent,
        text: `Support Request from ${name} (${email})\n\nSubject: ${subject}\nPriority: ${priority || 'normal'}\n\nMessage:\n${message}`,
        priority: priority === 'urgent' ? 'high' : 'normal'
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Support request email sent:', info.messageId);
      
      // If user is logged in, add a notification to the admins
      if (userId) {
        for (const admin of adminUsers) {
          if (admin._id) { // Make sure it's a valid admin user from the DB
            const unseenNotification = admin.unseenNotification || [];
            
            unseenNotification.push({
              type: 'support-request',
              message: `New support request from ${name}: ${subject}`,
              data: {
                name,
                email,
                subject,
                priority: priority || 'normal'
              },
              onClickPath: '/admin/support',
              createdAt: new Date()
            });
            
            await User.findByIdAndUpdate(
              admin._id,
              { unseenNotification },
              { new: true }
            );
            
            console.log(`Added notification to admin ${admin._id}`);
          }
        }
      }
      
      // Send confirmation email to user
      const userConfirmationMailOptions = {
        from: process.env.EMAIL_FROM || '"DevClinic Support" <no-reply@devclinic.com>',
        to: email,
        subject: 'Your Support Request - DevClinic',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #e0e0e0;
                border-radius: 5px;
              }
              .header {
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 1px solid #e0e0e0;
              }
              .content {
                padding: 20px 0;
              }
              .footer {
                text-align: center;
                font-size: 12px;
                color: #666;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Support Request Received</h2>
              </div>
              <div class="content">
                <p>Hello ${name},</p>
                <p>Thank you for contacting DevClinic Support. We have received your message regarding:</p>
                <p><strong>${subject}</strong></p>
                <p>Our support team will review your request and get back to you as soon as possible. Your request has been assigned the following priority: ${priority || 'Normal'}.</p>
                <p>For reference, here is a copy of your message:</p>
                <blockquote style="background-color: #f9f9f9; padding: 15px; border-left: 3px solid #3b82f6;">
                  ${message.replace(/\n/g, '<br>')}
                </blockquote>
                <p>If you need immediate assistance, please call our emergency support line at <strong>7599579985</strong>.</p>
                <p>Thank you for your patience.</p>
                <p>Best regards,<br>DevClinic Support Team</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} DevClinic. All rights reserved.</p>
                <p>This is an automated response, please do not reply directly to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Hello ${name},

Thank you for contacting DevClinic Support. We have received your message regarding:

${subject}

Our support team will review your request and get back to you as soon as possible. Your request has been assigned the following priority: ${priority || 'Normal'}.

For reference, here is a copy of your message:

${message}

If you need immediate assistance, please call our emergency support line at 7599579985.

Thank you for your patience.

Best regards,
DevClinic Support Team

© ${new Date().getFullYear()} DevClinic. All rights reserved.
This is an automated response, please do not reply directly to this email.`
      };
      
      await transporter.sendMail(userConfirmationMailOptions);
      console.log('Confirmation email sent to user:', email);
      
      return res.status(200).json({
        success: true,
        message: 'Your message has been sent successfully. We will contact you soon.'
      });
    } catch (emailError) {
      console.error('Error sending support email:', emailError);
      throw emailError; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('Error processing contact form:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
      error: error.message
    });
  }
}; 