const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const supportController = require('../controllers/supportController');

// Route to handle contact form submissions
router.post('/contact', async (req, res) => {
  try {
    await supportController.submitContactForm(req, res);
  } catch (error) {
    console.error("Error in contact route:", error);
    res.status(500).send({
      success: false,
      message: "Error processing contact form",
      error: error.message,
    });
  }
});

module.exports = router; 