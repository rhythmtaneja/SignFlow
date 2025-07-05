const Signature = require('../models/Signature');
const Document = require('../models/Document');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { logAuditEvent } = require('../middleware/auditLogger');

exports.saveSignaturePosition = async (req, res) => {
  try {
    const { documentId, x, y, page, signatureType, signatureValue, displayWidth, displayHeight, status = 'pending', rejectionReason } = req.body;
    const signer = req.user.id;

    const newSignature = new Signature({
      documentId,
      signer,
      x,
      y,
      page,
      signatureType,
      signatureValue,
      displayWidth,
      displayHeight,
      status,
      rejectionReason
    });

    await newSignature.save();

    // Log audit event
    await logAuditEvent(req, 'signature_added', {
      documentId,
      signer,
      signatureType,
      x,
      y,
      page,
      status,
      rejectionReason
    });

    res.json({ msg: 'Signature saved successfully', signature: newSignature });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error saving signature' });
  }
};

exports.getAllSignatures = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all documents uploaded by the user
    const userDocuments = await Document.find({ uploadedBy: userId });
    const documentIds = userDocuments.map(doc => doc._id);
    
    // Get all signatures for these documents
    const signatures = await Signature.find({ 
      documentId: { $in: documentIds } 
    }).populate('documentId', 'originalName');
    
    res.json(signatures);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error fetching signatures' });
  }
};

exports.getDocumentSignatures = async (req, res) => {
  try {
    const { id } = req.params;
    const signatures = await Signature.find({ documentId: id });
    res.json(signatures);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error fetching signatures' });
  }
};

exports.generateSignedPDF = async (req, res) => {
  try {
    const { documentId } = req.params;
    const signerId = req.user.id;

    // Get document and signatures
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    const signatures = await Signature.find({ documentId, status: { $ne: 'rejected' } });
    if (signatures.length === 0) {
      return res.status(400).json({ msg: 'No valid signatures found for this document' });
    }

    // Read the original PDF
    const pdfPath = path.resolve(__dirname, '..', 'uploads', path.basename(document.filePath));
    const pdfBytes = await fs.readFile(pdfPath);

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Add signatures to each page
    for (const signature of signatures) {
      const pageIndex = signature.page - 1; // PDF-Lib uses 0-based indexing
      if (pageIndex < pages.length) {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        // Convert coordinates from frontend pixels to PDF points
        // Use the actual display dimensions that were saved with the signature
        // Fallback to 600px width for backward compatibility with old signatures
        const displayWidth = signature.displayWidth || 600;
        const displayHeight = signature.displayHeight || (600 * 1.414); // A4 aspect ratio
        const scaleX = width / displayWidth;
        const scaleY = height / displayHeight;
        
        const pdfX = signature.x * scaleX;
        const pdfY = height - (signature.y * scaleY); // Flip Y coordinate

        if (signature.signatureType === 'text') {
          // Add text signature
          const signatureText = signature.signatureValue || 'SIGNED';
          // For text, center it on the click point
          const textWidth = signatureText.length * 7; // Approximate text width
          const textHeight = 12; // Text size
          page.drawText(signatureText, {
            x: pdfX - (textWidth / 2),
            y: pdfY + (textHeight / 2),
            size: 12,
            color: rgb(0, 0, 0),
          });
        } else if (signature.signatureType === 'image' || signature.signatureType === 'draw') {
          // Check if signature value exists
          if (!signature.signatureValue) {
            // Fallback to text if no signature value
            const fallbackText = 'SIGNED';
            const textWidth = fallbackText.length * 7;
            const textHeight = 12;
            page.drawText(fallbackText, {
              x: pdfX - (textWidth / 2),
              y: pdfY + (textHeight / 2),
              size: 12,
              color: rgb(0, 0, 0),
            });
            continue;
          }
          try {
            // Handle image signature (base64 data URL)
            const imageData = signature.signatureValue;
            let imageBytes;
            
            if (imageData.startsWith('data:image/png;base64,')) {
              imageBytes = Buffer.from(imageData.split(',')[1], 'base64');
            } else if (imageData.startsWith('data:image/jpeg;base64,')) {
              imageBytes = Buffer.from(imageData.split(',')[1], 'base64');
            } else {
              // Assume it's already base64 without data URL prefix
              imageBytes = Buffer.from(imageData, 'base64');
            }

            // Embed the image - handle different formats
            let image;
            if (imageData.startsWith('data:image/png;base64,')) {
              image = await pdfDoc.embedPng(imageBytes);
            } else if (imageData.startsWith('data:image/jpeg;base64,')) {
              image = await pdfDoc.embedJpg(imageBytes);
            } else {
              // Default to PNG for drawn signatures
              image = await pdfDoc.embedPng(imageBytes);
            }
            
            const imageDims = image.scale(0.5); // Scale down the image

            // For images, center the signature on the click point (like frontend does with transform: translate(-50%, -50%))
            page.drawImage(image, {
              x: pdfX - (imageDims.width / 2),
              y: pdfY - (imageDims.height / 2),
              width: imageDims.width,
              height: imageDims.height,
            });
          } catch (imageError) {
            console.error('Error embedding image signature:', imageError);
            // Fallback to text if image embedding fails
            const errorText = 'SIGNED';
            const textWidth = errorText.length * 7;
            const textHeight = 12;
            page.drawText(errorText, {
              x: pdfX - (textWidth / 2),
              y: pdfY + (textHeight / 2),
              size: 12,
              color: rgb(0, 0, 0),
            });
          }
        }
      }
    }

    // Save the signed PDF
    const signedPdfBytes = await pdfDoc.save();
    
    // Generate filename for signed PDF
    const originalName = path.basename(document.originalName, '.pdf');
    const signedFileName = `${originalName}_signed_${Date.now()}.pdf`;
    const signedPdfPath = path.resolve(__dirname, '..', 'uploads', signedFileName);
    
    // Write signed PDF to disk
    await fs.writeFile(signedPdfPath, signedPdfBytes);

    // Save signed document record
    const signedDocument = new Document({
      originalName: signedFileName,
      filePath: `uploads/${signedFileName}`,
      uploadedBy: signerId,
      isSigned: true,
      originalDocument: documentId
    });
    await signedDocument.save();

    // Log audit event for document signing
    await logAuditEvent(req, 'document_signed', {
      documentId,
      signer: signerId
    });

    // Send the signed PDF with proper binary handling
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${signedFileName}"`);
    res.setHeader('Content-Length', signedPdfBytes.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(Buffer.from(signedPdfBytes));

  } catch (error) {
    console.error('Error generating signed PDF:', error);
    res.status(500).json({ msg: 'Error generating signed PDF' });
  }
};

exports.inviteSigner = async (req, res) => {
  try {
    const { documentId, email } = req.body;
    if (!documentId || !email) {
      return res.status(400).json({ msg: 'documentId and email are required' });
    }
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }
    // Generate a JWT token for public signing (valid for 7 days)
    const token = jwt.sign({ documentId, email }, process.env.JWT_SECRET || 'publicsignsecret', { expiresIn: '7d' });
    const publicLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/sign/${token}`;

    // Send email (or log for dev)
    let info;
    if (process.env.NODE_ENV === 'production') {
      // Configure your real SMTP here
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      info = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@example.com',
        to: email,
        subject: 'Sign PDF Document',
        text: `You have been invited to sign a document. Click the link: ${publicLink}`,
        html: `<p>You have been invited to sign a document.</p><p><a href="${publicLink}">${publicLink}</a></p>`
      });
    } else {
      // For dev, just log the link
      console.log(`Public signature link for ${email}: ${publicLink}`);
      info = { message: 'Link logged to console (dev mode)' };
    }
    res.json({ msg: 'Invite sent', info, publicLink });
  } catch (error) {
    console.error('Error inviting signer:', error);
    res.status(500).json({ msg: 'Error inviting signer' });
  }
};

exports.publicSignatureInfo = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'publicsignsecret');
    const { documentId, email } = decoded;
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.json({ documentId, email, document });
  } catch (error) {
    console.error('Error in publicSignatureInfo:', error);
    res.status(400).json({ msg: 'Invalid or expired link' });
  }
};

exports.savePublicSignature = async (req, res) => {
  try {
    const { token, x, y, page, signatureType, signatureValue } = req.body;
    
    if (!token || !x || !y || !page || !signatureType || !signatureValue) {
      return res.status(400).json({ msg: 'All fields are required' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'publicsignsecret');
    const { documentId, email } = decoded;

    // Verify document exists
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    // Save the signature
    const signatureData = {
      documentId,
      externalEmail: email, // Use externalEmail for public signatures
      x,
      y,
      page,
      signatureType,
      signatureValue
    };

    const newSignature = new Signature(signatureData);

    await newSignature.save();

    // Log audit event for public signature
    await logAuditEvent(req, 'signature_added', {
      documentId,
      externalEmail: email,
      signatureType,
      x,
      y,
      page
    });

    res.json({ msg: 'Signature saved successfully', signature: newSignature });
  } catch (error) {
    console.error('Error saving public signature:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ msg: 'Invalid or expired link' });
    }
    res.status(500).json({ msg: 'Server error saving signature' });
  }
};

exports.updateSignatureStatus = async (req, res) => {
  try {
    const { signatureId } = req.params;
    const { status, rejectionReason } = req.body;
    const userId = req.user.id;

    // Validate status
    if (!['pending', 'signed', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status. Must be pending, signed, or rejected' });
    }

    // Find the signature
    const signature = await Signature.findById(signatureId);
    if (!signature) {
      return res.status(404).json({ msg: 'Signature not found' });
    }

    // Check if user has permission to update this signature
    // User can update if they are the signer or the document owner
    const document = await Document.findById(signature.documentId);
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    const isSigner = signature.signer && signature.signer.toString() === userId;
    const isDocumentOwner = document.uploadedBy && document.uploadedBy.toString() === userId;
    
    if (!isSigner && !isDocumentOwner) {
      return res.status(403).json({ msg: 'You do not have permission to update this signature' });
    }

    // Validate rejection reason if status is rejected
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({ msg: 'Rejection reason is required when status is rejected' });
    }

    // Update the signature
    const updateData = { status };
    
    if (status === 'signed') {
      updateData.signedAt = new Date();
      updateData.rejectionReason = undefined;
      updateData.rejectedAt = undefined;
    } else if (status === 'rejected') {
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = rejectionReason;
      updateData.signedAt = undefined;
    } else if (status === 'pending') {
      updateData.signedAt = undefined;
      updateData.rejectedAt = undefined;
      updateData.rejectionReason = undefined;
    }

    const updatedSignature = await Signature.findByIdAndUpdate(
      signatureId,
      updateData,
      { new: true, runValidators: true }
    );

    // If signature was rejected, check if all signatures for this document are rejected
    if (status === 'rejected') {
      const allSignatures = await Signature.find({ documentId: signature.documentId });
      const allRejected = allSignatures.every(sig => sig.status === 'rejected');
      
      if (allRejected && allSignatures.length > 0) {
        // Move document to rejected folder
        try {
          const document = await Document.findById(signature.documentId);
          if (document) {
            const rejectedFolderPath = path.join(__dirname, '../uploads/rejected');
            try {
              await fs.access(rejectedFolderPath);
            } catch (error) {
              await fs.mkdir(rejectedFolderPath, { recursive: true });
            }

            const originalFilePath = path.resolve(__dirname, '..', document.filePath);
            const rejectedFilePath = path.join(rejectedFolderPath, `rejected_${document.originalName}`);
            
            try {
              await fs.copyFile(originalFilePath, rejectedFilePath);
              console.log(`Document moved to rejected folder: ${rejectedFilePath}`);
            } catch (moveError) {
              console.error('Error moving document to rejected folder:', moveError);
            }
          }
        } catch (moveError) {
          console.error('Error handling document move to rejected folder:', moveError);
        }
      }
    }

    // Log audit event
    try {
      await logAuditEvent(req, 'signature_status_updated', {
        documentId: signature.documentId,
        signer: signature.signer || signature.externalEmail,
        status,
        rejectionReason
      });
    } catch (auditError) {
      console.error('Error logging audit event:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    res.json({ 
      msg: 'Signature status updated successfully', 
      signature: updatedSignature 
    });

  } catch (error) {
    console.error('Error updating signature status:', error);
    res.status(500).json({ msg: 'Server error updating signature status' });
  }
};

exports.getSignaturesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.user.id;

    // Validate status
    if (!['pending', 'signed', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status. Must be pending, signed, or rejected' });
    }

    // Get all documents uploaded by the user
    const userDocuments = await Document.find({ uploadedBy: userId });
    const documentIds = userDocuments.map(doc => doc._id);
    
    // Get signatures with the specified status for these documents
    const signatures = await Signature.find({ 
      documentId: { $in: documentIds },
      status: status
    }).populate('documentId', 'originalName filePath')
      .populate('signer', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(signatures);
  } catch (error) {
    console.error('Error fetching signatures by status:', error);
    res.status(500).json({ msg: 'Server error fetching signatures' });
  }
};

exports.rejectDocument = async (req, res) => {
  try {
    const { documentId, rejectionReason } = req.body;
    const userId = req.user.id;

    if (!documentId || !rejectionReason) {
      return res.status(400).json({ msg: 'Document ID and rejection reason are required' });
    }

    // Verify document exists and user owns it
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    if (document.uploadedBy.toString() !== userId) {
      return res.status(403).json({ msg: 'You do not have permission to reject this document' });
    }

    // Create rejected folder if it doesn't exist
    const rejectedFolderPath = path.join(__dirname, '../uploads/rejected');
    try {
      await fs.access(rejectedFolderPath);
    } catch (error) {
      await fs.mkdir(rejectedFolderPath, { recursive: true });
    }

    // Move the original document to rejected folder
    const originalFilePath = path.resolve(__dirname, '..', document.filePath);
    const rejectedFilePath = path.join(rejectedFolderPath, `rejected_${document.originalName}`);
    
    try {
      await fs.copyFile(originalFilePath, rejectedFilePath);
      console.log(`Document moved to rejected folder: ${rejectedFilePath}`);
    } catch (moveError) {
      console.error('Error moving document to rejected folder:', moveError);
      // Continue with rejection even if move fails
    }

    // Create a rejection signature (without actual signature data)
    const rejectionSignature = new Signature({
      documentId,
      signer: userId,
      x: 0,
      y: 0,
      page: 1,
      signatureType: 'text',
      signatureValue: 'REJECTED',
      displayWidth: 600, // Default display width
      displayHeight: 848, // Default display height (A4 aspect ratio)
      status: 'rejected',
      rejectionReason: rejectionReason,
      rejectedAt: new Date()
    });

    await rejectionSignature.save();

    // Log audit event
    await logAuditEvent(req, 'document_rejected', {
      documentId,
      signer: userId,
      rejectionReason
    });

    res.json({ 
      msg: 'Document rejected successfully', 
      signature: rejectionSignature 
    });

  } catch (error) {
    console.error('Error rejecting document:', error);
    res.status(500).json({ msg: 'Server error rejecting document' });
  }
};

// Delete a signature by ID
exports.deleteSignature = async (req, res) => {
  try {
    const { signatureId } = req.params;
    const userId = req.user.id;

    // Find the signature
    const signature = await Signature.findById(signatureId);
    if (!signature) {
      return res.status(404).json({ msg: 'Signature not found' });
    }

    // Find the document
    const document = await Document.findById(signature.documentId);
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    // Only the signer or document owner can delete
    const isSigner = signature.signer && signature.signer.toString() === userId;
    const isDocumentOwner = document.uploadedBy && document.uploadedBy.toString() === userId;
    if (!isSigner && !isDocumentOwner) {
      return res.status(403).json({ msg: 'You do not have permission to delete this signature' });
    }

    await Signature.findByIdAndDelete(signatureId);

    // Optionally, log audit event
    try {
      await logAuditEvent(req, 'signature_deleted', {
        documentId: signature.documentId,
        signer: signature.signer || signature.externalEmail
      });
    } catch (auditError) {
      console.error('Error logging audit event:', auditError);
    }

    res.json({ msg: 'Signature deleted successfully' });
  } catch (error) {
    console.error('Error deleting signature:', error);
    res.status(500).json({ msg: 'Server error deleting signature' });
  }
};
