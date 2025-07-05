const express = require('express');
const router = express.Router();
const { getDocumentAudit } = require('../controllers/auditController');
const auth = require('../middleware/auth');

// GET /api/audit/:fileId - Get audit trail for a specific document
router.get('/:fileId', auth, getDocumentAudit);

module.exports = router; 