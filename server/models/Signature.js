const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SignatureSchema = new Schema({
  documentId: {
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  signer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return !this.externalEmail; }
  },
  externalEmail: {
    type: String,
    required: function() { return !this.signer; }
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  page: {
    type: Number,
    default: 1
  },
  signatureType: {
    type: String,
    enum: ['text', 'image', 'draw'],
    default: 'text'
  },
  signatureValue: {
    type: String,
    required: true
  },
  displayWidth: {
    type: Number,
    required: true
  },
  displayHeight: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'signed', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    required: function() { return this.status === 'rejected'; }
  },
  signedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

SignatureSchema.pre('validate', function(next) {
  if (!this.signer && !this.externalEmail) {
    this.invalidate('signer', 'Either signer or externalEmail is required');
  }
  next();
});

module.exports = mongoose.model('Signature', SignatureSchema);
