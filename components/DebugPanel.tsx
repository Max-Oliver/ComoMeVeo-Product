import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface DebugPanelProps {
  sessionId: string | null;
  outfitHistoryLength: number;
  currentOutfitIndex: number;
  currentPoseIndex: number;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  sessionId,
  outfitHistoryLength,
  currentOutfitIndex,
  currentPoseIndex
}) => {
  const { user } = useAuth();

  return (
    <div className="fixed top-20 left-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="font-bold mb-2">Debug Info</div>
      <div>User: {user ? `${user.email} (${user.uid.slice(0, 8)}...)` : 'Not authenticated'}</div>
      <div>Session ID: {sessionId ? `${sessionId.slice(0, 8)}...` : 'None'}</div>
      <div>Outfit History: {outfitHistoryLength} layers</div>
      <div>Current Outfit: {currentOutfitIndex}</div>
      <div>Current Pose: {currentPoseIndex}</div>
      <div className="mt-2 text-xs text-gray-300">
        Check console for detailed logs
      </div>
    </div>
  );
};

export default DebugPanel;

