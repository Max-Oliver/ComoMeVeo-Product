import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { TryOnSession, Feedback, GeneratedImage, OutfitLayer } from '../types';

export class FirebaseService {
  // Helper function to convert Firestore data back to OutfitLayer format
  private static convertFirestoreToOutfitLayer(
    firestoreData: any
  ): OutfitLayer {
    return {
      garment: firestoreData.garment
        ? {
            id: firestoreData.garment.id,
            name: firestoreData.garment.name,
            url: firestoreData.garment.url,
          }
        : null,
      poseImages: firestoreData.poseImages,
    };
  }

  // Helper function to upload base64 image to Firebase Storage
  static async uploadBase64Image(
    base64Url: string,
    path: string
  ): Promise<string> {
    try {
      // Convert base64 to blob
      const response = await fetch(base64Url);
      const blob = await response.blob();

      // Create storage reference
      const storageRef = ref(storage, path);

      // Upload the blob
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      console.log('Image uploaded to Storage:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image to Storage:', error);
      throw error;
    }
  }

  // Session management
  static async createSession(
    userId: string,
    originalImageUrl: string,
    outfitHistory: OutfitLayer[],
    currentOutfitIndex: number = 0,
    currentPoseIndex: number = 0
  ): Promise<string> {
    try {
      console.log('Creating session with data:', {
        userId,
        originalImageUrl: originalImageUrl.substring(0, 100) + '...', // Log only first 100 chars
        outfitHistoryLength: outfitHistory.length,
        currentOutfitIndex,
        currentPoseIndex,
      });

      // Check if the URL is a base64 data URL and upload to Storage if needed
      let finalImageUrl = originalImageUrl;
      if (originalImageUrl.startsWith('data:')) {
        console.log('Detected base64 image, uploading to Storage...');
        const timestamp = Date.now();
        const imagePath = `sessions/${userId}/original-image-${timestamp}.jpg`;
        finalImageUrl = await this.uploadBase64Image(
          originalImageUrl,
          imagePath
        );
      }

      const firestoreOutfitHistory = outfitHistory.map(
        FirebaseService.normalizeLayer
      );

      const sessionDataRaw = {
        userId,
        originalImageUrl: finalImageUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        outfitHistory: firestoreOutfitHistory,
        currentOutfitIndex: Number.isFinite(currentOutfitIndex)
          ? currentOutfitIndex
          : 0,
        currentPoseIndex: Number.isFinite(currentPoseIndex)
          ? currentPoseIndex
          : 0,
      };

      console.log('🔧 DEBUG: Converting outfitHistory for Firestore:', {
        originalLength: outfitHistory.length,
        convertedLength: firestoreOutfitHistory.length,
        firstLayer: firestoreOutfitHistory[0],
      });

      const sessionData = FirebaseService.deepClean(sessionDataRaw); // <— evita undefined
      const docRef = await addDoc(collection(db, 'sessions'), sessionData);
      console.log('Session created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error in createSession:', error);
      throw error;
    }
  }

  static async updateSession(
    sessionId: string,
    outfitHistory: OutfitLayer[],
    currentOutfitIndex: number,
    currentPoseIndex: number
  ): Promise<void> {
    try {
      console.log(
        '🔧 DEBUG: Updating session:',
        sessionId,
        'with index:',
        currentOutfitIndex
      );

      const firestoreOutfitHistory = outfitHistory.map(
        FirebaseService.normalizeLayer
      );

      console.log('🔧 DEBUG: Converting outfitHistory for update:', {
        originalLength: outfitHistory.length,
        convertedLength: firestoreOutfitHistory.length,
      });

      await updateDoc(
        doc(db, 'sessions', sessionId),
        FirebaseService.deepClean({
          outfitHistory: firestoreOutfitHistory,
          currentOutfitIndex,
          currentPoseIndex,
          updatedAt: serverTimestamp(),
        })
      );

      console.log('✅ DEBUG: Session updated successfully');
    } catch (error) {
      console.error('❌ DEBUG: Error updating session:', error);
      throw error;
    }
  }

  
static async getUserSessions(
  userId: string,
  opts?: { noOrder?: boolean }
): Promise<TryOnSession[]> {
  const constraints: QueryConstraint[] = [ where('userId', '==', userId) ];
  if (!opts?.noOrder) constraints.push(orderBy('updatedAt', 'desc'));
  constraints.push(limit(20));

  const q = query(collection(db, 'sessions'), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();

    // ✅ seguro ante serverTimestamp() y tipos raros
    const createdAt: Date =
      (data.createdAt instanceof Timestamp && data.createdAt.toDate()) ||
      data.createdAt?.toDate?.() ||
      new Date(0);

    const updatedAt: Date =
      (data.updatedAt instanceof Timestamp && data.updatedAt.toDate()) ||
      data.updatedAt?.toDate?.() ||
      createdAt; // fallback razonable

    return {
      id: d.id,
      userId: data.userId,
      originalImageUrl: data.originalImageUrl,
      createdAt,
      updatedAt,
      outfitHistory: (data.outfitHistory ?? []).map((layer: any) =>
        this.convertFirestoreToOutfitLayer(layer)
      ),
      currentOutfitIndex: Number(data.currentOutfitIndex ?? 0),
      currentPoseIndex: Number(data.currentPoseIndex ?? 0),
    } as TryOnSession;
  });
}
  


  // Feedback management
  static async submitFeedback(
    sessionId: string,
    userId: string,
    imageUrl: string,
    poseInstruction: string,
    rating: 'like' | 'dislike',
    comment?: string,
    garmentId?: string
  ): Promise<string> {
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:')) {
      const timestamp = Date.now();
      const imagePath = `feedback/${userId}/${sessionId}/${rating}-${timestamp}.jpg`;
      finalImageUrl = await this.uploadBase64Image(imageUrl, imagePath);
    }

    const feedbackData = {
      sessionId,
      userId,
      imageUrl: finalImageUrl,
      poseInstruction,
      rating,
      // 👇👇 normalizamos undefined -> null
      garmentId: garmentId ?? null,
      comment: comment ?? null,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'feedback'), feedbackData);
    return docRef.id;
  }

  // Image caching
  static async cacheGeneratedImage(
    sessionId: string,
    userId: string,
    imageUrl: string,
    poseInstruction: string,
    garmentId?: string
  ): Promise<string> {
    try {
      console.log(
        'Caching image for session:',
        sessionId,
        'pose:',
        poseInstruction,
        'garment:',
        garmentId
      );

      // Check if the URL is a base64 data URL and upload to Storage if needed
      let finalImageUrl = imageUrl;
      if (imageUrl.startsWith('data:')) {
        console.log(
          'Detected base64 image for caching, uploading to Storage...'
        );
        const timestamp = Date.now();
        const imagePath = `generated-images/${userId}/${sessionId}/${poseInstruction}-${
          garmentId || 'base'
        }-${timestamp}.jpg`;
        finalImageUrl = await this.uploadBase64Image(imageUrl, imagePath);
      }

      const imageData = {
        sessionId,
        userId,
        imageUrl: finalImageUrl,
        poseInstruction,
        garmentId,
        isCached: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'generatedImages'), imageData);
      console.log('Image cached successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error caching image:', error);
      throw error;
    }
  }

  static async getSessionFeedback(
    sessionId: string,
    userId: string
  ): Promise<Feedback[]> {
    const q = query(
      collection(db, 'feedback'),
      where('userId', '==', userId), // Fixed: was 'uid'
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'desc')
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt:
        (d.data().createdAt as Timestamp | undefined)?.toDate() ?? new Date(0),
    })) as Feedback[];
  }

  static async getCachedImages(
    sessionId: string,
    poseInstruction: string,
    userId: string,
    garmentId?: string
  ): Promise<GeneratedImage[]> {
    let q = query(
      collection(db, 'generatedImages'),
      where('userId', '==', userId), // Fixed: was 'uid'
      where('sessionId', '==', sessionId),
      where('poseInstruction', '==', poseInstruction),
      where('isCached', '==', true)
    );

    if (garmentId) q = query(q, where('garmentId', '==', garmentId));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt:
        (d.data().createdAt as Timestamp | undefined)?.toDate() ?? new Date(0),
    })) as GeneratedImage[];
  }

  // Check if image already exists in cache
  static async isImageCached(
    sessionId: string,
    poseInstruction: string,
    userId: string,
    garmentId?: string
  ): Promise<string | null> {
    const cachedImages = await this.getCachedImages(
      sessionId,
      poseInstruction,
      userId,
      garmentId
    );
    return cachedImages.length > 0 ? cachedImages[0].imageUrl : null;
  }

  // Normaliza un OutfitLayer a algo 100% escribible en Firestore
  static normalizeLayer(layer: OutfitLayer) {
    return {
      garment: layer.garment
        ? {
            id: String(layer.garment.id ?? ''),
            name: String(layer.garment.name ?? ''),
            url: String(layer.garment.url ?? ''),
          }
        : null,
      // solo strings válidos, sin undefined/null/objetos
      poseImages: (Array.isArray(layer.poseImages)
        ? layer.poseImages
        : []
      ).filter((v): v is string => typeof v === 'string' && v.length > 0),
    };
  }

  // Limpia undefined recursivamente (Firestore no lo admite)
  static deepClean<T>(val: T): T {
    if (Array.isArray(val)) {
      return val
        .map((v) => FirebaseService.deepClean(v))
        .filter((v) => v !== undefined) as unknown as T;
    }
    if (val && typeof val === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(val as any)) {
        const cleaned = FirebaseService.deepClean(v);
        if (cleaned !== undefined) out[k] = cleaned;
      }
      return out;
    }
    return (val === undefined ? null : val) as T;
  }
}
