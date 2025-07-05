import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, ArrowLeft, Download, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';

function parseJwt (token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) { return null; }
}

const SignaturesByStatus = () => {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const { status } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = parseJwt(token);

  useEffect(() => {
    fetchSignaturesByStatus();
  }, [status]);

  const fetchSignaturesByStatus = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/signatures/status/${status}`, {
        headers: { 'x-auth-token': token }
      });
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setSignatures(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching signatures:', error);
      toast.error('Failed to fetch signatures');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPDF = (doc, signatureStatus) => {
    try {
      let pdfUrl;
      const docId = doc._id || doc;
      
      if (signatureStatus === 'signed') {
        // Open signed PDF in new tab
        pdfUrl = `http://localhost:5001/api/signatures/generate/${docId}/view`;
      } else {
        // Open original PDF for pending/rejected
        pdfUrl = `http://localhost:5001/api/docs/file/${docId}/view`;
      }

      // Add token to URL for authentication
      const urlWithToken = `${pdfUrl}?token=${encodeURIComponent(token)}`;
      
      // Open in new tab
      window.open(urlWithToken, '_blank');
      
      const statusMessage = signatureStatus === 'signed' ? 'Opening signed PDF...' : 'Opening PDF...';
      toast.info(statusMessage);
    } catch (error) {
      console.error('Error opening PDF:', error);
      toast.error('Failed to open PDF');
    }
  };

  const handleDownloadPDF = async (doc, signatureStatus) => {
    try {
      let response;
      const docId = doc._id || doc;
      
      if (signatureStatus === 'signed') {
        // Download signed PDF
        response = await fetch(`http://localhost:5001/api/signatures/generate/${docId}`, {
          headers: { 'x-auth-token': token }
        });
      } else {
        // Download original PDF for pending/rejected
        response = await fetch(`http://localhost:5001/api/docs/file/${docId}`, {
          headers: { 'x-auth-token': token }
        });
      }

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set appropriate filename based on status
      const baseName = doc.originalName.replace('.pdf', '');
      if (signatureStatus === 'signed') {
        link.download = `${baseName}_signed.pdf`;
      } else {
        link.download = doc.originalName;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const statusMessage = signatureStatus === 'signed' ? 'Signed PDF downloaded successfully!' : 'PDF downloaded successfully!';
      toast.success(statusMessage);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleDeleteSignature = async (signatureId) => {
    if (!window.confirm('Are you sure you want to delete this signature? This action cannot be undone.')) return;
    try {
      const response = await fetch(`http://localhost:5001/api/signatures/${signatureId}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      if (response.ok) {
        toast.success('Signature deleted successfully!');
        fetchSignaturesByStatus();
      } else {
        const error = await response.json();
        toast.error(error.msg || 'Failed to delete signature');
      }
    } catch (error) {
      toast.error('Server error');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'pending':
        return <Clock className="w-6 h-6 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'signed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'signed':
        return 'Signed Documents';
      case 'rejected':
        return 'Rejected Documents';
      case 'pending':
        return 'Pending Documents';
      default:
        return 'Documents';
    }
  };

  // Group signatures by document to avoid duplicates
  const groupedSignatures = signatures.reduce((acc, signature) => {
    const docId = signature.documentId?._id || signature.documentId;
    if (!acc[docId]) {
      acc[docId] = {
        document: signature.documentId,
        signatures: []
      };
    }
    acc[docId].signatures.push(signature);
    return acc;
  }, {});

  const documentGroups = Object.values(groupedSignatures);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <h1 className="text-3xl font-bold text-gray-900">{getStatusTitle()}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}>
              {documentGroups.length} {documentGroups.length === 1 ? 'document' : 'documents'}
            </span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading {status} documents...</p>
          </div>
        ) : documentGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {getStatusIcon()}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {status} documents</h3>
            <p className="text-gray-600">You don't have any {status} documents yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {documentGroups.map(({ document, signatures: docSignatures }) => (
              <div key={document._id} className="bg-white rounded-lg shadow-md border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      status === 'signed' ? 'bg-green-100 text-green-800' :
                      status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(document?.uploadDate || document?.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">Document:</span>
                    <p className="text-gray-600 truncate">
                      {document?.originalName || 'Unknown Document'}
                    </p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Signatures:</span>
                    <p className="text-gray-600">{docSignatures.length} signature{docSignatures.length !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Show signature details */}
                  {docSignatures.map((signature, index) => (
                    <div key={signature._id} className="p-2 bg-gray-50 rounded border-l-4 border-gray-300">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Signer:</span> {signature.signer?.name || signature.externalEmail || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Type:</span> {signature.signatureType}
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Location:</span> Page {signature.page}
                      </div>
                      {signature.rejectionReason && (
                        <div className="mt-1 p-1 bg-red-50 border border-red-200 rounded">
                          <span className="text-xs font-medium text-red-700">Rejection Reason:</span>
                          <p className="text-xs text-red-600">{signature.rejectionReason}</p>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        {/* Only show delete button if user is signer or document owner */}
                        {(user && (signature.signer?._id === user.id || document.uploadedBy === user.id)) && (
                          <button
                            onClick={() => handleDeleteSignature(signature._id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            <XCircle className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleOpenPDF(document, status)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {status === 'signed' ? 'View Signed PDF' : 'View PDF'}
                  </button>
                  
                  <button
                    onClick={() => handleDownloadPDF(document, status)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SignaturesByStatus; 