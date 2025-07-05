import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FileText, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../api';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const navigate = useNavigate();

  // Get token from localStorage (assume you store it after login)
  const token = localStorage.getItem('token');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a PDF file to upload.');
      return;
    }
    if (!token) {
      toast.error('You must be logged in to upload.');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/docs/upload`, {
        method: 'POST',
        headers: {
          'x-auth-token': token
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('File uploaded successfully!');
        setFile(null);
        fileInputRef.current.value = '';
        navigate('/dashboard');
      } else {
        toast.error(data.msg || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Server error');
    }
    setUploading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary-100 to-blue-200">
      <form onSubmit={handleUpload} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col items-center">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-primary-700 flex items-center gap-2">
          <UploadCloud className="w-8 h-8 text-primary-500" /> Upload PDF
        </h2>
        <div
          className={`w-full border-2 border-dashed rounded-xl p-8 mb-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${file ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50 hover:border-primary-400'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current.click()}
        >
          {file ? (
            <div className="flex flex-col items-center">
              <FileText className="w-10 h-10 text-primary-500 mb-2" />
              <span className="text-primary-700 font-semibold">{file.name}</span>
              <span className="text-xs text-gray-500 mt-1">Click to change file</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
              <span className="text-gray-600 font-medium">Drag & drop your PDF here, or click to select</span>
              <span className="text-xs text-gray-400 mt-1">Only PDF files are allowed</span>
            </div>
          )}
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-primary-500 text-black py-3 rounded-lg font-bold text-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload PDF'}
        </button>
      </form>
      <div className="mt-8 w-full max-w-lg">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-white border-2 border-primary-500 text-primary-700 py-4 rounded-xl font-bold text-lg shadow hover:bg-primary-50 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Upload; 