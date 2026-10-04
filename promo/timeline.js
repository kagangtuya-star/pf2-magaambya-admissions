// Shared timing for picture and score, in seconds.
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;
export const DURATION = 60;

export const SCENES = {
  prologue: [0, 7.6],
  rekindling: [7.0, 15.6],
  masks: [15.0, 24.6],
  nantambu: [24.0, 35.2],
  branches: [34.6, 46.8],
  wordway: [46.2, 52.8],
  finale: [52.2, 60],
};

export const MASK_HITS = Array.from({ length: 10 }, (_, i) => 16.2 + i * 0.55);
export const BRANCH_HITS = Array.from({ length: 5 }, (_, i) => 35.6 + i * 2);
export const BRANCH_UNITY = 45.4;
export const CREST_REVEAL = 55.6;
