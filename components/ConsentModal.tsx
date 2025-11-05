import React from 'react';

interface ConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
  title: string;
  children: React.ReactNode;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onConsent, onDecline, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="text-slate-300 mb-6 space-y-4 max-h-60 overflow-y-auto">
          {children}
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onDecline}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-md font-semibold"
          >
            Decline
          </button>
          <button
            onClick={onConsent}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold"
          >
            Agree and Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;