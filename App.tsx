

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import ApiKeyDialog from './components/ApiKeyDialog';
import BottomPromptBar from './components/BottomPromptBar';
import VideoCard from './components/VideoCard';
import SettingsDialog from './components/SettingsDialog';
import LoginDialog from './components/LoginDialog';
import { generateVideo } from './services/geminiService';
import { FeedPost, GenerateVideoParams, PostStatus, EngineType, UserProfile } from './types';
import { Clapperboard, Heart, LogIn, LogOut } from 'lucide-react';

// Sample video URLs for the feed (public domain/creative commons)
const sampleVideos: FeedPost[] = [
  {
    id: 's1',
    videoUrl: 'https://storage.googleapis.com/sideprojects-asronline/veo-cameos/cameo-alisa.mp4',
    username: 'alisa_fortin',
    avatarUrl: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Maria',
    description: 'Sipping coffee at a parisian cafe',
    modelTag: 'Veo Fast',
    engineType: EngineType.VEO,
    status: PostStatus.SUCCESS,
  },
  {
    id: 's2',
    videoUrl: 'https://storage.googleapis.com/sideprojects-asronline/veo-cameos/cameo-omar.mp4',
    username: 'osanseviero',
    avatarUrl: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Emery',
    description: 'At a llama petting zoo',
    modelTag: 'Veo Fast',
    engineType: EngineType.VEO,
    status: PostStatus.SUCCESS,
  },
    {
    id: 's3',
    videoUrl: 'https://storage.googleapis.com/sideprojects-asronline/veo-cameos/cameo-ammaar.mp4',
    username: 'ammaar',
    avatarUrl: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Kimberly',
    description: 'At a red carpet ceremony',
    modelTag: 'Veo',
    engineType: EngineType.VEO,
    status: PostStatus.SUCCESS,
  },
];

const App: React.FC = () => {
  const [feed, setFeed] = useState<FeedPost[]>(sampleVideos);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [comfyUrl, setComfyUrl] = useState('');
  const [comfyModel, setComfyModel] = useState('');
  const [comfyGpuEnabled, setComfyGpuEnabled] = useState(true);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  // Check login status & load comfy URL on initial render
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        }
      } catch (error) {
        console.warn("Could not check user status:", error);
      }
    };
    checkUserStatus();

    const savedComfyUrl = localStorage.getItem('comfyUrl');
    if (savedComfyUrl) {
      setComfyUrl(savedComfyUrl);
    }
  }, []);

  // Auto-dismiss error toast
  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

  const updateFeedPost = (id: string, updates: Partial<FeedPost>) => {
    setFeed(prevFeed => 
      prevFeed.map(post => 
        post.id === id ? { ...post, ...updates } : post
      )
    );
  };

  const processGeneration = async (postId: string, params: GenerateVideoParams) => {
    try {
      // Inject configured Comfy URL and Model if engine is ComfyUI
      const paramsWithConfig = {
        ...params,
        comfyUrl: params.engine === EngineType.COMFY_UI ? comfyUrl : undefined,
        comfyModel: params.engine === EngineType.COMFY_UI ? comfyModel : undefined,
        comfyGpuEnabled: params.engine === EngineType.COMFY_UI ? comfyGpuEnabled : undefined
      };

      const { url, enhancedPrompt } = await generateVideo(paramsWithConfig);
      updateFeedPost(postId, { 
          videoUrl: url, 
          status: PostStatus.SUCCESS,
          description: enhancedPrompt || params.prompt // Update description if prompt was enhanced
      });
    } catch (error) {
      console.error('Video generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
      updateFeedPost(postId, { status: PostStatus.ERROR, errorMessage: errorMessage });
      
      // Handle specific errors for toast notifications
      if (typeof errorMessage === 'string') {
         if (
          errorMessage.includes('API_KEY_INVALID') || 
          errorMessage.includes('permission denied') ||
          errorMessage.includes('Requested entity was not found')
        ) {
          setErrorToast('Invalid API key or permissions. Please check billing.');
        } else if (
          errorMessage.includes('Connection refused') ||
          errorMessage.includes('Failed to fetch')
        ) {
          setErrorToast('ComfyUI Connection Failed. Check Settings.');
        } else if (errorMessage.includes('ComfyUI URL is required')) {
          setErrorToast('ComfyUI URL missing. Open Settings.');
        } else if (errorMessage.includes('Bad Request') || errorMessage.includes('queue prompt')) {
          setErrorToast('Workflow Error. Check ComfyUI Console or Model Selection.');
        }
      }
    }
  };

  const handleGenerate = useCallback(async (params: GenerateVideoParams) => {
    if (!currentUser) {
      setShowLoginDialog(true);
      return;
    }
    
    // Only check Google API key if using Veo or if using Veo as helper for templates
    if (params.engine === EngineType.VEO || params.templateId) {
        if (window.aistudio) {
        try {
            if (!(await window.aistudio.hasSelectedApiKey())) {
            setShowApiKeyDialog(true);
            return;
            }
        } catch (error) {
            setShowApiKeyDialog(true);
            return;
        }
        }
    }
    
    // Check Comfy Config before starting
    if (params.engine === EngineType.COMFY_UI && !comfyUrl) {
        setShowSettingsDialog(true);
        return;
    }

    const newPostId = Date.now().toString();
    const refImage = params.referenceImages?.[0]?.base64;

    const modelTag = params.engine === EngineType.COMFY_UI 
        ? (comfyModel ? `ComfyUI (${comfyModel.substring(0, 10)}...)` : 'ComfyUI')
        : (params.model === 'veo-3.1-fast-generate-preview' ? 'Veo Fast' : 'Veo');

    // Create new post object with GENERATING status
    const newPost: FeedPost = {
      id: newPostId,
      username: currentUser.username,
      avatarUrl: currentUser.avatarUrl,
      description: params.prompt,
      modelTag: modelTag,
      engineType: params.engine,
      templateLabel: params.templateId,
      status: PostStatus.GENERATING,
      referenceImageBase64: refImage,
    };

    // Prepend to feed immediately
    setFeed(prev => [newPost, ...prev]);

    // Start generation in background
    processGeneration(newPostId, params);

  }, [comfyUrl, comfyModel, comfyGpuEnabled, currentUser]);

  const handleApiKeyDialogContinue = async () => {
    setShowApiKeyDialog(false);
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
  };

  const handleLogin = async (provider: 'google' | 'github' | 'discord' | 'twitter') => {
    try {
      const response = await fetch(`/api/login/${provider}`);
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        setShowLoginDialog(false);
      } else {
        setErrorToast("Mock login failed. See server console.");
      }
    } catch (error) {
       setErrorToast("Could not connect to login service.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout');
      setCurrentUser(null);
      setProfileMenuOpen(false);
    } catch (error) {
      setErrorToast("Logout failed. Could not connect to service.");
    }
  };


  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden font-sans selection:bg-white/20 selection:text-white">
      {showApiKeyDialog && (
        <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />
      )}

      <SettingsDialog 
        isOpen={showSettingsDialog} 
        onClose={() => setShowSettingsDialog(false)}
        comfyUrl={comfyUrl}
        onSaveComfyUrl={setComfyUrl}
        comfyModel={comfyModel}
        onSaveComfyModel={setComfyModel}
        enableGpu={comfyGpuEnabled}
        onSaveEnableGpu={setComfyGpuEnabled}
      />

      <LoginDialog 
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLogin={handleLogin}
      />
      
      {/* Error Toast */}
      <AnimatePresence>
        {errorToast && (
            <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 24, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] bg-neutral-900/95 border border-red-500/30 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl max-w-md text-center text-sm font-medium flex items-center gap-3 ring-1 ring-red-500/20"
            >
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse"></div>
                {errorToast}
            </motion.div>
        )}
      </AnimatePresence>
      
      <main className="flex-1 h-full relative overflow-y-auto overflow-x-hidden no-scrollbar bg-black">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.03),_transparent_70%)]"></div>

        {/* Top Bar */}
        <header className="sticky top-0 z-30 w-full px-6 py-6 pointer-events-none">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-xl mask-image-linear-gradient-to-b" />
            
            <div className="relative flex items-center justify-between text-white pointer-events-auto max-w-[1600px] mx-auto w-full">
                <div className="flex items-center gap-3.5">
                    <Clapperboard className="w-8 h-8 text-white" />
                    <h1 className="font-bogle text-3xl text-white tracking-wide drop-shadow-sm">Advigrow's Studio</h1>
                </div>
                 
                 <div className="flex items-center gap-6">
                    {currentUser ? (
                      <div className="relative">
                        <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-2 pr-4 rounded-full transition-colors">
                          <img src={currentUser.avatarUrl} alt="User avatar" className="w-8 h-8 rounded-full border-2 border-white/20" />
                          <span className="font-bold text-sm text-white">{currentUser.username}</span>
                        </button>
                        <AnimatePresence>
                          {isProfileMenuOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full right-0 mt-2 w-48 bg-neutral-900/90 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden ring-1 ring-black/20"
                              onClick={() => setProfileMenuOpen(false)}
                            >
                              <div className="p-2">
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 text-left px-3 py-2 text-sm text-red-300 hover:bg-white/5 rounded-md transition-colors">
                                  <LogOut className="w-4 h-4" />
                                  <span>Logout</span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <button onClick={() => setShowLoginDialog(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-full transition-colors text-sm">
                        <LogIn className="w-4 h-4" />
                        Login
                      </button>
                    )}

                    <div className="hidden lg:flex items-center gap-3 font-bogle text-xs font-medium text-white/60 tracking-wide flex-wrap justify-end">
                        <a href="https://advigrow.online" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-2.5 py-1 rounded-full transition-colors">
                            <Heart className="w-3 h-3 text-red-400" />
                            <span>Powered by Advigrow</span>
                        </a>
                        <div className="h-3 w-px bg-white/20 mx-1 hidden sm:block"></div>
                        <span>TikTok:</span>
                        <a href="https://www.tiktok.com/@advigrow" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@advigrow</a>
                        <span>/</span>
                        <a href="https://www.tiktok.com/@roxaszm" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@roxaszm</a>
                        <div className="h-3 w-px bg-white/20 mx-1 hidden sm:block"></div>
                        <a href="https://www.instagram.com/advigrow" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
                        <div className="h-3 w-px bg-white/20 mx-1 hidden sm:block"></div>
                        <a href="https://twitter.com/advigrow" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
                        <div className="h-3 w-px bg-white/20 mx-1 hidden sm:block"></div>
                        <a href="https://www.youtube.com/@Trendbiz" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a>
                    </div>
                 </div>
            </div>
        </header>

        {/* Video Grid */}
        <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 pb-64 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            <AnimatePresence initial={false}>
              {feed.map((post) => (
                <VideoCard key={post.id} post={post} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <BottomPromptBar 
        onGenerate={handleGenerate} 
        onOpenSettings={() => setShowSettingsDialog(true)}
        comfyEnabled={!!comfyUrl}
      />
    </div>
  );
};

export default App;