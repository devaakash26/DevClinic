const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/AppointmentModel');
const Payment = require('../models/paymentModel');
const { sendPaymentConfirmationEmail, sendPaymentFailureEmail } = require('../utils/paymentEmailService');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a Razorpay order
router.post('/create-order', authMiddleware, async (req, res) => {
    try {
        console.log('[DEBUG] Payment create-order request received:', req.body);
        const { appointmentId, amount, userId } = req.body;
        
        if (!appointmentId || !amount) {
            console.log('[DEBUG] Invalid request - missing appointmentId or amount');
            return res.status(400).json({
                success: false,
                message: 'Appointment ID and amount are required'
            });
        }

        // Find the appointment to verify
        console.log('[DEBUG] Finding appointment with ID:', appointmentId);
        const appointment = await Appointment.findById(appointmentId);
        
        if (!appointment) {
            console.log('[DEBUG] Appointment not found:', appointmentId);
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        console.log('[DEBUG] Appointment found:', { 
            id: appointment._id, 
            userId: appointment.userId, 
            reqUserId: userId 
        });

        // Verify that the user making the request is the one who booked the appointment
        // Note: Need to convert IDs to strings for comparison
        const appointmentUserId = String(appointment.userId);
        const requestUserId = String(userId);
        
        console.log('[DEBUG] Comparing user IDs:', { appointmentUserId, requestUserId });
        
        if (appointmentUserId !== requestUserId) {
            console.log('[DEBUG] User ID mismatch:', { appointmentUserId, requestUserId });
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only pay for your own appointments'
            });
        }

        // Create Razorpay order
        console.log('[DEBUG] Creating Razorpay order:', { amount, appointmentId });
        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `receipt_${appointmentId}`,
            payment_capture: 1 // Auto-capture
        };

        try {
            const order = await razorpay.orders.create(options);
            console.log('[DEBUG] Razorpay order created:', order);

            // Save the payment details 
            const payment = new Payment({
                appointmentId,
                userId: userId,
                doctorId: appointment.doctorId,
                amount,
                currency: 'INR',
                orderId: order.id,
                status: 'created',
                receipt: options.receipt
            });

            console.log('[DEBUG] Saving payment record to database');
            await payment.save();
            console.log('[DEBUG] Payment record saved with ID:', payment._id);

            return res.status(200).json({
                success: true,
                data: {
                    orderId: order.id,
                    amount: amount * 100,
                    currency: 'INR',
                    receipt: options.receipt,
                    key: process.env.RAZORPAY_KEY_ID
                }
            });
        } catch (orderError) {
            console.error('[DEBUG] Razorpay order creation error:', orderError);
            throw orderError;
        }
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating payment order',
            error: error.message
        });
    }
});

// Verify payment
router.post('/verify-payment', authMiddleware, async (req, res) => {
    try {
        console.log('[DEBUG] Payment verification request received:', req.body);
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Find the payment record
        console.log('[DEBUG] Looking up payment record with order ID:', razorpay_order_id);
        const payment = await Payment.findOne({ orderId: razorpay_order_id });
        if (!payment) {
            console.log('[DEBUG] Payment record not found for order ID:', razorpay_order_id);
            return res.status(404).json({
                success: false,
                message: 'Payment record not found'
            });
        }
        
        console.log('[DEBUG] Payment record found:', payment);

        // Verify signature
        console.log('[DEBUG] Verifying payment signature');
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        // Compare signatures
        const isAuthentic = expectedSignature === razorpay_signature;
        console.log('[DEBUG] Signature verification result:', { 
            isAuthentic, 
            expectedSignature,
            receivedSignature: razorpay_signature
        });

        if (isAuthentic) {
            // Update payment status
            payment.status = 'paid';
            payment.paymentId = razorpay_payment_id;
            payment.signature = razorpay_signature;
            payment.paidAt = new Date();
            await payment.save();

            // Update appointment payment status
            const appointment = await Appointment.findByIdAndUpdate(
                payment.appointmentId,
                { 
                    paymentStatus: 'paid', 
                    paymentId: payment._id,
                    paymentMethod: 'razorpay',
                    // Update status from pending-payment to pending for doctor review
                    status: 'pending'
                },
                { new: true }
            );

            if (appointment) {
                // Get user data for notification
                const userData = await User.findById(appointment.userId);
                
                // Get doctor data for notification
                const doctorData = await Doctor.findOne({ userId: appointment.doctorId });
                
                // Send payment confirmation email if we have the user's email
                if (userData && userData.email) {
                    // Send email notification using our email service
                    await sendPaymentConfirmationEmail(
                        userData, 
                        doctorData || appointment.doctorInfo, 
                        appointment, 
                        payment
                    );
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                data: {
                    paymentId: razorpay_payment_id,
                    appointmentId: payment.appointmentId
                }
            });
        } else {
            // Payment verification failed
            payment.status = 'failed';
            await payment.save();

            // Find user and doctor details for email notification
            const appointment = await Appointment.findById(payment.appointmentId);

            if (appointment) {
                // Get user data for notification
                const userData = await User.findById(appointment.userId);
                
                // Get doctor data for notification
                const doctorData = await Doctor.findOne({ userId: appointment.doctorId });
                
                // Send payment failure email if we have the user's email
                if (userData && userData.email) {
                    await sendPaymentFailureEmail(
                        userData,
                        doctorData || appointment.doctorInfo,
                        appointment,
                        payment
                    );
                }
            }

            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        return res.status(500).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message
        });
    }
});

// Get payment details for an appointment
router.get('/get-details/:appointmentId', authMiddleware, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        
        // Find the payment record
        const payment = await Payment.findOne({ appointmentId });
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'No payment record found for this appointment'
            });
        }

        return res.status(200).json({
            success: true,
            data: payment
        });
    } catch (error) {
        console.error('Error getting payment details:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving payment details',
            error: error.message
        });
    }
});

// Update payment status (used for handling webhooks or manual updates)
router.post('/update-status', authMiddleware, async (req, res) => {
    try {
        const { paymentId, status } = req.body;
        
        if (!paymentId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID and status are required'
            });
        }

        // Find and update the payment
        const payment = await Payment.findOneAndUpdate(
            { paymentId },
            { status },
            { new: true }
        );

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found'
            });
        }

        // If payment is marked as paid, update the appointment too
        if (status === 'paid') {
            const appointment = await Appointment.findByIdAndUpdate(
                payment.appointmentId,
                { paymentStatus: 'paid' },
                { new: true }
            );
            
            // Optionally send confirmation email here too
            if (appointment) {
                // Get user data for notification
                const userData = await User.findById(appointment.userId);
                
                // Get doctor data for notification
                const doctorData = await Doctor.findOne({ userId: appointment.doctorId });
                
                if (userData && userData.email) {
                    try {
                        await sendPaymentConfirmationEmail(
                            userData,
                            doctorData || appointment.doctorInfo,
                            appointment,
                            payment
                        );
                    } catch (emailError) {
                        console.error("Error sending payment confirmation email:", emailError);
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            data: payment
        });
    } catch (error) {
        console.error('Error updating payment status:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating payment status',
            error: error.message
        });
    }
});

module.exports = router; 