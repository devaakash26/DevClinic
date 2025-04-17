const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointments',
        required: true,
    },
    patientId: {
        type: String,
        required: true,
    },
    doctorId: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    satisfaction: {
        type: String,
        required: true,
        enum: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']
    },
    comment: {
        type: String,
        default: "",
    },
    showAsTestimonial: {
        type: Boolean,
        default: false,
    },
    patientName: {
        type: String,
        default: null,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema); 