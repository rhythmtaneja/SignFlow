const Audit = require('../models/Audit');
const Document = require('../models/Document');
const User = require('../models/User');

// Helper function to get client IP address
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
};

// Helper function to get signer name
const getSignerName = async (signerId, externalEmail) => {
  if (externalEmail) {
    return externalEmail;
  }
  if (signerId) {
    try {
      const user = await User.findById(signerId).select('name email');
      return user ? user.name || user.email : 'Unknown User';
    } catch (error) {
      console.error('Error fetching user for audit:', error);
      return 'Unknown User';
    }
  }
  return 'Unknown User';
};

// Helper function to get document name
const getDocumentName = async (documentId) => {
  try {
    const document = await Document.findById(documentId).select('originalName');
    return document ? document.originalName : 'Unknown Document';
  } catch (error) {
    console.error('Error fetching document for audit:', error);
    return 'Unknown Document';
  }
};

// Main audit logging function
const logAuditEvent = async (req, action, signatureData = {}) => {
  try {
    const documentId = req.params.documentId || req.params.id || signatureData.documentId;
    
    // Don't log if we don't have a document ID
    if (!documentId) {
      console.log(`Skipping audit log for ${action} - no document ID`);
      return;
    }

    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    // Get document name
    const documentName = await getDocumentName(documentId);
    
    // Get signer name
    const signerName = await getSignerName(
      req.user && req.user.id ? req.user.id : (signatureData.signer || 'Unknown'),
      signatureData.externalEmail
    );

    const auditData = {
      documentId,
      documentName,
      action,
      signer: req.user && req.user.id ? req.user.id : (signatureData.signer || null),
      externalEmail: signatureData.externalEmail,
      signerName,
      ipAddress,
      userAgent,
      signatureType: signatureData.signatureType,
      signatureLocation: signatureData.x && signatureData.y ? {
        x: signatureData.x,
        y: signatureData.y,
        page: signatureData.page
      } : undefined
    };

    const audit = new Audit(auditData);
    await audit.save();
    
    console.log(`📋 Audit logged: ${action} by ${signerName} (${ipAddress}) on ${documentName}`);
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

// Middleware for signature events
const auditSignatureMiddleware = (action) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send function to capture response data
    res.send = function(data) {
      // Restore original send
      res.send = originalSend;
      
      // Log audit event after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          logAuditEvent(req, action, responseData);
        } catch (error) {
          console.error('Error parsing response for audit:', error);
        }
      }
      
      // Call original send
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Middleware for document viewing
const auditDocumentView = async (req, res, next) => {
  try {
    // Only log if we have a document ID and user is authenticated
    if (req.params.id && req.user && req.user.id) {
      await logAuditEvent(req, 'document_viewed');
    }
  } catch (error) {
    console.error('Error logging document view:', error);
    // Don't fail the request if audit logging fails
  }
  next();
};

module.exports = {
  logAuditEvent,
  auditSignatureMiddleware,
  auditDocumentView,
  getClientIP
}; 