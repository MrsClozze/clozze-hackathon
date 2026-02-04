import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * DotloopCallback page - handles the OAuth callback redirect
 * 
 * This page is shown in the popup after Dotloop redirects back with the authorization code.
 * It displays a clean UI while the parent window processes the connection.
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
      icon: <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />,
      title: 'Connecting...',
      bgGradient: 'from-slate-900 to-slate-800',
    },
    success: {
      icon: <CheckCircle className="w-12 h-12 text-green-400" />,
      title: 'Connected!',
      bgGradient: 'from-green-900/50 to-slate-900',
    },
    denied: {
      icon: <XCircle className="w-12 h-12 text-orange-400" />,
      title: 'Connection Cancelled',
      bgGradient: 'from-orange-900/50 to-slate-900',
    },
    error: {
      icon: <AlertTriangle className="w-12 h-12 text-red-400" />,
      title: 'Connection Failed',
      bgGradient: 'from-red-900/50 to-slate-900',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} flex items-center justify-center p-4`}>
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-white/10">
        <div className="flex justify-center mb-4">
          {config.icon}
        </div>
        <h1 className="text-2xl font-semibold text-white mb-3">
          {config.title}
        </h1>
        <p className="text-white/80 text-sm leading-relaxed">
          {message}
        </p>
        {status === 'processing' && (
          <p className="text-white/50 text-xs mt-4">
            Exchanging authorization code for access tokens...
          </p>
        )}
        {status === 'error' && (
          <button
            onClick={() => window.close()}
            className="mt-6 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            Close Window
          </button>
        )}
      </div>
    </div>
  );
}
