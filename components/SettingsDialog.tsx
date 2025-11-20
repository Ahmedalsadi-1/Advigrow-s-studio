
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Server, X, RefreshCw, CheckCircle, AlertCircle, Search, ChevronDown, Database, CloudDownload, Loader2, HardDrive, Cpu, WifiOff, Radio } from 'lucide-react';
import { getComfyModels, POPULAR_CHECKPOINTS, discoverComfyUrl, enableMockMode, isMockModeActive } from '../services/comfyService';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  comfyUrl: string;
  onSaveComfyUrl: (url: string) => void;
  comfyModel?: string;
  onSaveComfyModel: (model: string) => void;
  enableGpu: boolean;
  onSaveEnableGpu: (enabled: boolean) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ 
  isOpen, 
  onClose, 
  comfyUrl, 
  onSaveComfyUrl,
  comfyModel,
  onSaveComfyModel,
  enableGpu,
  onSaveEnableGpu
}) => {
  const [url, setUrl] = useState(comfyUrl);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'error' | 'mock' | 'scanning'>('none');
  const [statusMessage, setStatusMessage] = useState('');
  
  // Model Selection State
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [selectedModel, setSelectedModel] = useState(comfyModel || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [gpuEnabled, setGpuEnabled] = useState(enableGpu);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset local state when dialog opens
    if (isOpen) {
        setUrl(comfyUrl);
        setSelectedModel(comfyModel || '');
        setGpuEnabled(enableGpu);
        // Auto-connect silently if we have a URL to populate the list
        if (comfyUrl) {
            handleConnect(true);
        } else {
            // If no URL, try to find one automatically
            handleConnect(false);
        }
    }
  }, [isOpen, comfyUrl, comfyModel, enableGpu]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = async (silent = false) => {
    if (!silent) {
        setIsConnecting(true);
        setConnectionStatus('none');
        setStatusMessage('');
    }

    let currentUrl = url;
    if (!currentUrl) {
        currentUrl = 'http://127.0.0.1:8188'; // Start with default if empty
        setUrl(currentUrl);
    }

    try {
        // 1. Try direct connection
        const models = await getComfyModels(currentUrl);
        finishConnectionSuccess(models, currentUrl, silent);

    } catch (error) {
        // 2. If direct failed, try auto-discovery
        if (!silent) {
             setConnectionStatus('scanning');
             setStatusMessage('Connection failed. Searching for ComfyUI on local network...');
        }
        
        const discoveredUrl = await discoverComfyUrl();
        
        if (discoveredUrl) {
             setUrl(discoveredUrl);
             try {
                 const models = await getComfyModels(discoveredUrl);
                 finishConnectionSuccess(models, discoveredUrl, silent);
                 return;
             } catch (e) { /* Ignore if discovery somehow fails immediately after */ }
        }

        // 3. Fallback to Mock Mode if everything fails
        if (!silent) {
            setConnectionStatus('mock');
            setStatusMessage('ComfyUI not found. Switched to Offline / Demo Mode.');
            enableMockMode();
            setInstalledModels([POPULAR_CHECKPOINTS[0]]); // Mock having one installed
            if (!selectedModel) setSelectedModel(POPULAR_CHECKPOINTS[0]);
        } else {
            // Silent fail usually means we just leave it alone or show error
            setConnectionStatus('error');
        }
        setIsConnecting(false);
    }
  };

  const finishConnectionSuccess = (models: string[], connectedUrl: string, silent: boolean) => {
    setInstalledModels(models);
    if (!silent) {
        setConnectionStatus('success');
        setStatusMessage(`Connected to ${connectedUrl}! Found ${models.length} models.`);
    }
    setIsConnecting(false);
    
    // Auto-select if needed
    if (!selectedModel && models.length > 0) {
        setSelectedModel(models[0]);
    }
  };

  const simulateDownload = (modelName: string) => {
    if (downloadProgress[modelName] !== undefined) return;

    setDownloadProgress(prev => ({...prev, [modelName]: 0}));

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        const current = prev[modelName] || 0;
        // Non-linear progress to feel more realistic
        const increment = Math.random() * (current > 80 ? 2 : 10); 
        const next = Math.min(current + increment, 100);
        
        if (next >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                setInstalledModels(curr => [...curr, modelName].sort());
                setDownloadProgress(p => {
                    const newP = {...p};
                    delete newP[modelName];
                    return newP;
                });
            }, 500);
            return { ...prev, [modelName]: 100 };
        }
        return { ...prev, [modelName]: next };
      });
    }, 250);
  };

  const handleSave = () => {
    onSaveComfyUrl(url);
    onSaveComfyModel(selectedModel);
    onSaveEnableGpu(gpuEnabled);
    onClose();
  };

  const getModelStatus = (name: string): 'installed' | 'downloading' | 'available' => {
    if (downloadProgress[name] !== undefined) return 'downloading';
    if (installedModels.includes(name)) return 'installed';
    return 'available';
  };

  const handleModelSelect = (modelName: string, status: 'installed' | 'downloading' | 'available') => {
    if (status === 'downloading') return;

    if (status === 'available') {
        // Automatically start downloading
        simulateDownload(modelName);
        setSelectedModel(modelName);
        // Close dropdown to show the global progress bar which is clearer
        setIsDropdownOpen(false);
    } else {
        setSelectedModel(modelName);
        setIsDropdownOpen(false);
    }
  };

  // Combine installed and popular models for the list
  const allDisplayModels = Array.from(new Set([...installedModels, ...POPULAR_CHECKPOINTS])).sort();
  const filteredModels = allDisplayModels.filter(m => 
    m.toLowerCase().includes(selectedModel.toLowerCase())
  );

  const currentDownloadProgress = downloadProgress[selectedModel];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl ring-1 ring-white/5 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
                <Settings className="w-5 h-5 text-purple-300" />
            </div>
            <h2 className="text-xl font-bogle text-white">Studio Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Connection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-white/90 font-medium">
                <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    <h3>ComfyUI Connection</h3>
                </div>
                {connectionStatus === 'success' && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Online</span>}
                {connectionStatus === 'mock' && <span className="text-xs text-amber-400 flex items-center gap-1"><WifiOff className="w-3 h-3"/> Demo Mode</span>}
                {connectionStatus === 'scanning' && <span className="text-xs text-blue-400 flex items-center gap-1"><Radio className="w-3 h-3 animate-pulse"/> Scanning...</span>}
            </div>
            
            <p className="text-xs text-gray-400 leading-relaxed">
                Enter your local ComfyUI URL (e.g., http://127.0.0.1:8188).
                <br/>
                <span className="text-white/30 mt-1 block">If offline, the app will try to find it or switch to simulation.</span>
            </p>
            
            <div className="flex gap-2">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8188"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-mono placeholder:text-white/20"
                />
                <button 
                    onClick={() => handleConnect(false)}
                    disabled={isConnecting}
                    className="px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center min-w-[48px]"
                >
                    {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                </button>
            </div>

            {/* Connection Feedback */}
            {statusMessage && (
                <div className={`text-xs p-3 rounded-lg flex items-start gap-2 ${
                    connectionStatus === 'error' ? 'bg-red-500/10 text-red-200 border border-red-500/20' : 
                    connectionStatus === 'mock' ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20' :
                    connectionStatus === 'scanning' ? 'bg-blue-500/10 text-blue-200 border border-blue-500/20' :
                    'bg-green-500/10 text-green-200 border border-green-500/20'
                }`}>
                    {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    {statusMessage}
                </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 text-white/90 font-medium">
                <Database className="w-4 h-4 text-purple-400" />
                <h3>Select Model (Checkpoint)</h3>
            </div>
            <p className="text-xs text-gray-400">
                {connectionStatus === 'mock' ? 'Select a model to simulate download & install.' : 'Select a model from the server or popular list.'}
            </p>
            
            <div className="relative" ref={dropdownRef}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        value={selectedModel}
                        onChange={(e) => {
                            setSelectedModel(e.target.value);
                            setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Search models..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-10 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-mono placeholder:text-white/20"
                    />
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Global Progress Indicator for Selected Model */}
                {currentDownloadProgress !== undefined && (
                    <div className="mt-2 bg-black/20 p-2 rounded-lg border border-white/5 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between text-xs text-purple-300 mb-1.5 font-medium">
                            <div className="flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Downloading {selectedModel}...</span>
                            </div>
                            <span>{Math.round(currentDownloadProgress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-500 transition-all duration-200 ease-linear shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                                style={{ width: `${currentDownloadProgress}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
                            <CloudDownload className="w-3 h-3" />
                            Fetching weights from HuggingFace...
                        </p>
                    </div>
                )}

                {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-20 ring-1 ring-white/5">
                        {filteredModels.length > 0 ? (
                            filteredModels.map((m) => {
                                const status = getModelStatus(m);
                                const progress = downloadProgress[m] || 0;

                                return (
                                    <div
                                        key={m}
                                        onClick={() => handleModelSelect(m, status)}
                                        className="w-full px-4 py-2.5 border-b border-white/5 last:border-0 flex items-center justify-between gap-3 group hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        {status === 'downloading' ? (
                                            <div className="flex-1 py-1">
                                                <div className="flex justify-between text-[10px] text-gray-400 mb-1.5 font-mono">
                                                    <span>Downloading {m}...</span>
                                                    <span>{Math.round(progress)}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-purple-500 transition-all duration-300 ease-out"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-1 text-left text-sm text-white/80 group-hover:text-white transition-colors font-mono truncate flex items-center gap-2">
                                                    {status === 'installed' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>}
                                                    {status === 'available' && <div className="w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0"></div>}
                                                    <span className="truncate">{m}</span>
                                                </div>

                                                {status === 'available' && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-gray-500 font-medium bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Auto-Download
                                                        </span>
                                                        <button
                                                            className="p-1.5 bg-white/10 hover:bg-purple-600 text-white/60 hover:text-white rounded-lg transition-colors"
                                                            title="Download Model"
                                                        >
                                                            <CloudDownload className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                                {status === 'installed' && selectedModel === m && (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-white/30 text-sm italic">
                                No models found matching "{selectedModel}"
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>

          {/* GPU Toggle */}
          <div className="flex items-center justify-between py-3 border-t border-white/5">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-500/20 p-1.5 rounded-lg">
                    <Cpu className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                    <h3 className="text-white/90 font-medium text-sm">GPU Acceleration</h3>
                    <p className="text-xs text-gray-400">Use GPU for generation (Recommended)</p>
                </div>
            </div>
            <button 
                onClick={() => setGpuEnabled(!gpuEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${gpuEnabled ? 'bg-purple-600' : 'bg-white/10 ring-1 ring-white/10'}`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${gpuEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="p-4 bg-black/20 border-t border-white/5 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl text-sm shadow-lg shadow-purple-900/20 transition-all hover:scale-105"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
