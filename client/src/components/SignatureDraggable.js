import React from 'react';
import Draggable from 'react-draggable';

const SignatureDraggable = ({ signature, onDragStop, onSave, saving }) => {
  return (
    <div className="absolute top-20 left-20 z-50">
      <Draggable onStop={onDragStop}>
        <div className="bg-yellow-200 border-2 border-yellow-400 px-4 py-3 rounded-lg shadow-lg cursor-move min-w-[120px]">
          <div className="text-center font-semibold text-gray-800 mb-2">
            {signature.type === 'text' ? signature.value : 'Signature'}
          </div>
          <div className="text-xs text-gray-600 text-center">
            Drag to position
          </div>
        </div>
      </Draggable>
      
      <div className="mt-4 flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Signature'}
        </button>
      </div>
    </div>
  );
};

export default SignatureDraggable;
