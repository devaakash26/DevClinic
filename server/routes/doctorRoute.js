const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Doctor = require("../models/Doctor");
const User = require("../models/user");
const Appointment = require("../models/AppointmentModel");
const mongoose = require("mongoose");
const moment = require("moment");
const ExcelJS = require('exceljs');
const { 
  sendAppointmentApprovedEmail, 
  sendAppointmentRejectedEmail,
  sendAppointmentCompletedEmail,
  sendDoctorUnavailableEmailToAdmin,
  sendDoctorUnavailableConfirmationEmail,
  sendMedicalRecordToPatientEmail
} = require("../utils/emailService");
const Feedback = require("../models/FeedbackModel");
const { upload, uploadMedicalRecord } = require("../cloudConfig/multerConfig");
const MedicalRecord = require("../models/MedicalRecordModel");
const axios = require('axios');

router.get("/get-doctor-info", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.query;
        const doctor = await Doctor.findOne({ userId: userId });
        if (doctor) {
            res.status(200).send({
                message: "Doctor Profile Fetched",
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
});

//Get doctor info by _id
router.get("/get-doctor-info-by-id", authMiddleware, async (req, res) => {
    try {
        const { doctorId } = req.query;
        console.log("Request received for doctorId:", doctorId, "Type:", typeof doctorId);
        
        // Log full request information to debug issues
        console.log("Full request query:", req.query);
        console.log("User making the request:", req.body.userId);
        
        if (!doctorId) {
            console.log("No doctorId provided in request");
            return res.status(400).send({
                message: "Doctor ID is required",
                success: false,
            });
        }

        // Try different approaches to find the doctor
        let doctor = null;
        
        // 1. Try with raw doctorId (might be a string ID that mongoose can handle)
        try {
            doctor = await Doctor.findOne({ _id: doctorId });
            if (doctor) {
                console.log("Doctor found by raw _id:", doctorId);
            }
        } catch (rawIdError) {
            console.error("Error when searching by raw _id:", rawIdError.message);
        }
        
        // 2. Try with ObjectId if it's valid
        if (!doctor) {
            try {
                if (mongoose.Types.ObjectId.isValid(doctorId)) {
                    const objectId = new mongoose.Types.ObjectId(doctorId);
                    doctor = await Doctor.findById(objectId);
                    if (doctor) {
                        console.log("Doctor found by converted ObjectId:", doctorId);
                    }
                } else {
                    console.log("doctorId is not a valid ObjectId:", doctorId);
                }
            } catch (idError) {
                console.error("Error when searching by ObjectId:", idError.message);
            }
        }
        
        // 3. Try by userId
        if (!doctor) {
            try {
                doctor = await Doctor.findOne({ userId: doctorId });
                if (doctor) {
                    console.log("Doctor found by userId:", doctorId);
                }
            } catch (userIdError) {
                console.error("Error when searching by userId:", userIdError.message);
            }
        }
        
        // 4. Try by other fields as a last resort
        if (!doctor) {
            try {
                // Try finding by other potential fields
                doctor = await Doctor.findOne({
                    $or: [
                        { userId: doctorId },
                        { email: doctorId }
                    ]
                });
                
                if (doctor) {
                    console.log("Doctor found by alternative fields");
                }
            } catch (alternativeError) {
                console.error("Error when searching by alternative fields:", alternativeError.message);
            }
        }
        
        // Log detailed DB info
        console.log("All doctor IDs in the database:");
        const allDoctors = await Doctor.find({}, { _id: 1, userId: 1, firstname: 1, lastname: 1 }).limit(5);
        console.log(allDoctors);
        
        if (!doctor) {
            console.log(`Doctor not found for ID: ${doctorId}`);
            return res.status(404).send({
                message: `Doctor not found for ID: ${doctorId}`,
                success: false,
            });
        }

        // Log full doctor details for debugging
        console.log(`Doctor found: ${doctor.firstname} ${doctor.lastname}`);
        console.log("Doctor userId:", doctor.userId);
        console.log("Doctor timing:", JSON.stringify(doctor.timing));
        
        res.status(200).send({
            message: "Doctor Profile Fetched",
            success: true,
            data: doctor,
        });
    } catch (error) {
        console.error("Error fetching doctor info by doctorId:", error);
        res.status(500).send({
            message: "Something went wrong",
            success: false,
            error: error.message
        });
    }
});



//Update a doctors profile

router.post("/update-doctor-profile", authMiddleware, async (req, res) => {
    try {
        const { userId, ...updateData } = req.body;
        
        console.log("Update doctor profile request:", { userId, updateData });
        
        // Check and format timing to ensure it's stored consistently
        if (updateData.timing && Array.isArray(updateData.timing)) {
            console.log("Original timing data received:", updateData.timing);
            
            // Ensure timing is an array of exactly 2 elements
            if (updateData.timing.length !== 2) {
                return res.status(400).send({
                    message: "Timing must include start and end times",
                    success: false,
                });
            }
            
            // Extract raw time values, but preserve the user's intended hours and minutes
            updateData.timing = updateData.timing.map(time => {
                if (!time) return null;
                
                // If it's an ISO date string, extract only the time part (HH:mm)
                if (typeof time === 'string' && time.includes('T')) {
                    // Extract HH:mm from the ISO string
                    return time.split('T')[1].substring(0, 5);
                }
                
                // If it's already in HH:mm format, preserve it exactly as is
                if (typeof time === 'string' && time.match(/^\d{2}:\d{2}$/)) {
                    return time; // Return the exact HH:mm string
                }
                
                // Handle other formats by using moment to extract hours and minutes
                // and reconstructing the HH:mm string to preserve the original time
                try {
                    const timeMoment = moment(time);
                    if (timeMoment.isValid()) {
                        // Reconstruct HH:mm string with padded zeros
                        const hours = timeMoment.hours().toString().padStart(2, '0');
                        const minutes = timeMoment.minutes().toString().padStart(2, '0');
                        return `${hours}:${minutes}`;
                    }
                } catch (err) {
                    console.error("Error parsing time:", err);
                }
                
                // Return the original if we can't process it
                return time;
            });
            
            console.log("Processed timing before saving:", updateData.timing);
            
            // Validate that we have valid start and end times
            if (!updateData.timing[0] || !updateData.timing[1]) {
                return res.status(400).send({
                    message: "Invalid timing format. Please provide valid start and end times",
                    success: false,
                });
            }
        }
        
        const doctor = await Doctor.findOneAndUpdate(
            { userId: userId },
            { $set: updateData },
            { new: true }
        );

        if (!doctor) {
            return res.status(404).send({
                message: "Doctor not found",
                success: false,
            });
        }

        console.log("Doctor profile updated successfully. New timing:", doctor.timing);
        
        res.status(200).send({
            message: "Doctor Profile Updated",
            success: true,
            data: doctor,
        });
    } catch (error) {
        console.error("Error updating doctor profile:", error);
        res.status(500).send({
            message: "Something went wrong",
            success: false,
            error: error.message
        });
    }
});

// Upload doctor profile image to Cloudinary
router.post("/upload-doctor-image", authMiddleware, upload.single('doctorImage'), async (req, res) => {
    try {
        // Debug log for troubleshooting
        console.log("File upload details:", req.file ? {
            filename: req.file.originalname,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : "No file uploaded");
        
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
        // req.file.path contains the Cloudinary URL when using CloudinaryStorage
        const imageUrl = req.file.path;
        
        if (!imageUrl) {
            return res.status(400).send({
                success: false,
                message: "Failed to upload image"
            });
        }
        
        console.log("Uploaded image URL:", imageUrl);

        // Update doctor record with new image URL
        const doctor = await Doctor.findOneAndUpdate(
            { userId: userId },
            { $set: { image: imageUrl } },
            { new: true }
        );

        if (!doctor) {
            return res.status(404).send({
                success: false,
                message: "Doctor not found"
            });
        }

        return res.status(200).send({
            success: true,
            message: "Profile picture updated successfully",
            data: {
                url: imageUrl,
                doctor: doctor
            }
        });
    } catch (error) {
        console.error("Error uploading doctor profile picture:", error);
        res.status(500).send({
            success: false,
            message: "Server error while uploading profile picture",
            error: error.message
        });
    }
});

//get a patient list

router.get("/get-patient-list", authMiddleware, async (req, res) => {
    try {
        const doctorId = req.query.doctorId;
        const appointments = await Appointment.find({ doctorId });
        const patientData = appointments.map(appointment => appointment);
        console.log(patientData);
        res.status(200).send({ message: 'Fetched successfully', success: true, patients: patientData });

    } catch (error) {
        console.error(error);
        res.status(500).send({
            message: "Something went wrong",
            success: false,
        });
    }
});

//change a appointment status
router.post("/update-appointment-status", authMiddleware, async (req, res) => {
  try {
    const { appointmentId, status, patientId, rejectionReason } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, 
      { 
        status, 
        ...(rejectionReason && { rejectionReason }) 
      }, 
      { new: true }
    );
    
    if (!appointment) {
      return res.status(404).send({ message: "Appointment not found", success: false });
    }

    // Find the patient to get their email and info
    const patient = await User.findOne({ _id: patientId });
    if (!patient) {
      return res.status(404).send({ message: "Patient not found", success: false });
    }
    // Send notification to patient
    const unseenNotifications = patient.unseenNotification || [];
        unseenNotifications.push({
      type: "Appointment Status Update",
      message: status === 'completed' 
        ? `Your appointment with Dr. ${appointment.doctorInfo.firstname} ${appointment.doctorInfo.lastname} has been marked as completed. Thank you for using DevClinic!`
        : `Your appointment status is updated to '${status}' by Dr. ${appointment.doctorInfo.firstname} ${appointment.doctorInfo.lastname}`,
      onClickPath: `/appointment/${appointment.doctorId}`
    });

    await User.findByIdAndUpdate(patientId, { unseenNotification: unseenNotifications });

    // Send real-time notification via socket
    try {
      const io = req.app.get("io");
      if (io) {
        const notificationObj = {
          _id: new mongoose.Types.ObjectId().toString(), // Generate a unique ID
          type: "appointment-status",
          message: status === 'completed' 
            ? `Your appointment with Dr. ${appointment.doctorInfo.firstname} ${appointment.doctorInfo.lastname} has been marked as completed. Thank you for using DevClinic!`
            : `Your appointment status is updated to '${status}' by Dr. ${appointment.doctorInfo.firstname} ${appointment.doctorInfo.lastname}`,
          onClickPath: `/appointments`,
            data: {
                appointmentId: appointment._id,
            status: status,
            doctorId: appointment.doctorId
          },
          createdAt: new Date()
        };
        
        io.to(`user_${patientId}`).emit("receive_notification", {
          userId: patientId,
          notification: notificationObj
        });
        
        console.log(`Real-time notification sent to patient: ${patientId}`);
      }
    } catch (socketError) {
      console.error("Error sending socket notification:", socketError);
    }

    // Send email notification based on status
    try {
      const patientEmail = patient.email;
      const patientName = patient.name;
      const doctorName = `${appointment.doctorInfo.firstname} ${appointment.doctorInfo.lastname}`;
      
      if (patientEmail) {
        // Format appointment details for email
        const appointmentDetails = {
          startTime: `${appointment.date} ${appointment.time}`,
          reason: appointment.reason,
          doctorName: doctorName,
          date: appointment.date,
          time: appointment.time,
          userInfo: {
            name: patientName,
            email: patientEmail,
            phone: patient.phone || patient.mobile
          },
          doctorInfo: appointment.doctorInfo
        };
        
        // Handle video consultation for approved appointments
        if (status === 'approved' && appointment.appointmentType === "video") {
          // Import video consultation services
          const { createVideoConsultation } = require('../services/googleCalendarService');
          const { sendVideoConsultationPatientEmail, sendVideoConsultationDoctorEmail } = require("../utils/emailService");
          
          // Check if the appointment already has a video consultation link
          if (!appointment.videoConsultation?.meetingLink || !appointment.videoConsultation?.calendarEventId) {
            try {
              console.log("Creating video consultation for appointment:", appointmentId);
              const calendarResult = await createVideoConsultation(appointment);
              
              if (calendarResult.success) {
                // Update the appointment with the video consultation details
                appointment.videoConsultation = {
                  meetingLink: calendarResult.meetingLink,
                  calendarEventId: calendarResult.calendarEventId,
                  joinedByPatient: false,
                  joinedByDoctor: false
                };
                
                await appointment.save();
                console.log("Video consultation created with link:", calendarResult.meetingLink);
                
                // Update appointment details with video consultation info for emails
                appointmentDetails.videoConsultation = appointment.videoConsultation;
                
                // Send video consultation emails to both patient and doctor
                await sendVideoConsultationPatientEmail(patientEmail, patientName, appointmentDetails)
                  .catch(err => console.error("Error sending video consultation email to patient:", err));
                
                await sendVideoConsultationDoctorEmail(
                  appointment.doctorInfo.email, 
                  doctorName, 
                  patientName, 
                  appointmentDetails
                ).catch(err => console.error("Error sending video consultation email to doctor:", err));
                
                console.log("Video consultation emails sent to patient and doctor");
              } else {
                // If video creation failed, still approve but send regular emails
                console.error('Failed to create video consultation:', calendarResult.error);
                await sendAppointmentApprovedEmail(patientEmail, patientName, appointmentId, appointmentDetails)
                  .catch(err => console.error("Error sending approval email:", err));
              }
            } catch (videoError) {
              console.error('Error creating video consultation:', videoError);
              // Still approve the appointment but send regular emails
              await sendAppointmentApprovedEmail(patientEmail, patientName, appointmentId, appointmentDetails)
                .catch(err => console.error("Error sending approval email:", err));
            }
          } else {
            // Video consultation is already set up, include it in the appointment details
            appointmentDetails.videoConsultation = appointment.videoConsultation;
            
            // Send video consultation emails to both patient and doctor
            await sendVideoConsultationPatientEmail(patientEmail, patientName, appointmentDetails)
              .catch(err => console.error("Error sending video consultation email to patient:", err));
            
            await sendVideoConsultationDoctorEmail(
              appointment.doctorInfo.email, 
              doctorName, 
              patientName, 
              appointmentDetails
            ).catch(err => console.error("Error sending video consultation email to doctor:", err));
            
            console.log("Video consultation emails sent to patient and doctor");
          }
        } else if (status === 'approved') {
          // For non-video appointments, send regular approval email
          await sendAppointmentApprovedEmail(
            patientEmail, 
            patientName, 
            appointmentId, 
            appointmentDetails
          );
          console.log(`Appointment approval email sent to patient: ${patientEmail}`);
        } else if (status === 'rejected') {
          // For rejected appointments, cancel any Google Calendar event if it exists
          if (appointment.appointmentType === "video" && appointment.videoConsultation?.calendarEventId) {
            try {
              const { deleteCalendarEvent } = require('../services/googleCalendarService');
              await deleteCalendarEvent(appointment.videoConsultation.calendarEventId);
              console.log(`Cancelled Google Calendar event for rejected appointment: ${appointment.videoConsultation.calendarEventId}`);
            } catch (calendarError) {
              console.error('Error canceling Google Calendar event:', calendarError);
            }
          }
          
          // Send rejection email
          await sendAppointmentRejectedEmail(
            patientEmail, 
            patientName, 
            appointmentDetails, 
            rejectionReason || 'The doctor is unavailable at the requested time'
          );
          console.log(`Appointment rejection email sent to patient: ${patientEmail}`);
        } else if (status === 'completed') {
          // Send completion email
          await sendAppointmentCompletedEmail(
            patientEmail,
            patientName,
            appointmentDetails
          );
          console.log(`Appointment completion email sent to patient: ${patientEmail}`);
        }
      }
    } catch (emailError) {
      console.error("Error sending status update email:", emailError);
      // Continue with response even if email fails
    }

    res.status(200).send({ message: "Appointment status updated", success: true });
    } catch (error) {
        console.error("Error updating appointment status:", error);
        res.status(500).send({
      message: "An error occurred while updating the appointment status", 
      error: error.message,
      success: false 
        });
    }
});


// Add a new route to update doctor's join status for video consultation
router.post('/update-video-join-status', authMiddleware, async (req, res) => {
    try {
        const { appointmentId, joined } = req.body;
        const { userId } = req.body; // Doctor's user ID
        
        // Find the appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).send({
                success: false,
                message: 'Appointment not found'
            });
        }
        
        // Verify this is the doctor's appointment
        if (appointment.doctorId !== userId) {
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
        appointment.videoConsultation.joinedByDoctor = joined;
        await appointment.save();
        
        // If doctor joined, notify the patient
        if (joined) {
            // Find the patient user
            const patientUser = await User.findOne({ _id: appointment.userId });
            
            if (patientUser) {
                // Create notification for patient using the existing pattern
                const unseenNotifications = patientUser.unseenNotification || [];
                
                unseenNotifications.push({
                    type: 'video-consultation-doctor-joined',
                message: `Dr. ${appointment.doctorInfo.firstname} ${appointment.doctorInfo.lastname} has joined your video consultation.`,
                data: {
                    appointmentId: appointment._id,
                    message: `Dr. ${appointment.doctorInfo.firstname} ${appointment.doctorInfo.lastname} has joined your video consultation. Join now!`,
                },
                    onClickPath: '/patient/video-consultations',
                    createdAt: new Date()
            });
                
                // Update the patient's unseenNotification array
                await User.findByIdAndUpdate(appointment.userId, { unseenNotification: unseenNotifications });
            
            // Socket notification
            if (req.app.get('io')) {
                const io = req.app.get('io');
                const onlineUsers = req.app.get('onlineUsers') || {};
                if (onlineUsers[appointment.userId]) {
                    io.to(onlineUsers[appointment.userId]).emit('new-notification', {
                        message: `Dr. ${appointment.doctorInfo.firstname} ${appointment.doctorInfo.lastname} has joined your video consultation.`,
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

//delete a appointment 

router.delete("/delete-appointment", authMiddleware, async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const appointment = await Appointment.findByIdAndDelete(appointmentId);
        if (!appointment) {
            return res.status(404).send({ message: "Appointment Not found", success: false });
        }
        res.status(200).send({ message: "Deleted Successfully", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Something Went Wrong while deleting appointment", success: false });
    }
});

// Get doctor testimonials and ratings
router.get("/get-doctor-testimonials", authMiddleware, async (req, res) => {
  try {
    const { doctorId } = req.query;
    
    // Get all feedback for this doctor where showAsTestimonial is true
    const testimonials = await Feedback.find({ 
      doctorId, 
      showAsTestimonial: true 
    }).sort({ createdAt: -1 });
    
    // Calculate average rating from ALL feedback (not just testimonials)
    const allRatings = await Feedback.find({ doctorId });
    
    const stats = {
      averageRating: 0,
      totalReviews: allRatings.length,
      testimonials: testimonials
    };
    
    if (allRatings.length > 0) {
      const totalRating = allRatings.reduce((sum, feedback) => sum + feedback.rating, 0);
      stats.averageRating = (totalRating / allRatings.length).toFixed(1);
    }
    
    res.status(200).send({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error getting doctor testimonials:", error);
    res.status(500).send({
      message: "Error getting doctor testimonials",
      success: false,
      error: error.message
    });
  }
});

// Update doctor availability status
router.post("/update-availability", authMiddleware, async (req, res) => {
  try {
    const { userId, isAvailable, unavailableReason, unavailableUntil } = req.body;
    
    console.log("Update doctor availability request:", { userId, isAvailable, unavailableReason, unavailableUntil });
    
    // Find the doctor by userId
    const doctor = await Doctor.findOne({ userId: userId });
    
    if (!doctor) {
      return res.status(404).send({
        message: "Doctor not found",
        success: false,
      });
    }
    
    // Get admin email(s) for notification
    const adminUsers = await User.find({ isAdmin: true });
    const adminEmails = adminUsers.map(admin => admin.email);
    
    // Update doctor availability
    doctor.isAvailable = isAvailable;
    
    if (!isAvailable) {
      doctor.unavailableReason = unavailableReason || 'Not specified';
      doctor.unavailableUntil = unavailableUntil || null;
      
      // Send email notifications
      const doctorFullName = `${doctor.firstname} ${doctor.lastname}`;
      
      // Notify doctor with confirmation
      await sendDoctorUnavailableConfirmationEmail(
        doctor.email,
        doctorFullName,
        unavailableReason,
        unavailableUntil ? moment(unavailableUntil).format('MMMM DD, YYYY') : 'Unspecified date'
      );
      
      // Notify admin(s) via email
      if (adminEmails.length > 0) {
        await sendDoctorUnavailableEmailToAdmin(
          adminEmails,
          doctorFullName,
          unavailableReason,
          unavailableUntil ? moment(unavailableUntil).format('MMMM DD, YYYY') : 'Unspecified date'
        );
      }
      
      // Send in-app notifications to all admin users
      for (const adminUser of adminUsers) {
        const unseenNotification = adminUser.unseenNotification || [];
        
        const notification = {
          type: "doctor-unavailable",
          message: `Dr. ${doctor.firstname} ${doctor.lastname} has marked themselves as unavailable: ${unavailableReason}`,
          data: {
            doctorId: doctor._id,
            name: `${doctor.firstname} ${doctor.lastname}`,
            reason: unavailableReason,
            until: unavailableUntil
          },
          onClickPath: "/admin/doctor-list",
          createdAt: new Date()
        };
        
        unseenNotification.push(notification);
        
        // Update admin's unseen notifications
        await User.findByIdAndUpdate(
          adminUser._id,
          { $set: { unseenNotification: unseenNotification } },
          { new: true }
        );
        
        // Use Socket.io to send real-time notification if available
        const io = req.app.get('io');
        if (io) {
          io.emit('send_notification', { 
            userId: adminUser._id.toString(),
            notification 
          });
          console.log(`Real-time notification sent to admin ${adminUser._id.toString()} via Socket.io`);
        }
      }
    } else {
      // If becoming available again, clear the unavailability reason and date
      doctor.unavailableReason = '';
      doctor.unavailableUntil = null;
    }
    
    await doctor.save();
    
    res.status(200).send({
      message: isAvailable ? "You are now marked as available" : "You are now marked as unavailable",
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error("Error updating doctor availability:", error);
    res.status(500).send({
      message: "Something went wrong",
      success: false,
      error: error.message
    });
  }
});

// Download Patient List as Excel
router.get("/download-patients-excel", authMiddleware, async (req, res) => {
    try {
        console.log("Excel download request received");
        
        // Get doctor ID (from query parameter or from auth user)
        const doctorId = req.query.doctorId;
        
        console.log("Requested doctorId:", doctorId);
        
        if (!doctorId) {
            return res.status(400).send({
                message: "Doctor ID is required",
                success: false
            });
        }
        
        // Check if the doctor ID is valid
        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            console.log("Invalid doctorId format:", doctorId);
            return res.status(400).send({
                message: "Invalid doctor ID format",
                success: false
            });
        }
        
        // Verify the doctor exists and requesting user has access
        const doctor = await Doctor.findOne({ _id: doctorId });
        if (!doctor) {
            console.log("Doctor not found with ID:", doctorId);
            return res.status(404).send({
                message: "Doctor not found",
                success: false
            });
        }
        
        // Ensure the logged in user is either the doctor or an admin
        const user = await User.findOne({ _id: req.userId });
        if (doctor.userId.toString() !== req.userId && !user.isAdmin) {
            console.log("Unauthorized access attempt by user:", req.userId);
            return res.status(403).send({
                message: "Unauthorized access to patient data",
                success: false
            });
        }
        
        // Fetch all appointments for this doctor
        console.log("Fetching appointments for doctor:", doctorId);
        const appointments = await Appointment.find({ doctorId }).populate('userId');
        console.log(`Found ${appointments.length} appointments`);
        
        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Developer Clinic';
        workbook.created = new Date();
        
        const worksheet = workbook.addWorksheet('Patients');
        
        if (appointments.length === 0) {
            // Add a note about no appointments
            worksheet.columns = [
                { header: 'No appointments found', key: 'message', width: 30 },
            ];
            worksheet.addRow({ message: 'No patient appointments found for this doctor' });
        } else {
            // Add headers
            worksheet.columns = [
                { header: 'Patient Name', key: 'name', width: 25 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Phone', key: 'phone', width: 15 },
                { header: 'Appointment Date', key: 'date', width: 15 },
                { header: 'Appointment Time', key: 'time', width: 15 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Problem', key: 'problem', width: 40 },
                { header: 'Created At', key: 'createdAt', width: 20 }
            ];
            
            // Style the header
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            
            // Process appointments and add unique patients
            const patientMap = new Map();
            
            appointments.forEach(appointment => {
                const patientInfo = appointment.userId;
                if (!patientInfo) return; // Skip if patient info is missing
                
                // Format date and time
                const appointmentDate = moment(appointment.date, "DD-MM-YYYY").format("MMM DD, YYYY");
                const appointmentTime = appointment.time;
                
                const patientData = {
                    name: patientInfo.name || 'Not provided',
                    email: patientInfo.email || 'Not provided',
                    phone: patientInfo.phone || 'Not provided',
                    date: appointmentDate,
                    time: appointmentTime,
                    status: appointment.status,
                    problem: appointment.problem || 'Not specified',
                    createdAt: moment(appointment.createdAt).format("MMM DD, YYYY")
                };
                
                // Add appointment to worksheet
                worksheet.addRow(patientData);
                
                // Track unique patients (using email as key)
                if (!patientMap.has(patientInfo.email)) {
                    patientMap.set(patientInfo.email, patientInfo);
                }
            });
        }
        
        // Apply styles to all cells with data
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });
        
        console.log("Excel file generated, preparing to send");
        
        // Set response headers (after ensuring there are no previous headers)
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=patients-${moment().format('YYYY-MM-DD')}.xlsx`);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Pragma', 'no-cache');
        
        try {
            // Write the workbook directly to the response
            console.log("Writing Excel file to response");
            await workbook.xlsx.write(res);
            console.log("Excel file written successfully");
            
            // End the response
            res.end();
            console.log("Response ended, download complete");
        } catch (writeError) {
            console.error("Error writing Excel to response:", writeError);
            if (!res.headersSent) {
                res.status(500).send({
                    message: "Failed to generate Excel file: " + writeError.message,
                    success: false
                });
            } else {
                res.end();
            }
        }
    } catch (error) {
        console.error("Error in Excel download process:", error);
        // For binary responses, we need to set headers before sending an error
        if (!res.headersSent) {
            res.status(500).send({
                message: "Error generating Excel file: " + error.message,
                success: false
            });
        } else {
            // If headers were already sent, we need to end the response
            res.end();
        }
    }
});

// Upload medical record
router.post("/upload-medical-record", authMiddleware, async (req, res) => {
  try {
    uploadMedicalRecord.single('medicalRecord')(req, res, async (err) => {
      if (err) {
        console.error("Multer upload error:", err);
        return res.status(400).send({
          success: false,
          message: `File upload error: ${err.message}`,
          error: err.message
        });
      }
      
      try {
        
        const { patientId, recordType, title, description } = req.body;
        const doctorId = req.body.doctorId;
        
        if (!patientId || !recordType || !title || !doctorId) {
          return res.status(400).send({
            success: false,
            message: "Missing required fields: patientId, recordType, title, or doctorId",
            missingFields: {
              patientId: !patientId,
              recordType: !recordType,
              title: !title,
              doctorId: !doctorId
            }
          });
        }
        
        if (!req.file) {
          return res.status(400).send({
            success: false,
            message: "No file uploaded or file upload failed"
          });
        }
        
        // Get file details from Cloudinary response
        let fileUrl = req.file.path || req.file.secure_url;
        const fileName = req.file.originalname;
        const fileType = req.file.mimetype;
        
        console.log("File details:", {
          url: fileUrl,
          name: fileName,
          type: fileType
        });
        
        // Get the doctor name to store in the record
        let doctorName = '';
        try {
          const Doctor = require('../models/Doctor');
          // Lookup doctor in applydoctors collection using userId (not _id) field
          const doctor = await Doctor.findOne({ userId: doctorId });
          
          if (doctor) {
            doctorName = `Dr. ${doctor.firstname} ${doctor.lastname}`;
          } else {
            const doctorById = await Doctor.findById(doctorId);
            if (doctorById) {
              doctorName = `Dr. ${doctorById.firstname} ${doctorById.lastname}`;
            } else {
              console.log("Doctor not found by either method");
            }
          }
        } catch (doctorError) {
          console.error("Error fetching doctor name:", doctorError);
          // Continue with empty doctor name if lookup fails
        }
        
        // Create the medical record
        const MedicalRecord = require('../models/MedicalRecordModel');
        const medicalRecord = new MedicalRecord({
          title,
          description,
          recordType,
          fileUrl,
          fileName,
          fileType,
          patientId,
          doctorId,
          doctorName, 
          uploadedBy: req.userId
        });
        
        try {
          await medicalRecord.save();
        } catch (dbError) {
          console.error("Database save error:", dbError);
          return res.status(500).send({
            success: false,
            message: "Failed to save medical record to database",
            error: dbError.message
          });
        }
        
        // Continue with notification logic
        try {
          // Add notification for patient
          const patient = await User.findById(patientId);
          if (patient) {
            // Use the doctorName we already retrieved above
            const doctorNameForNotification = doctorName || "Your doctor";
            
            const unseenNotification = patient.unseenNotification || [];
            const notification = {
              type: "new-medical-record",
              message: `${doctorNameForNotification} has uploaded a new medical record: ${title}`,
              onClickPath: "/profile",
              createdAt: new Date(),
              _id: new mongoose.Types.ObjectId(),
              data: {
                recordId: medicalRecord._id
              }
            };
            
            unseenNotification.push(notification);
            await User.findByIdAndUpdate(patientId, { unseenNotification });
            
            // Send real-time notification if socket is available
            const io = req.app.get('io');
            if (io) {
              const notificationWithStringId = {
                ...notification,
                _id: notification._id.toString()
              };
              
              io.emit('send_notification', {
                userId: patientId,
                notification: notificationWithStringId
              });
            }
            
            // Send email notification to patient
            try {
              const emailSent = await sendMedicalRecordToPatientEmail(
                patient.email,
                patient.name,
                medicalRecord,
                doctorNameForNotification
              );
              
            } catch (emailError) {
              console.error("Error sending medical record email to patient:", emailError);
              // Don't stop the process if email fails
            }
          }
        } catch (notificationError) {
          console.error("Notification error:", notificationError);
          // Don't fail the whole request if notification fails
        }
        
        res.status(200).send({
          success: true,
          message: "Medical record uploaded successfully",
          data: medicalRecord
        });
      } catch (innerError) {
        console.error("Inner error in upload processing:", innerError);
        return res.status(500).send({
          success: false,
          message: "Error processing uploaded file",
          error: innerError.message
        });
      }
    });
  } catch (outerError) {
    console.error("Outer error in upload endpoint:", outerError);
    res.status(500).send({
      success: false,
      message: "Server error during file upload",
      error: outerError.message
    });
  }
});

// Get patient medical records
router.get("/patient-medical-records", authMiddleware, async (req, res) => {
  try {
    const { patientId, doctorId } = req.query;
    
    if (!patientId) {
      return res.status(400).send({
        success: false,
        message: "Patient ID is required"
      });
    }
    
    // Build query
    const query = { patientId };
    
    // If doctorId is provided, filter by that doctor
    if (doctorId) {
      query.doctorId = doctorId;
    }
    
    // Get medical records
    const medicalRecords = await MedicalRecord.find(query)
      .sort({ createdAt: -1 })
      .populate('doctorId', 'firstname lastname specialization')
      .populate('uploadedBy', 'name')
      .populate('patientId', 'name email');
    
    res.status(200).send({
      success: true,
      message: "Medical records fetched successfully",
      data: medicalRecords
    });
    
  } catch (error) {
    console.error("Error fetching medical records:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching medical records",
      error: error.message
    });
  }
});

// Delete medical record
router.delete("/medical-record/:recordId", authMiddleware, async (req, res) => {
  try {
    const { recordId } = req.params;
    
    // Find the record first to check permissions
    const record = await MedicalRecord.findById(recordId);
    
    if (!record) {
      return res.status(404).send({
        success: false,
        message: "Medical record not found"
      });
    }
    
    // Check if current user is the doctor who uploaded it
    if (record.uploadedBy.toString() !== req.userId) {
      return res.status(403).send({
        success: false,
        message: "You don't have permission to delete this record"
      });
    }
    
    // Delete the record
    await MedicalRecord.findByIdAndDelete(recordId);
    
    res.status(200).send({
      success: true,
      message: "Medical record deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting medical record:", error);
    res.status(500).send({
      success: false,
      message: "Error deleting medical record",
      error: error.message
    });
  }
});

// Get all medical records with patient details
router.get("/medical-records", authMiddleware, async (req, res) => {
  try {
    // Get potential doctor IDs from various sources
    const userId = req.userId; // From auth token
    const queryDoctorId = req.query.doctorId; // From query params
    const queryUserId = req.query.userId; // From query params as backup
    
    console.log("Medical Records Request Details:", {
      userId,
      queryDoctorId,
      queryUserId
    });
    
    // First, try to find the doctor document to get the correct ID
    let doctor = null;
    let doctorId = null;
    
    if (queryDoctorId) {
      // Try to find doctor by the provided doctorId
      try {
        if (mongoose.Types.ObjectId.isValid(queryDoctorId)) {
          doctor = await Doctor.findById(queryDoctorId);
          if (doctor) {
            console.log("Found doctor by queryDoctorId");
            doctorId = doctor._id;
          }
        }
      } catch (err) {
        console.error("Error finding doctor by queryDoctorId:", err);
      }
    }
    
    // If doctor not found yet, try finding by userId from token
    if (!doctor && userId) {
      try {
        doctor = await Doctor.findOne({ userId });
        if (doctor) {
          console.log("Found doctor by userId from token");
          doctorId = doctor._id;
        }
      } catch (err) {
        console.error("Error finding doctor by userId from token:", err);
      }
    }
    
    // If doctor still not found, try with queryUserId
    if (!doctor && queryUserId) {
      try {
        doctor = await Doctor.findOne({ userId: queryUserId });
        if (doctor) {
          console.log("Found doctor by queryUserId");
          doctorId = doctor._id;
        }
      } catch (err) {
        console.error("Error finding doctor by queryUserId:", err);
      }
    }
    
    // If we still couldn't determine the doctorId, use the userId directly
    // (Some DBs might have doctorId directly as userId)
    if (!doctorId) {
      console.log("No doctor found, using userId as fallback");
      doctorId = userId;
    }
    
    console.log("Final doctorId for query:", doctorId);
    
    // Fetch records with the determined doctorId
    const recordsQuery = { doctorId };
    
    // Attempt alternate query if needed
    let records = await MedicalRecord.find(recordsQuery)
      .sort({ createdAt: -1 })
      .populate('patientId', 'name email phone age gender photo')
      .populate('doctorId', 'firstname lastname specialization');
    
    // If no records found and we have both doctorId and userId, try with userId as doctorId
    if (records.length === 0 && doctorId !== userId && userId) {
      console.log("No records found with doctorId, trying with userId directly");
      records = await MedicalRecord.find({ doctorId: userId })
        .sort({ createdAt: -1 })
        .populate('patientId', 'name email phone age gender photo')
        .populate('doctorId', 'firstname lastname specialization');
    }
    
    console.log(`Found ${records.length} medical records`);
    
    if (records.length === 0) {
      // Return early with empty result
      return res.status(200).send({
        success: true,
        message: "No medical records found for this doctor",
        data: []
      });
    }
    
    // Debug: Log record details
    console.log("Records found, first record:", {
      id: records[0]._id,
      patientId: records[0].patientId?._id || records[0].patientId,
      doctorId: records[0].doctorId?._id || records[0].doctorId,
      title: records[0].title
    });
      
    // Group records by patient
    const recordsByPatient = {};
    
    records.forEach(record => {
      if (record.patientId) {
        const patientId = record.patientId._id.toString();
        
        if (!recordsByPatient[patientId]) {
          recordsByPatient[patientId] = {
            patient: record.patientId,
            records: []
          };
        }
        
        // Format the record
        const formattedRecord = {
          _id: record._id,
          title: record.title,
          description: record.description,
          recordType: record.recordType,
          fileUrl: record.fileUrl,
          fileName: record.fileName,
          fileType: record.fileType,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        };
        
        // Fix PDF URLs
        if (record.fileUrl && record.fileUrl.toLowerCase().endsWith('.pdf')) {
          let fixedUrl = record.fileUrl;
          
          // Convert image upload to raw upload
          if (fixedUrl.includes('/image/upload/')) {
            fixedUrl = fixedUrl.replace('/image/upload/', '/raw/upload/');
          }
          
          // Add attachment flag for better PDF handling
          if (fixedUrl.includes('/upload/') && !fixedUrl.includes('fl_attachment')) {
            fixedUrl = fixedUrl.replace('/upload/', '/upload/fl_attachment,fl_no_overflow/');
          }
          
          // Add PDF extension if missing
          if (!fixedUrl.toLowerCase().endsWith('.pdf')) {
            fixedUrl = `${fixedUrl}.pdf`;
          }
          
          formattedRecord.fileUrl = fixedUrl;
        }
        
        recordsByPatient[patientId].records.push(formattedRecord);
      }
    });
    
    // Convert to array
    const result = Object.values(recordsByPatient);
    
    res.status(200).send({
      success: true,
      message: "Medical records fetched successfully",
      data: result
    });
    
  } catch (error) {
    console.error("Error fetching medical records:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching medical records",
      error: error.message
    });
  }
});

// Get medical records for specific appointment
router.get("/appointment-medical-records/:appointmentId", authMiddleware, async (req, res) => {
  try {
    const medicalRecordController = require("../controllers/medicalRecordController");
    await medicalRecordController.getMedicalRecordsByAppointment(req, res);
  } catch (error) {
    console.error("Error in appointment medical records route:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching medical records for appointment",
      error: error.message,
    });
  }
});

// Add an alias route for the appointment medical records that matches the client request URL
router.get("/medical-records-by-appointment/:appointmentId", authMiddleware, async (req, res) => {
  try {
    const medicalRecordController = require("../controllers/medicalRecordController");
    await medicalRecordController.getMedicalRecordsByAppointment(req, res);
  } catch (error) {
    console.error("Error in medical records by appointment route:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching medical records for appointment",
      error: error.message,
    });
  }
});

// Email a medical record to the patient
router.post("/email-medical-record/:recordId", authMiddleware, async (req, res) => {
  try {
    const medicalRecordController = require("../controllers/medicalRecordController");
    await medicalRecordController.emailMedicalRecordToPatient(req, res);
  } catch (error) {
    console.error("Error in email medical record route:", error);
    res.status(500).send({
      success: false,
      message: "Error sending medical record email",
      error: error.message,
    });
  }
});

// Proxy upload to Cloudinary for fallback
router.post("/proxy-upload-to-cloudinary", authMiddleware, async (req, res) => {
    try {
        const cloudinary = require('../cloudConfig/cloudinaryConfig');
        
        // Check if we have a file or base64 data
        if (!req.body.image) {
            return res.status(400).send({
                success: false,
                message: "No image data provided"
            });
        }
        
        const { image, userId } = req.body;
        
        // Upload to cloudinary directly
        const uploadResult = await cloudinary.uploader.upload(image, {
            folder: 'doctor_appointment_system/profile_pictures',
            transformation: [{ width: 500, height: 500, crop: 'limit' }],
            resource_type: 'auto'
        });
        
        if (!uploadResult || !uploadResult.secure_url) {
            return res.status(500).send({
                success: false,
                message: "Failed to upload image to Cloudinary"
            });
        }
        
        // If a userId is provided, update the doctor record
        if (userId) {
            const doctor = await Doctor.findOneAndUpdate(
                { userId: userId },
                { $set: { image: uploadResult.secure_url } },
                { new: true }
            );
            
            if (!doctor) {
                // Still return success with the URL even if doctor not found
                console.log("Doctor not found for userId:", userId);
            }
        }
        
        return res.status(200).send({
            success: true,
            message: "Image uploaded successfully",
            data: {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id
            }
        });
    } catch (error) {
        console.error("Error in proxy upload to Cloudinary:", error);
        res.status(500).send({
            success: false,
            message: "Server error during proxy upload",
            error: error.message
        });
    }
});

// Get video consultations for a doctor
router.get('/get-video-consultations', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId; // Get userId from auth middleware
        
        console.log(`Fetching video consultations for doctor with userId: ${userId}`);
        
        // Try both string comparison and ObjectId for better compatibility
        let userIdObj;
        try {
            userIdObj = new mongoose.Types.ObjectId(userId);
        } catch (e) {
            console.log('Could not convert userId to ObjectId, will use string value');
            userIdObj = userId;
        }
        
        // Use a more permissive query to find all video consultations for this doctor
        const videoConsultations = await Appointment.find({
            doctorId: { $in: [userId, userIdObj] }, // Try both string and ObjectId
            $and: [
                { status: "approved" },
                { $or: [
                    { appointmentType: "video" },
                    { "videoConsultation": { $exists: true } }
                ]}
            ]
        }).sort({ date: 1, time: 1 });
        
        console.log(`Found ${videoConsultations.length} total video consultations for doctor`);
        
        // Debug all consultations
        videoConsultations.forEach(consultation => {
            console.log(`Appointment ID: ${consultation._id}`);
            console.log(`Date: ${consultation.date}, Time: ${consultation.time}`);
            console.log(`Status: ${consultation.status}, Type: ${consultation.appointmentType}`);
            console.log(`Patient: ${consultation.userInfo?.name}`);
            console.log(`Has videoConsultation: ${!!consultation.videoConsultation}`);
            
            if (consultation.videoConsultation) {
                console.log(`Meeting link: ${consultation.videoConsultation.meetingLink}`);
                console.log(`Calendar event ID: ${consultation.videoConsultation.calendarEventId}`);
                console.log(`Joined by doctor: ${consultation.videoConsultation.joinedByDoctor}`);
                console.log(`Joined by patient: ${consultation.videoConsultation.joinedByPatient}`);
            }
            
            console.log('-------------------');
        });
        
        // Process all consultations
        const processedConsultations = videoConsultations.map(consultation => {
            // Parse date and time correctly based on the stored format (DD-MM-YYYY HH:mm)
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
