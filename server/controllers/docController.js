const Document = require('../models/Document');
const Signature = require('../models/Signature');
const Audit = require('../models/Audit');
const fs = require('fs').promises;
const path = require('path');

exports.uploadDoc = async (req, res) => {
  try {
    const { file } = req;

    if (!file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    // Save document in DB
    const newDoc = new Document({
      originalName: file.originalname,
      filePath: file.path,
      uploadedBy: req.user.id // from auth middleware
    });

    await newDoc.save();

    res.status(201).json({ msg: 'File uploaded successfully', document: newDoc });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getUserDocs = async (req, res) => {
  try {
    const userId = req.user.id;

    const docs = await Document.find({ uploadedBy: userId }).sort({ uploadDate: -1 });

    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error fetching documents' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the document and check ownership
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    if (document.uploadedBy.toString() !== userId) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    // Delete associated signatures
    await Signature.deleteMany({ documentId: id });

    // Delete associated audit logs
    await Audit.deleteMany({ documentId: id });

    // Delete the file from the filesystem
    try {
      const filePath = path.resolve(__dirname, '..', 'uploads', path.basename(document.filePath));
      await fs.unlink(filePath);
    } catch (fileError) {
      console.warn('Could not delete file from filesystem:', fileError.message);
      // Continue with deletion even if file doesn't exist
    }

    // Delete the document from database
    await Document.findByIdAndDelete(id);

    res.json({ msg: 'Document deleted successfully' });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ msg: 'Server error deleting document' });
  }
};
