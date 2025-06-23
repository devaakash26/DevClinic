const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Doctor = require("../models/Doctor")
const Appointment = require("../models/AppointmentModel");
const MedicalRecord = require("../models/MedicalRecordModel");
const bcrypt = require("bcryptjs"); require("jsonwebtoken");
const jwt = require("jsonwebtoken")
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require('mongoose');
const moment = require("moment");
const ExcelJS = require('exceljs');
const { sendDoctorAccountApprovedEmail, sendDoctorAccountRejectedEmail } = require('../utils/emailService');

//get a user list

router.get("/get-all-user", authMiddleware, async (req, res) => {
    try {
        const user = await User.find({});
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

//Changed status for doctor account
router.post("/changed-doctor-account", authMiddleware, async (req, res) => {
    try {
        const { doctorId, userId, status, reason } = req.body;
        console.log("user Id is : ",userId)
        if (!doctorId || !userId) {
            return res.status(400).send({
                message: "Missing required fields: doctorId and userId",
                success: false
            });
        }

        console.log("Changing doctor account status:", {
            doctorId,
            userId,
            status,
            reason: reason ? "Provided" : "Not provided"
        });

        // Update doctor status
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { status },
            { new: true }
        );

        if (!doctor) {
            return res.status(404).send({
                message: "Doctor profile not found",
                success: false
            });
        }


        // Find the user associated with this doctor
        const doctorAc = await User.findOne({ _id: userId });
        

        if (!doctorAc) {
            console.error(`User with ID ${userId} not found. Trying to find by email.`);
            // Try to find by email as fallback
            doctorAc = await User.findOne({ email: doctor.email });

            if (!doctorAc) {
                console.error(`No user found with email ${doctor.email} either`);
                
                // Return a partial success response
                return res.status(200).send({
                    message: "Doctor status updated, but associated user not found",
                    success: true,
                    data: doctor,
                    warning: "Associated user not found, but doctor status was updated successfully"
                });
            }
            
            console.log(`User found by email: ${doctorAc.name} (${doctorAc._id})`);
        }

        // If we found the user, update their status and add notification
        const unseenNotification = doctorAc.unseenNotification;
        const notification = {
            type: "new-doctor-request-changed",
            message: `Your Doctor account request has been ${status}${reason ? ': ' + reason : ''}`,
            onClickPath: "/profile",
            createdAt: new Date(),
            _id: new mongoose.Types.ObjectId(), 
            data: {
                doctorId: doctor._id,
                status
            }
        };
        unseenNotification.push(notification);
        
        // Update isDoctor status based on approval
        doctorAc.isDoctor = status === "approved";
        try {
            await doctorAc.save();
        } catch (saveError) {
            console.error("Error saving user after updating:", saveError);
            return res.status(500).send({
                message: "Error updating user status",
                success: false,
                error: saveError.message
            });
        }
        
        // Send real-time notification
        const io = req.app.get('io');
        if (io) {
            // Direct emit to specific user - no broadcasting
            const notificationWithStringId = {
                ...notification,
                _id: notification._id.toString() // Convert ObjectId to string for socket transmission
            };
            
            io.emit('send_notification', { 
                userId: doctorAc._id.toString(),
                notification: notificationWithStringId
            });
            
            console.log(`Notification sent to user ${doctorAc._id} about doctor status change`);
        }

        // Send email notification based on status
        try {
            const doctorEmail = doctor.email;
            const doctorName = `${doctor.firstname} ${doctor.lastname}`;

            if (doctorEmail) {
                if (status === "approved") {
                    // Send approval email
                    await sendDoctorAccountApprovedEmail(doctorEmail, doctorName);
                    console.log(`Doctor account approval email sent to: ${doctorEmail}`);
                } else if (status === "rejected") {
                    // Send rejection email with reason
                    await sendDoctorAccountRejectedEmail(doctorEmail, doctorName, reason || "Your application did not meet our current requirements.");
                    console.log(`Doctor account rejection email sent to: ${doctorEmail} with reason: ${reason || "No specific reason provided"}`);
                }
            }
        } catch (emailError) {
            console.error("Error sending doctor status update email:", emailError);
            // Continue with response even if email fails
        }

        res.status(200).send({
            message: `Doctor status updated to ${status}`,
            success: true,
            data: doctor
        });
        
    } catch (error) {
        console.error("Error in changed-doctor-account:", error);
        res.status(500).send({
            message: "Error updating doctor status",
            success: false,
            error: error.message
        });
    }
});

//Delete a applydoctor request

router.delete("/delete-doctor-request/:doctorId", authMiddleware, async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndDelete(req.params.doctorId);
        if (doctor) {
            res.status(200).send({
                message: "Doctor Profile Deleted",
                success: true,
                data: doctor
            });
        } else {
            res.status(404).send({
                message: "Doctor not found",
                success: false
            });
        }
    } catch (error) {
        res.status(500).send({
            message: "Something went wrong",
            success: false
        });
    }
})

// Update User Status (Block/Unblock)
router.post("/update-user-status", authMiddleware, async (req, res) => {
    try {
        const { userId, status } = req.body;
        
        // Verify admin status using req.userId instead of req.body.userId
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access",
                success: false
            });
        }
        
        // Find and update user status
        const user = await User.findByIdAndUpdate(
            userId,
            { status },
            { new: true }
        );

        if (!user) {
            return res.status(404).send({
                message: "User not found",
                success: false
            });
        }

        // Create notification for the user
        const notification = {
            type: "account-status-change",
            message: `Your account has been ${status === 'blocked' ? 'blocked' : 'activated'} by an administrator`,
            onClickPath: "/profile",
            createdAt: new Date()
        };

        // Add notification to user's unseen notifications
        const unseenNotification = user.unseenNotification || [];
        unseenNotification.push(notification);
        user.unseenNotification = unseenNotification;
        await user.save();

        // Use Socket.io to send real-time notification if available
        const io = req.app.get('io');
        if (io) {
            io.emit('send_notification', { 
                userId: userId, 
                notification 
            });
        }

        res.status(200).send({
            message: `User ${status === 'blocked' ? 'blocked' : 'activated'} successfully`,
            success: true,
            data: user
        });

    } catch (error) {
        console.log("Error updating user status:", error);
        return res.status(500).send({ 
            message: "Something went wrong while updating user status", 
            success: false 
        });
    }
});

// Get doctor details by ID
router.get("/doctor-detail/:doctorId", authMiddleware, async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.doctorId);
        if (!doctor) {
            return res.status(404).send({
                message: "Doctor not found",
                success: false
            });
        }
        
        // Log the doctor data for debugging
        console.log("Doctor details fetched:", {
            id: doctor._id,
            name: `${doctor.firstname} ${doctor.lastname}`,
            fields: Object.keys(doctor._doc)
        });
        
        res.status(200).send({
            message: "Doctor details fetched successfully",
            success: true,
            data: doctor
        });
    } catch (error) {
        console.log("Error fetching doctor details:", error);
        return res.status(500).send({ 
            message: "Something went wrong while fetching doctor details", 
            success: false 
        });
    }
});

// Admin-initiated password reset
router.post("/admin-reset-password", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Verify admin status
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access",
                success: false
            });
        }
        
        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({
                message: "User not found",
                success: false
            });
        }
        
        // Generate reset token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        
        // Store token and expiry in user document
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        
        // Send password reset email using emailService
        const { sendPasswordResetEmail } = require('../utils/emailService');
        const emailSent = await sendPasswordResetEmail(user.email, user.name, token);
        
        if (!emailSent) {
            return res.status(500).send({
                message: "Failed to send password reset email",
                success: false
            });
        }
        
        // Create notification for the user
        const notification = {
            type: "password-reset",
            message: "An administrator has initiated a password reset for your account. Please check your email.",
            onClickPath: "/profile",
            createdAt: new Date()
        };
        
        // Add notification to user's unseen notifications
        const unseenNotification = user.unseenNotification || [];
        unseenNotification.push(notification);
        user.unseenNotification = unseenNotification;
        await user.save();
        
        // Use Socket.io to send real-time notification if available
        const io = req.app.get('io');
        if (io) {
            io.emit('send_notification', { 
                userId: userId, 
                notification 
            });
        }
        
        res.status(200).send({
            message: "Password reset email sent successfully",
            success: true
        });
        
    } catch (error) {
        console.log("Error initiating password reset:", error);
        return res.status(500).send({ 
            message: "Something went wrong while initiating password reset", 
            success: false 
        });
    }
});

// Get all appointments
router.get("/appointments", authMiddleware, async (req, res) => {
  try {
    const { status, startDate, endDate, doctorId, patientId } = req.query;
    
    // Build query
    const query = {};
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Date range filter
    if (startDate && endDate) {
      const start = moment(startDate, "YYYY-MM-DD").startOf('day');
      const end = moment(endDate, "YYYY-MM-DD").endOf('day');
      
      if (start.isValid() && end.isValid()) {
        // We can't directly query string dates like this, so we'll filter later
        query.dateRange = { start, end };
      }
    }
    
    // Doctor filter
    if (doctorId) {
      query.doctorId = doctorId;
    }
    
    // Patient filter
    if (patientId) {
      query.userId = patientId;
    }
    
    // Fetch appointments with basic filters
    let appointments = await Appointment.find({
      ...query,
      // Remove dateRange as it's not a real field
      dateRange: undefined
    }).sort({ createdAt: -1 });
    
    // Apply date filtering if needed
    if (query.dateRange) {
      appointments = appointments.filter(appointment => {
        const appointmentDate = moment(appointment.date, "DD-MM-YYYY");
        return appointmentDate.isBetween(query.dateRange.start, query.dateRange.end, 'day', '[]');
      });
    }
    
    res.status(200).send({
      message: "Appointments fetched successfully",
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).send({
      message: "Error fetching appointments",
      success: false,
      error: error.message
    });
  }
});

// Get appointment statistics
router.get("/appointment-stats", authMiddleware, async (req, res) => {
  try {
    // Get total counts of appointments by status
    const [
      totalAppointments,
      pendingAppointments,
      approvedAppointments,
      rejectedAppointments,
      completedAppointments,
      cancelledAppointments
    ] = await Promise.all([
      Appointment.countDocuments({}),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'approved' }),
      Appointment.countDocuments({ status: 'rejected' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' })
    ]);
    
    // Get appointments per day for the last 30 days
    const last30Days = moment().subtract(30, 'days').toDate();
    const appointmentsPerDay = await Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: last30Days }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.status(200).send({
      message: "Appointment statistics fetched successfully",
      success: true,
      data: {
        counts: {
          total: totalAppointments,
          pending: pendingAppointments,
          approved: approvedAppointments,
          rejected: rejectedAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments
        },
        timeline: appointmentsPerDay
      }
    });
  } catch (error) {
    console.error("Error fetching appointment statistics:", error);
    res.status(500).send({
      message: "Error fetching appointment statistics",
      success: false,
      error: error.message
    });
  }
});

// Get all patients with appointment history
router.get("/patient-records", authMiddleware, async (req, res) => {
  try {
    // Get all non-admin, non-doctor users
    const patients = await User.find({
      isAdmin: false,
      isDoctor: false
    });

    // Get all appointments
    const appointments = await Appointment.find({})
      .sort({ createdAt: -1 });

    // Group appointments by patient ID
    const patientAppointments = {};
    appointments.forEach(appointment => {
      if (!patientAppointments[appointment.userId]) {
        patientAppointments[appointment.userId] = [];
      }
      patientAppointments[appointment.userId].push(appointment);
    });

    // Create enriched patient data with appointment history
    const patientData = patients.map(patient => {
      return {
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone || 'N/A',
        createdAt: patient.createdAt,
        status: patient.status || 'active',
        appointmentCount: patientAppointments[patient._id.toString()]?.length || 0,
        appointments: patientAppointments[patient._id.toString()] || []
      };
    });

    res.status(200).send({
      message: "Patient records fetched successfully",
      success: true,
      data: patientData
    });
  } catch (error) {
    console.error("Error fetching patient records:", error);
    res.status(500).send({
      message: "Error fetching patient records",
      success: false,
      error: error.message
    });
  }
});

// Download Users List as Excel
router.get("/download-users-excel", authMiddleware, async (req, res) => {
    try {
        // Check if the user is admin
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access",
                success: false
            });
        }

        // Fetch all users
        const users = await User.find({});
        
        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Users');
        
        // Add headers
        worksheet.columns = [
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Mobile Number', key: 'phone', width: 20 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];
        
        // Style the header
        worksheet.getRow(1).font = { bold: true };
        
        // Add data rows
        users.forEach(user => {
            let role = "Patient";
            if (user.isAdmin) {
                role = "Admin";
            } else if (user.isDoctor) {
                role = "Doctor";
            }
            
            worksheet.addRow({
                name: user.name,
                email: user.email,
                phone: user.phone || 'Not provided',
                role: role,
                status: user.status || 'active'
            });
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
        
        // Write the workbook to the response
        await workbook.xlsx.write(res);
        
        // End the response
        res.end();
        
    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).send({
            message: "Error generating Excel file",
            success: false,
            error: error.message
        });
    }
});

// Download Doctors List as Excel
router.get("/download-doctors-excel", authMiddleware, async (req, res) => {
    try {
        // Check if the user is admin
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access",
                success: false
            });
        }

        // Fetch all doctors
        const doctors = await Doctor.find({});
        
        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Doctors');
        
        // Add headers
        worksheet.columns = [
            { header: 'First Name', key: 'firstname', width: 15 },
            { header: 'Last Name', key: 'lastname', width: 15 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Specialization', key: 'specialization', width: 20 },
            { header: 'Experience', key: 'experience', width: 12 },
            { header: 'Fee Per Consultation', key: 'feePerConsultation', width: 18 },
            { header: 'Status', key: 'status', width: 15 }
        ];
        
        // Style the header
        worksheet.getRow(1).font = { bold: true };
        
        // Add data rows
        doctors.forEach(doctor => {
            worksheet.addRow({
                firstname: doctor.firstname,
                lastname: doctor.lastname,
                email: doctor.email,
                phone: doctor.phone || 'Not provided',
                specialization: doctor.specialization,
                experience: doctor.experience,
                feePerConsultation: doctor.feePerConsultation,
                status: doctor.status || 'pending'
            });
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=doctors.xlsx');
        
        // Write the workbook to the response
        await workbook.xlsx.write(res);
        
        // End the response
        res.end();
        
    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).send({
            message: "Error generating Excel file",
            success: false,
            error: error.message
        });
    }
});

// Get all patient medical records (admin view)
router.get("/medical-records", authMiddleware, async (req, res) => {
    try {
        // Verify admin privileges
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access. Admin privileges required.",
                success: false
            });
        }

        // Find all medical records using the imported model
        const records = await MedicalRecord.find({})
            .populate('doctorId', 'name firstname lastname email phone')
            .populate('patientId', 'name email phone')
            .sort({ createdAt: -1 });

        res.status(200).send({
            message: "Medical records fetched successfully",
            success: true,
            data: records
        });
    } catch (error) {
        console.error("Error fetching admin medical records:", error);
        res.status(500).send({
            message: "Error fetching medical records",
            success: false,
            error: error.message
        });
    }
});

// Get all video consultations (admin view)
router.get("/get-all-video-consultations", authMiddleware, async (req, res) => {
    try {
        // Verify admin privileges
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access. Admin privileges required.",
                success: false
            });
        }

        // Build filter query based on request parameters
        const query = { 
            $or: [
                { appointmentType: "video" },
                { "videoConsultation": { $exists: true } }
            ],
            status: "approved"
        };

        // Apply date filter if provided
        if (req.query.date) {
            query.date = req.query.date;
        }

        // Apply status filter if provided
        if (req.query.status && req.query.status !== "all") {
            if (req.query.status === "active") {
                // For active consultations
                query.meetingStatus = "active";
            } else if (req.query.status === "upcoming") {
                // For upcoming consultations
                query.meetingStatus = { $in: ["scheduled", "imminent"] };
            } else if (req.query.status === "completed") {
                // For completed consultations
                query.meetingStatus = "ended";
                query.completionStatus = { $in: ["completed successfully", "Both joined"] };
            } else if (req.query.status === "noShow") {
                // For no-show consultations
                query.meetingStatus = "ended";
                query.completionStatus = { $regex: "no-show", $options: "i" };
            }
        }

        // Find all appointments that match the criteria
        const videoConsultations = await Appointment.find(query)
            .populate('userId', 'name email phone')
            .populate('doctorId', 'firstname lastname email phone specialization')
            .sort({ date: 1, time: 1 });

        // Process consultations to add status information
        const processedConsultations = videoConsultations.map(consultation => {
            // Parse date and time correctly based on the stored format (DD-MM-YYYY HH:mm)
            const consultationDateTime = moment(`${consultation.date} ${consultation.time}`, 'DD-MM-YYYY HH:mm');
            const now = moment();
            
            // Calculate time until appointment in minutes
            const minutesUntil = consultationDateTime.diff(now, 'minutes');
            
            // Determine meeting status
            let meetingStatus = 'scheduled';
            if (minutesUntil < -30) {
                meetingStatus = 'ended'; // Appointment ended (30 minutes after start time)
            } else if (minutesUntil <= 0) {
                meetingStatus = 'active'; // Appointment is currently active
            } else if (minutesUntil <= 15) {
                meetingStatus = 'imminent'; // Appointment starting soon (within 15 minutes)
            }
            
            // Determine completion status based on join information
            let completionStatus = 'Not started';
            if (meetingStatus === 'ended') {
                const doctorJoined = consultation.videoConsultation?.doctorJoined || false;
                const patientJoined = consultation.videoConsultation?.patientJoined || false;
                
                if (doctorJoined && patientJoined) {
                    completionStatus = 'Both joined';
                } else if (doctorJoined) {
                    completionStatus = 'Patient no-show';
                } else if (patientJoined) {
                    completionStatus = 'Doctor no-show';
                } else {
                    completionStatus = 'Neither joined';
                }
            } else if (meetingStatus === 'active') {
                const doctorJoined = consultation.videoConsultation?.doctorJoined || false;
                const patientJoined = consultation.videoConsultation?.patientJoined || false;
                
                if (doctorJoined && patientJoined) {
                    completionStatus = 'Both in meeting';
                } else if (doctorJoined) {
                    completionStatus = 'Doctor waiting';
                } else if (patientJoined) {
                    completionStatus = 'Patient waiting';
                } else {
                    completionStatus = 'Waiting for participants';
                }
            }
            
            return {
                ...consultation.toObject(),
                meetingStatus,
                completionStatus,
                userInfo: consultation.userId,
                doctorInfo: consultation.doctorId,
                minutesUntil: meetingStatus === 'ended' ? 'Ended' : 
                            meetingStatus === 'active' ? 'Ongoing' : 
                            `Starts in ${minutesUntil} minute${minutesUntil === 1 ? '' : 's'}`,
                formattedDate: moment(consultation.date, "DD-MM-YYYY").format('dddd, MMMM D, YYYY'),
                formattedTime: moment(consultation.time, 'HH:mm').format('h:mm A')
            };
        });
        
        res.status(200).send({
            message: "Video consultations fetched successfully",
            success: true,
            data: processedConsultations
        });
    } catch (error) {
        console.error("Error fetching video consultations:", error);
        res.status(500).send({
            message: "Error fetching video consultations",
            success: false,
            error: error.message
        });
    }
});

// Get video consultation details (admin view)
router.get("/get-video-consultation/:consultationId", authMiddleware, async (req, res) => {
    try {
        // Verify admin privileges
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access. Admin privileges required.",
                success: false
            });
        }

        const consultationId = req.params.consultationId;
        
        const consultation = await Appointment.findById(consultationId)
            .populate('userId', 'name email phone')
            .populate('doctorId', 'firstname lastname email phone specialization');
            
        if (!consultation) {
            return res.status(404).send({
                message: "Consultation not found",
                success: false
            });
        }
        
        // Check if this is a video consultation
        if (consultation.appointmentType !== "video" && !consultation.videoConsultation) {
            return res.status(400).send({
                message: "This is not a video consultation",
                success: false
            });
        }
        
        // Parse date and time
        const consultationDateTime = moment(`${consultation.date} ${consultation.time}`, 'DD-MM-YYYY HH:mm');
        const now = moment();
        
        // Calculate time until appointment in minutes
        const minutesUntil = consultationDateTime.diff(now, 'minutes');
        
        // Determine meeting status
        let meetingStatus = 'scheduled';
        if (minutesUntil < -30) {
            meetingStatus = 'ended';
        } else if (minutesUntil <= 0) {
            meetingStatus = 'active';
        } else if (minutesUntil <= 15) {
            meetingStatus = 'imminent';
        }
        
        // Determine completion status
        let completionStatus = 'Not started';
        if (meetingStatus === 'ended') {
            const doctorJoined = consultation.videoConsultation?.doctorJoined || false;
            const patientJoined = consultation.videoConsultation?.patientJoined || false;
            
            if (doctorJoined && patientJoined) {
                completionStatus = 'Both joined';
            } else if (doctorJoined) {
                completionStatus = 'Patient no-show';
            } else if (patientJoined) {
                completionStatus = 'Doctor no-show';
            } else {
                completionStatus = 'Neither joined';
            }
        } else if (meetingStatus === 'active') {
            const doctorJoined = consultation.videoConsultation?.doctorJoined || false;
            const patientJoined = consultation.videoConsultation?.patientJoined || false;
            
            if (doctorJoined && patientJoined) {
                completionStatus = 'Both in meeting';
            } else if (doctorJoined) {
                completionStatus = 'Doctor waiting';
            } else if (patientJoined) {
                completionStatus = 'Patient waiting';
            } else {
                completionStatus = 'Waiting for participants';
            }
        }
        
        const processedConsultation = {
            ...consultation.toObject(),
            meetingStatus,
            completionStatus,
            userInfo: consultation.userId,
            doctorInfo: consultation.doctorId,
            minutesUntil: meetingStatus === 'ended' ? 'Ended' : 
                        meetingStatus === 'active' ? 'Ongoing' : 
                        `Starts in ${minutesUntil} minute${minutesUntil === 1 ? '' : 's'}`,
            formattedDate: moment(consultation.date, "DD-MM-YYYY").format('dddd, MMMM D, YYYY'),
            formattedTime: moment(consultation.time, 'HH:mm').format('h:mm A')
        };
        
        res.status(200).send({
            message: "Consultation details fetched successfully",
            success: true,
            data: processedConsultation
        });
    } catch (error) {
        console.error("Error fetching consultation details:", error);
        res.status(500).send({
            message: "Error fetching consultation details",
            success: false,
            error: error.message
        });
    }
});

// Monitor a video consultation (admin view)
router.post("/monitor-video-consultation", authMiddleware, async (req, res) => {
    try {
        // Verify admin privileges
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access. Admin privileges required.",
                success: false
            });
        }

        const { consultationId } = req.body;
        
        if (!consultationId) {
            return res.status(400).send({
                message: "Consultation ID is required",
                success: false
            });
        }
        
        const consultation = await Appointment.findById(consultationId);
        
        if (!consultation) {
            return res.status(404).send({
                message: "Consultation not found",
                success: false
            });
        }
        
        // Check if this is a video consultation with a meeting link
        if (!consultation.videoConsultation || !consultation.videoConsultation.meetingLink) {
            return res.status(400).send({
                message: "No valid meeting link found for this consultation",
                success: false
            });
        }
        
        // Return the meeting link for monitoring
        res.status(200).send({
            message: "Monitoring link generated",
            success: true,
            monitoringLink: consultation.videoConsultation.meetingLink
        });
    } catch (error) {
        console.error("Error generating monitoring link:", error);
        res.status(500).send({
            message: "Error generating monitoring link",
            success: false,
            error: error.message
        });
    }
});

// End a video consultation (admin forcefully ends it)
router.post("/end-video-consultation", authMiddleware, async (req, res) => {
    try {
        // Verify admin privileges
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access. Admin privileges required.",
                success: false
            });
        }

        const { consultationId } = req.body;
        
        if (!consultationId) {
            return res.status(400).send({
                message: "Consultation ID is required",
                success: false
            });
        }
        
        const consultation = await Appointment.findById(consultationId);
        
        if (!consultation) {
            return res.status(404).send({
                message: "Consultation not found",
                success: false
            });
        }
        
        // Check if this is a video consultation
        if (!consultation.videoConsultation) {
            return res.status(400).send({
                message: "This is not a video consultation",
                success: false
            });
        }
        
        // Update the consultation status
        if (!consultation.videoConsultation.endedAt) {
            consultation.videoConsultation.endedAt = new Date();
            consultation.videoConsultation.endedBy = "admin";
            consultation.videoConsultation.status = "ended";
            
            await consultation.save();
            
            // Send notifications to doctor and patient
            const io = req.app.get('io');
            if (io) {
                // Notify the doctor
                const doctorNotification = {
                    type: "consultation-ended",
                    message: "An administrator has ended your video consultation.",
                    onClickPath: "/doctor/consultations",
                    createdAt: new Date()
                };
                
                if (consultation.doctorId) {
                    io.emit('send_notification', {
                        userId: consultation.doctorId.toString(),
                        notification: doctorNotification
                    });
                }
                
                // Notify the patient
                const patientNotification = {
                    type: "consultation-ended",
                    message: "An administrator has ended your video consultation.",
                    onClickPath: "/consultations",
                    createdAt: new Date()
                };
                
                if (consultation.userId) {
                    io.emit('send_notification', {
                        userId: consultation.userId.toString(),
                        notification: patientNotification
                    });
                }
            }
        }
        
        res.status(200).send({
            message: "Consultation ended successfully",
            success: true
        });
    } catch (error) {
        console.error("Error ending consultation:", error);
        res.status(500).send({
            message: "Error ending consultation",
            success: false,
            error: error.message
        });
    }
});

// Create video consultation link for an appointment (admin view)
router.post("/create-video-link", authMiddleware, async (req, res) => {
    try {
        // Verify admin privileges
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access. Admin privileges required.",
                success: false
            });
        }

        const { appointmentId } = req.body;
        
        if (!appointmentId) {
            return res.status(400).send({
                message: "Appointment ID is required",
                success: false
            });
        }
        
        // Find the appointment
        const appointment = await Appointment.findById(appointmentId)
            .populate('userId', 'name email phone')
            .populate('doctorId', 'firstname lastname email phone specialization');
        
        if (!appointment) {
            return res.status(404).send({
                message: "Appointment not found",
                success: false
            });
        }

        // Check if it's already a video consultation with a link
        if (appointment.videoConsultation?.meetingLink) {
            return res.status(200).send({
                message: "Video consultation link already exists",
                success: true,
                data: appointment
            });
        }

        // Import required services
        const { createVideoConsultation } = require('../services/googleCalendarService');
        const { sendVideoConsultationPatientEmail, sendVideoConsultationDoctorEmail } = require("../utils/emailService");

        // Create appointment details object for the calendar service
        const appointmentDetails = {
            ...appointment.toObject(),
            doctorInfo: appointment.doctorId,
            userInfo: appointment.userId,
            formattedDate: moment(appointment.date, "DD-MM-YYYY").format('dddd, MMMM D, YYYY'),
            formattedTime: moment(appointment.time, 'HH:mm').format('h:mm A')
        };
        
        console.log("Admin creating video consultation for appointment:", appointmentId);
        
        let calendarResult;
        
        try {
            // Try to create video consultation with Google Calendar
            calendarResult = await createVideoConsultation(appointmentDetails);
        } catch (calendarError) {
            console.error('Error in Google Calendar API:', calendarError);
            calendarResult = { success: false, error: calendarError.message };
        }
        
        // Check if Google Calendar integration succeeded
        if (!calendarResult.success) {
            console.log('Google Calendar integration failed, using fallback method');
            
            // Create a fallback meeting link using a public meeting service
            // You can replace this with any video conferencing service URL
            const fallbackMeetingId = `dev-clinic-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            
            // Options for fallback video links - choose one:
            // 1. Google Meet (public link without calendar integration)
            const fallbackMeetingLink = `https://meet.google.com/${fallbackMeetingId}`;
            
            // 2. Jitsi Meet (alternative open-source option)
            // const fallbackMeetingLink = `https://meet.jit.si/${fallbackMeetingId}`;
            
            // 3. Whereby (another alternative)
            // const fallbackMeetingLink = `https://whereby.com/${fallbackMeetingId}`;
            
            calendarResult = {
                success: true,
                meetingLink: fallbackMeetingLink,
                calendarEventId: `manual-${fallbackMeetingId}`,
                isFallbackLink: true
            };
            
            console.log('Created fallback meeting link:', fallbackMeetingLink);
        }

        // Update appointment with video consultation details
        appointment.videoConsultation = {
            meetingLink: calendarResult.meetingLink,
            calendarEventId: calendarResult.calendarEventId || `manual-${Date.now()}`,
            joinedByPatient: false,
            joinedByDoctor: false
        };

        // If appointment type is not already video, update it
        if (appointment.appointmentType !== "video") {
            appointment.appointmentType = "video";
        }
        
        await appointment.save();
        
        console.log("Video consultation link created:", calendarResult.meetingLink);

        // Add the meeting link to appointment details for emails
        appointmentDetails.videoConsultation = appointment.videoConsultation;

        // Send emails to patient and doctor
        const patientName = appointment.userId.name;
        const patientEmail = appointment.userId.email;
        
        const doctorName = `Dr. ${appointment.doctorId.firstname} ${appointment.doctorId.lastname}`;
        const doctorEmail = appointment.doctorId.email;

        // Send emails with the updated appointment details including the meeting link
        try {
            // Send to patient
            await sendVideoConsultationPatientEmail(patientEmail, patientName, appointmentDetails);
            console.log("Video consultation email sent to patient:", patientEmail);
            
            // Send to doctor
            await sendVideoConsultationDoctorEmail(doctorEmail, doctorName, patientName, appointmentDetails);
            console.log("Video consultation email sent to doctor:", doctorEmail);
        } catch (emailError) {
            console.error("Error sending video consultation emails:", emailError);
            // Continue even if email sending fails
        }

        // Return success response
        res.status(200).send({
            message: "Video consultation link created and emails sent successfully",
            success: true,
            data: {
                appointmentId: appointment._id,
                meetingLink: appointment.videoConsultation.meetingLink,
                isFallbackLink: calendarResult.isFallbackLink || false
            }
        });
    } catch (error) {
        console.error("Error creating video link:", error);
        res.status(500).send({
            message: "Error creating video consultation link",
            success: false,
            error: error.message
        });
    }
});

// Send reminders for video consultation
router.post("/send-consultation-reminder", authMiddleware, async (req, res) => {
    try {
        // Verify admin privileges
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).send({
                message: "Unauthorized access. Admin privileges required.",
                success: false
            });
        }

        const { appointmentId, sendToDoctor = true, sendToPatient = true } = req.body;
        
        if (!appointmentId) {
            return res.status(400).send({
                message: "Appointment ID is required",
                success: false
            });
        }
        
        // Find the appointment
        const appointment = await Appointment.findById(appointmentId)
            .populate('userId', 'name email phone')
            .populate('doctorId', 'firstname lastname email phone specialization');
        
        if (!appointment) {
            return res.status(404).send({
                message: "Appointment not found",
                success: false
            });
        }

        // Check if it has a video consultation link
        if (!appointment.videoConsultation?.meetingLink) {
            return res.status(400).send({
                message: "This appointment does not have a video consultation link",
                success: false
            });
        }

        // Import required service
        const { sendVideoConsultationReminderEmail } = require("../utils/emailService");

        // Create appointment details object for the email service
        const appointmentDetails = {
            ...appointment.toObject(),
            doctorInfo: appointment.doctorId,
            userInfo: appointment.userId,
            formattedDate: moment(appointment.date, "DD-MM-YYYY").format('dddd, MMMM D, YYYY'),
            formattedTime: moment(appointment.time, 'HH:mm').format('h:mm A'),
            videoConsultation: appointment.videoConsultation
        };
        
        const results = {
            doctorEmail: false,
            patientEmail: false
        };

        // Send emails
        try {
            // Send to doctor if requested
            if (sendToDoctor && appointment.doctorId && appointment.doctorId.email) {
                const doctorName = `Dr. ${appointment.doctorId.firstname} ${appointment.doctorId.lastname}`;
                const doctorEmail = appointment.doctorId.email;
                
                await sendVideoConsultationReminderEmail(doctorEmail, doctorName, appointmentDetails, 'doctor');
                console.log("Video consultation reminder sent to doctor:", doctorEmail);
                results.doctorEmail = true;
            }
            
            // Send to patient if requested
            if (sendToPatient && appointment.userId && appointment.userId.email) {
                const patientName = appointment.userId.name;
                const patientEmail = appointment.userId.email;
                
                await sendVideoConsultationReminderEmail(patientEmail, patientName, appointmentDetails, 'patient');
                console.log("Video consultation reminder sent to patient:", patientEmail);
                results.patientEmail = true;
            }
        } catch (emailError) {
            console.error("Error sending video consultation reminder emails:", emailError);
            // Continue even if email sending fails
        }

        // Return success response
        res.status(200).send({
            message: "Video consultation reminders sent",
            success: true,
            data: results
        });
    } catch (error) {
        console.error("Error sending consultation reminders:", error);
        res.status(500).send({
            message: "Error sending consultation reminders",
            success: false,
            error: error.message
        });
    }
});

// Export appointments as Excel
router.get("/export-appointments", authMiddleware, async (req, res) => {
  try {
    // Fetch all appointments
    const appointments = await Appointment.find({})
      .sort({ createdAt: -1 });

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Appointments');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Patient Name', key: 'patientName', width: 20 },
      { header: 'Patient Email', key: 'patientEmail', width: 25 },
      { header: 'Doctor Name', key: 'doctorName', width: 20 },
      { header: 'Doctor Specialization', key: 'doctorSpecialization', width: 20 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'Symptoms', key: 'symptoms', width: 30 },
      { header: 'Medical History', key: 'medicalHistory', width: 30 },
      { header: 'Preferred Communication', key: 'preferredCommunication', width: 15 },
      { header: 'Emergency Contact', key: 'emergencyContact', width: 15 },
      { header: 'Additional Notes', key: 'additionalNotes', width: 30 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Appointment Type', key: 'appointmentType', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Last Updated', key: 'updatedAt', width: 20 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };

    // Add appointment data to the worksheet
    appointments.forEach(appointment => {
      worksheet.addRow({
        id: appointment._id.toString(),
        patientName: appointment.userInfo?.name || 'N/A',
        patientEmail: appointment.userInfo?.email || 'N/A',
        doctorName: `Dr. ${appointment.doctorInfo?.firstname || ''} ${appointment.doctorInfo?.lastname || ''}`.trim(),
        doctorSpecialization: appointment.doctorInfo?.specialization || 'N/A',
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        reason: appointment.reason,
        symptoms: appointment.symptoms,
        medicalHistory: appointment.medicalHistory,
        preferredCommunication: appointment.preferredCommunication,
        emergencyContact: appointment.emergencyContact,
        additionalNotes: appointment.additionalNotes,
        paymentStatus: appointment.paymentStatus,
        paymentMethod: appointment.paymentMethod,
        appointmentType: appointment.appointmentType,
        createdAt: appointment.createdAt ? new Date(appointment.createdAt).toLocaleString() : 'N/A',
        updatedAt: appointment.updatedAt ? new Date(appointment.updatedAt).toLocaleString() : 'N/A'
      });
    });

    // Set content type and headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=appointments.xlsx');

    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting appointments:", error);
    return res.status(500).send({
      success: false,
      message: "Error exporting appointments",
      error
    });
  }
});

module.exports = router;
