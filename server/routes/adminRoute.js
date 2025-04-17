const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Doctor = require("../models/Doctor")
const Appointment = require("../models/AppointmentModel");
const bcrypt = require("bcryptjs"); require("jsonwebtoken");
const jwt = require("jsonwebtoken")
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require('mongoose');
const moment = require("moment");
const ExcelJS = require('exceljs');

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

module.exports = router;
