import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import eagleLogo from "./assets/eagle.png";
import viteLogo from "/vite.svg";

import { backgroundService } from "./webdav/background";

interface ServiceStatus {
  running: boolean;
  port: number;
  host: string;
  startTime?: Date;
  error?: string;
}

interface ConnectionInfo {
  url: string;
  username: string;
  password: string;
}

function App() {
    
  const mode = "dark"; // Just use dark theme
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);

  
  useEffect(() => {
    // Initialize and update status
    const initializeAndUpdate = async () => {
      try {
        // Background service initialization is handled by init.ts
        // Just update the UI state
        
        updateStatus();
        updateConnectionInfo();
      } catch (error) {
        console.error('[DEBUG] Failed to initialize service:', error);
      }
    };

    initializeAndUpdate();

    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = () => {
        try {
      const currentStatus = backgroundService.getStatus();
            setStatus(currentStatus);
          } catch (error) {
      console.error('[DEBUG] Error in updateStatus:', error);
    }
  };

  const updateConnectionInfo = async () => {
        try {
      console.log('[DEBUG] Attempting to get connection info...');
      const info = await backgroundService.getConnectionInfo();
      console.log('[DEBUG] Connection info received:', info);
                  setConnectionInfo(info);
          } catch (error) {
      console.error('[DEBUG] Failed to get connection info:', error);
      // Set fallback connection info to prevent undefined errors
      const fallbackInfo = {
        url: 'http://localhost:41596',
        username: 'localhost',
        password: 'unavailable'
      };
      console.log('[DEBUG] Using fallback connection info:', fallbackInfo);
            setConnectionInfo(fallbackInfo);
    }
  };

  const handleStart = async () => {
    const success = await backgroundService.start();
    if (success) {
      updateStatus();
      updateConnectionInfo();
    }
  };

  const handleStop = async () => {
    await backgroundService.stop();
    updateStatus();
  };

  const handleRestart = async () => {
    const success = await backgroundService.restart();
    if (success) {
      updateStatus();
      updateConnectionInfo();
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof eagle !== 'undefined' && eagle.clipboard) {
      eagle.clipboard.writeText(text);
      eagle.notification.show({
        title: 'Copied',
        description: 'Text copied to clipboard',
        duration: 1500
      });
    } else {
      // Fallback for non-Eagle environment
      navigator.clipboard.writeText(text).then(() => {
              }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  };

  return (
    <div
      data-theme={mode}
      className="w-full h-screen p-4 bg-base-100 text-base-content overflow-hidden"
    >
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        {/* Header - More compact */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex justify-center items-center gap-3">
            <img src={viteLogo} className="w-8" alt="Vite logo" />
            <img src={reactLogo} className="w-8" alt="React logo" />
            <img src={eagleLogo} className="w-8" alt="Eagle logo" />
            <h1 className="text-xl font-bold">Eagle WebDAV Server</h1>
          </div>
          
          {/* Theme indicator (read-only, follows Eagle) */}
          <div className="flex items-center gap-2 text-sm opacity-60">
            {mode === 'dark' ? (
              <svg className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/></svg>
            ) : (
              <svg className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/></svg>
            )}
            <span>Theme follows Eagle</span>
          </div>
        </div>

        {/* Content in a flex container */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          
          {/* Left Column */}
          <div className="space-y-4">
            {/* Server Status Card - Compact */}
            <div className="card bg-base-200 shadow-lg">
              <div className="card-body p-4">
                <h2 className="card-title text-lg">
                  Server Status
                  <div className={`badge badge-sm ${status?.running ? 'badge-success' : 'badge-error'}`}>
                    {status?.running ? 'Running' : 'Stopped'}
                  </div>
                </h2>
                
                {status && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">Host:</span> {status.host}
                    </div>
                    <div>
                      <span className="font-semibold">Port:</span> {status.port}
                    </div>
                    {status.startTime && (
                      <div className="col-span-2">
                        <span className="font-semibold">Started:</span> {status.startTime.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}

                <div className="card-actions justify-end mt-3">
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={handleStart}
                    disabled={status?.running}
                  >
                    Start
                  </button>
                  <button 
                    className="btn btn-error btn-sm" 
                    onClick={handleStop}
                    disabled={!status?.running}
                  >
                    Stop
                  </button>
                  <button 
                    className="btn btn-warning btn-sm" 
                    onClick={handleRestart}
                    disabled={!status?.running}
                  >
                    Restart
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Connection Info */}
          {(() => {
                        return connectionInfo;
          })() && (
            <div className="card bg-base-200 shadow-lg">
              <div className="card-body p-4">
                <h2 className="card-title text-lg">Connection Information</h2>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="font-semibold block mb-1">Server URL:</label>
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        value={connectionInfo?.url || ''} 
                        readOnly 
                        className="input input-bordered input-sm flex-1 text-xs font-mono"
                      />
                      <button 
                        className="btn btn-outline btn-sm px-2"
                        onClick={() => copyToClipboard(connectionInfo?.url || '')}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold block mb-1">Username:</label>
                      <div className="flex gap-1">
                        <input 
                          type="text" 
                          value={connectionInfo?.username || ''} 
                          readOnly 
                          className="input input-bordered input-sm flex-1 text-xs font-mono"
                        />
                        <button 
                          className="btn btn-outline btn-sm px-2"
                          onClick={() => copyToClipboard(connectionInfo?.username || '')}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Password:</label>
                      <div className="flex gap-1">
                        <input 
                          type="password" 
                          value={connectionInfo?.password || ''} 
                          readOnly 
                          className="input input-bordered input-sm flex-1 text-xs font-mono"
                        />
                        <button 
                          className="btn btn-outline btn-sm px-2"
                          onClick={() => copyToClipboard(connectionInfo?.password || '')}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
