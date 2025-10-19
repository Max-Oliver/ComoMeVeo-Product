/**
 * Shared pose instructions for generating pose variations.
 */
export const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Jumping in the air, mid-action shot",
  "Walking towards camera",
  "Leaning against a wall",
] as const;

export type PoseInstruction = typeof POSE_INSTRUCTIONS[number];
