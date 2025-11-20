

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export enum AppState {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export enum VeoModel {
  VEO_FAST = 'veo-3.1-fast-generate-preview',
  VEO = 'veo-3.1-generate-preview',
}

export enum AspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
}

export enum Resolution {
  P720 = '720p',
  P1080 = '1080p',
}

export enum GenerationMode {
  TEXT_TO_VIDEO = 'Text to Video',
  FRAMES_TO_VIDEO = 'Frames to Video',
  REFERENCES_TO_VIDEO = 'References to Video',
}

export enum EngineType {
  VEO = 'veo',
  COMFY_UI = 'comfyui',
}

export interface VideoTemplate {
  id: string;
  label: string;
  description: string; // For the LLM
  thumbnail: string;
  color: string;
}

export interface ImageFile {
  file: File;
  base64: string;
}

export interface VideoFile {
  file: File;
  base64: string;
}

export interface GenerateVideoParams {
  prompt: string;
  model: VeoModel;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  mode: GenerationMode;
  engine: EngineType;
  templateId?: string; // If present, we use Gemini to rewrite prompt
  comfyUrl?: string; // If engine is ComfyUI
  comfyModel?: string; // Specific checkpoint for ComfyUI
  comfyGpuEnabled?: boolean; // Toggle for GPU acceleration
  startFrame?: ImageFile | null;
  endFrame?: ImageFile | null;
  referenceImages?: ImageFile[];
  styleImage?: ImageFile | null;
  inputVideo?: VideoFile | null;
  isLooping?: boolean;
}

export enum PostStatus {
  GENERATING = 'generating',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface FeedPost {
  id: string;
  videoUrl?: string;
  username: string;
  avatarUrl: string;
  description: string; // The original user prompt
  enhancedPrompt?: string; // The actual prompt sent to model
  modelTag: string;
  engineType: EngineType;
  templateLabel?: string;
  status?: PostStatus; 
  errorMessage?: string;
  referenceImageBase64?: string; 
}

export interface CameoProfile {
  id: string;
  name: string;
  imageUrl: string; 
}