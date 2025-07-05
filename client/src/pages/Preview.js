import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DocView from './DocView';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../api';

const Preview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [docUrl, setDocUrl] = useState(null);
  const [documentName, setDocumentName] = useState('');

  useEffect(() => {
    const fetchPdf = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE_URL}/api/docs/file/${id}`, {
          headers: { 'x-auth-token': token }
        });
        if (!res.ok) throw new Error('Failed to fetch PDF');
        const blob = await res.blob();
        setDocUrl(URL.createObjectURL(blob));
        
        // Also fetch document info for the name
        const docRes = await fetch(`${API_BASE_URL}/api/docs`, {
          headers: { 'x-auth-token': token }
        });
        if (docRes.ok) {
          const docs = await docRes.json();
          const doc = docs.find(d => d._id === id);
          if (doc) {
            setDocumentName(doc.originalName);
          }
        }
      } catch (err) {
        console.error('Error fetching PDF:', err);
        toast.error('Failed to load PDF file');
        setDocUrl(null);
      }
    };
    fetchPdf();
    
    // Cleanup blob URL on unmount
    return () => {
      if (docUrl) URL.revokeObjectURL(docUrl);
    };
    // eslint-disable-next-line
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-lg font-semibold text-gray-900">
                {documentName || 'Document Preview'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {docUrl ? (
          <DocView docUrl={docUrl} documentId={id} showSignButton={false} />
        ) : (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <div className="text-red-500 text-lg mb-2">Failed to load PDF file</div>
              <button
                onClick={() => window.location.reload()}
                className="text-primary-500 hover:text-primary-600 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Preview; 