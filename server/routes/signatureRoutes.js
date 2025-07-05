const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { saveSignaturePosition, getAllSignatures, getDocumentSignatures, generateSignedPDF, inviteSigner, publicSignatureInfo, savePublicSignature, updateSignatureStatus, getSignaturesByStatus, rejectDocument } = require('../controllers/signatureController');
const { auditSignatureMiddleware } = require('../middleware/auditLogger');
const jwt = require('jsonwebtoken');

router.post('/', auth, auditSignatureMiddleware('signature_added'), saveSignaturePosition);
router.get('/', auth, getAllSignatures);
router.get('/:id', auth, getDocumentSignatures);

// Route for viewing signed PDFs in new tab with token in URL
router.get('/generate/:documentId/view', async (req, res) => {
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

    // Set user in request for the controller
    req.user = { id: decoded.user?.id || decoded.id };
    
    // Call the existing generateSignedPDF function
    await generateSignedPDF(req, res);
  } catch (err) {
    console.error('Exception in /generate/:documentId/view:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Invalid token' });
    }
    res.status(500).json({ msg: 'Error generating signed PDF', error: err.message });
  }
});

router.get('/generate/:documentId', auth, auditSignatureMiddleware('document_signed'), generateSignedPDF);
router.post('/invite', auth, auditSignatureMiddleware('invite_sent'), inviteSigner);
router.get('/public/:token', publicSignatureInfo);
router.post('/public', auditSignatureMiddleware('signature_added'), savePublicSignature);
router.put('/:signatureId/status', auth, auditSignatureMiddleware('signature_status_updated'), updateSignatureStatus);
router.post('/reject-document', auth, auditSignatureMiddleware('document_rejected'), rejectDocument);
router.get('/status/:status', auth, getSignaturesByStatus);

router.delete('/:signatureId', auth, auditSignatureMiddleware('signature_deleted'), require('../controllers/signatureController').deleteSignature);

module.exports = router;
