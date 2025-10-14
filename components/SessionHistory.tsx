import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FirebaseService } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import { TryOnSession } from '../types';

interface SessionHistoryProps {
  onSessionSelect?: (session: TryOnSession) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({
  onSessionSelect,
  isOpen,
  onClose,
}) => {
  const [sessions, setSessions] = useState<TryOnSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      loadSessions();
    }
  }, [isOpen, user]);

  const loadSessions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userSessions = await FirebaseService.getUserSessions(user.uid);
      setSessions(userSessions);
    } catch (err: any) {
      if (err?.code === 'failed-precondition') {
        console.warn('Index faltante; usando fallback sin orderBy.');
        const userSessions = await FirebaseService.getUserSessions(user.uid, { noOrder: true }); // <-- importante
        // Ordeno en cliente por updatedAt desc
        userSessions.sort((a, b) =>
          (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0)
        );
        setSessions(userSessions);
      } else {
        console.error('Error loading sessions:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getCurrentImage = (session: TryOnSession) => {
    if (session.outfitHistory.length === 0) return session.originalImageUrl;

    const currentLayer = session.outfitHistory[session.currentOutfitIndex];
    if (!currentLayer) return session.originalImageUrl;

    const poseInstruction =
      Object.keys(currentLayer.poseImages)[session.currentPoseIndex] ||
      Object.keys(currentLayer.poseImages)[0];

    return currentLayer.poseImages[poseInstruction] || session.originalImageUrl;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif tracking-widest text-gray-800">
                Your Styling History
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                <span className="ml-3 text-gray-600">
                  Loading your sessions...
                </span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👗</div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  No sessions yet
                </h3>
                <p className="text-gray-500">
                  Start creating outfits to see your history here!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      onSessionSelect?.(session);
                      onClose();
                    }}
                  >
                    <div className="aspect-square bg-gray-200 relative overflow-hidden">
                      <img
                        src={getCurrentImage(session)}
                        alt="Session preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-700">
                        {session.outfitHistory.length} items
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-gray-500 mb-1">
                        {formatDate(session.updatedAt)}
                      </p>
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">
                        {session.outfitHistory.length > 0
                          ? session.outfitHistory[session.currentOutfitIndex]
                              ?.garment?.name || 'Base outfit'
                          : 'Base model'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {sessions.length > 0 && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500 text-center">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''}{' '}
                found
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SessionHistory;
