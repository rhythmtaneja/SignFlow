const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  isSigned: {
    type: Boolean,
    default: false
  },
  originalDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }
});

module.exports = mongoose.model('Document', DocumentSchema);
