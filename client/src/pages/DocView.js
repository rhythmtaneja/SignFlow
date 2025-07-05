import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { Pen, Upload, Type, Download, X, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import RejectionModal from '../components/RejectionModal';
import API_BASE_URL from '../api';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const DocView = ({ docUrl, documentId, showSignButton }) => {
  const navigate = useNavigate();
  const [signatures, setSignatures] = useState([]);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(600);
  const [currentSignature, setCurrentSignature] = useState(null);
  const [signPosition, setSignPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showSignatureOptions, setShowSignatureOptions] = useState(false);
  const [signatureType, setSignatureType] = useState(null);
  const [signatureValue, setSignatureValue] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const containerRef = useRef();
  const canvasRef = useRef();
  const fileInputRef = useRef();

  // Fetch signatures for this document
  const fetchSignatures = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/signatures/${documentId}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      setSignatures(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching signatures:', error);
    }
  }, [documentId]);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  // Reset to page 1 when document changes
  useEffect(() => {
    setCurrentPage(1);
  }, [docUrl]);

  // Responsive width for PDF preview
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setPageWidth(Math.min(600, containerRef.current.offsetWidth - 32));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle signature type selection
  const handleSignatureTypeSelect = (type) => {
    setSignatureType(type);
    setShowSignatureOptions(true);
    setSignatureValue('');
    setUploadedImage(null);
  };

  // Handle text signature
  const handleTextSignature = () => {
    if (!signatureValue.trim()) {
      toast.error('Please enter your signature text');
      return;
    }
    setCurrentSignature({
      type: 'text',
      value: signatureValue,
      display: signatureValue
    });
    setShowSignatureOptions(false);
    setIsDragging(true);
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
        setCurrentSignature({
          type: 'image',
          value: event.target.result,
          display: 'Uploaded Signature'
        });
        setShowSignatureOptions(false);
        setIsDragging(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drawing signature
  const handleDrawingComplete = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL();
      setCurrentSignature({
        type: 'draw',
        value: dataURL,
        display: 'Drawn Signature'
      });
      setShowSignatureOptions(false);
      setIsDragging(true);
    }
  };

  // Save signature to backend with status
  const handleSaveSignature = async (status = 'signed', rejectionReason = null) => {
    if (!signPosition || !currentSignature) {
      toast.error('Please place your signature on the document first');
      return;
    }
    
    setSaving(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/signatures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          documentId,
          x: signPosition.x,
          y: signPosition.y,
          page: currentPage,
          signatureType: currentSignature.type,
          signatureValue: currentSignature.value,
          status: status,
          rejectionReason: rejectionReason,
          // Send the actual display dimensions for proper scaling
          displayWidth: pageWidth,
          displayHeight: pageWidth * 1.414 // Approximate aspect ratio for A4
        })
      });

      const data = await response.json();
      
      if (data.signature) {
        const statusMessage = status === 'signed' ? 'Signature saved successfully!' : 
                            status === 'rejected' ? 'Signature rejected!' : 
                            'Signature saved as pending!';
        toast.success(statusMessage);
        setIsDragging(false);
        setCurrentSignature(null);
        setSignPosition(null);
        setSignatureType(null);
        setSignatureValue('');
        setUploadedImage(null);
        fetchSignatures();
      } else {
        toast.error(data.msg || 'Failed to save signature');
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('Failed to save signature');
    } finally {
      setSaving(false);
    }
  };

  // Handle reject signature
  const handleRejectSignature = () => {
    setShowRejectionModal(true);
  };

  // Handle rejecting existing signature
  const handleRejectExistingSignature = async (signatureId) => {
    const rejectionReason = prompt('Please provide a reason for rejecting this signature:');
    if (!rejectionReason || !rejectionReason.trim()) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/signatures/${signatureId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: rejectionReason.trim()
        })
      });

      if (response.ok) {
        toast.success('Signature rejected successfully!');
        fetchSignatures();
      } else {
        const error = await response.json();
        toast.error(error.msg || 'Failed to reject signature');
      }
    } catch (error) {
      console.error('Error rejecting signature:', error);
      toast.error('Server error rejecting signature');
    }
  };

  // Handle signature rejection (save signature as rejected)
  const handleRejectSignatureWithReason = async (rejectionReason) => {
    if (!signPosition || !currentSignature) {
      toast.error('Please place your signature on the document first');
      return;
    }
    
    setSaving(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/signatures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          documentId,
          x: signPosition.x,
          y: signPosition.y,
          page: currentPage,
          signatureType: currentSignature.type,
          signatureValue: currentSignature.value,
          status: 'rejected',
          rejectionReason: rejectionReason,
          displayWidth: pageWidth,
          displayHeight: pageWidth * 1.414
        })
      });

      const data = await response.json();
      
      if (data.signature) {
        toast.success('Signature rejected successfully!');
        // Clear all signature-related state
        setIsDragging(false);
        setCurrentSignature(null);
        setSignPosition(null);
        setSignatureType(null);
        setSignatureValue('');
        setUploadedImage(null);
        setShowSignatureOptions(false);
        // Refresh signatures
        fetchSignatures();
      } else {
        toast.error(data.msg || 'Failed to reject signature');
      }
    } catch (error) {
      console.error('Error rejecting signature:', error);
      toast.error('Failed to reject signature');
    } finally {
      setSaving(false);
    }
  };

  // Note: handleRejectDocument function removed as it's not used in the current implementation

  // Download signed PDF
  const handleDownloadPDF = async () => {
    setDownloading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/signatures/generate/${documentId}`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signed_document.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Signed PDF downloaded successfully!');
      } else {
        const data = await response.json();
        toast.error(data.msg || 'Failed to download signed PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download signed PDF');
    } finally {
      setDownloading(false);
    }
  };

  // Navigation functions
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
    setIsDragging(false);
    setCurrentSignature(null);
    setSignPosition(null);
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(numPages, prev + 1));
    setIsDragging(false);
    setCurrentSignature(null);
    setSignPosition(null);
  };

  // Drawing functionality
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingContext, setDrawingContext] = useState(null);

  useEffect(() => {
    if (canvasRef.current && signatureType === 'draw') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      setDrawingContext(ctx);
    }
  }, [signatureType]);

  const startDrawing = (e) => {
    if (signatureType === 'draw' && drawingContext) {
      setIsDrawing(true);
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      drawingContext.beginPath();
      drawingContext.moveTo(x, y);
    }
  };

  const draw = (e) => {
    if (isDrawing && drawingContext) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      drawingContext.lineTo(x, y);
      drawingContext.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div ref={containerRef} className="relative border shadow-lg w-full max-w-4xl mx-auto bg-white">
      {/* Signature Options Bar - Directly above document */}
      <div className="bg-gray-50 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Add Signature</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleSignatureTypeSelect('draw')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <Pen className="w-4 h-4" />
                Draw
              </button>
              <button
                onClick={() => handleSignatureTypeSelect('upload')}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
              <button
                onClick={() => handleSignatureTypeSelect('text')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                <Type className="w-4 h-4" />
                Type
              </button>
            </div>
          </div>
          
          {signatures.filter(sig => sig.status !== 'rejected').length > 0 && (
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-black rounded font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download Signed PDF'}
            </button>
          )}
        </div>
      </div>

      {/* Signature Options Modal */}
      {showSignatureOptions && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {signatureType === 'draw' && 'Draw Your Signature'}
                {signatureType === 'upload' && 'Upload Signature Image'}
                {signatureType === 'text' && 'Type Your Signature'}
              </h3>
              <button
                onClick={() => setShowSignatureOptions(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {signatureType === 'draw' && (
              <div className="space-y-4">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="border border-gray-300 rounded cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDrawingComplete}
                    className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                  >
                    Use This Signature
                  </button>
                  <button
                    onClick={() => {
                      if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        ctx.clearRect(0, 0, 400, 200);
                      }
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {signatureType === 'upload' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-500 file:text-black hover:file:bg-primary-600"
                />
                {uploadedImage && (
                  <div className="text-center">
                    <img src={uploadedImage} alt="Uploaded signature" className="max-w-full h-32 object-contain mx-auto" />
                  </div>
                )}
              </div>
            )}

            {signatureType === 'text' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={signatureValue}
                  onChange={(e) => setSignatureValue(e.target.value)}
                  placeholder="Enter your signature text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleTextSignature}
                  className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600"
                >
                  Use This Signature
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {numPages > 1 && (
        <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-primary-500 text-black rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600"
          >
            Previous
          </button>
          <span className="text-gray-700">
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="px-4 py-2 bg-primary-500 text-black rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600"
          >
            Next
          </button>
        </div>
      )}

      {/* PDF Document */}
      <div className="relative min-h-[700px]">
        <Document
          file={docUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="text-center py-8">Loading PDF...</div>}
        >
          <Page
            pageNumber={currentPage}
            width={pageWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>

        {/* Existing signatures for current page */}
        {Array.isArray(signatures) && signatures
          .filter(sig => sig.page === currentPage && sig.status !== 'rejected')
          .map(sig => (
            <div
              key={sig._id}
              className="absolute group"
              style={{
                top: `${sig.y}px`,
                left: `${sig.x}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 1000
              }}
            >
              {sig.signatureType === 'text' && (
                <div className="text-lg font-bold text-gray-800 relative" style={{ background: 'transparent' }}>
                  {sig.signatureValue}
                  {/* Reject button for existing signatures */}
                  <button
                    onClick={() => handleRejectExistingSignature(sig._id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Reject signature"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {sig.signatureType === 'image' && (
                <div className="relative">
                  <img 
                    src={sig.signatureValue} 
                    alt="Signature" 
                    className="max-w-32 max-h-16 object-contain"
                    style={{ background: 'transparent' }}
                  />
                  {/* Reject button for existing signatures */}
                  <button
                    onClick={() => handleRejectExistingSignature(sig._id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Reject signature"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {sig.signatureType === 'draw' && (
                <div className="relative">
                  <img 
                    src={sig.signatureValue} 
                    alt="Drawn signature" 
                    className="max-w-32 max-h-16 object-contain"
                    style={{ background: 'transparent' }}
                  />
                  {/* Reject button for existing signatures */}
                  <button
                    onClick={() => handleRejectExistingSignature(sig._id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Reject signature"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}

        {/* Draggable signature */}
        {isDragging && currentSignature && (
          <div
            className="absolute cursor-move z-50"
            style={{
              top: signPosition?.y || 100,
              left: signPosition?.x || 100,
              transform: 'translate(-50%, -50%)'
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startY = e.clientY;
              const startPosX = signPosition?.x || 100;
              const startPosY = signPosition?.y || 100;
              
              const handleMouseMove = (moveEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                setSignPosition({
                  x: startPosX + deltaX,
                  y: startPosY + deltaY
                });
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            {currentSignature.type === 'image' && (
              <img 
                src={currentSignature.value} 
                alt="Signature" 
                className="max-w-32 max-h-16 object-contain cursor-move"
                style={{ background: 'transparent' }}
              />
            )}
            {currentSignature.type === 'text' && (
              <div className="text-lg font-bold text-gray-800 cursor-move" style={{ background: 'transparent' }}>
                {currentSignature.value}
              </div>
            )}
            {currentSignature.type === 'draw' && (
              <img 
                src={currentSignature.value} 
                alt="Drawn signature" 
                className="max-w-32 max-h-16 object-contain cursor-move"
                style={{ background: 'transparent' }}
              />
            )}
            
            {/* Save and Reject buttons */}
            <div className="mt-2 flex gap-2 justify-center">
              <button
                onClick={() => handleSaveSignature('signed')}
                disabled={saving}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleRejectSignature}
                disabled={saving}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                {saving ? 'Saving...' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        onReject={handleRejectSignatureWithReason}
        rejectionType="signature"
      />
    </div>
  );
};

export default DocView;