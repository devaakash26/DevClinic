const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinaryConfig');
const https = require('https');

// Configure storage options with error handling
const configureStorage = (options) => {
  const storageConfig = {
    cloudinary: cloudinary,
    params: options.params
  };

  // Add error handling for HTTPS requests
  if (process.env.NODE_ENV !== 'production') {
    storageConfig.https_agent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  return new CloudinaryStorage(storageConfig);
};

// Configure cloudinary storage with proper v2 API
const storage = configureStorage({
  params: {
    folder: 'doctor_appointment_system/profile_pictures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = file.originalname.split('.')[0];
      return `user-${filename}-${uniqueSuffix}`;
    },
    // Ensure that secure URLs are used
    secure: true
  }
});

// Configure storage for medical records with PDF and image support
const medicalRecordStorage = configureStorage({
  params: (req, file) => {
    // Extract file extension from original filename
    const extension = file.originalname.split('.').pop().toLowerCase();
    const filename = file.originalname.split('.')[0];
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const patientId = req.body.patientId || 'unknown';
    
    // Create a unique filename that preserves the extension
    const uniqueFilename = `medical-record-${patientId}-${filename}-${uniqueSuffix}.${extension}`;
    console.log("Generated filename:", uniqueFilename);
    
    // Default parameters with resource_type raw
    const params = {
      folder: 'doctor_appointment_system/medical_records',
      resource_type: 'raw', // Always use raw for consistent handling
      public_id: uniqueFilename,
      secure: true
    };
    
    // Add special flags for PDFs to allow viewing and downloading
    if (file.mimetype === 'application/pdf') {
      console.log("Setting up PDF-specific Cloudinary parameters");
      params.flags = 'attachment'; // Add attachment flag for security bypass
    }
    
    console.log("Cloudinary upload params:", params);
    return params;
  }
});

// Configure multer for file upload handling
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // limit file size to 5MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only jpeg, jpg, png, gif
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  }
});

// Configure multer for medical record uploads
const uploadMedicalRecord = multer({
  storage: medicalRecordStorage,
  limits: {
    fileSize: 1024 * 1024 * 10 // limit file size to 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (
      file.mimetype.startsWith('image/') || 
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' || 
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type! Please upload images, PDFs, or Word documents.'), false);
    }
  }
});

module.exports = { upload, uploadMedicalRecord }; 