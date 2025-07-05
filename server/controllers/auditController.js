const Audit = require('../models/Audit');
const Document = require('../models/Document');

// Get audit trail for a specific document
const getDocumentAudit = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Verify document exists and user has access
    const document = await Document.findById(fileId).populate('uploadedBy', 'name email');
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user owns the document or is admin
    if (req.user && document.uploadedBy && document.uploadedBy._id && document.uploadedBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get audit logs for the document
    console.log(`Fetching audit logs for document: ${fileId}`);
    
    // First, let's check if there are any audit logs at all
    const totalAudits = await Audit.countDocuments();
    console.log(`Total audit logs in database: ${totalAudits}`);
    
    const auditLogs = await Audit.find({ documentId: fileId })
      .sort({ timestamp: -1 })
      .populate('signer', 'name email')
      .select('-__v');
    
    console.log(`Found ${auditLogs.length} audit logs for document ${fileId}`);
    
    // Let's also check what document IDs exist in audit logs
    const allAuditDocIds = await Audit.distinct('documentId');
    console.log(`Document IDs in audit logs:`, allAuditDocIds);

    // Format the response
    const formattedLogs = auditLogs.map(log => ({
      id: log._id,
      action: log.action,
      signerName: log.signerName,
      externalEmail: log.externalEmail,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      signatureType: log.signatureType,
      signatureLocation: log.signatureLocation,
      timestamp: log.timestamp,
      createdAt: log.createdAt
    }));

    res.json({
      documentId: fileId,
      documentName: document.originalName,
      totalEvents: formattedLogs.length,
      auditLogs: formattedLogs
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getDocumentAudit
}; 