const mongoose = require('mongoose');

var applyDoctorSchema = new mongoose.Schema({
    userId: {
        type: String,
        ref: 'users',
        required: true,
    },
    firstname: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        required: true,
    },
    website: {
        type: String,
    },
    image: {
        type: String,
        required: true,
    },
    department: {
        type: String,
        required: true,
    },
    profession: {
        type: String,
        required: true,
    },
    experience: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        default: '',
    },
    state: {
        type: String,
        default: '',
    },
    zipCode: {
        type: String,
        default: '',
    },
    country: {
        type: String,
        default: 'India',
    },
    coordinates: {
        type: {
            lat: Number,
            lng: Number
        },
        default: null,
    },
    feePerConsultation: {
        type: String,
        required: true,
    },
    timing: {
        type: Array,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    medicalDegree: {
        type: String,
    },
    institution: {
        type: String,
    },
    qualifications: {
        type: String,
    },
    specialization: {
        type: mongoose.Schema.Types.Mixed,
    },
    hospitalAffiliations: {
        type: String,
    },
    professionalBio: {
        type: String,
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
    unavailableReason: {
        type: String,
        default: '',
    },
    unavailableUntil: {
        type: Date,
        default: null,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('applydoctors', applyDoctorSchema);
