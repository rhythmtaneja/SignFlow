const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadDoc, getUserDocs, deleteDocument } = require('../controllers/docController');
const upload = require('../utils/multer');
const path = require('path');
const Document = require('../models/Document');
const { auditDocumentView } = require('../middleware/auditLogger');
const jwt = require('jsonwebtoken');

router.post('/upload', auth, upload.single('pdf'), uploadDoc);
router.get('/', auth, getUserDocs);
router.delete('/:id', auth, deleteDocument);

// Route for opening PDFs in new tab with token in URL
router.get('/file/:id/view', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(401).json({ msg: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ msg: 'Invalid token' });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) {
      console.error('Document not found for id:', req.params.id);
      return res.status(404).json({ msg: 'Document not found' });
    }

    const filePath = path.resolve(__dirname, '..', 'uploads', path.basename(doc.filePath));
    console.log('doc.filePath:', doc.filePath);
    console.log('Resolved filePath:', filePath);
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ msg: 'Error serving file', error: err.message });
      }
    });
  } catch (err) {
    console.error('Exception in /file/:id/view:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Invalid token' });
    }
    res.status(500).json({ msg: 'Error serving file', error: err.message });
  }
});

router.get('/file/:id', auth, auditDocumentView, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      console.error('Document not found for id:', req.params.id);
      return res.status(404).json({ msg: 'Document not found' });
    }
    const filePath = path.resolve(__dirname, '..', 'uploads', path.basename(doc.filePath));
    console.log('doc.filePath:', doc.filePath);
    console.log('Resolved filePath:', filePath);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ msg: 'Error serving file', error: err.message });
      }
    });
  } catch (err) {
    console.error('Exception in /file/:id:', err);
    res.status(500).json({ msg: 'Error serving file', error: err.message });
  }
});

module.exports = router;
