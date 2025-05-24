const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Doctor = require("../models/Doctor")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const moment = require('moment');
const Appointments = require("../models/AppointmentModel");
const { upload } = require("../cloudConfig/multerConfig");
const { sendVerificationEmail, sendPasswordResetEmail, sendAppointmentRequestedPatientEmail, sendAppointmentRequestedDoctorEmail, sendWelcomeEmail, sendVideoConsultationPatientEmail, sendVideoConsultationDoctorEmail } = require("../utils/emailService");
const { OAuth2Client } = require('google-auth-library');
const mongoose = require('mongoose');
const crypto = require("crypto");
const { createVideoConsultation } = require('../services/googleCalendarService');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//Register
router.post('/register', async (req, res) => {
    try {
        const userExist = await User.findOne({ email: req.body.email });
        if (userExist) {
            return res.status(200).send({ message: "User already exists", success: false });
        }

        const password = req.body.password;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        req.body.password = hashedPassword;

        const newUser = new User(req.body);
        
        // Generate email verification token
        const verificationToken = jwt.sign(
            { userId: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        newUser.emailVerificationToken = verificationToken;
        newUser.emailVerificationExpires = Date.now() + 86400000; // 24 hours
        
        await newUser.save();
        
        // Send verification email
        await sendVerificationEmail(newUser.email, newUser.name, verificationToken);
        
        return res.status(200).send({ message: "User Created Successfully. Please check your email to verify your account.", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong", success: false });
    }
});

//Login 
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(200).send({ message: "User does not exist", success: false });
        }
        const isMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isMatch) {
            return res.status(200).send({ message: "Password Incorrect", success: false });
        } 
        
        // Check if the user's email is verified
        if (!user.isEmailVerified) {
            return res.status(200).send({ 
                message: "Please verify your email address before logging in. Check your inbox for the verification link.", 
                success: false,
                emailNotVerified: true
            });
        }
        
        // Check if this is the first login (welcome email not sent yet)
        if (user.isEmailVerified && !user.welcomeEmailSent) {
            // Send welcome email
            await sendWelcomeEmail(user.email, user.name);
            
            // Update user record to indicate welcome email has been sent
            user.welcomeEmailSent = true;
            await user.save();
            
            console.log(`Welcome email sent to ${user.name} (${user.email})`);
        }
        
        // Email is verified, proceed with login
        const token = await jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1d"
        });
        res.status(200).send({ message: "Login Successful", success: true, data: token });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong", success: false });
    }
});

// Google Sign-In Route
router.post('/google-signin', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).send({ 
                message: "Google token is required", 
                success: false 
            });
        }
        
        console.log("Received Google token for verification");
        
        // Create a new OAuth client with the client ID from environment variables
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        
        // Verify the token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        console.log("Google payload verified:", payload.email);
        
        // Extract user information from Google payload
        const { email, name, picture, email_verified, sub } = payload;
        
        if (!email_verified) {
            return res.status(400).send({ 
                message: "Google account email not verified", 
                success: false 
            });
        }
        
        // Check if user already exists
        let user = await User.findOne({ email });
        let isNewUser = false;
        
        if (user) {
            // User exists, update their profile if needed
            user.name = name || user.name;
            user.profilePicture = picture || user.profilePicture;
            user.isEmailVerified = true; // Google accounts are pre-verified
            
            // If user signed up with Google, they might not have a googleId
            if (!user.googleId) {
                user.googleId = sub;
            }
            
            await user.save();
            console.log("Updated existing user with Google information");
        } else {
            // Create new user with a random secure password
            const randomPassword = require('crypto').randomBytes(16).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);
            
            // Create new user
            const newUser = new User({
                email,
                name: name || email.split('@')[0], // Use email username as fallback
                googleId: sub,
                profilePicture: picture || '',
                isEmailVerified: true, // Google accounts are pre-verified
                password: hashedPassword
            });
            
            user = await newUser.save();
            isNewUser = true;
            console.log("Created new user from Google sign-in");
        }
        
        // Check if welcome email should be sent
        if (!user.welcomeEmailSent) {
            // Send welcome email
            await sendWelcomeEmail(user.email, user.name);
            
            // Update user record to indicate welcome email has been sent
            user.welcomeEmailSent = true;
            await user.save();
            
            console.log(`Welcome email sent to ${user.name} (${user.email})`);
        }
        
        // Generate JWT token
        const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1d"
        });
        
        res.status(200).send({ 
            message: "Google sign-in successful", 
            success: true, 
            data: jwtToken
        });
        
    } catch (error) {
        console.error("Google sign-in error:", error);
        
        // More specific error messages based on the error type
        if (error.message && error.message.includes('Invalid token')) {
            return res.status(401).send({ 
                message: "Invalid Google token", 
                success: false 
            });
        }
        
        return res.status(500).send({ 
            message: "Something went wrong with Google sign-in", 
            success: false 
        });
    }
});

router.post('/get-user-info', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.userId });
        if (!user) {
            return res.status(200).send({
                message: "User does not exist", success: false
            })
        }
        else {
            res.status(200).send({
                success: true, data: user
            })
        }
    } catch (error) {
        return res.status(500).send({ message: "Something went wrong", success: false });

    }
})

//Apply doctor account
router.post('/apply-doctor', authMiddleware, upload.single('imgDoctor'), async (req, res) => {
    try {
        // Extract data from request body and file
        const {
            firstname, lastname, email, mobile, website, 
            department, profession, experience, address, 
            city, state, zipCode, coordinates,
            feePerConsultation, timing, userId,
            medicalDegree, institution, qualifications, specialization,
            hospitalAffiliations, professionalBio, imageUrl
        } = req.body;

        console.log("Doctor application received with fields:", Object.keys(req.body));
        console.log("User ID from request:", userId, "type:", typeof userId);
        console.log("Timing value received:", timing);
        console.log("Location details received:", { city, state, zipCode, coordinates });
        console.log("Image file received:", req.file ? true : false);
        console.log("Image URL from request body:", imageUrl);

        // Verify that the user exists in the database
        let userObject = null;
        try {
            userObject = await User.findById(userId);
        } catch (err) {
            console.error("Error finding user by ID:", err);
        }
        
        if (!userObject) {
            console.warn(`User with ID ${userId} not found directly, attempting to find by email`);
            // Try to find the user by email as a fallback
            userObject = await User.findOne({ email: email });
            
            if (!userObject) {
                console.error(`No user found with email ${email} either`);
                return res.status(400).send({ 
                    message: "Cannot find a matching user. Please ensure you're logged in.", 
                    success: false 
                });
            }
            
            console.log(`User found by email: ${userObject.name} (${userObject._id})`);
        } else {
            console.log(`User verified by ID: ${userObject.name} (${userObject._id})`);
        }

        // Handle image: either from file upload or from provided URL
        let finalImageUrl;
        
        if (req.file) {
            // If a file was uploaded, use its path (Cloudinary URL)
            finalImageUrl = req.file.path;
            console.log("Using uploaded image path:", finalImageUrl);
        } else if (imageUrl) {
            // Check if the imageUrl is a valid URL and not a base64 string
            if (imageUrl.startsWith('data:')) {
                return res.status(400).send({ 
                    message: "Invalid image format. Please upload image properly.", 
                    success: false 
                });
            }
            // Use the provided Cloudinary URL
            finalImageUrl = imageUrl;
            console.log("Using provided Cloudinary URL:", finalImageUrl);
        } else {
            // No image found
            return res.status(400).send({ 
                message: "Profile image is required. Please upload an image.", 
                success: false 
            });
        }

        // Handle timing data safely
        let parsedTiming = [];
        if (timing) {
            try {
                // Check if it's already an array
                if (Array.isArray(timing)) {
                    parsedTiming = timing;
                } else if (typeof timing === 'string') {
                    // Try to parse if it's a JSON string
                    try {
                        parsedTiming = JSON.parse(timing);
                    } catch {
                        // If it's not valid JSON, it might be a comma-separated string
                        parsedTiming = timing.split(',').map(time => time.trim());
                    }
                }
                
                // Ensure we have properly formatted HH:mm strings for both start and end time
                if (parsedTiming.length >= 2) {
                    const formattedTiming = parsedTiming.map(timeStr => {
                        if (!timeStr) return null;
                        
                        // If it's already in HH:mm format, return as is
                        if (typeof timeStr === 'string' && /^\d{2}:\d{2}$/.test(timeStr)) {
                            console.log(`Time already in HH:mm format: ${timeStr}`);
                            return timeStr;
                        }
                        
                        try {
                            // Special handling for AM/PM format
                            const timeValue = String(timeStr).trim();
                            let formattedTime;
                            
                            // Handle AM/PM format specifically
                            if (timeValue.toLowerCase().includes('am') || timeValue.toLowerCase().includes('pm')) {
                                console.log(`Parsing AM/PM time: ${timeValue}`);
                                
                                // Try the specific AM/PM formats first
                                const time = moment(timeValue, ['h:mm A', 'h:mm a', 'hh:mm A', 'hh:mm a'], true);
                                
                                if (time.isValid()) {
                                    formattedTime = time.format('HH:mm');
                                    console.log(`Converted AM/PM time ${timeValue} → ${formattedTime}`);
                                    return formattedTime;
                                }
                            }
                            
                            // Try other formats
                            const parsedTime = moment(timeValue, [
                                'HH:mm', 'HH:mm:ss', 'H:mm', 
                                'YYYY-MM-DD HH:mm', 
                                'YYYY-MM-DDTHH:mm:ss.SSSZ'
                            ]);
                            
                            if (parsedTime.isValid()) {
                                formattedTime = parsedTime.format('HH:mm');
                                console.log(`Converted time ${timeValue} → ${formattedTime}`);
                                return formattedTime;
                            }
                            
                            // Return original if we couldn't parse
                            console.warn(`Could not parse time: ${timeValue}`);
                            return timeValue;
                        } catch (error) {
                            console.error(`Error parsing time '${timeStr}':`, error);
                            return timeStr; // Return original on error
                        }
                    });
                    
                    // Log the original and converted times for debugging
                    console.log("Time conversion:", {
                        original: parsedTiming.map(t => String(t)),
                        formatted: formattedTiming
                    });
                    
                    // Make sure both times are valid
                    if (formattedTiming.length >= 2 && 
                        formattedTiming[0] && formattedTiming[1] &&
                        /^\d{2}:\d{2}$/.test(formattedTiming[0]) &&
                        /^\d{2}:\d{2}$/.test(formattedTiming[1])) {
                        parsedTiming = formattedTiming;
                        console.log("Using formatted timing:", parsedTiming);
                    } else {
                        console.warn("Invalid formatted timing, using original:", parsedTiming);
                    }
                }
                
                console.log("Successfully parsed timing:", parsedTiming);
            } catch (error) {
                console.error("Timing parse error:", error);
                // If parsing fails completely, set default hours
                parsedTiming = ["09:00", "17:00"];
                console.log("Using default timing:", parsedTiming);
            }
        } else {
            // Default timing if not provided
            parsedTiming = ["09:00", "17:00"];
            console.log("No timing provided. Using default:", parsedTiming);
        }

        // Parse specialization if it's a JSON string
        let parsedSpecialization = specialization;
        if (specialization && typeof specialization === 'string') {
            try {
                parsedSpecialization = JSON.parse(specialization);
                console.log("Successfully parsed specialization:", parsedSpecialization);
            } catch (error) {
                console.error("Specialization parse error:", error);
                // If parsing fails, use the original string
                parsedSpecialization = specialization;
            }
        }

        // Always use the actual user ID from the database for consistency
        const validUserId = userObject._id;

        // Create new doctor with all available fields
        const newDoctor = new Doctor({
            firstname,
            lastname,
            email,
            mobile,
            website,
            department,
            profession,
            experience,
            address,
            city: city || '',
            state: state || '',
            zipCode: zipCode || '',
            coordinates: coordinates ? (typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates) : null,
            feePerConsultation,
            timing: parsedTiming,
            userId: validUserId,  // Use the verified user ID
            image: finalImageUrl,
            status: "pending",
            // Additional fields for qualifications
            medicalDegree,
            institution, 
            qualifications,
            specialization: parsedSpecialization,
            // Additional fields for professional information
            hospitalAffiliations,
            professionalBio
        });

        const savedDoctor = await newDoctor.save();
        console.log("Doctor saved with fields:", Object.keys(savedDoctor._doc));
        
        // Notify admin
        const adminUser = await User.findOne({ isAdmin: true });
        
        if (!adminUser) {
            console.error("No admin user found in the database!");
            return res.status(201).send({ 
                message: "Application submitted successfully, but admin notification could not be sent.", 
                success: true 
            });
        }
        
        console.log(`Found admin user:`, adminUser.email);
        
        const unseenNotification = adminUser.unseenNotification || [];
        
        const notification = {
            type: "new-doctor-request",
            message: `${newDoctor.firstname} ${newDoctor.lastname} has applied for a doctor account`,
            data: {
                doctorId: newDoctor._id,
                name: newDoctor.firstname + " " + newDoctor.lastname
            },
            onClickPath: "/admin/doctor-list",
            createdAt: new Date()
        };
        
        unseenNotification.push(notification);
        
        // Make sure we're using findOneAndUpdate to ensure atomic operation
        const updatedAdmin = await User.findOneAndUpdate(
            { _id: adminUser._id },
            { $set: { unseenNotification: unseenNotification } },
            { new: true }
        );
        
        console.log("Admin notification added:", updatedAdmin.unseenNotification.length);
        
        // Use Socket.io to send real-time notification
        const io = req.app.get('io');
        if (io) {
            io.emit('send_notification', { 
                userId: adminUser._id.toString(),
                notification 
            });
            console.log(`Real-time notification sent to admin ${adminUser._id.toString()} via Socket.io`);
        }

        return res.status(201).send({ message: "Application submitted successfully.", success: true });
    } catch (error) {
        console.error("Error during doctor application:", error);
        return res.status(500).send({ message: "Something went wrong.", success: false });
    }
});

//mark-as-all-seen
router.post("/mark-as-all-seen", authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.userId });
        if (!user) {
            return res.status(404).send({ message: "User not found", success: false });
        }
        const unseenNotification = user.unseenNotification;
        const seenNotification = user.seenNotification || [];
        
        // Ensure all notifications have timestamps before moving them
        if (unseenNotification && unseenNotification.length > 0) {
            unseenNotification.forEach(notification => {
                ensureNotificationTimestamp(notification);
            });
        }
        
        // Move all notifications to seen
        seenNotification.push(...unseenNotification);
        user.unseenNotification = [];
        user.seenNotification = seenNotification;
        
        await user.save();
        
        // Use Socket.io to notify about seen notifications
        const io = req.app.get('io');
        if (io) {
            io.emit('notifications_seen', { userId: user._id });
        }
        
        res.status(200).send({ message: "All Notifications marked as seen", success: true, user });
    } catch (error) {
        res.status(500).send({ message: "Something went wrong.", success: false });
    }
});

//Delete all Notification
router.post("/delete-all-notification", authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.userId });
        user.unseenNotification = [];
        user.seenNotification = [];
        const updateUser = await User.findByIdAndUpdate(user._id, user);
        updateUser.password = undefined;
        res.status(200).send({ message: "Deleted Successfully", success: true });
    } catch (error) {
        console.log("Error", error);
        return res.status(500).send({ message: "Something went wrong.", success: false });
    }
});

// Forgot Password Route
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).send({ 
                message: "User with this email does not exist", 
                success: false 
            });
        }
        
        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        
        // Save token to user
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        
        // Send password reset email
        const emailSent = await sendPasswordResetEmail(user.email, user.name, resetToken);
        
        if (emailSent) {
            return res.status(200).send({ 
                message: "Password reset link sent to your email", 
                success: true 
            });
        } else {
            return res.status(500).send({ 
                message: "Failed to send password reset email. Please try again later.", 
                success: false 
            });
        }
    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).send({ 
            message: "Something went wrong", 
            success: false 
        });
    }
});

// Verify Reset Token
router.get("/verify-reset-token/:token", async (req, res) => {
    try {
        const { token } = req.params;
        
        // Verify token format
        if (!token) {
            return res.status(400).send({ 
                message: "Invalid token", 
                success: false 
            });
        }
        
        // Find user with this token and check if token is expired
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(200).send({ 
                message: "Password reset token is invalid or has expired", 
                success: false 
            });
        }
        
        return res.status(200).send({ 
            message: "Token is valid", 
            success: true 
        });
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(500).send({ 
            message: "Something went wrong", 
            success: false 
        });
    }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
    try {
        const { token, password } = req.body;
        
        // Find user with this token and check if token is expired
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(200).send({ 
                message: "Password reset token is invalid or has expired", 
                success: false 
            });
        }
        
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Update user password and clear reset token fields
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
        return res.status(200).send({ 
            message: "Password has been reset successfully", 
            success: true 
        });
    } catch (error) {
        console.error("Password reset error:", error);
        return res.status(500).send({ 
            message: "Something went wrong", 
            success: false 
        });
    }
});

// Email Verification Route
router.get("/verify-email/:token", async (req, res) => {
    try {
        const { token } = req.params;
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        
        // Find user and update verification status
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ 
                message: "User not found", 
                success: false 
            });
        }
        
        user.isEmailVerified = true;
        await user.save();
        
        return res.status(200).send({ 
            message: "Email verification successful", 
            success: true 
        });
    } catch (error) {
        console.error("Email verification error:", error);
        return res.status(500).send({ 
            message: "Invalid or expired verification link", 
            success: false 
        });
    }
});

//get a user list
router.get("/get-all-user", authMiddleware, async (req, res) => {
    try {
        const user = await User.find({ isAdmin: false, isDoctor: false });
        res.status(200).send({ message: "Fetched Successfully", success: true, data: user })


    } catch (error) {
        console.log("Error", error);

        return res.status(500).send({ message: "Something went wrong.", success: false });

    }
})

//get a doctor list
router.get("/get-all-doctors", authMiddleware, async (req, res) => {
    try {
        const user = await Doctor.find({});
        res.status(200).send({ message: "Doctor Details Fetched Successfully", success: true, data: user })


    } catch (error) {
        console.log("Error", error);

        return res.status(500).send({ message: "Something went wrong.", success: false });

    }
})

//approved doctor cards
router.get("/get-all-aproved-doctor", authMiddleware, async (req, res) => {
    try {
        const doctor = await Doctor.find({ status: "approved" });
        res.status(200).send({ message: "Doctor Details Fetched Successfully", success: true, data: doctor });
    } catch (error) {
        console.log(error)
        return res.status(500).send({ message: "Something went wrong.", success: false });

    }

})

router.get("/notifications/:userId", authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({
                message: "User not found",
                success: false,
            });
        }

        // Initialize notification arrays if they don't exist
        let unseenNotifications = user.unseenNotification || [];
        let seenNotifications = user.seenNotification || [];
        
        // Ensure all notifications have timestamps
        let needsUpdate = false;
        
        unseenNotifications = unseenNotifications.map(notification => {
            if (!notification.createdAt) {
                needsUpdate = true;
                return ensureNotificationTimestamp(notification);
            }
            return notification;
        });
        
        seenNotifications = seenNotifications.map(notification => {
            if (!notification.createdAt) {
                needsUpdate = true;
                return ensureNotificationTimestamp(notification);
            }
            return notification;
        });
        
        // Save any updates to notifications if needed
        if (needsUpdate) {
            user.unseenNotification = unseenNotifications;
            user.seenNotification = seenNotifications;
            await user.save();
            console.log(`Added missing timestamps to notifications for user ${userId}`);
        }
        
        console.log(`Fetched ${unseenNotifications.length} unseenNotifications for user ${userId}`);

        res.status(200).send({
            message: "Notifications fetched successfully",
            success: true,
            data: unseenNotifications,
            seenNotifications: seenNotifications
        });

    } catch (error) {
        console.log("Error fetching notifications:", error);
        return res.status(500).send({ message: "Something went wrong.", success: false });
    }
});

// Helper function to format time from any format to HH:mm
const formatTimeToHHMM = (timeString) => {
  if (!timeString) return null;
  
  // If it's an ISO date string, extract only the time part
  if (typeof timeString === 'string' && timeString.includes('T')) {
    return timeString.split('T')[1].substring(0, 5); // Get HH:mm
  }
  
  // If it's already in HH:mm format, return as is
  if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}$/)) {
    return timeString;
  }
  
  // Otherwise, try to parse with moment and format
  const time = moment(timeString);
  if (time.isValid()) {
    return time.format('HH:mm');
  }
  
  return null;
};

// booking appointment
router.post("/book-appointment", authMiddleware, async (req, res) => {
  try {
    console.log("Received appointment booking request:", JSON.stringify(req.body, null, 2));
    
    const { 
      doctorId, 
      userId, 
      doctorInfo, 
      userInfo, 
      date, 
      time, 
      reason, 
      symptoms, 
      medicalHistory, 
      preferredCommunication,
      emergencyContact,
      additionalNotes,
      paymentMethod,
      status,
      appointmentType
    } = req.body;
    
    // Make sure we have all required fields
    if (!doctorId || !userId || !date || !time || !reason) {
      console.log("Missing required fields in request:", { doctorId, userId, date, time, reason });
      return res.status(400).send({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Format date and time for consistency
    const formattedDate = moment(date, "DD-MM-YYYY").format("DD-MM-YYYY");
    const formattedTime = formatTimeToHHMM(time);
    console.log("Formatted date and time:", { formattedDate, formattedTime, originalDate: date, originalTime: time });

    // First check if this slot is available
    const doctorUser = await User.findOne({ _id: doctorId });
    
    if (!doctorUser) {
      console.log("Doctor not found:", doctorId);
      return res.status(404).send({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check if the doctor is available at this time
    const existingAppointment = await Appointments.findOne({
      doctorId,
      date: formattedDate,
      time: formattedTime,
      status: { $nin: ["cancelled", "rejected"] }, // Exclude cancelled and rejected appointments
    });

    if (existingAppointment) {
      console.log("Appointment slot not available:", existingAppointment);
      return res.status(400).send({
        success: false,
        message: "Appointment slot not available. Please select a different time.",
      });
    }

    console.log("Creating new appointment with model:", typeof Appointments);
    
    // Determine initial status
    // If payment method is razorpay and status is pending-payment, use pending-payment
    // Otherwise use default "pending"
    const initialStatus = (paymentMethod === 'razorpay' && status === 'pending-payment') 
      ? 'pending-payment' 
      : 'pending';
    
    // Create the appointment
    const newAppointment = {
      userId,
      doctorId,
      doctorInfo,
      userInfo,
      date: formattedDate,
      time: formattedTime,
      reason,
      symptoms: symptoms || "",
      medicalHistory: medicalHistory || "",
      preferredCommunication: preferredCommunication || "phone",
      emergencyContact: emergencyContact || "",
      additionalNotes: additionalNotes || "",
      status: initialStatus,
      paymentMethod: paymentMethod || "clinic",
      paymentStatus: "pending",
      appointmentType: appointmentType || "in-person"
    };

    console.log("Saving appointment to database...");

    // If this is a video consultation, set up Google Meet link
    if (appointmentType === "video") {
      console.log('Setting up video consultation');
      
      try {
        // Create Google Calendar event with Meet link
        const calendarResult = await createVideoConsultation(newAppointment);
        console.log('Google Calendar API result:', calendarResult);
        
        if (calendarResult.success && calendarResult.meetingLink) {
          // Add video consultation details to the appointment
          newAppointment.videoConsultation = {
            meetingLink: calendarResult.meetingLink,
            calendarEventId: calendarResult.calendarEventId,
            joinedByDoctor: false,
            joinedByPatient: false
          };
          
          console.log('Video consultation link created:', calendarResult.meetingLink);
        } else {
          console.error('Failed to create video consultation:', calendarResult.error);
          // Set default values to prevent undefined errors
          newAppointment.videoConsultation = {
            meetingLink: "",
            calendarEventId: "",
            joinedByDoctor: false,
            joinedByPatient: false
          };
          // You might want to send an alert or email to admin about this failure
        }
      } catch (videoError) {
        console.error('Error creating video consultation:', videoError);
        // Set default values to prevent undefined errors
        newAppointment.videoConsultation = {
          meetingLink: "",
          calendarEventId: "",
          joinedByDoctor: false,
          joinedByPatient: false
        };
      }
    }

    // Save appointment to database
    const appointment = new Appointments(newAppointment);
    const result = await appointment.save();
    console.log("Appointment saved successfully:", result._id);
    
    // Only send notification to doctor if status is "pending" (not for pending-payment)
    if (initialStatus === 'pending') {
      const unseenNotifications = doctorUser.unseenNotification || [];
      unseenNotifications.push({
        type: "new-appointment-request",
        message: `A new appointment request from ${userInfo.name} for ${formattedDate} at ${moment(formattedTime, "HH:mm").format("hh:mm A")}`,
        data: {
          appointmentId: result._id,
          userInfo: userInfo,
          date: formattedDate,
          time: formattedTime,
        },
        onClickPath: "/doctor/appointments",
      });
      
      await User.findByIdAndUpdate(doctorId, { unseenNotification: unseenNotifications });
      console.log("Doctor notification sent successfully");
    } else {
      console.log("Skipping doctor notification for pending-payment status");
    }

    // Send confirmation emails
    if (userInfo.email) {
      // For in-person appointments, use regular email template
      if (appointmentType === "in-person") {
        sendAppointmentRequestedPatientEmail(userInfo.email, userInfo.name, newAppointment)
          .catch(err => console.error('Error sending patient confirmation email:', err));
      } else if (appointmentType === "video" && newAppointment.videoConsultation?.meetingLink) {
        // For video appointments with successful link creation, use video consultation template
        sendVideoConsultationPatientEmail(userInfo.email, userInfo.name, newAppointment)
          .catch(err => console.error('Error sending video consultation email to patient:', err));
      }
    }
    
    if (doctorInfo && doctorInfo.email) {
      // For in-person appointments, use regular email template
      if (appointmentType === "in-person") {
        sendAppointmentRequestedDoctorEmail(doctorInfo.email, `${doctorInfo.firstname} ${doctorInfo.lastname}`, userInfo.name, newAppointment)
          .catch(err => console.error('Error sending doctor notification email:', err));
      } else if (appointmentType === "video" && newAppointment.videoConsultation?.meetingLink) {
        // For video appointments with successful link creation, use video consultation template
        sendVideoConsultationDoctorEmail(doctorInfo.email, `${doctorInfo.firstname} ${doctorInfo.lastname}`, userInfo.name, newAppointment)
          .catch(err => console.error('Error sending video consultation email to doctor:', err));
      }
    }

    // If payment method is 'razorpay' redirect to payment creation
    if (paymentMethod === "razorpay") {
      return res.status(200).send({
        message: "Appointment created successfully, payment pending",
        success: true,
        data: result,
        redirectToPayment: true
      });
    } else {
      return res.status(200).send({
        message: "Appointment request submitted successfully",
        success: true,
        data: result
      });
    }
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).send({
      message: "Error booking appointment",
      success: false,
      error: error.message
    });
  }
});

// checking booking availability
router.post("/check-book-availability", authMiddleware, async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;
    
    // Make sure we have all required fields
    if (!doctorId || !date || !time) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Format date and time for consistency
    const formattedDate = moment(date, "DD-MM-YYYY").format("DD-MM-YYYY");
    const formattedTime = formatTimeToHHMM(time);
    
    // Check if the doctor exists
    const doctorUser = await User.findOne({ _id: doctorId });
    
    if (!doctorUser) {
      return res.status(404).send({
        success: false,
        message: "Doctor not found",
      });
    }
    
    // Check if the doctor is available at this time
    const existingAppointment = await Appointments.findOne({
      doctorId,
      date: formattedDate,
      time: formattedTime,
      status: { $ne: "cancelled" }, // Exclude cancelled appointments
    });
    
    if (existingAppointment) {
      return res.status(200).send({
        success: false,
        message: "Slot already booked",
      });
    }
    
    // Check if the time is within doctor's consulting hours
    const doctorData = await Doctor.findOne({ userId: doctorId });
    
    if (doctorData && doctorData.timing && doctorData.timing.length >= 2) {
      // Format doctor's timing to ensure consistent comparison
      const startTimeStr = formatTimeToHHMM(doctorData.timing[0]);
      const endTimeStr = formatTimeToHHMM(doctorData.timing[1]);
      
      const startTime = moment(startTimeStr, "HH:mm");
      const endTime = moment(endTimeStr, "HH:mm");
      const requestedTime = moment(formattedTime, "HH:mm");
      
      if (requestedTime.isBefore(startTime) || requestedTime.isAfter(endTime)) {
        return res.status(200).send({
          success: false,
          message: "Time is outside doctor's consulting hours",
        });
      }
    }
    
    // The slot is available
    return res.status(200).send({
      success: true,
      message: "Slot is available",
    });
  } catch (error) {
    console.error("Check availability error:", error);
    res.status(500).send({
      success: false,
      message: "Error checking appointment availability",
      error: error.message,
    });
  }
});

// Update user profile
router.post("/update-profile", authMiddleware, async (req, res) => {
  try {
    const { userId, name, phone, mobile, address, profilePicture } = req.body;
    
    // Validate data
    if (!userId) {
      return res.status(400).send({
        success: false,
        message: "User ID is required"
      });
    }

    // Prepare update data
    const updateData = {
      name,
      address
    };

    // Handle mobile/phone - ensure we use one of them consistently
    if (mobile) {
      updateData.mobile = mobile;
    } else if (phone) {
      updateData.phone = phone;
    }

    // Include profile picture if provided
    if (profilePicture) {
      updateData.profilePicture = profilePicture;
    }

    // Find user and update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).send({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).send({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send({
      success: false,
      message: "Server error while updating profile",
      error: error.message
    });
  }
});

// Upload profile picture
router.post("/upload-profile-picture", authMiddleware, upload.single('profileImage'), async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).send({
        success: false,
        message: "User ID is required"
      });
    }

    if (!req.file) {
      return res.status(400).send({
        success: false,
        message: "No image file provided"
      });
    }

    // Get the Cloudinary URL from the uploaded file
    const profileImageUrl = req.file.path || null;

    if (!profileImageUrl) {
      return res.status(400).send({
        success: false,
        message: "Failed to upload image"
      });
    }

    // Update user with new profile picture
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture: profileImageUrl },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).send({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).send({
      success: true,
      message: "Profile picture updated successfully",
      data: {
        url: profileImageUrl,
        user: updatedUser
      }
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).send({
      success: false,
      message: "Server error while uploading profile picture",
      error: error.message
    });
  }
});

// Get a single appointment by ID
router.get("/appointment/:appointmentId", authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    if (!appointmentId) {
      return res.status(400).send({
        success: false,
        message: "Appointment ID is required"
      });
    }

    // Find the appointment with the given ID
    const appointment = await Appointments.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).send({
        success: false,
        message: "Appointment not found"
      });
    }

    // Ensure the user is authorized to view this appointment (user is either the patient or the doctor)
    const userId = req.body.userId;
    if (appointment.userId !== userId && appointment.doctorId !== userId) {
      console.log("Authorization check failed:", {
        appointmentUserId: appointment.userId,
        appointmentDoctorId: appointment.doctorId,
        requestUserId: userId
      });
      
      return res.status(403).send({
        success: false,
        message: "You are not authorized to view this appointment"
      });
    }

    // Return the appointment
    return res.status(200).send({
      success: true,
      message: "Appointment found",
      data: appointment
    });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    res.status(500).send({
      success: false,
      message: "Server error while fetching appointment",
      error: error.message
    });
  }
});

// Update password
router.post("/update-password", authMiddleware, async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    // Validate data
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).send({
        success: false,
        message: "All fields are required"
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found"
      });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).send({
        success: false,
        message: "Current password is incorrect"
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    return res.status(200).send({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).send({
      success: false,
      message: "Server error while updating password",
      error: error.message
    });
  }
});

// Delete account
router.post("/delete-account", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Validate data
    if (!userId) {
      return res.status(400).send({
        success: false,
        message: "User ID is required"
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found"
      });
    }
    
    // If user is a doctor, also delete doctor data
    if (user.isDoctor) {
      await Doctor.findOneAndDelete({ userId });
      
      // Cancel all appointments with this doctor
      await Appointments.updateMany(
        { doctorId: userId },
        { $set: { status: "cancelled", cancelReason: "Doctor account deleted" } }
      );
    }
    
    // Cancel all appointments made by this user
    await Appointments.updateMany(
      { userId },
      { $set: { status: "cancelled", cancelReason: "User account deleted" } }
    );
    
    // Delete user
    await User.findByIdAndDelete(userId);
    
    return res.status(200).send({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).send({
      success: false,
      message: "Server error while deleting account",
      error: error.message
    });
  }
});

//delete-notification
router.post("/delete-notification", authMiddleware, async (req, res) => {
    try {
        const { userId, notificationId } = req.body;
        const user = await User.findOne({ _id: userId });
        
        if (!user) {
            return res.status(404).send({ message: "User not found", success: false });
        }
        
        // Remove from unseen notifications if present
        const unseenIndex = user.unseenNotification.findIndex(
            notification => notification._id.toString() === notificationId
        );
        
        if (unseenIndex !== -1) {
            user.unseenNotification.splice(unseenIndex, 1);
        } else {
            // Remove from seen notifications if not in unseen
            const seenIndex = user.seenNotification.findIndex(
                notification => notification._id.toString() === notificationId
            );
            
            if (seenIndex !== -1) {
                user.seenNotification.splice(seenIndex, 1);
            } else {
                return res.status(404).send({ 
                    message: "Notification not found", 
                    success: false 
                });
            }
        }
        
        await user.save();
        
        // Use Socket.io to notify about deleted notification
        const io = req.app.get('io');
        if (io) {
            io.emit('notification_deleted', { 
                userId: user._id,
                notificationId
            });
        }
        
        res.status(200).send({
            message: "Notification deleted successfully",
            success: true,
            user
        });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).send({
            message: "Error deleting notification",
            success: false,
            error: error.message
        });
    }
});

//mark-notification-seen
router.post("/mark-notification-seen", authMiddleware, async (req, res) => {
    try {
        const { userId, notificationId } = req.body;
        
        console.log("Mark notification seen request:", { userId, notificationId });
        
        if (!userId || !notificationId) {
            return res.status(400).send({ 
                message: "User ID and notification ID are required", 
                success: false 
            });
        }
        
        // Validate the authenticated user matches the requested userId
        if (req.userId !== userId) {
            console.log(`Auth user ${req.userId} does not match requested user ${userId}`);
            return res.status(403).send({
                message: "You are not authorized to modify notifications for this user",
                success: false
            });
        }
        
        const user = await User.findOne({ _id: userId });
        
        if (!user) {
            console.log(`User not found: ${userId}`);
            return res.status(404).send({ 
                message: "User not found", 
                success: false 
            });
        }
        
        console.log(`Found user ${user.name}, checking for notification ${notificationId}`);
        console.log(`User has ${user.unseenNotification?.length || 0} unseen notifications`);
        
        // Ensure user has unseenNotification array
        if (!Array.isArray(user.unseenNotification)) {
            user.unseenNotification = [];
        }
        
        // Find notification in unseen array
        let notificationIndex = -1;
        let notificationObj = null;
        
        // Try both string comparison and ObjectId comparison to handle different ID formats
        if (user.unseenNotification && user.unseenNotification.length > 0) {
            // Log all notification IDs for debugging
            console.log("Available notification IDs:", 
                user.unseenNotification.map(n => n._id ? n._id.toString() : "undefined")
            );
            
            notificationIndex = user.unseenNotification.findIndex(notification => {
                if (!notification._id) {
                    console.log("Found notification without ID");
                    return false;
                }
                
                const notificationIdStr = notification._id.toString();
                console.log(`Comparing ${notificationIdStr} with ${notificationId}`);
                
                return notificationIdStr === notificationId || 
                       notificationIdStr === new mongoose.Types.ObjectId(notificationId).toString();
            });
            
            if (notificationIndex !== -1) {
                notificationObj = user.unseenNotification[notificationIndex];
                
                // Ensure notification has a timestamp
                if (!notificationObj.createdAt) {
                    notificationObj.createdAt = new Date();
                }
            }
        }
        
        // Handle case when notification is not found
        if (notificationIndex === -1) {
            return res.status(404).send({
                message: "Notification not found",
                success: false
            });
        }
        
        // Remove from unseen
        user.unseenNotification.splice(notificationIndex, 1);
        
        // Initialize seen array if needed
        if (!Array.isArray(user.seenNotification)) {
            user.seenNotification = [];
        }
        
        // Add to seen
        user.seenNotification.push(notificationObj);
        
        await user.save();
        console.log("User updated successfully - notification marked as seen");
        
        // Use Socket.io to notify about seen notification
        const io = req.app.get('io');
        if (io) {
            io.emit('notification_seen', { 
                userId: user._id.toString(),
                notificationId
            });
            console.log("Socket notification sent for seen notification");
        }
        
        return res.status(200).send({
            message: "Notification marked as seen",
            success: true,
            user
        });
    } catch (error) {
        console.error("Error marking notification as seen:", error);
        return res.status(500).send({ 
            message: "Something went wrong", 
            success: false,
            error: error.message
        });
    }
});

// Get user appointments
router.get("/get-user-appointments", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId; // This comes from the authMiddleware

    // Fetch all appointments for this user
    const appointments = await Appointments.find({ userId })
      .sort({ createdAt: -1 }); // Latest first

    // Calculate statistics
    const stats = {
      total: appointments.length,
      pending: appointments.filter(a => a.status === 'pending').length,
      approved: appointments.filter(a => a.status === 'approved').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      rejected: appointments.filter(a => a.status === 'rejected').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length
    };

    res.status(200).send({
      message: "User appointments fetched successfully",
      success: true,
      data: {
        appointments,
        stats
      }
    });
  } catch (error) {
    console.error("Error fetching user appointments:", error);
    res.status(500).send({
      message: "Error fetching appointments",
      success: false,
      error: error.message
    });
  }
});

// Cancel appointment
router.post("/cancel-appointment", authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.userId; // This comes from the authMiddleware
    
    // Find the appointment
    const appointment = await Appointments.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).send({
        message: "Appointment not found",
        success: false
      });
    }
    
    // Check if the appointment belongs to the user
    if (appointment.userId !== userId) {
      return res.status(403).send({
        message: "You are not authorized to cancel this appointment",
        success: false
      });
    }
    
    // Check if the appointment can be cancelled (only pending or approved appointments)
    if (appointment.status !== 'pending' && appointment.status !== 'approved') {
      return res.status(400).send({
        message: `Cannot cancel an appointment with status '${appointment.status}'`,
        success: false
      });
    }
    
    // Update the appointment status to cancelled
    appointment.status = 'cancelled';
    await appointment.save();
    
    // Notify the doctor about the cancellation
    const doctorUser = await User.findOne({ _id: appointment.doctorId });
    if (doctorUser) {
      const unseenNotifications = doctorUser.unseenNotification || [];
      unseenNotifications.push({
        type: "appointment-cancelled",
        message: `An appointment for ${appointment.date} at ${moment(appointment.time, "HH:mm").format("h:mm A")} has been cancelled by the patient`,
        onClickPath: "/doctor/appointments"
      });
      
      await User.findByIdAndUpdate(appointment.doctorId, { unseenNotification: unseenNotifications });
      
      // Send real-time notification if socket available
      try {
        const io = req.app.get("io");
        if (io) {
          const notificationObj = {
            _id: new mongoose.Types.ObjectId().toString(),
            type: "appointment-cancelled",
            message: `An appointment for ${appointment.date} at ${moment(appointment.time, "HH:mm").format("h:mm A")} has been cancelled by the patient`,
            onClickPath: "/doctor/appointments",
            createdAt: new Date()
          };
          
          io.to(`user_${appointment.doctorId}`).emit("receive_notification", {
            userId: appointment.doctorId,
            notification: notificationObj
          });
        }
      } catch (socketError) {
        console.error("Socket emit error:", socketError);
      }
    }
    
    res.status(200).send({
      message: "Appointment cancelled successfully",
      success: true
    });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    res.status(500).send({
      message: "Error cancelling appointment",
      success: false,
      error: error.message
    });
  }
});


// Get patient's medical records
router.get("/patient-medical-records", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(400).send({
        success: false,
        message: "User ID is required"
      });
    }
    
    // Find medical records for this patient
    const MedicalRecord = require('../models/MedicalRecordModel');
    
    const medicalRecords = await MedicalRecord.find({ patientId: userId })
      .sort({ createdAt: -1 })
      .populate('doctorId', 'firstname lastname specialization')
      .populate('patientId', 'name email');
    
    console.log(`Found ${medicalRecords.length} medical records for patient ID ${userId}`);
    
    // Format records if needed
    let formattedRecords = medicalRecords;
    if (typeof MedicalRecord.formatRecords === 'function') {
      formattedRecords = MedicalRecord.formatRecords(medicalRecords);
    }
    
    res.status(200).send({
      success: true,
      message: "Medical records fetched successfully",
      data: formattedRecords
    });
    
  } catch (error) {
    console.error("Error fetching patient medical records:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching medical records",
      error: error.message
    });
  }
});

// Resend Verification Email
router.post("/resend-verification", async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).send({
                message: "Email is required",
                success: false
            });
        }
        
        // Find the user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).send({
                message: "No account found with this email",
                success: false
            });
        }
        
        // Check if the user is already verified
        if (user.isEmailVerified) {
            return res.status(200).send({
                message: "Your email is already verified. Please login.",
                success: true,
                alreadyVerified: true
            });
        }
        
        // Generate a new verification token
        const verificationToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Update user with new token and expiry
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = Date.now() + 86400000; // 24 hours
        await user.save();
        
        // Send the verification email
        const emailSent = await sendVerificationEmail(user.email, user.name, verificationToken);
        
        if (emailSent) {
            return res.status(200).send({
                message: "Verification email has been sent. Please check your inbox.",
                success: true
            });
        } else {
            return res.status(500).send({
                message: "Failed to send verification email. Please try again later.",
                success: false
            });
        }
    } catch (error) {
        console.error("Error resending verification email:", error);
        return res.status(500).send({
            message: "Something went wrong while sending verification email",
            success: false
        });
    }
});

// Add a new endpoint to update appointment payment method
router.post('/update-appointment-payment-method', authMiddleware, async (req, res) => {
  try {
    const { appointmentId, paymentMethod } = req.body;
    
    if (!appointmentId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID and payment method are required'
      });
    }
    
    // Validate payment method
    if (!['clinic', 'razorpay'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be "clinic" or "razorpay"'
      });
    }
    
    // Find and update the appointment
    const appointment = await Appointments.findByIdAndUpdate(
      appointmentId,
      {
        paymentMethod,
        // If changing to clinic payment from online, update status to pending
        ...(paymentMethod === 'clinic' && { status: 'pending', paymentStatus: 'pending' })
      },
      { new: true }
    );
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Appointment payment method updated successfully',
      data: appointment
    });
    
  } catch (error) {
    console.error('Error updating appointment payment method:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating appointment payment method',
      error: error.message
    });
  }
});

// Helper function to ensure notification has createdAt timestamp
const ensureNotificationTimestamp = (notification) => {
    if (!notification.createdAt) {
        notification.createdAt = new Date();
    }
    return notification;
};

// Add route for patients to update their join status for video consultations
router.post('/update-video-join-status', authMiddleware, async (req, res) => {
  try {
    const { appointmentId, joined } = req.body;
    const { userId } = req.body; // Patient's user ID
    
    // Find the appointment
    const appointment = await Appointments.findById(appointmentId);
    if (!appointment) {
      return res.status(404).send({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Verify this is the patient's appointment
    if (appointment.userId !== userId) {
      return res.status(403).send({
        success: false,
        message: 'You are not authorized to update this appointment'
      });
    }
    
    // Verify this is a video consultation
    if (appointment.appointmentType !== "video" || !appointment.videoConsultation) {
      return res.status(400).send({
        success: false,
        message: 'This is not a video consultation appointment'
      });
    }
    
    // Update the join status
    appointment.videoConsultation.joinedByPatient = joined;
    await appointment.save();
    
    // If patient joined, notify the doctor
    if (joined) {
      // Find the doctor to update their notifications
      const doctorUser = await User.findOne({ _id: appointment.doctorId });
      
      if (doctorUser) {
        // Add notification to doctor's unseenNotification array
        const unseenNotifications = doctorUser.unseenNotification || [];
        
        unseenNotifications.push({
          type: 'video-consultation-patient-joined',
          message: `${appointment.userInfo.name} has joined your video consultation.`,
          data: {
            appointmentId: appointment._id,
            message: `${appointment.userInfo.name} has joined your video consultation. Join now!`
          },
          onClickPath: '/doctor/video-consultations',
          createdAt: new Date()
        });
        
        // Update doctor's notifications
        await User.findByIdAndUpdate(appointment.doctorId, { unseenNotification: unseenNotifications });
        
        // Socket notification
        if (req.app.get('io')) {
          const io = req.app.get('io');
          const onlineUsers = req.app.get('onlineUsers') || {};
          if (onlineUsers[appointment.doctorId]) {
            io.to(onlineUsers[appointment.doctorId]).emit('new-notification', {
              message: `${appointment.userInfo.name} has joined your video consultation.`,
              appointmentId: appointment._id,
              videoConsultation: true
            });
          }
        }
      }
    }
    
    res.status(200).send({
      message: 'Video consultation join status updated',
      success: true
    });
  } catch (error) {
    console.error("Error updating video join status:", error);
    res.status(500).send({
      message: 'Error updating video join status',
      success: false,
      error: error.message
    });
  }
});

// Get video consultations for a patient
router.get('/get-video-consultations', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId; // Get userId from auth middleware, not from body
    
    console.log(`Fetching video consultations for user ${userId} (checking both userId string and ObjectId)`);
    
    // Try both string comparison and ObjectId for better compatibility
    let userIdObj;
    try {
      userIdObj = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      console.log('Could not convert userId to ObjectId, will use string value');
      userIdObj = userId;
    }
    
    // Use a more permissive query that will find appointments based on either:
    // 1. appointmentType = "video" OR
    // 2. Has videoConsultation field (regardless of appointmentType)
    const videoConsultations = await Appointments.find({
      userId: { $in: [userId, userIdObj] }, // Try both string and ObjectId
      $and: [
        { status: "approved" },
        { $or: [
          { appointmentType: "video" },
          { "videoConsultation": { $exists: true } }
        ]}
      ]
    }).sort({ date: 1, time: 1 });
    
    console.log(`Found ${videoConsultations.length} total video consultations for user`);
    
    // Debug all consultations
    videoConsultations.forEach(consultation => {
      console.log(`Appointment ID: ${consultation._id}`);
      console.log(`Date: ${consultation.date}, Time: ${consultation.time}`);
      console.log(`Status: ${consultation.status}, Type: ${consultation.appointmentType}`);
      console.log(`Doctor: ${consultation.doctorInfo?.firstname} ${consultation.doctorInfo?.lastname}`);
      console.log(`Has videoConsultation: ${!!consultation.videoConsultation}`);
      
      if (consultation.videoConsultation) {
        console.log(`Meeting link: ${consultation.videoConsultation.meetingLink}`);
        console.log(`Calendar event ID: ${consultation.videoConsultation.calendarEventId}`);
        console.log(`Joined by doctor: ${consultation.videoConsultation.joinedByDoctor}`);
        console.log(`Joined by patient: ${consultation.videoConsultation.joinedByPatient}`);
      }
      
      console.log('-------------------');
    });
    
    // Process all consultations (no filtering by date)
    const processedConsultations = videoConsultations.map(consultation => {
      // Parse date and time
      const consultationDateTime = moment(`${consultation.date} ${consultation.time}`, 'DD-MM-YYYY HH:mm');
      const now = moment();
      
      // Calculate time until appointment in minutes
      const minutesUntil = consultationDateTime.diff(now, 'minutes');
      
      // Determine appointment status
      let joinStatus = 'upcoming';
      
      if (minutesUntil < -30) {
        joinStatus = 'ended'; // Appointment ended (30 minutes after start time)
      } else if (minutesUntil <= 0) {
        joinStatus = 'active'; // Appointment is ongoing
      } else if (minutesUntil <= 15) {
        joinStatus = 'imminent'; // Appointment starting soon (within 15 minutes)
      }
      
      return {
        ...consultation.toObject(),
        joinStatus,
        minutesUntil: joinStatus === 'ended' ? 'Ended' : 
                       joinStatus === 'active' ? 'Ongoing' : 
                       `Starts in ${minutesUntil} minute${minutesUntil === 1 ? '' : 's'}`,
        formattedDate: moment(consultation.date, "DD-MM-YYYY").format('dddd, MMMM D, YYYY'),
        formattedTime: moment(consultation.time, 'HH:mm').format('h:mm A')
      };
    });
    
    console.log(`Returning ${processedConsultations.length} processed consultations to client`);
    
    res.status(200).send({
      message: 'Video consultations fetched successfully',
      success: true,
      data: processedConsultations
    });
  } catch (error) {
    console.error("Error fetching video consultations:", error);
    res.status(500).send({
      message: 'Error fetching video consultations',
      success: false,
      error: error.message
    });
  }
});

module.exports = router;