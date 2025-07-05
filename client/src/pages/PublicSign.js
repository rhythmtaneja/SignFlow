import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import SignatureDraggable from '../components/SignatureDraggable';
import SignatureInput from '../components/SignatureInput';
import { toast } from 'react-toastify';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PublicSign = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [documentInfo, setDocumentInfo] = useState(null);
  const [docUrl, setDocUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(600);
  const [showDraggable, setShowDraggable] = useState(false);
  const [showSignatureInput, setShowSignatureInput] = useState(false);
  const [signPosition, setSignPosition] = useState(null);
  const [currentSignature, setCurrentSignature] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef();

  // Fetch document info using the public token
  useEffect(() => {
    const fetchDocumentInfo = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/signatures/public/${token}`);
        if (!response.ok) {
          throw new Error('Invalid or expired link');
        }
        const data = await response.json();
        setDocumentInfo(data);
        
        // Fetch the PDF file
        const pdfResponse = await fetch(`http://localhost:5001/api/docs/file/${data.documentId}`);
        if (!pdfResponse.ok) {
          throw new Error('Failed to fetch PDF');
        }
        const blob = await pdfResponse.blob();
        setDocUrl(URL.createObjectURL(blob));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDocumentInfo();

    // Cleanup blob URL on unmount
    return () => {
      if (docUrl) URL.revokeObjectURL(docUrl);
    };
  }, [token]);

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

  // Save signature position to backend (public endpoint)
  const handleSaveSignature = async () => {
    if (!signPosition || !currentSignature || !documentInfo) return;
    
    try {
      const response = await fetch('http://localhost:5001/api/signatures/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          x: signPosition.x,
          y: signPosition.y,
          page: currentPage,
          signatureType: currentSignature.type,
          signatureValue: currentSignature.value
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Signature added successfully!');
        setShowDraggable(false);
        setShowSignatureInput(false);
        setSignPosition(null);
        setCurrentSignature(null);
      } else {
        toast.error(data.msg || 'Failed to add signature');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  // Handle drag stop
  const handleDragStop = (e, data) => {
    setSignPosition({ x: data.x, y: data.y });
  };

  // Handle signature input submission
  const handleSignatureSubmit = (signature) => {
    setCurrentSignature(signature);
    setShowSignatureInput(false);
    setShowDraggable(true);
  };

  // Navigation functions
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
    setShowDraggable(false);
    setShowSignatureInput(false);
    setSignPosition(null);
    setCurrentSignature(null);
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(numPages, prev + 1));
    setShowDraggable(false);
    setShowSignatureInput(false);
    setSignPosition(null);
    setCurrentSignature(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-500 text-black px-6 py-3 rounded-lg font-bold hover:bg-primary-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Sign Document</h1>
              <p className="text-gray-600">
                {documentInfo?.document?.originalName} • Invited as {documentInfo?.email}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSignatureInput(true)}
                className="bg-primary-500 text-black px-6 py-3 rounded-lg font-bold hover:bg-primary-600 transition-colors"
              >
                Add Signature
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div ref={containerRef} className="relative border shadow-lg w-full max-w-2xl mx-auto bg-white">
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

            {/* Draggable signature placeholder */}
            {showDraggable && currentSignature && (
              <SignatureDraggable
                signature={currentSignature}
                onDragStop={handleDragStop}
                onSave={handleSaveSignature}
                onCancel={() => {
                  setShowDraggable(false);
                  setCurrentSignature(null);
                  setSignPosition(null);
                }}
              />
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">How to sign:</h3>
            <ol className="text-blue-700 text-sm space-y-1">
              <li>1. Click "Add Signature" to create your signature</li>
              <li>2. Choose your signature type (text, draw, or upload)</li>
              <li>3. Drag the signature to the desired location on the document</li>
              <li>4. Click "Save" to place the signature</li>
              <li>5. You can add multiple signatures if needed</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Signature Input Modal */}
      {showSignatureInput && (
        <SignatureInput
          onSubmit={handleSignatureSubmit}
          onCancel={() => setShowSignatureInput(false)}
        />
      )}
    </div>
  );
};

export default PublicSign; 