export type VisionImage = {
  data: Buffer;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
};

// ponytail: bounds base64 payload size/cost across both reel frames and link images
export const MAX_VISION_IMAGES = 6;
