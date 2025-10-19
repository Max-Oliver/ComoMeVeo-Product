/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import Header from './components/Header';
import { generateVirtualTryOnImage, generatePoseVariation } from './services/geminiService';
import { FirebaseService } from './services/firebaseService';
import { OutfitLayer, WardrobeItem, TryOnSession } from './types';
import { ChevronDownIcon, ChevronUpIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import Footer from './components/Footer';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DebugPanel from './components/DebugPanel';
import { POSE_INSTRUCTIONS } from './lib/poses';

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // DEPRECATED: mediaQueryList.addListener(listener);
    mediaQueryList.addEventListener('change', listener);
    
    // Check again on mount in case it changed between initial state and effect runs
    if (mediaQueryList.matches !== matches) {
      setMatches(mediaQueryList.matches);
    }

    return () => {
      // DEPRECATED: mediaQueryList.removeListener(listener);
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query, matches]);

  return matches;
};


const AppContent: React.FC = () => {
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Create session when user logs in after uploading image
  useEffect(() => {
    const createSessionAfterLogin = async () => {
      if (user && modelImageUrl && !currentSessionId && outfitHistory.length > 0) {
        try {
          console.log('[Session] Creating session after login', {
            userId: user.uid,
            layers: outfitHistory.length,
            outfitIndex: currentOutfitIndex,
            poseIndex: currentPoseIndex,
          });

          const sessionId = await FirebaseService.createSession(
            user.uid,
            modelImageUrl,
            outfitHistory,
            currentOutfitIndex,
            currentPoseIndex
          );
          console.log('[Session] Session created after login', { sessionId });
          setCurrentSessionId(sessionId);
        } catch (error) {
          console.error('[Session] Error creating session after login', error);
        }
      }
    };

    createSessionAfterLogin();
  }, [user, modelImageUrl, currentSessionId, outfitHistory, currentOutfitIndex, currentPoseIndex]);

  const activeOutfitLayers = useMemo(() => 
    outfitHistory.slice(0, currentOutfitIndex + 1), 
    [outfitHistory, currentOutfitIndex]
  );
  
  const activeGarmentIds = useMemo(() => 
    activeOutfitLayers.map(layer => layer.garment?.id).filter(Boolean) as string[], 
    [activeOutfitLayers]
  );
  
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return modelImageUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return modelImageUrl;

    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    // Return the image for the current pose, or fallback to the first available image for the current layer.
    // This ensures an image is shown even while a new pose is generating.
    return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseIndex, modelImageUrl]);

  const availablePoseKeys = useMemo(() => {
    if (outfitHistory.length === 0) return [];
    const currentLayer = outfitHistory[currentOutfitIndex];
    return currentLayer ? Object.keys(currentLayer.poseImages) : [];
  }, [outfitHistory, currentOutfitIndex]);

  const handleModelFinalized = async (url: string) => {
    setModelImageUrl(url);
    const initialLayer = {
      garment: null,
      poseImages: { [POSE_INSTRUCTIONS[0]]: url }
    };
    setOutfitHistory([initialLayer]);
    setCurrentOutfitIndex(0);

    // Create session in Firebase if user is authenticated
    if (user) {
      try {
        const sessionId = await FirebaseService.createSession(
          user.uid,
          url,
          [initialLayer],
          0,
          0
        );
        console.log('[Session] Session created after model finalized', {
          sessionId,
          userId: user.uid,
        });
        setCurrentSessionId(sessionId);
      } catch (error) {
        console.error('[Session] Error creating session after model finalized', error);
        // Show error to user
        setError('Error creating session. Please try again.');
      }
    } else {
      console.log('[Session] User not authenticated, session will be created after login');
    }
  };

  const handleStartOver = () => {
    setModelImageUrl(null);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
    setIsSheetCollapsed(false);
    setWardrobe(defaultWardrobe);
    setCurrentSessionId(null);
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;

    // Caching: Check if we are re-applying a previously generated layer
    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id) {
        setCurrentOutfitIndex(prev => prev + 1);
        setCurrentPoseIndex(0); // Reset pose when changing layer
        return;
    }

    // Check Firebase cache for existing image
    let cachedImageUrl: string | null = null;
    if (currentSessionId) {
      try {
        console.log('[Wardrobe] Checking cache', {
          sessionId: currentSessionId,
          pose: POSE_INSTRUCTIONS[currentPoseIndex],
          garmentId: garmentInfo.id,
        });
        cachedImageUrl = await FirebaseService.isImageCached(
          currentSessionId,
          POSE_INSTRUCTIONS[currentPoseIndex],
          user.uid,
          garmentInfo.id
        );
        console.log('[Wardrobe] Cache result', {
          hit: Boolean(cachedImageUrl),
          sessionId: currentSessionId,
          garmentId: garmentInfo.id,
        });
      } catch (error) {
        console.error('Error checking cache:', error);
      }
    } else {
      console.log('[Wardrobe] Cache skipped - no active session', {
        sessionId: currentSessionId,
        hasUser: Boolean(user),
      });
    }

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Adding ${garmentInfo.name}...`);

    try {
      let newImageUrl: string;
      
      if (cachedImageUrl) {
        newImageUrl = cachedImageUrl;
        setLoadingMessage(`Loading cached ${garmentInfo.name}...`);
      } else {
        newImageUrl = await generateVirtualTryOnImage(displayImageUrl, garmentFile);
        
        // Cache the generated image
        if (currentSessionId && user) {
          try {
            await FirebaseService.cacheGeneratedImage(
              currentSessionId,
              user.uid,
              newImageUrl,
              POSE_INSTRUCTIONS[currentPoseIndex],
              garmentInfo.id
            );
          } catch (error) {
            console.error('Error caching image:', error);
          }
        }
      }

      const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
      
      const newLayer: OutfitLayer = { 
        garment: garmentInfo, 
        poseImages: { [currentPoseInstruction]: newImageUrl } 
      };

      const newHistory = outfitHistory.slice(0, currentOutfitIndex + 1);
      const updatedHistory = [...newHistory, newLayer];
      setOutfitHistory(updatedHistory);
      setCurrentOutfitIndex(prev => prev + 1);
      
      // Update session in Firebase
      if (currentSessionId && user) {
        try {
          await FirebaseService.updateSession(
            currentSessionId,
            updatedHistory,
            currentOutfitIndex + 1,
            currentPoseIndex
          );
        } catch (error) {
          console.error('Error updating session:', error);
        }
      } else {
        console.log('[Session] Skipped update - missing session or user', {
          sessionId: currentSessionId,
          hasUser: Boolean(user),
        });
      }
      
      // Add to personal wardrobe if it's not already there
      setWardrobe(prev => {
        if (prev.find(item => item.id === garmentInfo.id)) {
            return prev;
        }
        return [...prev, garmentInfo];
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, currentPoseIndex, outfitHistory, currentOutfitIndex, currentSessionId, user]);

  const handleRemoveLastGarment = () => {
    if (currentOutfitIndex > 0) {
      setCurrentOutfitIndex(prevIndex => prevIndex - 1);
      setCurrentPoseIndex(0); // Reset pose to default when removing a layer
    }
  };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];

    // If pose already exists, just update the index to show it.
    if (currentLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }

    // Check Firebase cache for existing pose
    let cachedImageUrl: string | null = null;
    if (currentSessionId && currentLayer.garment) {
      try {
        cachedImageUrl = await FirebaseService.isImageCached(
          currentSessionId,
          poseInstruction,
          user.uid,
          currentLayer.garment.id
        );
      } catch (error) {
        console.error('Error checking cache:', error);
      }
    }

    // Use an existing image from the current layer as the base.
    const baseImageForPoseChange = Object.values(currentLayer.poseImages)[0];
    if (!baseImageForPoseChange) return; // Should not happen

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);
    
    const prevPoseIndex = currentPoseIndex;
    // Optimistically update the pose index so the pose name changes in the UI
    setCurrentPoseIndex(newIndex);

    try {
      let newImageUrl: string;
      
      if (cachedImageUrl) {
        newImageUrl = cachedImageUrl;
        setLoadingMessage(`Loading cached pose...`);
      } else {
        newImageUrl = await generatePoseVariation(baseImageForPoseChange, poseInstruction);
        
        // Cache the generated image
        if (currentSessionId && user && currentLayer.garment) {
          try {
            await FirebaseService.cacheGeneratedImage(
              currentSessionId,
              user.uid,
              newImageUrl,
              poseInstruction,
              currentLayer.garment.id
            );
          } catch (error) {
            console.error('Error caching image:', error);
          }
        }
      }

      const updatedHistory = [...outfitHistory];
      updatedHistory[currentOutfitIndex].poseImages[poseInstruction] = newImageUrl;
      setOutfitHistory(updatedHistory);

      // Update session in Firebase
      if (currentSessionId && user) {
        try {
          await FirebaseService.updateSession(
            currentSessionId,
            updatedHistory,
            currentOutfitIndex,
            newIndex
          );
        } catch (error) {
          console.error('Error updating session:', error);
        }
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
      // Revert pose index on failure
      setCurrentPoseIndex(prevPoseIndex);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex, currentSessionId, user]);

  const handleSessionSelect = useCallback((session: TryOnSession) => {
    const safePoseIndex = Math.min(
      Math.max(session.currentPoseIndex ?? 0, 0),
      POSE_INSTRUCTIONS.length - 1
    );

    let normalizedHistory = session.outfitHistory ?? [];

    if (normalizedHistory.length === 0) {
      normalizedHistory = [
        {
          garment: null,
          poseImages: {
            [POSE_INSTRUCTIONS[safePoseIndex] ?? POSE_INSTRUCTIONS[0]]: session.originalImageUrl,
          },
        },
      ];
    } else {
      normalizedHistory = normalizedHistory.map((layer, index) => {
        if (index === 0 && (!layer.poseImages || Object.keys(layer.poseImages).length === 0)) {
          return {
            ...layer,
            poseImages: {
              [POSE_INSTRUCTIONS[safePoseIndex] ?? POSE_INSTRUCTIONS[0]]: session.originalImageUrl,
            },
          };
        }
        return layer;
      });
    }

    const safeOutfitIndex = Math.min(
      Math.max(session.currentOutfitIndex ?? 0, 0),
      normalizedHistory.length - 1
    );

    console.log('[SessionHistory] Loading session', {
      sessionId: session.id,
      layers: normalizedHistory.length,
      outfitIndex: safeOutfitIndex,
      poseIndex: safePoseIndex,
    });

    setModelImageUrl(session.originalImageUrl);
    setOutfitHistory(normalizedHistory);
    setCurrentOutfitIndex(safeOutfitIndex);
    setCurrentPoseIndex(safePoseIndex);
    setCurrentSessionId(session.id);
    setError(null);
    setIsLoading(false);
    setLoadingMessage('');
    setIsSheetCollapsed(false);
  }, []);

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };

  return (
    <div className="font-sans">
      <Header
        showHistory={!!user}
        onSessionSelect={handleSessionSelect}
      />
      
      {/* Debug Panel - Removed from UI, only in console logs */}
      {/* {modelImageUrl && (
        <DebugPanel
          sessionId={currentSessionId}
          outfitHistoryLength={outfitHistory.length}
          currentOutfitIndex={currentOutfitIndex}
          currentPoseIndex={currentPoseIndex}
        />
      )} */}
      <AnimatePresence mode="wait">
        {!modelImageUrl ? (
          <motion.div
            key="start-screen"
            className="w-screen min-h-screen flex items-start sm:items-center justify-center bg-gray-50 p-4 pb-20"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <StartScreen onModelFinalized={handleModelFinalized} />
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            className="relative flex flex-col h-screen bg-white overflow-hidden"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <main className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
              <div className="w-full h-full flex-grow flex items-center justify-center bg-white pb-16 relative">
                <Canvas 
                  displayImageUrl={displayImageUrl}
                  onStartOver={handleStartOver}
                  isLoading={isLoading}
                  loadingMessage={loadingMessage}
                  onSelectPose={handlePoseSelect}
                  poseInstructions={POSE_INSTRUCTIONS}
                  currentPoseIndex={currentPoseIndex}
                  availablePoseKeys={availablePoseKeys}
                  sessionId={currentSessionId || undefined}
                  currentGarmentId={outfitHistory[currentOutfitIndex]?.garment?.id}
                />
              </div>

              <aside 
                className={`absolute md:relative md:flex-shrink-0 bottom-0 right-0 h-auto md:h-full w-full md:w-1/3 md:max-w-sm bg-white/80 backdrop-blur-md flex flex-col border-t md:border-t-0 md:border-l border-gray-200/60 transition-transform duration-500 ease-in-out ${isSheetCollapsed ? 'translate-y-[calc(100%-4.5rem)]' : 'translate-y-0'} md:translate-y-0`}
                style={{ transitionProperty: 'transform' }}
              >
                  <button 
                    onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} 
                    className="md:hidden w-full h-8 flex items-center justify-center bg-gray-100/50"
                    aria-label={isSheetCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    {isSheetCollapsed ? <ChevronUpIcon className="w-6 h-6 text-gray-500" /> : <ChevronDownIcon className="w-6 h-6 text-gray-500" />}
                  </button>
                  <div className="p-4 md:p-6 pb-20 overflow-y-auto flex-grow flex flex-col gap-8">
                    {error && (
                      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                      </div>
                    )}
                    <OutfitStack 
                      outfitHistory={activeOutfitLayers}
                      onRemoveLastGarment={handleRemoveLastGarment}
                    />
                    <WardrobePanel
                      onGarmentSelect={handleGarmentSelect}
                      activeGarmentIds={activeGarmentIds}
                      isLoading={isLoading}
                      wardrobe={wardrobe}
                    />
                  </div>
              </aside>
            </main>
            <AnimatePresence>
              {isLoading && isMobile && (
                <motion.div
                  className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Spinner />
                  {loadingMessage && (
                    <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">{loadingMessage}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer isOnDressingScreen={!!modelImageUrl} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;