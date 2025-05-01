const nodemailer = require('nodemailer');

// Create a transporter object
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Function to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
    }).format(amount);
};

// Function to format date
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    }).format(date);
};

// Function to send payment confirmation email
const sendPaymentConfirmationEmail = async (user, doctor, appointment, payment) => {
    try {
        // Get user name - handle different structures
        const userName = user.name || 
                         (user.userInfo && user.userInfo.name) || 
                         'Patient';
                         
        // Get doctor name - handle different structures
        const doctorFirstName = doctor.firstname || 
                               (doctor.doctorInfo && doctor.doctorInfo.firstname) || 
                               '';
        const doctorLastName = doctor.lastname || 
                              (doctor.doctorInfo && doctor.doctorInfo.lastname) || 
                              '';
        const doctorSpecialization = doctor.specialization || 
                                    (doctor.doctorInfo && doctor.doctorInfo.specialization) || 
                                    'Specialist';
                         
        // Get user email - handle different structures 
        const userEmail = user.email || 
                          (user.userInfo && user.userInfo.email);
                          
        if (!userEmail) {
            console.error("No email address found for user:", user);
            return false;
        }
        
        // Format the amount
        const formattedAmount = formatCurrency(payment.amount);
        
        // Generate receipt number
        const receiptNumber = payment.paymentId ? 
            `DCLINIC-${payment.paymentId.substring(0, 6)}` : 
            `DCLINIC-${payment._id.toString().substring(0, 6)}`;
        
        // Create payment date
        const paymentDate = formatDate(payment.paidAt || new Date());
        
        // Create HTML content
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #4a90e2;">Payment Confirmation</h2>
                </div>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <p>Dear ${userName},</p>
                    <p>Thank you for your payment. Your appointment has been confirmed and paid successfully.</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Receipt Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; width: 40%;"><strong>Receipt Number:</strong></td>
                            <td style="padding: 8px 0;">${receiptNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Date:</strong></td>
                            <td style="padding: 8px 0;">${paymentDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Payment Method:</strong></td>
                            <td style="padding: 8px 0;">Razorpay</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Transaction ID:</strong></td>
                            <td style="padding: 8px 0;">${payment.paymentId || 'Not available'}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Appointment Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; width: 40%;"><strong>Doctor:</strong></td>
                            <td style="padding: 8px 0;">Dr. ${doctorFirstName} ${doctorLastName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Specialization:</strong></td>
                            <td style="padding: 8px 0;">${doctorSpecialization}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Date:</strong></td>
                            <td style="padding: 8px 0;">${appointment.date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Time:</strong></td>
                            <td style="padding: 8px 0;">${appointment.time}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0;"><strong>Consultation Fee:</strong></td>
                            <td style="padding: 8px 0; text-align: right;">${formattedAmount}</td>
                        </tr>
                        <tr style="border-top: 1px solid #ddd;">
                            <td style="padding: 12px 0;"><strong>Total Amount Paid:</strong></td>
                            <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: bold; color: #4a90e2;">${formattedAmount}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
                    <p>If you have any questions about your payment or appointment, please contact us.</p>
                    <p>Thank you for choosing Developer Clinic.</p>
                </div>
            </div>
        `;
        
        // Send the email
        const info = await transporter.sendMail({
            from: `"Developer Clinic" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "Payment Confirmation - Developer Clinic",
            html: htmlContent
        });
        
        console.log("Payment confirmation email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending payment confirmation email:", error);
        return false;
    }
};

// Function to send payment failure email
const sendPaymentFailureEmail = async (user, doctor, appointment, paymentDetails) => {
    try {
        // Get user name - handle different structures
        const userName = user.name || 
                         (user.userInfo && user.userInfo.name) || 
                         'Patient';
                         
        // Get doctor name - handle different structures
        const doctorFirstName = doctor.firstname || 
                               (doctor.doctorInfo && doctor.doctorInfo.firstname) || 
                               '';
        const doctorLastName = doctor.lastname || 
                              (doctor.doctorInfo && doctor.doctorInfo.lastname) || 
                              '';
                         
        // Get user email - handle different structures 
        const userEmail = user.email || 
                          (user.userInfo && user.userInfo.email);
                          
        if (!userEmail) {
            console.error("No email address found for user:", user);
            return false;
        }
        
        // Create HTML content for failure notification
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #e74c3c;">Payment Failed</h2>
                </div>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <p>Dear ${userName},</p>
                    <p>We're sorry, but your recent payment for the appointment with Dr. ${doctorFirstName} ${doctorLastName} was not successful.</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Appointment Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; width: 40%;"><strong>Doctor:</strong></td>
                            <td style="padding: 8px 0;">Dr. ${doctorFirstName} ${doctorLastName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Date:</strong></td>
                            <td style="padding: 8px 0;">${appointment.date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Time:</strong></td>
                            <td style="padding: 8px 0;">${appointment.time}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #fdf7f7; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #e74c3c;">
                    <p style="margin: 0; color: #333;">Your appointment is still confirmed, and you can pay at the clinic during your visit.</p>
                </div>
                
                <div style="margin-top: 30px;">
                    <p>If you wish to try the payment again, you can do so from your appointment details page.</p>
                    <p>If you need assistance, please contact our support team.</p>
                </div>
                
                <div style="margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
                    <p>Thank you for choosing Developer Clinic.</p>
                </div>
            </div>
        `;
        
        // Send the email
        const info = await transporter.sendMail({
            from: `"Developer Clinic" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "Payment Failed - Developer Clinic",
            html: htmlContent
        });
        
        console.log("Payment failure email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending payment failure email:", error);
        return false;
    }
};

module.exports = {
    sendPaymentConfirmationEmail,
    sendPaymentFailureEmail,
    formatCurrency
}; 