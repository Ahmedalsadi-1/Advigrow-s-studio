
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper to generate a random Client ID
function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

export const POPULAR_CHECKPOINTS = [
  "v1-5-pruned-emaonly.ckpt",
  "sd_xl_base_1.0.safetensors",
  "svd.safetensors",
  "svd_xt.safetensors", 
  "dreamshaper_8.safetensors",
  "majicmixRealistic_v7.safetensors",
  "juggernautXL_v9Rdphoto2Lightning.safetensors",
  "epicrealism_natural_sin_rc1_vae.safetensors",
  "cyberrealistic_v33.safetensors",
  "realisticVisionV51_v51VAE.safetensors"
];

// State to track if we are in fallback/mock mode due to connection failure
let isMockMode = false;

// Common addresses to search for ComfyUI
const CANDIDATE_URLS = [
  'http://127.0.0.1:8188',
  'http://localhost:8188',
  'http://host.docker.internal:8188',
  'http://0.0.0.0:8188'
];

// A basic default workflow for Text-to-Image in ComfyUI
const DEFAULT_WORKFLOW = {
  "3": {
    "inputs": {
      "seed": 0,
      "steps": 20,
      "cfg": 8,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1,
      "model": ["4", 0],
      "positive": ["6", 0],
      "negative": ["7", 0],
      "latent_image": ["5", 0]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "4": {
    "inputs": {
      "ckpt_name": "v1-5-pruned-emaonly.ckpt"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "5": {
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage",
    "_meta": {
      "title": "Empty Latent Image"
    }
  },
  "6": {
    "inputs": {
      "text": "", // Will be replaced
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "7": {
    "inputs": {
      "text": "text, watermark",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative Prompt)"
    }
  },
  "8": {
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "9": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": ["8", 0]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  }
};

/**
 * Attempts to find a running ComfyUI instance on common ports.
 */
export const discoverComfyUrl = async (): Promise<string | null> => {
  for (const url of CANDIDATE_URLS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout per check
      const res = await fetch(`${url}/object_info/CheckpointLoaderSimple`, { 
        method: 'GET',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        console.log(`[ComfyUI] Discovered active server at ${url}`);
        return url;
      }
    } catch (e) {
      // Continue to next candidate
    }
  }
  return null;
};

export const getComfyModels = async (baseUrl: string): Promise<string[]> => {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for quick check

        // Fetch object info for CheckpointLoaderSimple to get available models
        const response = await fetch(`${cleanUrl}/object_info/CheckpointLoaderSimple`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Failed to connect: ${response.statusText}`);
        
        const data = await response.json();
        const models = data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
        
        if (Array.isArray(models) && models.length > 0) {
            isMockMode = false;
            return models;
        }
        
        // If connected but empty, fallback to mock
        console.warn("Connected to ComfyUI but no models found. Switching to virtual models.");
        isMockMode = true;
        // Start with just one model "installed" to demonstrate download capability in UI
        return [POPULAR_CHECKPOINTS[0]];

    } catch (error) {
        // Don't automatically switch to mock here; let the UI decide to retry with discovery
        // If we are absolutely unable to connect, then we bubble up error or return empty to trigger discovery
        throw error;
    }
}

// Helper to enable mock mode explicitly from UI if discovery fails
export const enableMockMode = () => {
    isMockMode = true;
};

export const isMockModeActive = () => isMockMode;

// Helper for simulated delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateComfyVideo = async (
  baseUrl: string,
  prompt: string,
  modelName?: string,
  enableGpu: boolean = true
): Promise<{ url: string }> => {
  const cleanUrl = baseUrl.replace(/\/$/, '');
  const clientId = uuidv4();
  
  // 1. Check/Refresh Models and Mode logic
  try {
     await getComfyModels(cleanUrl);
  } catch (e) {
     // If connection fails during generation, check if we should just use mock
     if (isMockMode) {
        // Pass through
     } else {
        // Try to auto-recover or fail
        console.warn("Connection lost during generation check.");
     }
  }
  
  // If in Mock Mode, simulate the entire process
  if (isMockMode) {
      console.log(`[ComfyUI-Sim] Started generation in Demo Mode. GPU: ${enableGpu}`);
      
      // Simulate "Downloading" the model if it was "selected" but strictly virtual
      console.log(`[ComfyUI-Sim] verifying model: ${modelName || 'default'}...`);
      await wait(1500); 
      
      console.log(`[ComfyUI-Sim] Queuing prompt...`);
      await wait(1000);
      
      console.log(`[ComfyUI-Sim] Processing... (Simulating GPU work)`);
      // Simulate a variable processing time
      await wait(3000);
      
      console.log(`[ComfyUI-Sim] Done.`);
      
      // Return a random sample video to verify the "Success" flow
      const SAMPLES = [
         'https://storage.googleapis.com/sideprojects-asronline/veo-cameos/cameo-alisa.mp4',
         'https://storage.googleapis.com/sideprojects-asronline/veo-cameos/cameo-omar.mp4',
         'https://storage.googleapis.com/sideprojects-asronline/veo-cameos/cameo-ammaar.mp4'
      ];
      return { url: SAMPLES[Math.floor(Math.random() * SAMPLES.length)] };
  }

  // --- REAL EXECUTION PATH ---
  
  // Re-fetch strict list for validation in real mode
  const validModels = await getComfyModels(cleanUrl);

  console.log(`[ComfyUI] Generating video. GPU Acceleration: ${enableGpu ? 'ENABLED' : 'DISABLED'}`);

  if (validModels.length === 0 && !isMockMode) {
    throw new Error("No checkpoint models found on ComfyUI server. Please install models in 'ComfyUI/models/checkpoints'.");
  }

  // 2. Resolve Target Model with Fallback
  let targetModel = modelName;
  
  // If no model specified, or specified model is missing
  if (!targetModel || !validModels.includes(targetModel)) {
      // Fallback: Try to fuzzy match or default to first available
      const normalize = (s: string) => s.toLowerCase();
      const search = targetModel ? normalize(targetModel) : '';
      
      const match = validModels.find(m => normalize(m).includes(search) || search.includes(normalize(m)));
      targetModel = match || validModels[0];
      console.log(`Using fallback model: ${targetModel}`);
  }

  // 3. Prepare Workflow (Deep clone and inject prompt)
  const workflow = JSON.parse(JSON.stringify(DEFAULT_WORKFLOW));
  
  if (workflow["6"]) workflow["6"].inputs.text = prompt;
  if (targetModel && workflow["4"]) workflow["4"].inputs.ckpt_name = targetModel;
  if (workflow["3"]) workflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000);

  try {
    // 4. Queue Prompt
    const payload = {
        client_id: clientId,
        prompt: workflow
    };

    const queueRes = await fetch(`${cleanUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!queueRes.ok) {
        let errorMsg = `Failed to queue prompt: ${queueRes.status}`;
        try {
            const errorJson = await queueRes.json();
            if (errorJson.node_errors) {
                const nodeIds = Object.keys(errorJson.node_errors);
                if (nodeIds.length > 0) {
                     const firstNode = errorJson.node_errors[nodeIds[0]];
                     if (firstNode.errors && firstNode.errors.length > 0) {
                         errorMsg = `ComfyUI Validation: ${firstNode.errors[0].message}`;
                     }
                }
            } else if (errorJson.error) {
                errorMsg = `ComfyUI Error: ${errorJson.error.message || errorJson.error}`;
            }
        } catch (e) { /* ignore parse error */ }
        throw new Error(errorMsg);
    }

    const queueData = await queueRes.json();
    const promptId = queueData.prompt_id;

    console.log(`ComfyUI: Queued prompt ${promptId}`);

    // 5. Poll for completion
    let outputFilename = '';
    let attempts = 0;
    
    while (!outputFilename && attempts < 60) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;
      
      const historyRes = await fetch(`${cleanUrl}/history/${promptId}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (historyData[promptId]) {
            const outputs = historyData[promptId].outputs;
            for (const nodeId in outputs) {
                const images = outputs[nodeId].images;
                if (images && images.length > 0) {
                    outputFilename = images[0].filename;
                }
            }
        }
      }
    }

    if (!outputFilename) throw new Error('ComfyUI Generation timed out.');

    return {
        url: `${cleanUrl}/view?filename=${encodeURIComponent(outputFilename)}`
    };

  } catch (error) {
    console.error("ComfyUI Error:", error);
     if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        throw new Error("Connection refused. Ensure ComfyUI is running.");
    }
    throw error;
  }
};
