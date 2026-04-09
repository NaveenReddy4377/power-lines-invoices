'use client';

import { useState, useEffect } from 'react';
import { WifiOff, CloudUpload, CheckCircle, RefreshCw } from 'lucide-react';
import { getPendingOfflineCount, syncOfflineData } from '@/app/actions';

export default function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOffline(!navigator.onLine);

    const checkPending = async () => {
      try {
        const count = await getPendingOfflineCount();
        setPendingCount(count);
      } catch (e) {
        console.error(e);
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      checkPending();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncOfflineData();
      if (res.success) {
        // Optimistically set to 0, though the interval will catch it
        setPendingCount(0);
        alert(res.message);
      } else {
        alert(res.error || 'Failed to sync.');
        // fetch real count in case some succeeded
        const count = await getPendingOfflineCount();
        setPendingCount(count);
      }
    } catch (error: any) {
      alert('Error during sync: ' + error.message);
      const count = await getPendingOfflineCount();
      setPendingCount(count);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOffline && pendingCount === 0) return null;

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 w-full bg-orange-600 text-white text-xs sm:text-sm font-bold text-center py-1.5 px-4 z-[100] flex items-center justify-center gap-2 print:hidden shadow-lg animate-in slide-in-from-top duration-300">
        <WifiOff className="w-4 h-4" /> 
        <span>No Internet Connection - Operating in Offline Mode. Documents are saved locally.</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 w-full bg-blue-600 text-white text-xs sm:text-sm font-bold text-center py-1.5 px-4 z-[100] flex items-center justify-center gap-4 print:hidden shadow-lg animate-in slide-in-from-top duration-300">
        <div className="flex items-center gap-2">
           <CloudUpload className="w-4 h-4" />
           <span>You have {pendingCount} item{pendingCount > 1 ? 's' : ''} saved locally that need to be synced to Google Sheets.</span>
        </div>
        <button 
           onClick={handleSync}
           disabled={isSyncing}
           className="bg-white text-blue-700 px-3 py-1 rounded shadow-sm text-xs font-bold border border-white/20 hover:bg-blue-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <CheckCircle className="w-3.5 h-3.5" />}
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    );
  }

  return null;
}
