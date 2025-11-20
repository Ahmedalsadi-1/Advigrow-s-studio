
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AnimatePresence, motion } from 'framer-motion';
import React, { useRef, useState, useEffect } from 'react';
import { AspectRatio, CameoProfile, GenerateVideoParams, GenerationMode, ImageFile, Resolution, VeoModel, VideoTemplate, EngineType } from '../types';
import { ArrowUp, Plus, User, Wand2, Settings2, Sparkles, Film, Zap } from 'lucide-react';

// Templates Data
const TEMPLATES: VideoTemplate[] = [
    { id: 'cinematic', label: 'Cinematic', description: 'High-end film look', thumbnail: '', color: 'from-amber-500 to-orange-700' },
    { id: 'anime', label: 'Anime', description: 'Studio Ghibli style', thumbnail: '', color: 'from-pink-500 to-rose-600' },
    { id: 'cyberpunk', label: 'Cyberpunk', description: 'Neon future', thumbnail: '', color: 'from-cyan-500 to-blue-700' },
    { id: 'claymation', label: 'Clay', description: 'Stop motion', thumbnail: '', color: 'from-emerald-500 to-teal-700' },
    { id: 'pixel', label: 'Pixel Art', description: '16-bit retro', thumbnail: '', color: 'from-purple-500 to-indigo-700' },
];

const defaultCameoProfiles: CameoProfile[] = [
  { id: '1', name: 'asr', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=asr&backgroundColor=transparent' },
  { id: '2', name: 'skirano', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=skirano&backgroundColor=transparent' },
  { id: '3', name: 'lc-99', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=lc99&backgroundColor=transparent' },
];

const examplePrompts = [
  "Vibecoding on a snowy mountain top...",
  "Skydiving over the crystal blue Bahamas...",
  "Discovering an ancient temple in the jungle...",
  "Sipping coffee in a cozy Parisian cafe...",
];

const fileToImageFile = (file: File): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1];
            if (base64) {
              resolve({file, base64});
            } else {
              reject(new Error('Failed to extract base64 data.'));
            }
        } else {
            reject(new Error('FileReader result is not a string.'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
};

const urlToImageFile = async (url: string): Promise<ImageFile> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        const file = new File([blob], 'cameo.png', { type: blob.type });
        resolve({ file, base64 });
      } else {
        reject(new Error("Failed to read image data as string"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface BottomPromptBarProps {
  onGenerate: (params: GenerateVideoParams) => void;
  onOpenSettings: () => void;
  comfyEnabled: boolean;
}

const BottomPromptBar: React.FC<BottomPromptBarProps> = ({ onGenerate, onOpenSettings, comfyEnabled }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [selectedCameoId, setSelectedCameoId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<EngineType>(EngineType.VEO);
  
  const [profiles, setProfiles] = useState<CameoProfile[]>(defaultCameoProfiles);
  const [profileImages, setProfileImages] = useState<Record<string, ImageFile>>({});
  const uploadedImageUrlsRef = useRef<string[]>([]);
  
  const [promptIndex, setPromptIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node) && prompt === '' && !selectedCameoId) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [prompt, selectedCameoId]);

  useEffect(() => {
    return () => {
        uploadedImageUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (prompt !== '') return;
    const interval = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % examplePrompts.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [prompt]);

  const handleFocus = () => setIsExpanded(true);

  const handleCameoSelect = (id: string) => {
    setSelectedCameoId(selectedCameoId === id ? null : id);
    if (!isExpanded) setIsExpanded(true);
  };

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(selectedTemplateId === id ? null : id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imgFile = await fileToImageFile(file);
        const newId = `user-${Date.now()}`;
        const objectUrl = URL.createObjectURL(file);
        uploadedImageUrlsRef.current.push(objectUrl);

        const newProfile: CameoProfile = { id: newId, name: 'You', imageUrl: objectUrl };
        setProfiles(prev => [newProfile, ...prev]);
        setProfileImages(prev => ({ ...prev, [newId]: imgFile }));
        setSelectedCameoId(newId);
        if (!isExpanded) setIsExpanded(true);
      } catch (error) {
        console.error("Error uploading file", error);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fillPrompt = () => {
      const currentPrompt = examplePrompts[promptIndex];
      setPrompt(currentPrompt);
      if (inputRef.current) {
          inputRef.current.focus();
          setTimeout(() => {
              if (inputRef.current) {
                  inputRef.current.style.height = 'auto';
                  inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
              }
          }, 0);
      }
  };

  const getProfileImage = async (profile: CameoProfile): Promise<ImageFile> => {
    if (profileImages[profile.id]) return profileImages[profile.id];
    const imgFile = await urlToImageFile(profile.imageUrl);
    setProfileImages(prev => ({ ...prev, [profile.id]: imgFile }));
    return imgFile;
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    let mode = GenerationMode.TEXT_TO_VIDEO;
    let referenceImages: ImageFile[] | undefined = undefined;
    let currentAspectRatio = AspectRatio.PORTRAIT;

    if (selectedCameoId) {
      mode = GenerationMode.REFERENCES_TO_VIDEO;
      currentAspectRatio = AspectRatio.LANDSCAPE; // Required for ref images in Veo
      const cameo = profiles.find(c => c.id === selectedCameoId);
      if (cameo) {
        try {
            const imgFile = await getProfileImage(cameo);
            referenceImages = [imgFile];
        } catch (e) {
            console.error("Failed to load cameo image", e);
            return;
        }
      }
    }

    const params: GenerateVideoParams = {
      prompt,
      model: selectedEngine === EngineType.VEO ? VeoModel.VEO : VeoModel.VEO_FAST, // Simplified selection
      aspectRatio: currentAspectRatio,
      resolution: Resolution.P720,
      mode: mode,
      referenceImages: referenceImages,
      engine: selectedEngine,
      templateId: selectedTemplateId || undefined,
    };

    onGenerate(params);
    setPrompt('');
    if (inputRef.current) {
        inputRef.current.style.height = '28px';
        inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Tab' && prompt === '' && isExpanded) {
        e.preventDefault();
        fillPrompt();
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedCameoId);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none mb-6">
      <motion.div
        ref={barRef}
        className="w-full max-w-2xl mx-4 bg-neutral-900/95 border border-white/10 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-auto relative ring-1 ring-white/5 group rounded-[32px]"
        initial={false}
        animate={{ height: 'auto' }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="px-3 pt-3 space-y-2"
            >
              {/* Engine & Settings Row */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                    <button 
                        onClick={() => setSelectedEngine(EngineType.VEO)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${selectedEngine === EngineType.VEO ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        <Film className="w-3 h-3" />
                        Veo
                    </button>
                    <button 
                         onClick={() => setSelectedEngine(EngineType.COMFY_UI)}
                         className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${selectedEngine === EngineType.COMFY_UI ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-white/40 hover:text-white'}`}
                    >
                        <Zap className="w-3 h-3" />
                        ComfyUI
                    </button>
                </div>
                <button onClick={onOpenSettings} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors">
                    <Settings2 className="w-4 h-4" />
                </button>
              </div>

              {/* Controls Container */}
              <div className="grid grid-cols-[auto_1fr] gap-2">
                
                {/* Cameos (Faces) */}
                <div className="bg-black/40 rounded-2xl p-2 border border-white/5 shadow-inner flex flex-col justify-center min-w-[140px]">
                    <div className="flex items-center gap-2 mb-1 px-2 text-white/70 pt-1">
                        <User className="w-3 h-3" />
                        <p className="text-[9px] font-bold uppercase tracking-wider font-sans text-white/50">Subject</p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar items-center px-2 py-1">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-10 h-10 shrink-0 rounded-lg border border-dashed border-white/20 hover:border-white/60 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                        </button>
                        {profiles.slice(0, 3).map((profile) => (
                            <button
                            key={profile.id}
                            onClick={() => handleCameoSelect(profile.id)}
                            className={`w-10 h-10 shrink-0 rounded-lg overflow-hidden relative transition-all ${selectedCameoId === profile.id ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : 'opacity-50 hover:opacity-100'}`}
                            >
                            <img src={profile.imageUrl} alt={profile.name} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Templates (Styles) */}
                <div className="bg-black/40 rounded-2xl p-2 border border-white/5 shadow-inner overflow-hidden">
                    <div className="flex items-center gap-2 mb-1 px-2 text-white/70 pt-1">
                        <Wand2 className="w-3 h-3" />
                        <p className="text-[9px] font-bold uppercase tracking-wider font-sans text-white/50">Workflow / Style</p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar items-center px-2 py-1">
                        {TEMPLATES.map((tpl) => (
                            <button
                                key={tpl.id}
                                onClick={() => handleTemplateSelect(tpl.id)}
                                className={`h-10 px-3 shrink-0 rounded-lg border transition-all flex items-center gap-2 group ${
                                    selectedTemplateId === tpl.id 
                                    ? `bg-gradient-to-r ${tpl.color} border-white/20 text-white shadow-lg` 
                                    : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/10'
                                }`}
                            >
                                <span className="text-xs font-medium tracking-wide">{tpl.label}</span>
                                {selectedTemplateId === tpl.id && <Sparkles className="w-3 h-3 animate-pulse" />}
                            </button>
                        ))}
                    </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar */}
        <div className={`flex items-end gap-3 px-3 pb-3 relative transition-all ${isExpanded ? 'pt-3' : 'pt-3'}`}>
          <button 
            onClick={() => {
                setIsExpanded(!isExpanded);
                if (!isExpanded) setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 shrink-0 shadow-lg ${isExpanded ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10 rotate-45' : 'text-white bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-105 shadow-[0_0_15px_rgba(99,102,241,0.5)]'}`}
          >
            <Plus className={`w-5 h-5`} />
          </button>
          
          <div className="flex-grow relative py-2 flex items-center">
            <AnimatePresence mode="wait">
              {prompt === '' && isExpanded && (
                <motion.div
                  key={examplePrompts[promptIndex]}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute inset-y-0 left-0 flex items-center w-full pointer-events-none pr-2"
                >
                  <span className="text-white/40 text-lg font-light font-sans tracking-wide truncate flex-grow">
                    {examplePrompts[promptIndex]}
                  </span>
                  <button onClick={fillPrompt} className="ml-2 px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-white/50 pointer-events-auto">TAB</button>
                </motion.div>
              )}
            </AnimatePresence>

            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={!isExpanded ? "Describe the scene..." : ""}
              className={`w-full bg-transparent text-white outline-none resize-none overflow-hidden py-0.5 leading-relaxed text-lg font-light font-sans tracking-wide relative z-10 placeholder:text-white/40 ${prompt === '' && isExpanded ? 'opacity-0 focus:opacity-100' : ''}`}
              style={{ height: '28px' }}
            />
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pb-0.5">
            <AnimatePresence>
                {selectedCameoId && selectedProfile && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="h-11 w-8 rounded-lg overflow-hidden border border-white/20">
                        <img src={selectedProfile.imageUrl} className="w-full h-full object-cover" />
                    </motion.div>
                )}
            </AnimatePresence>
            
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 ${
                prompt.trim()
                  ? 'bg-white text-black hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BottomPromptBar;
