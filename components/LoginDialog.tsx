

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { User, X } from 'lucide-react';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (provider: 'google' | 'github' | 'discord' | 'twitter') => void;
}

const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    <path fill="none" d="M1 1h22v22H1z"/>
  </svg>
);

const GitHubIcon: React.FC = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
);

const DiscordIcon: React.FC = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.36981C18.7915 3.74625 17.1826 3.2841 15.5243 3.01691C15.2955 3.42784 15.0428 3.88674 14.8383 4.36981C13.2265 4.0533 11.6117 4.0533 10.0028 4.36981C9.79839 3.88674 9.54565 3.42784 9.31686 3.01691C7.65859 3.2841 6.04968 3.74625 4.52422 4.36981C3.23844 7.2185 2.82245 9.98634 3.15589 12.6843C4.24652 13.5649 5.43715 14.238 6.53073 14.7739C6.37284 15.0026 6.21789 15.2283 6.06587 15.4511C5.23215 15.1971 4.45155 14.8395 3.72385 14.382C3.58596 14.5366 3.45099 14.6883 3.31896 14.837C2.43323 15.637 1.76019 16.5905 1.25841 17.6521C2.98188 18.986 4.96284 19.9532 7.10777 20.522C7.54225 19.8974 7.92817 19.2329 8.26161 18.5316C7.42789 18.2776 6.64729 17.92 5.91959 17.4625C6.07161 17.2397 6.22363 17.017 6.37284 16.7913C7.66155 17.4361 9.10237 17.8933 10.6309 18.118C11.0264 18.6625 11.4947 19.1414 12.0115 19.5393C12.5284 19.1414 12.9967 18.6625 13.3921 18.118C14.8722 17.8933 16.2917 17.4361 17.5804 16.7913C17.7296 17.017 17.8816 17.2397 18.0336 17.4625C17.3059 17.92 16.5253 18.2776 15.6916 18.5316C16.0251 19.2329 16.411 19.8974 16.8455 20.522C18.9875 19.9532 20.9714 18.986 22.6949 17.6521C22.1931 16.5905 21.5171 15.637 20.6314 14.837C20.5023 14.6883 20.3644 14.5366 20.2265 14.382C19.4988 14.8395 18.7182 15.1971 17.8845 15.4511C17.7325 15.2283 17.5775 15.0026 17.4196 14.7739C18.5103 14.238 19.7009 13.5649 20.7915 12.6843C21.1775 9.98634 20.7615 7.2185 19.4757 4.36981H20.317Z M7.99933 11.0234C8.66311 11.0234 9.20448 10.4856 9.20448 9.82658C9.20448 9.16757 8.66311 8.62973 7.99933 8.62973C7.33555 8.62973 6.79419 9.16757 6.79419 9.82658C6.79419 10.4856 7.33555 11.0234 7.99933 11.0234Z M15.9998 11.0234C16.6636 11.0234 17.205 10.4856 17.205 9.82658C17.205 9.16757 16.6636 8.62973 15.9998 8.62973C15.336 8.62973 14.7947 9.16757 14.7947 9.82658C14.7947 10.4856 15.336 11.0234 15.9998 11.0234Z"/>
    </svg>
);

const XIcon: React.FC = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
        <path d="M9.293 6.953L14.632 1h-1.32L9.039 6.183L5.618 1H1.455l5.638 7.974L1.368 15h1.32l4.577-5.18L11.382 15h4.162L9.292 6.953h.001Z M7.143 8.324L6.61 7.625L2.345 2.05h1.954l3.85 4.54l.533.7l4.49 5.98h-1.954L7.143 8.324Z"/>
    </svg>
);

const LoginDialog: React.FC<LoginDialogProps> = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-sm w-full p-8 text-center flex flex-col items-center ring-1 ring-white/5 relative overflow-hidden">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors rounded-full">
            <X className="w-5 h-5"/>
        </button>

        <div className="bg-white/5 p-5 rounded-full mb-6 ring-1 ring-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] relative z-10">
          <User className="w-8 h-8 text-white opacity-90" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3 font-bogle tracking-wide drop-shadow-md">Join the Studio</h2>
        <p className="text-gray-300 mb-8 text-sm leading-relaxed font-light">
          Sign in to create, share, and save your video masterpieces.
        </p>
        
        <div className="w-full space-y-3">
            <button onClick={() => onLogin('google')} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-colors text-sm">
                <GoogleIcon />
                Sign in with Google
            </button>
            <button onClick={() => onLogin('github')} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#24292e] hover:bg-[#343a40] text-white font-bold rounded-xl transition-colors text-sm">
                <GitHubIcon />
                Sign in with GitHub
            </button>
            <button onClick={() => onLogin('discord')} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#5865F2] hover:bg-[#4a56d4] text-white font-bold rounded-xl transition-colors text-sm">
                <DiscordIcon />
                Sign in with Discord
            </button>
            <button onClick={() => onLogin('twitter')} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#000000] hover:bg-[#1f1f1f] border border-white/20 text-white font-bold rounded-xl transition-colors text-sm">
                <XIcon />
                Sign in with X
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoginDialog;
