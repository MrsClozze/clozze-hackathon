import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import clozzeLogo from '@/assets/clozze-logo.png';
import clozzeLogoBlack from '@/assets/clozze-logo-black.png';

/**
 * DotloopCallback page - handles the OAuth callback redirect
 * 
 * This page is shown in the popup after Dotloop redirects back with the authorization code.
 * It displays a clean Clozze-branded UI while the parent window processes the connection.
 */
export default function DotloopCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'denied' | 'error'>('processing');
  const [message, setMessage] = useState('Completing your Dotloop connection...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dotloopStatus = params.get('dotloop');
    const error = params.get('error');

    // Determine status from URL params
    if (error || dotloopStatus === 'error') {
      setStatus('error');
      setMessage('There was a problem connecting to Dotloop. Please close this window and try again.');
    } else if (dotloopStatus === 'denied') {
      setStatus('denied');
      setMessage('You chose not to connect Dotloop. This window will close automatically.');
    } else if (dotloopStatus === 'success') {
      setStatus('success');
      setMessage('Your Dotloop account has been linked successfully. This window will close automatically.');
    }

    // Notify parent window and close
    if (window.opener) {
      try {
        window.opener.postMessage(
          { type: 'dotloop-callback', url: window.location.href },
          '*'
        );
      } catch (e) {
        console.error('Failed to post message to opener:', e);
      }
    }

    // Auto-close after a brief delay (unless error)
    if (dotloopStatus === 'success' || dotloopStatus === 'denied') {
      const timer = setTimeout(() => {
        window.close();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const statusConfig = {
    processing: {
      icon: <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />,
      title: 'Connecting...',
      bgClass: 'bg-white',
      textClass: 'text-gray-900',
      subtextClass: 'text-gray-600',
    },
    success: {
      icon: <CheckCircle className="w-10 h-10 text-green-600" />,
      title: 'Connected!',
      bgClass: 'bg-white',
      textClass: 'text-gray-900',
      subtextClass: 'text-gray-600',
    },
    denied: {
      icon: <XCircle className="w-10 h-10 text-orange-500" />,
      title: 'Connection Cancelled',
      bgClass: 'bg-white',
      textClass: 'text-gray-900',
      subtextClass: 'text-gray-600',
    },
    error: {
      icon: <AlertTriangle className="w-10 h-10 text-red-500" />,
      title: 'Connection Failed',
      bgClass: 'bg-white',
      textClass: 'text-gray-900',
      subtextClass: 'text-gray-600',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`min-h-screen ${config.bgClass} flex flex-col items-center justify-center p-6`}>
      {/* Clozze Logo - Prominent branding */}
      <div className="mb-10">
        <img 
          src={clozzeLogoBlack} 
          alt="Clozze" 
          className="h-16 w-auto"
        />
      </div>

      {/* Status Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
        <div className="flex justify-center mb-4">
          {config.icon}
        </div>
        <h1 className={`text-xl font-semibold ${config.textClass} mb-2`}>
          {config.title}
        </h1>
        <p className={`${config.subtextClass} text-sm leading-relaxed`}>
          {message}
        </p>
        {status === 'processing' && (
          <p className="text-gray-400 text-xs mt-4">
            Exchanging authorization...
          </p>
        )}
        {status === 'error' && (
          <button
            onClick={() => window.close()}
            className="mt-6 px-4 py-2 bg-[#D4AF37] hover:bg-[#C4A030] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Close Window
          </button>
        )}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-400">
        Securely powered by Clozze
      </p>
    </div>
  );
}