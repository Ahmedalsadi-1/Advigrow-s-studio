

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  VideoGenerationReferenceImage,
  VideoGenerationReferenceType,
} from '@google/genai';
import {EngineType, GenerateVideoParams, GenerationMode, ImageFile, VeoModel} from '../types';
import { generateComfyVideo } from './comfyService';

// Templates for Prompt Expansion
const TEMPLATE_PROMPTS: Record<string, string> = {
  'cinematic': 'Rewrite the following prompt to be a high-budget cinematic film shot. Describe lighting, camera angles (e.g. wide shot, anamorphic), and texture in detail. Keep it under 300 characters. Prompt: ',
  'claymation': 'Rewrite the following prompt to describe a stop-motion claymation scene. Mention the texture of the clay, the handmade feel, and slightly jerky animation style. Prompt: ',
  'cyberpunk': 'Rewrite the following prompt to be set in a futuristic cyberpunk city. Mention neon lights, rain, holographic advertisements, and high-tech gadgets. Prompt: ',
  'anime': 'Rewrite the following prompt to describe a high-quality anime scene (Studio Ghibli style). Mention vibrant colors, cel-shading, and emotional atmosphere. Prompt: ',
  'pixel': 'Rewrite the following prompt to describe a retro 16-bit pixel art video game scene. Mention limited color palette and blocky aesthetics. Prompt: ',
};

// Helper to enhance prompt using Gemini 2.5 Flash
const enhancePrompt = async (originalPrompt: string, templateId: string): Promise<string> => {
  if (!templateId || !TEMPLATE_PROMPTS[templateId]) return originalPrompt;

  try {
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: TEMPLATE_PROMPTS[templateId] + originalPrompt,
    });
    return response.text || originalPrompt;
  } catch (e) {
    console.warn("Failed to enhance prompt with Gemini:", e);
    return originalPrompt;
  }
};

export const generateVideo = async (
  params: GenerateVideoParams,
): Promise<{url: string; blob?: Blob; enhancedPrompt?: string}> => {
  
  // 1. Enhance Prompt if Template Selected
  let finalPrompt = params.prompt;
  if (params.templateId) {
    console.log(`Enhancing prompt for template: ${params.templateId}`);
    finalPrompt = await enhancePrompt(params.prompt, params.templateId);
    console.log(`Enhanced prompt: ${finalPrompt}`);
  }

  // 2. Route to Engine
  if (params.engine === EngineType.COMFY_UI) {
    if (!params.comfyUrl) throw new Error("ComfyUI URL is required.");
    const result = await generateComfyVideo(params.comfyUrl, finalPrompt, params.comfyModel, params.comfyGpuEnabled);
    return { url: result.url, enhancedPrompt: finalPrompt };
  }

  // 3. Default Veo Handling
  console.log('Starting Veo generation with params:', params);

  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  const generateVideoPayload: any = {
    model: params.model,
    prompt: finalPrompt,
    config: {
      numberOfVideos: 1,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
    },
  };

  if (params.mode === GenerationMode.FRAMES_TO_VIDEO) {
    if (params.startFrame) {
      generateVideoPayload.image = {
        imageBytes: params.startFrame.base64,
        mimeType: params.startFrame.file.type,
      };
    }

    const finalEndFrame = params.isLooping
      ? params.startFrame
      : params.endFrame;
    if (finalEndFrame) {
      generateVideoPayload.config.lastFrame = {
        imageBytes: finalEndFrame.base64,
        mimeType: finalEndFrame.file.type,
      };
    }
  } else if (params.mode === GenerationMode.REFERENCES_TO_VIDEO) {
    const referenceImagesPayload: VideoGenerationReferenceImage[] = [];

    if (params.referenceImages) {
      for (const img of params.referenceImages) {
        referenceImagesPayload.push({
          image: {
            imageBytes: img.base64,
            mimeType: img.file.type,
          },
          referenceType: VideoGenerationReferenceType.ASSET,
        });
      }
    }

    if (params.styleImage) {
      referenceImagesPayload.push({
        image: {
          imageBytes: params.styleImage.base64,
          mimeType: params.styleImage.file.type,
        },
        referenceType: VideoGenerationReferenceType.STYLE,
      });
    }

    if (referenceImagesPayload.length > 0) {
      generateVideoPayload.config.referenceImages = referenceImagesPayload;
    }
  }

  console.log('Submitting video generation request...');
  let operation = await ai.models.generateVideos(generateVideoPayload);
  
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    // Fix: Cast operation name to string explicitly to satisfy strict type checking
    operation = await ai.operations.getVideosOperation({operation: (operation as any).name as string});
  }

  if (operation.error) {
    throw new Error(operation.error.message || 'Video generation failed.');
  }

  if (operation.response) {
    const videos = operation.response.generatedVideos;
    if (!videos || videos.length === 0) {
      throw new Error('No videos were generated.');
    }

    const firstVideo = videos[0];
    if (!firstVideo?.video?.uri) {
      throw new Error('Generated video is missing a URI.');
    }

    const url = decodeURIComponent(firstVideo.video.uri);
    
    // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
    const res = await fetch(`${url}&key=${process.env.API_KEY}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch video: ${res.status} ${res.statusText}`);
    }

    const videoBlob = await res.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    return {url: videoUrl, blob: videoBlob, enhancedPrompt: finalPrompt};
  } else {
    throw new Error('Video generation finished but no video was returned.');
  }
};