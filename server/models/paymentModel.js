const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'appointments',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'doctors',
      required: true
    },
    orderId: {
      type: String,
      required: true
    },
    paymentId: {
      type: String
    },
    signature: {
      type: String
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    receipt: {
      type: String
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created'
    },
    paidAt: {
      type: Date
    },
    paymentMethod: {
      type: String,
      default: 'razorpay'
    },
    refundId: {
      type: String
    },
    refundedAt: {
      type: Date
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const Payment = mongoose.model('payments', paymentSchema);

module.exports = Payment; 