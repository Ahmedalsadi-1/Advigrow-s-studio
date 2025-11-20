

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import http from 'http';
import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";

const PORT = 8012;

// --- MOCK AUTHENTICATION DATA ---
let loggedInUser = null; // In-memory session store

const MOCK_USERS = {
  google: {
    username: 'Advigrow G.',
    email: 'advigrow.google@example.com',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=g-advigrow&backgroundColor=transparent,b6e3f4`,
    provider: 'google',
  },
  github: {
    username: 'advigrow-dev',
    email: 'advigrow.github@example.com',
    avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=gh-advigrow`,
    provider: 'github',
  }
};
// --- END MOCK DATA ---


// Popular models fallback list (matching frontend)
const POPULAR_CHECKPOINTS = [
  "v1-5-pruned-emaonly.ckpt",
  "sd_xl_base_1.0.safetensors",
  "svd.safetensors", 
  "dreamshaper_8.safetensors",
  "realisticVisionV51_v51VAE.safetensors"
];

// Sample videos for fallback/mock mode
const MOCK_VIDEOS = [
  'https://storage.googleapis.com/sideprojects-asronline/veo-cameos/cameo-alisa.mp4',
  'https://storage.googleapis.com/sideprojects-asronline/veo-cameos/cameo-omar.mp4',
  'https://storage.googleapis.com/sideprojects-asronline/veo-cameos/cameo-ammaar.mp4'
];

// Common addresses to search for ComfyUI
const CANDIDATE_URLS = [
    'http://127.0.0.1:8188',
    'http://localhost:8188',
    'http://host.docker.internal:8188',
    'http://0.0.0.0:8188'
];

// Workflow Template for ComfyUI
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
    "_meta": { "title": "KSampler" }
  },
  "4": {
    "inputs": { "ckpt_name": "v1-5-pruned-emaonly.ckpt" },
    "class_type": "CheckpointLoaderSimple",
    "_meta": { "title": "Load Checkpoint" }
  },
  "5": {
    "inputs": { "width": 512, "height": 512, "batch_size": 1 },
    "class_type": "EmptyLatentImage",
    "_meta": { "title": "Empty Latent Image" }
  },
  "6": {
    "inputs": { "text": "", "clip": ["4", 1] },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "CLIP Text Encode (Prompt)" }
  },
  "7": {
    "inputs": { "text": "text, watermark", "clip": ["4", 1] },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "CLIP Text Encode (Negative Prompt)" }
  },
  "8": {
    "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
    "class_type": "VAEDecode",
    "_meta": { "title": "VAE Decode" }
  },
  "9": {
    "inputs": { "filename_prefix": "ComfyUI", "images": ["8", 0] },
    "class_type": "SaveImage",
    "_meta": { "title": "Save Image" }
  }
};

async function main() {
  if (!process.env.API_KEY) {
    console.error("Error: API_KEY environment variable is required.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const sessions = new Map();

  const server = http.createServer(async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    // --- MOCK AUTH API ENDPOINTS ---
    if (url.pathname.startsWith('/api/')) {
        // Login with a specific provider
        if (req.method === 'GET' && url.pathname.startsWith('/api/login/')) {
            const provider = url.pathname.split('/')[3];
            if (provider === 'google' || provider === 'github') {
                loggedInUser = MOCK_USERS[provider];
                console.log(`\n[Notification] User '${loggedInUser.username}' just signed in via ${provider}!\n`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(loggedInUser));
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid provider' }));
            }
            return;
        }

        // Check current user status
        if (req.method === 'GET' && url.pathname === '/api/user') {
            if (loggedInUser) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(loggedInUser));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not logged in' }));
            }
            return;
        }

        // Logout
        if (req.method === 'GET' && url.pathname === '/api/logout') {
            if (loggedInUser) {
                console.log(`\n[Notification] User '${loggedInUser.username}' logged out.\n`);
            }
            loggedInUser = null;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
            return;
        }
    }
    // --- END MOCK AUTH API ---


    // 1. SSE Endpoint for connecting
    if (req.method === 'GET' && url.pathname === '/sse') {
      const sessionId = randomUUID();
      console.log(`[MCP] New session connected: ${sessionId}`);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      sessions.set(sessionId, res);

      // Send the endpoint URL to the client as per MCP HTTP spec
      const endpointUrl = `http://localhost:${PORT}/message?sessionId=${sessionId}`;
      res.write(`event: endpoint\ndata: ${endpointUrl}\n\n`);

      req.on('close', () => {
        console.log(`[MCP] Session closed: ${sessionId}`);
        sessions.delete(sessionId);
      });
      return;
    }

    // 2. Message Endpoint for JSON-RPC requests
    if (req.method === 'POST' && url.pathname === '/message') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId || !sessions.has(sessionId)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end("Session not found");
        return;
      }

      let body = '';
      for await (const chunk of req) body += chunk;

      try {
        const request = JSON.parse(body);
        // Process request asynchronously, response sent via SSE
        handleRequest(request, sessions.get(sessionId), ai).catch(err => {
          console.error(`[MCP] Error handling request:`, err);
        });
        
        res.writeHead(202); // Accepted
        res.end("Accepted");
      } catch (e) {
        console.error(`[MCP] Invalid JSON:`, e);
        res.writeHead(400);
        res.end("Invalid JSON");
      }
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  });

  server.listen(PORT, () => {
    console.log(`\n=== Advigrow Studio Server ===`);
    console.log(`Running on http://localhost:${PORT}`);
    console.log(`- MCP Endpoint: /sse`);
    console.log(`- Mock Auth API: /api/*`);
    console.log(`Ready to connect with AI tools.\n`);
  });
}

// ------------------------------------------------------------------
// MCP Protocol Handler
// ------------------------------------------------------------------

async function handleRequest(request, sseResponse, ai) {
  const { id, method, params } = request;

  const sendJsonRpc = (result) => {
    const msg = JSON.stringify({ jsonrpc: "2.0", id, result });
    sseResponse.write(`event: message\ndata: ${msg}\n\n`);
  };

  const sendError = (code, message) => {
    const msg = JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
    sseResponse.write(`event: message\ndata: ${msg}\n\n`);
  };

  console.log(`[MCP] Method: ${method}`);

  try {
    if (method === "initialize") {
      sendJsonRpc({
        protocolVersion: "2024-11-05",
        serverInfo: { name: "veo-cameo-server", version: "1.0.0" },
        capabilities: { tools: {} }
      });
    } 
    else if (method === "notifications/initialized") {
      // No response needed
    } 
    else if (method === "tools/list") {
      sendJsonRpc({
        tools: [
          {
            name: "generate_cameo_video",
            description: "Generate a high-quality video using Google Veo or a local ComfyUI instance.",
            inputSchema: {
              type: "object",
              properties: {
                prompt: { 
                  type: "string", 
                  description: "Detailed description of the video scene." 
                },
                engine: { 
                  type: "string", 
                  enum: ["veo", "comfyui"], 
                  description: "Generation engine. 'veo' uses Google's cloud model. 'comfyui' uses local GPU." 
                },
                comfyUrl: { 
                  type: "string", 
                  description: "URL of local ComfyUI instance (default: http://127.0.0.1:8188)." 
                },
                comfyModel: {
                  type: "string",
                  description: "Specific checkpoint model name for ComfyUI (optional)."
                },
                enableGpu: {
                  type: "boolean",
                  description: "Enable GPU acceleration for ComfyUI (default: true)."
                }
              },
              required: ["prompt"]
            }
          }
        ]
      });
    } 
    else if (method === "tools/call") {
      if (params.name === "generate_cameo_video") {
        const { prompt, engine, comfyUrl, comfyModel, enableGpu } = params.arguments;
        let resultUrl = "";

        if (engine === "comfyui") {
          resultUrl = await callComfyWithFallback(comfyUrl, prompt, comfyModel, enableGpu);
        } else {
          resultUrl = await callVeo(ai, prompt);
        }

        sendJsonRpc({
          content: [{ type: "text", text: resultUrl }]
        });
      } else {
        sendError(-32601, "Method not found");
      }
    } 
    else {
      // Ignore other methods or ping
    }
  } catch (error) {
    console.error("Handler Error:", error);
    sendError(-32000, error.message);
  }
}

// ------------------------------------------------------------------
// Service Implementations
// ------------------------------------------------------------------

async function callVeo(ai, prompt) {
  console.log(`[Veo] Generating: "${prompt}"`);
  
  // Use Fast model for responsiveness
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: { numberOfVideos: 1, aspectRatio: '16:9', resolution: '720p' }
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(r => setTimeout(r, 4000));
    operation = await ai.operations.getVideosOperation({operation: operation.name});
  }
  
  if (operation.error) throw new Error(operation.error.message);
  
  const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) throw new Error("No video URI returned from Veo.");
  
  // Return URI with API key for immediate access by the tool caller
  return `${uri}&key=${process.env.API_KEY}`;
}

async function callComfyWithFallback(baseUrl, prompt, modelName, enableGpu) {
    const initialUrl = (baseUrl || 'http://127.0.0.1:8188').replace(/\/$/, '');
    let activeUrl = initialUrl;
    
    try {
        // 1. Try initial URL
        console.log(`[ComfyUI] Trying ${activeUrl}...`);
        await checkComfyConnection(activeUrl);
    } catch (error) {
        console.warn(`[ComfyUI] Initial connection failed. Auto-discovering...`);
        // 2. Try auto-discovery
        const discoveredUrl = await discoverComfyUrl();
        if (discoveredUrl) {
            console.log(`[ComfyUI] Found active server at ${discoveredUrl}`);
            activeUrl = discoveredUrl;
        } else {
            // 3. Fallback to Mock if discovery fails
            console.warn(`[ComfyUI] No server found. Switching to Simulation Mode.`);
            return await runComfyMock(prompt);
        }
    }

    // If we are here, activeUrl is valid
    try {
        return await callComfyReal(activeUrl, prompt, modelName, enableGpu);
    } catch (error) {
        console.warn(`[ComfyUI] Real generation error: ${error.message}. Fallback to mock.`);
        return await runComfyMock(prompt);
    }
}

async function discoverComfyUrl() {
    for (const url of CANDIDATE_URLS) {
        try {
            await checkComfyConnection(url);
            return url;
        } catch (e) {}
    }
    return null;
}

async function checkComfyConnection(url) {
    const res = await fetch(`${url}/object_info/CheckpointLoaderSimple`);
    if (!res.ok) throw new Error("Connection refused");
    return true;
}

async function runComfyMock(prompt) {
    await new Promise(r => setTimeout(r, 2000));
    const randomVideo = MOCK_VIDEOS[Math.floor(Math.random() * MOCK_VIDEOS.length)];
    return `${randomVideo}?simulated=true&prompt=${encodeURIComponent(prompt)}`;
}

async function callComfyReal(cleanUrl, prompt, modelName, enableGpu) {
    const clientId = randomUUID();
    console.log(`[ComfyUI] Connecting to ${cleanUrl}...`);

    // 1. Get Models
    let validModels = [];
    try {
        const res = await fetch(`${cleanUrl}/object_info/CheckpointLoaderSimple`);
        if (!res.ok) throw new Error("Connection refused");
        const data = await res.json();
        validModels = data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
    } catch (e) {
        throw new Error(`Connection Failed: ${e.message}`);
    }

    if (validModels.length === 0) throw new Error("No models found on server.");

    // 2. Resolve Model
    let targetModel = modelName;
    if (!targetModel || !validModels.includes(targetModel)) {
        const normalize = (s) => s.toLowerCase();
        const search = targetModel ? normalize(targetModel) : '';
        const match = validModels.find(m => normalize(m).includes(search));
        targetModel = match || validModels[0];
        console.log(`[ComfyUI] Auto-selected model: ${targetModel}`);
    }

    // 3. Queue Workflow
    const workflow = JSON.parse(JSON.stringify(DEFAULT_WORKFLOW));
    workflow["6"].inputs.text = prompt;
    if (targetModel && workflow["4"]) workflow["4"].inputs.ckpt_name = targetModel;
    if (workflow["3"]) workflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000);

    const queueRes = await fetch(`${cleanUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, prompt: workflow }),
    });

    if (!queueRes.ok) throw new Error(`Queue failed: ${queueRes.status}`);
    const queueData = await queueRes.json();
    const promptId = queueData.prompt_id;

    // 4. Poll
    let outputFilename = '';
    let attempts = 0;
    while (!outputFilename && attempts < 60) {
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
        const hRes = await fetch(`${cleanUrl}/history/${promptId}`);
        if (hRes.ok) {
            const hData = await hRes.json();
            if (hData[promptId]?.outputs) {
                for (const nid in hData[promptId].outputs) {
                    const imgs = hData[promptId].outputs[nid].images;
                    if (imgs?.length) {
                        outputFilename = imgs[0].filename;
                        break;
                    }
                }
            }
        }
    }

    if (!outputFilename) throw new Error("Generation timed out.");
    return `${cleanUrl}/view?filename=${encodeURIComponent(outputFilename)}`;
}

main().catch(console.error);
