import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const SignatureStatusModal = ({ isOpen, onClose, signature, onStatusUpdate }) => {
  const [status, setStatus] = useState(signature?.status || 'pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/signatures/${signature._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          rejectionReason: status === 'rejected' ? rejectionReason : undefined
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Signature status updated successfully!');
        onStatusUpdate(data.signature);
        onClose();
      } else {
        toast.error(data.msg || 'Failed to update signature status');
      }
    } catch (error) {
      toast.error('Server error');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
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

  if (!isOpen || !signature) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-primary-500 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        
        <h3 className="text-lg font-bold mb-4">Update Signature Status</h3>
        
        {/* Current Signature Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(signature.status)}
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(signature.status)}`}>
              {signature.status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            <strong>Signer:</strong> {signature.signer?.name || signature.externalEmail || 'Unknown'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Type:</strong> {signature.signatureType}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Location:</strong> Page {signature.page}, ({signature.x}, {signature.y})
          </p>
          {signature.rejectionReason && (
            <p className="text-sm text-red-600 mt-2">
              <strong>Rejection Reason:</strong> {signature.rejectionReason}
            </p>
          )}
        </div>

        {/* Status Update Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="pending">Pending</option>
              <option value="signed">Signed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {status === 'rejected' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows="3"
                placeholder="Please provide a reason for rejection..."
                required
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={updating}
              className="flex-1 bg-primary-500 text-black px-4 py-2 rounded font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Status'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignatureStatusModal; 