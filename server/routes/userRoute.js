const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Appointment = require("../models/AppointmentModel");
const Feedback = require("../models/FeedbackModel");
const User = require("../models/user");
const mongoose = require("mongoose");

// Get patient information by user ID (for testimonials)
router.get("/get-patient-info", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).send({
        message: "User ID is required",
        success: false
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).send({
        message: "User not found",
        success: false
      });
    }
    
    // Return only necessary information for security
    res.status(200).send({
      success: true,
      data: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Error getting patient info:", error);
    res.status(500).send({
      message: "Error getting patient information",
      success: false,
      error: error.message
    });
  }
});

// Submit feedback for a completed appointment
router.post("/submit-feedback", authMiddleware, async (req, res) => {
  try {
    const { appointmentId, rating, satisfaction, comment, showAsTestimonial, patientName } = req.body;
    // Get userId from middleware, not from body
    const userId = req.userId;
    
    console.log("Submit Feedback Request received:");
    console.log("appointmentId:", appointmentId);
    console.log("userId from auth:", userId);
    console.log("rating:", rating);
    console.log("satisfaction:", satisfaction);
    console.log("showAsTestimonial:", showAsTestimonial);
    
    // Ensure we have a valid MongoDB ObjectId
    let objectIdAppointmentId;
    try {
      objectIdAppointmentId = new mongoose.Types.ObjectId(appointmentId);
    } catch (err) {
      console.log("Invalid ObjectId format:", err.message);
      return res.status(400).send({
        message: "Invalid appointment ID format",
        success: false
      });
    }

    // Verify the appointment exists and belongs to the patient
    let appointment;
    try {
      appointment = await Appointment.findOne({ 
        _id: objectIdAppointmentId,
        userId: userId,
        status: "completed"
      });
    } catch (err) {
      console.error("Error finding appointment:", err);
      return res.status(500).send({
        message: "Error finding appointment",
        success: false,
        error: err.message
      });
    }
    
    if (!appointment) {
      // Log more details about why appointment wasn't found
      console.log("Appointment not found. Checking individual conditions:");
      
      // Check if appointment exists at all
      const anyAppointment = await Appointment.findById(objectIdAppointmentId);
      if (!anyAppointment) {
        console.log("No appointment found with this ID");
      } else {
        console.log("Appointment found but failed conditions:");
        console.log("- Expected userId:", userId);
        console.log("- Actual userId:", anyAppointment.userId);
        console.log("- Expected status: completed");
        console.log("- Actual status:", anyAppointment.status);
        
        // If the appointment exists but the status isn't completed
        if (anyAppointment.userId === userId && anyAppointment.status !== 'completed') {
          return res.status(400).send({
            message: "Appointment must be completed before providing feedback",
            success: false
          });
        }
        
        // If the appointment exists but doesn't belong to this user
        if (anyAppointment.userId !== userId) {
          return res.status(403).send({
            message: "This appointment doesn't belong to you",
            success: false
          });
        }
      }
      
      return res.status(404).send({
        message: "Appointment not found or not eligible for feedback",
        success: false
      });
    }

    // Log success for debugging
    console.log("Appointment found:", appointment._id);
    console.log("Appointment status:", appointment.status);

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ appointmentId });
    if (existingFeedback) {
      console.log("Feedback already exists for this appointment");
      return res.status(400).send({
        message: "Feedback has already been submitted for this appointment",
        success: false
      });
    }

    // Get user name for testimonial if showAsTestimonial is true
    let userName = null;
    if (showAsTestimonial) {
      // If patientName is provided in the request, use it
      if (patientName) {
        userName = patientName;
      } else {
        // Otherwise, fetch the user's name from the database
        try {
          const user = await User.findById(userId);
          if (user) {
            userName = user.name;
          }
        } catch (err) {
          console.error("Error fetching user name:", err);
          // Continue without the name if there's an error
        }
      }
    }

    // Create new feedback
    const feedback = new Feedback({
      appointmentId,
      patientId: userId,
      doctorId: appointment.doctorId,
      rating,
      satisfaction,
      comment: comment || "",
      showAsTestimonial: showAsTestimonial || false,
      patientName: showAsTestimonial ? userName : null
    });

    // Mark appointment as feedback provided
    appointment.feedbackProvided = true;
    await appointment.save();
    
    // Save feedback
    await feedback.save();
    console.log("Feedback saved successfully");

    res.status(200).send({
      message: "Feedback submitted successfully",
      success: true
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).send({
      message: "Error submitting feedback",
      success: false,
      error: error.message
    });
  }
});

// Get feedback for an appointment
router.get("/get-appointment-feedback", authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.query;
    // Get userId from middleware
    const userId = req.userId;
    
    console.log("Get Appointment Feedback request:");
    console.log("appointmentId:", appointmentId);
    console.log("userId:", userId);

    // Ensure we have a valid MongoDB ObjectId
    let objectIdAppointmentId;
    try {
      objectIdAppointmentId = new mongoose.Types.ObjectId(appointmentId);
    } catch (err) {
      console.log("Invalid ObjectId format:", err.message);
      return res.status(400).send({
        message: "Invalid appointment ID format",
        success: false
      });
    }

    // Verify the appointment exists and belongs to the patient
    const appointment = await Appointment.findOne({ 
      _id: objectIdAppointmentId,
      userId: userId
    });

    if (!appointment) {
      console.log("Appointment not found or doesn't belong to user");
      return res.status(404).send({
        message: "Appointment not found",
        success: false
      });
    }

    // Get feedback
    const feedback = await Feedback.findOne({ appointmentId: objectIdAppointmentId });
    console.log("Feedback found:", feedback ? "Yes" : "No");
    
    res.status(200).send({
      success: true,
      data: feedback || null
    });
  } catch (error) {
    console.error("Error getting feedback:", error);
    res.status(500).send({
      message: "Error getting feedback",
      success: false,
      error: error.message
    });
  }
});

// Check which appointment slots are booked for a doctor on a specific date
router.post("/check-booked-slots", async (req, res) => {
  try {
    const { doctorId, date } = req.body;
    
    console.log("Check booked slots request:");
    console.log("doctorId:", doctorId);
    console.log("date:", date);

    if (!doctorId || !date) {
      return res.status(400).send({
        message: "Doctor ID and date are required",
        success: false
      });
    }

    // Parse the incoming date (YYYY-MM-DD) to ensure we're working with a proper date object
    let parsedDate;
    try {
      // For YYYY-MM-DD format from client
      parsedDate = new Date(date);
      
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date format");
      }
    } catch (error) {
      console.error("Error parsing date:", error);
      return res.status(400).send({
        message: "Invalid date format. Expected YYYY-MM-DD",
        success: false
      });
    }
    
    // Format the date to match how it's stored in the database (DD-MM-YYYY)
    const day = parsedDate.getDate().toString().padStart(2, '0');
    const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
    const year = parsedDate.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    
    console.log("Searching for appointments with formatted date:", formattedDate);

    // Find all appointments for this doctor on this date using the formatted date string
    const bookedAppointments = await Appointment.find({
      doctorId,
      date: formattedDate,
      status: { $nin: ["cancelled"] } // Exclude cancelled appointments
    });
    
    console.log("Found", bookedAppointments.length, "booked appointments");
    
    // Extract the time slots
    const bookedSlots = bookedAppointments.map(appointment => appointment.time);
    console.log("Booked slots:", bookedSlots);
    
    res.status(200).send({
      success: true,
      bookedSlots
    });
  } catch (error) {
    console.error("Error checking booked slots:", error);
    res.status(500).send({
      message: "Error checking booked slots",
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 