const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    doctorId: {
        type: String,
        required: true,
    },
    doctorInfo: {
        type: Object,
        required: true,
    },
    userInfo: {
        type: Object,
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
        // required: true,
    },
    symptoms: {
        type: String,
        default: "",
    },
    medicalHistory: {
        type: String,
        default: "",
    },
    preferredCommunication: {
        type: String,
        enum: ["phone", "email"],
        default: "phone",
    },
    emergencyContact: {
        type: String,
        default: "",
    },
    additionalNotes: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        required: true,
        default: "pending"
    }
}, {
    timestamps: true
});

// Export the model
module.exports = mongoose.model('Appointments', appointmentSchema);






