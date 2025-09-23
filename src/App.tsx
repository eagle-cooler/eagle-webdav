import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import eagleLogo from "./assets/eagle.png";
import viteLogo from "/vite.svg";

import { backgroundService } from "./services/background";

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
  endpoints: string[];
}

function App() {
    
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [autoStart, setAutoStart] = useState(false);

  
  useEffect(() => {
        // Ensure background service is initialized
    const initializeAndUpdate = async () => {
      try {
                await backgroundService.ensureInitialized();
                updateStatus();
                updateConnectionInfo();
                setAutoStart(backgroundService.getAutoStart());
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
      const info = await backgroundService.getConnectionInfo();
                  setConnectionInfo(info);
          } catch (error) {
      console.error('[DEBUG] Failed to get connection info:', error);
      // Set fallback connection info to prevent undefined errors
      const fallbackInfo = {
        url: 'http://localhost:41596',
        username: 'localhost',
        password: 'unavailable',
        endpoints: [
          'http://localhost:41596/files/{item-id}',
          'http://localhost:41596/folders/{folder-id}',
          'http://localhost:41596/index/{folder-path}'
        ]
      };
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

  const handleAutoStartToggle = () => {
    const newAutoStart = !autoStart;
    backgroundService.setAutoStart(newAutoStart);
    setAutoStart(newAutoStart);
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
        <div className="flex justify-center items-center gap-3 mb-4">
          <img src={viteLogo} className="w-8" alt="Vite logo" />
          <img src={reactLogo} className="w-8" alt="React logo" />
          <img src={eagleLogo} className="w-8" alt="Eagle logo" />
          <h1 className="text-xl font-bold">Eagle WebDAV Server</h1>
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

            {/* Settings Card - Compact */}
            <div className="card bg-base-200 shadow-lg">
              <div className="card-body p-4">
                <h2 className="card-title text-lg">Settings</h2>
                
                <div className="space-y-2">
                  <div className="form-control">
                    <label className="label cursor-pointer py-1">
                      <span className="label-text text-sm">Auto-start server</span>
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-primary checkbox-sm" 
                        checked={autoStart}
                        onChange={handleAutoStartToggle}
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer py-1">
                      <span className="label-text text-sm">Dark mode</span>
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-primary checkbox-sm" 
                        checked={mode === "dark"}
                        onChange={() => setMode(mode === "light" ? "dark" : "light")}
                      />
                    </label>
                  </div>
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

                  <div>
                    <label className="font-semibold block mb-1">Available Endpoints:</label>
                    <div className="space-y-1">
                      {(() => {
                                                                                                
                        if (!connectionInfo) {
                                                    return <div className="text-sm text-gray-500">Loading endpoints...</div>;
                        }
                        
                        if (!connectionInfo.endpoints) {
                                                    return <div className="text-sm text-gray-500">No endpoints property</div>;
                        }
                        
                        if (!Array.isArray(connectionInfo.endpoints)) {
                                                    return <div className="text-sm text-gray-500">Endpoints is not an array</div>;
                        }
                        
                                                return connectionInfo.endpoints.map((endpoint, index) => {
                                                    return (
                            <div key={index} className="flex gap-1">
                              <input 
                                type="text" 
                                value={endpoint || 'undefined endpoint'} 
                                readOnly 
                                className="input input-bordered input-sm flex-1 text-xs font-mono"
                              />
                              <button 
                                className="btn btn-outline btn-sm px-2"
                                onClick={() => copyToClipboard(endpoint || '')}
                              >
                                Copy
                              </button>
                            </div>
                          );
                        });
                      })()}
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
