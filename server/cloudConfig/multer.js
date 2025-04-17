const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to handle image resizing
const resizeImage = (req, res, next) => {
    if (!req.file) {
        return next();
    }

    const filename = `profile-${uuidv4()}.jpeg`;

    sharp(req.file.buffer)
        .resize(250, 250)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(path.join(__dirname, `../uploads/${filename}`), (err) => {
            if (err) {
                return res.status(500).send({ message: 'Image processing failed', success: false });
            }

            req.body.image = filename;
            next();
        });
};

module.exports = { upload, resizeImage };
