import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FirebaseService } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';

interface FeedbackPanelProps {
  sessionId: string;
  imageUrl: string;
  poseInstruction: string;
  garmentId?: string;
  onFeedbackSubmitted?: () => void;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  sessionId,
  imageUrl,
  poseInstruction,
  garmentId,
  onFeedbackSubmitted
}) => {
  const [rating, setRating] = useState<'like' | 'dislike' | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!rating || !user) return;

    setIsSubmitting(true);
    try {
      await FirebaseService.submitFeedback(
        sessionId,
        user.uid,
        imageUrl,
        poseInstruction,
        rating,
        comment ?? null,
        garmentId ?? null
      );
      setIsSubmitted(true);
      onFeedbackSubmitted?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        className="bg-green-50 border border-green-200 rounded-lg p-4 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-green-600 text-lg mb-2">✓</div>
        <p className="text-green-800 font-medium">Thank you for your feedback!</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h3 className="text-lg font-medium text-gray-800 mb-4">
        How do you like this look?
      </h3>

      {/* Rating buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setRating('like')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
            rating === 'like'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 hover:border-green-300 text-gray-600'
          }`}
        >
          <motion.div
            animate={{ scale: rating === 'like' ? 1.2 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z" />
            </svg>
          </motion.div>
          <span className="font-medium">Love it!</span>
        </button>

        <button
          onClick={() => setRating('dislike')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
            rating === 'dislike'
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-gray-200 hover:border-red-300 text-gray-600'
          }`}
        >
          <motion.div
            animate={{ scale: rating === 'dislike' ? 1.2 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.73 5.25h1.035A7.465 7.465 0 0118 9.375a7.465 7.465 0 01-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 01-.75.75 2.25 2.25 0 01-2.25-2.25c0-1.152.26-2.243.723-3.218C7.74 15.724 7.366 15 6.748 15H3.622c-1.026 0-1.945-.694-2.054-1.715A12.137 12.137 0 011.5 12c0-.718.055-1.422.068-2.173.109-1.021.1.028-1.054 1.715H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 00-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z" />
            </svg>
          </motion.div>
          <span className="font-medium">Not for me</span>
        </button>
      </div>

      {/* Comment input */}
      <div className="mb-4">
        <label htmlFor="feedback-comment" className="block text-sm font-medium text-gray-700 mb-2">
          Tell us more (optional)
        </label>
        <textarea
          id="feedback-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What would you change? Any suggestions?"
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all resize-none"
          rows={3}
        />
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!rating || isSubmitting}
        className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </motion.div>
  );
};

export default FeedbackPanel;
