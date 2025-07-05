import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SignatureInput = ({ onSubmit, onCancel }) => {
  const [signatureType, setSignatureType] = useState('text'); // 'text', 'draw', 'upload'
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const signaturePadRef = useRef();

  const handleTextSubmit = () => {
    if (typedSignature.trim()) {
      onSubmit({
        type: 'text',
        value: typedSignature.trim()
      });
    }
  };

  const handleDrawSubmit = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const signatureData = signaturePadRef.current.toDataURL();
      onSubmit({
        type: 'image',
        value: signatureData
      });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = () => {
    if (uploadedImage) {
      onSubmit({
        type: 'image',
        value: uploadedImage
      });
    }
  };

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
    setTypedSignature('');
    setUploadedImage(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Add Your Signature</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Signature Type Selection */}
        <div className="mb-4">
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setSignatureType('text')}
              className={`px-4 py-2 rounded ${
                signatureType === 'text'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Type
            </button>
            <button
              onClick={() => setSignatureType('draw')}
              className={`px-4 py-2 rounded ${
                signatureType === 'draw'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Draw
            </button>
            <button
              onClick={() => setSignatureType('upload')}
              className={`px-4 py-2 rounded ${
                signatureType === 'upload'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Upload
            </button>
          </div>
        </div>

        {/* Text Signature */}
        {signatureType === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type your signature
              </label>
              <input
                type="text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Enter your name or signature"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleTextSubmit}
                disabled={!typedSignature.trim()}
                className="flex-1 bg-primary-500 text-white py-2 px-4 rounded hover:bg-primary-600 disabled:opacity-50"
              >
                Use This Signature
              </button>
            </div>
          </div>
        )}

        {/* Draw Signature */}
        {signatureType === 'draw' && (
          <div className="space-y-4">
            <div className="border border-gray-300 rounded-md">
              <SignatureCanvas
                ref={signaturePadRef}
                canvasProps={{
                  className: 'w-full h-48 border-0'
                }}
                backgroundColor="white"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={clearSignature}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleDrawSubmit}
                className="flex-1 bg-primary-500 text-white py-2 px-4 rounded hover:bg-primary-600"
              >
                Use This Signature
              </button>
            </div>
          </div>
        )}

        {/* Upload Signature */}
        {signatureType === 'upload' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload signature image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {uploadedImage && (
              <div className="border border-gray-300 rounded-md p-2">
                <img
                  src={uploadedImage}
                  alt="Uploaded signature"
                  className="max-w-full h-32 object-contain mx-auto"
                />
              </div>
            )}
            <div className="flex space-x-2">
              <button
                onClick={() => setUploadedImage(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={!uploadedImage}
                className="flex-1 bg-primary-500 text-white py-2 px-4 rounded hover:bg-primary-600 disabled:opacity-50"
              >
                Use This Signature
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignatureInput; 