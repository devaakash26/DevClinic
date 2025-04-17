const express = require("express");
const router = express.Router();
const Appointment = require("../models/AppointmentModel");
const authMiddleware = require("../middleware/authMiddleware");
const moment = require("moment");

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

// Export the router
module.exports = router; 