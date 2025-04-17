const MedicalRecord = require('../models/MedicalRecordModel');
const cloudinary = require('cloudinary').v2;

// Function to format medical record response
const formatMedicalRecordResponse = (record) => {
  // Basic record info
  const formattedRecord = {
    _id: record._id,
    title: record.title,
    description: record.description,
    recordDate: record.recordDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    patientId: record.patientId,
    doctorId: record.doctorId,
    recordType: record.recordType
  };

  // Format file URL if it exists
  if (record.fileUrl) {
    const url = record.fileUrl;
    
    // Keep the original URL for reference
    formattedRecord.originalUrl = url;
    
    // Check if file is a PDF by extension
    const isPdf = url.toLowerCase().endsWith('.pdf') || 
                 (record.fileType && 
                  (record.fileType === 'application/pdf' || 
                   record.fileType === 'pdf'));

    // For PDFs, ensure the URL is set up correctly for viewing/downloading
    if (isPdf) {
      let fixedUrl = url;
      
      // Make sure we're using raw upload path instead of image path
      if (fixedUrl.includes('/image/upload/')) {
        fixedUrl = fixedUrl.replace('/image/upload/', '/raw/upload/');
      }
      
      // Add required flags to bypass security restrictions
      if (fixedUrl.includes('/upload/') && !fixedUrl.includes('fl_attachment')) {
        fixedUrl = fixedUrl.replace('/upload/', '/upload/fl_attachment,fl_no_overflow/');
      }
      
      // Add PDF extension if missing
      if (!fixedUrl.toLowerCase().endsWith('.pdf')) {
        fixedUrl = `${fixedUrl}.pdf`;
      }
      
      formattedRecord.fileUrl = fixedUrl;
      formattedRecord.fileType = 'application/pdf';
    } else {
      formattedRecord.fileUrl = url;
      
      // Determine file type based on URL extension if not already set
      if (!record.fileType) {
        const extension = url.split('.').pop().toLowerCase();
        let fileType = '';
        
        // Map common extensions to mime types
        if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
          fileType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        } else {
          fileType = extension;
        }
        
        formattedRecord.fileType = fileType;
      } else {
        formattedRecord.fileType = record.fileType;
      }
    }
    
    // Add fileName if it exists in the record
    if (record.fileName) {
      formattedRecord.fileName = record.fileName;
    } else {
      // Generate a filename based on the URL
      const urlParts = url.split('/').pop().split('?')[0];
      formattedRecord.fileName = urlParts;
    }
  }

  return formattedRecord;
};

// Controller method to get all medical records
exports.getAllMedicalRecords = async (req, res) => {
  try {
    const { patientId, doctorId } = req.query;
    const query = {};

    if (patientId) query.patientId = patientId;
    if (doctorId) query.doctorId = doctorId;

    const medicalRecords = await MedicalRecord.find(query)
      .sort({ createdAt: -1 })
      .populate('patientId', 'name')
      .populate('doctorId', 'name');

    // Format each record
    const formattedRecords = medicalRecords.map(formatMedicalRecordResponse);

    res.status(200).json({
      success: true,
      data: formattedRecords
    });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Controller method to get a single medical record by ID
exports.getMedicalRecordById = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id)
      .populate('patientId', 'name')
      .populate('doctorId', 'name');
    
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    const formattedRecord = formatMedicalRecordResponse(medicalRecord);

    res.status(200).json({
      success: true,
      data: formattedRecord
    });
  } catch (error) {
    console.error('Error fetching medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Create a new medical record
exports.createMedicalRecord = async (req, res) => {
  try {
    const { title, description, recordDate, patientId, doctorId, recordType } = req.body;
    
    // Create base record
    const newRecord = {
      title,
      description,
      recordDate: new Date(recordDate),
      patientId,
      doctorId,
      recordType
    };
    
    // Fetch doctor information to get the name
    if (doctorId) {
      const Doctor = require('../models/Doctor');
      try {
        // Try finding by userId first (most common case)
        const doctorInfo = await Doctor.findOne({ userId: doctorId });
        if (doctorInfo) {
          newRecord.doctorName = `Dr. ${doctorInfo.firstname} ${doctorInfo.lastname}`;
        } else {
          // Fall back to direct ID lookup
          const doctorById = await Doctor.findById(doctorId);
          if (doctorById) {
            newRecord.doctorName = `Dr. ${doctorById.firstname} ${doctorById.lastname}`;
          }
        }
      } catch (err) {
        console.error('Error fetching doctor info:', err);
        // Continue with empty doctor name
      }
    }
    
    // Add file if uploaded
    if (req.file && req.file.path) {
      newRecord.fileUrl = req.file.path;
      
      // Check if it's a PDF and update the URL format accordingly
      if (req.file.originalname.toLowerCase().endsWith('.pdf')) {
        console.log('PDF file detected, storing file details');
      }
    }
    
    const medicalRecord = await MedicalRecord.create(newRecord);
    
    // Format the response
    const formattedRecord = formatMedicalRecordResponse(medicalRecord);
    
    res.status(201).json({
      success: true,
      data: formattedRecord
    });
  } catch (error) {
    console.error('Error creating medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update a medical record
exports.updateMedicalRecord = async (req, res) => {
  try {
    const { title, description, recordDate, recordType, doctorId } = req.body;
    const updateData = {
      title,
      description,
      recordType
    };
    
    // Handle doctorId and doctorName if doctorId is provided
    if (doctorId) {
      updateData.doctorId = doctorId;
      
      // Fetch doctor information to get the name
      const Doctor = require('../models/Doctor');
      try {
        // Try finding by userId first (most common case)
        const doctorInfo = await Doctor.findOne({ userId: doctorId });
        if (doctorInfo) {
          updateData.doctorName = `Dr. ${doctorInfo.firstname} ${doctorInfo.lastname}`;
        } else {
          // Fall back to direct ID lookup
          const doctorById = await Doctor.findById(doctorId);
          if (doctorById) {
            updateData.doctorName = `Dr. ${doctorById.firstname} ${doctorById.lastname}`;
          }
        }
      } catch (err) {
        console.error('Error fetching doctor info for update:', err);
        // Continue with empty doctor name
      }
    }
    
    if (recordDate) {
      updateData.recordDate = new Date(recordDate);
    }
    
    // Check if there's a new file
    if (req.file && req.file.path) {
      // Get the current record
      const currentRecord = await MedicalRecord.findById(req.params.id);
      
      // Delete old file from Cloudinary if exists
      if (currentRecord && currentRecord.fileUrl) {
        const publicId = currentRecord.fileUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
      
      // Update with new file
      updateData.fileUrl = req.file.path;
    }
    
    const medicalRecord = await MedicalRecord.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('patientId', 'name')
    .populate('doctorId', 'name');
    
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    const formattedRecord = formatMedicalRecordResponse(medicalRecord);
    
    res.status(200).json({
      success: true,
      data: formattedRecord
    });
  } catch (error) {
    console.error('Error updating medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete a medical record
exports.deleteMedicalRecord = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id);
    
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    // Delete file from Cloudinary if exists
    if (medicalRecord.fileUrl) {
      try {
        const publicId = medicalRecord.fileUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting file from Cloudinary:', cloudinaryError);
      }
    }
    
    await medicalRecord.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Medical record deleted'
    });
  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Export medical records to Excel
exports.exportMedicalRecordsToExcel = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const { patientId, doctorId } = req.query;
    const query = {};

    if (patientId) query.patientId = patientId;
    if (doctorId) query.doctorId = doctorId;

    const medicalRecords = await MedicalRecord.find(query)
      .sort({ recordDate: -1 })
      .populate('patientId', 'name')
      .populate('doctorId', 'name');

    if (medicalRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No medical records found'
      });
    }

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Medical Records');

    // Define columns
    worksheet.columns = [
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Record Date', key: 'recordDate', width: 15 },
      { header: 'Record Type', key: 'recordType', width: 15 },
      { header: 'Patient', key: 'patient', width: 20 },
      { header: 'Doctor', key: 'doctor', width: 20 },
      { header: 'File URL', key: 'fileUrl', width: 50 },
      { header: 'Created At', key: 'createdAt', width: 15 }
    ];

    // Add style to the header row
    worksheet.getRow(1).font = { bold: true };
    
    // Add data rows
    medicalRecords.forEach(record => {
      const formattedRecord = formatMedicalRecordResponse(record);
      worksheet.addRow({
        title: formattedRecord.title,
        description: formattedRecord.description,
        recordDate: new Date(formattedRecord.recordDate).toLocaleDateString(),
        recordType: formattedRecord.recordType,
        patient: record.patientId ? record.patientId.name : 'N/A',
        doctor: record.doctorId ? record.doctorId.name : 'N/A',
        fileUrl: formattedRecord.fileUrl || 'N/A',
        createdAt: new Date(formattedRecord.createdAt).toLocaleDateString()
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=medical-records.xlsx');

    // Write to response
    await workbook.xlsx.write(res);
    
    // End response
    res.end();
  } catch (error) {
    console.error('Error exporting medical records to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get medical records for a specific appointment
exports.getMedicalRecordsByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    console.log(`Fetching medical records for appointment: ${appointmentId}`);

    // First fetch the appointment to get doctor and patient IDs
    const Appointment = require('../models/AppointmentModel');
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      console.log(`Appointment not found with ID: ${appointmentId}`);
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Get patient and doctor IDs from the appointment
    const { userId: patientId, doctorId } = appointment;
    console.log(`Found appointment with patientId: ${patientId}, doctorId: ${doctorId}`);
    
    // Find medical records for this patient-doctor pair
    const medicalRecords = await MedicalRecord.find({
      patientId,
      doctorId
    })
    .sort({ createdAt: -1 })
    .populate('patientId', 'name email')
    .populate('doctorId', 'firstname lastname specialization');
    
    console.log(`Found ${medicalRecords.length} medical records for appointment`);
    
    // Format each record
    const formattedRecords = medicalRecords.map(formatMedicalRecordResponse);
    
    res.status(200).json({
      success: true,
      data: {
        appointment,
        medicalRecords: formattedRecords
      }
    });
  } catch (error) {
    console.error('Error fetching medical records for appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medical records',
      error: error.message
    });
  }
};

// Email a medical record to the patient
exports.emailMedicalRecordToPatient = async (req, res) => {
  try {
    const { recordId } = req.params;
    
    if (!recordId) {
      return res.status(400).json({
        success: false,
        message: 'Medical record ID is required'
      });
    }

    // Find the record
    const medicalRecord = await MedicalRecord.findById(recordId)
      .populate('patientId', 'name email')
      .populate('doctorId', 'firstname lastname specialization');
    
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    // Format the record for sending
    const formattedRecord = formatMedicalRecordResponse(medicalRecord);
    
    // Get patient email
    const patientEmail = medicalRecord.patientId.email;
    const patientName = medicalRecord.patientId.name;
    
    if (!patientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Patient email not found'
      });
    }
    
    // Import email service
    const { sendMedicalRecordToPatientEmail } = require('../utils/emailService');
    
    // Get doctor name for the email
    let doctorName = '';
    
    // First try to use the stored doctorName from the record
    if (medicalRecord.doctorName) {
      doctorName = medicalRecord.doctorName;
    }
    // If not available, try to get it from the populated doctorId
    else if (medicalRecord.doctorId && medicalRecord.doctorId.firstname) {
      doctorName = `Dr. ${medicalRecord.doctorId.firstname} ${medicalRecord.doctorId.lastname}`;
    } 
    // If still not available and we have the doctorId, look it up
    else if (medicalRecord.doctorId) {
      try {
        const Doctor = require('../models/Doctor');
        // First try by userId
        const doctorInfo = await Doctor.findOne({ userId: medicalRecord.doctorId });
        if (doctorInfo) {
          doctorName = `Dr. ${doctorInfo.firstname} ${doctorInfo.lastname}`;
        } else {
          // Try direct ID
          const doctorById = await Doctor.findById(medicalRecord.doctorId);
          if (doctorById) {
            doctorName = `Dr. ${doctorById.firstname} ${doctorById.lastname}`;
          }
        }
      } catch (err) {
        console.error('Error looking up doctor for email:', err);
        doctorName = 'Your doctor';
      }
    }
    else {
      doctorName = 'Your doctor';
    }
    
    // Send the email
    const emailResult = await sendMedicalRecordToPatientEmail(
      patientEmail,
      patientName,
      formattedRecord,
      doctorName
    );
    
    if (emailResult) {
      res.status(200).json({
        success: true,
        message: 'Medical record sent to patient email successfully'
      });
    } else {
      throw new Error('Failed to send email');
    }
  } catch (error) {
    console.error('Error emailing medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 