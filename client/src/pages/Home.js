import React from 'react';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Secure PDF Signatures Made Simple
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Upload, sign, and share your PDF documents with enterprise-grade security and complete audit trails.
        </p>
        <div className="flex justify-center space-x-4">
          <button className="btn-primary text-lg px-8 py-3" onClick={() => navigate('/upload')}>
            Get Started
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="flex justify-center">
        <div
          className="text-center p-6 bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition"
          onClick={() => navigate('/upload')}
        >
          <Upload className="h-12 w-12 text-primary-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Easy Upload</h3>
          <p className="text-gray-600">Drag and drop your PDF files for instant processing</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
