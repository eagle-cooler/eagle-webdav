import { EagleWebDAVServer } from "./server";

export interface ServiceStatus {
  running: boolean;
  port: number;
  host: string;
  startTime?: Date;
  error?: string;
}

export class BackgroundService {
  private static instance: BackgroundService | null = null;
  private startTime: Date | null = null;
  private eagleWebDAVServer = EagleWebDAVServer.getInstance();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): BackgroundService {
    if (!BackgroundService.instance) {
      BackgroundService.instance = new BackgroundService();
    }
    return BackgroundService.instance;
  }

  // Simple initialization - just setup the Eagle event
  init(): void {
    if (typeof eagle !== 'undefined' && eagle.event) {
      eagle.event.onPluginCreate(async () => {
        console.log('[DEBUG] Eagle Plugin Run - checking auto-start');
        eagle.log.info("Eagle WebDAV Plugin activated");
        
        // Check if should auto-start
        const serverStatePref = localStorage.getItem("eagle-webdav-server-state");
        const shouldAutoStart = serverStatePref !== "stopped";
        
        console.log(`[DEBUG] Server state: ${serverStatePref || "not set"}, auto-start: ${shouldAutoStart}`);
        
        if (shouldAutoStart) {
          console.log('[DEBUG] Auto-starting server');
          await this.start();
        }
      });

      eagle.event.onPluginBeforeExit(() => {
        eagle.log.info("Eagle WebDAV Plugin shutting down");
        this.stop();
      });
    }
  }

  async start(): Promise<boolean> {
    try {
      if (typeof eagle === "undefined") {
        console.warn("Eagle API not available - cannot start WebDAV server");
        return false;
      }

      eagle.log.info("Starting Eagle WebDAV background service");

      const success = await this.eagleWebDAVServer.start();
      if (success) {
        this.startTime = new Date();
        
        // Record that server is running
        localStorage.setItem("eagle-webdav-server-state", "running");
        
        eagle.log.info("Eagle WebDAV background service started successfully");

        // Show notification
        await eagle.notification.show({
          title: "Eagle WebDAV Server",
          description: `Server started on ${this.eagleWebDAVServer.getServerInfo().config.host}:${this.eagleWebDAVServer.getServerInfo().config.port}`,
          duration: 3000,
        });
      }

      return success;
    } catch (error) {
      if (typeof eagle !== "undefined") {
        eagle.log.error(`Failed to start background service: ${error}`);
      } else {
        console.error(`Failed to start background service: ${error}`);
      }
      return false;
    }
  }

  async stop(): Promise<void> {
    try {
      if (typeof eagle !== "undefined") {
        eagle.log.info("Stopping Eagle WebDAV background service");
      }

      await this.eagleWebDAVServer.stop();
      this.startTime = null;
      
      // Record that user manually stopped the server
      localStorage.setItem("eagle-webdav-server-state", "stopped");

      if (typeof eagle !== "undefined") {
        eagle.log.info("Eagle WebDAV background service stopped");

        // Show notification
        await eagle.notification.show({
          title: "Eagle WebDAV Server",
          description: "Server stopped",
          duration: 2000,
        });
      }
    } catch (error) {
      if (typeof eagle !== "undefined") {
        eagle.log.error(`Error stopping background service: ${error}`);
      } else {
        console.error(`Error stopping background service: ${error}`);
      }
    }
  }

  async restart(): Promise<boolean> {
    await this.stop();
    // Small delay to ensure clean shutdown
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return await this.start();
  }

  getStatus(): ServiceStatus {
    const serverInfo = this.eagleWebDAVServer.getServerInfo();

    return {
      running: serverInfo.isRunning,
      port: serverInfo.config.port,
      host: serverInfo.config.host,
      startTime: this.startTime || undefined,
    };
  }

  // Auto-start is now managed automatically based on server state
  // No manual toggle needed - server remembers if user stopped it

  async getServerUrl(): Promise<string> {
    const status = this.getStatus();
    return `http://${status.host}:${status.port}`;
  }

  async getConnectionInfo(): Promise<{
    url: string;
    username: string;
    password: string;
  }> {
    try {
      console.log('[DEBUG] getConnectionInfo() called');
      const url = await this.getServerUrl();
      console.log('[DEBUG] Server URL:', url);

      const serverInfo = this.eagleWebDAVServer.getServerInfo();
      console.log('[DEBUG] Server info:', serverInfo);

      // Get hostname for username
      const hostname =
        typeof eagle !== "undefined" && eagle.os
          ? eagle.os.hostname()
          : "localhost";
      console.log('[DEBUG] Hostname:', hostname);

      const result = {
        url,
        username: hostname, // Use hostname as username
        password: serverInfo.password || serverInfo.config?.password || 'no-password-found',
      };
      console.log('[DEBUG] Final connection info result:', result);
      return result;
    } catch (error) {
      console.error("[DEBUG] Error in getConnectionInfo:", error);
      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    healthy: boolean;
    uptime?: number;
    error?: string;
  }> {
    try {
      const status = this.getStatus();

      if (!status.running) {
        return {
          healthy: false,
          error: "WebDAV server is not running",
        };
      }

      const uptime = status.startTime
        ? Date.now() - status.startTime.getTime()
        : undefined;

      return {
        healthy: true,
        uptime,
      };
    } catch (error) {
      return {
        healthy: false,
        error: `Health check failed: ${error}`,
      };
    }
  }
}

// Create singleton instance
export const backgroundService = BackgroundService.getInstance();
