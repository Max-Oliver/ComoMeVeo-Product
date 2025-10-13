/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
}

export interface OutfitLayer {
  garment: WardrobeItem | null; // null represents the base model layer
  poseImages: Record<string, string>; // Maps pose instruction to image URL
}

// Firebase-related types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
}

export interface TryOnSession {
  id: string;
  userId: string;
  originalImageUrl: string;
  originalImageFile?: File; // For upload reference
  createdAt: Date;
  updatedAt: Date;
  outfitHistory: OutfitLayer[];
  currentOutfitIndex: number;
  currentPoseIndex: number;
}

export interface Feedback {
  id: string;
  sessionId: string;
  userId: string;
  imageUrl: string;
  poseInstruction: string;
  garmentId?: string;
  rating: 'like' | 'dislike';
  comment?: string;
  createdAt: Date;
}

export interface GeneratedImage {
  id: string;
  sessionId: string;
  userId: string;
  imageUrl: string;
  poseInstruction: string;
  garmentId?: string;
  createdAt: Date;
  isCached: boolean;
}
