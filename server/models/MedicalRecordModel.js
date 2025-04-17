const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'applydoctors',
        required: true
    },
    doctorName: {
        type: String,
        default: ''
    },
    recordType: {
        type: String,
        required: true,
        enum: ['clinical_report', 'lab_test', 'prescription', 'imaging', 'other']
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema); 