const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditSchema = new Schema({
  documentId: {
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  documentName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['signature_added', 'signature_removed', 'document_signed', 'document_viewed', 'signature_status_updated', 'document_rejected'],
    required: true
  },
  signer: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  externalEmail: {
    type: String
  },
  signerName: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  signatureType: {
    type: String,
    enum: ['text', 'draw', 'image']
  },
  signatureLocation: {
    x: Number,
    y: Number,
    page: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
AuditSchema.index({ documentId: 1, timestamp: -1 });
AuditSchema.index({ signer: 1, timestamp: -1 });
AuditSchema.index({ externalEmail: 1, timestamp: -1 });

module.exports = mongoose.model('Audit', AuditSchema); 