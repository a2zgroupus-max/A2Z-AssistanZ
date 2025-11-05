import React, { useState } from 'react';
import DisclaimerModal from './DisclaimerModal';

interface DisclaimerFlowProps {
  onAccepted: () => void;
  children: React.ReactNode;
}

const DisclaimerFlow: React.FC<DisclaimerFlowProps> = ({ onAccepted, children }) => {
  const [isAccepted, setIsAccepted] = useState(false);

  if (isAccepted) {
    return <>{children}</>;
  }

  return <DisclaimerModal isOpen={true} onAccept={() => { setIsAccepted(true); onAccepted(); }} />;
};

export default DisclaimerFlow;