import { eagleWebDAVServer } from "./webdav";

export interface ServiceStatus {
  running: boolean;
  port: number;
  host: string;
  startTime?: Date;
  error?: string;
}

export class BackgroundService {
  private startTime: Date | null = null;
  private autoStart: boolean = true;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize immediately, wait for Eagle to be ready
    this.delayedInit();
  }

  private async delayedInit(): Promise<void> {
    // Wait for Eagle to be available
    const checkEagle = () => {
      return new Promise<void>((resolve) => {
        const check = () => {
          if (typeof eagle !== "undefined" && eagle.event) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    };

    await checkEagle();
    await this.init();
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load auto-start preference
      const autoStartPref = localStorage.getItem("eagle-webdav-autostart");
      this.autoStart = autoStartPref !== "false";

      // Set up Eagle event listeners using the correct API
      eagle.event.onPluginRun(async () => {
        eagle.log.info("Eagle WebDAV Plugin activated");
        if (this.autoStart) {
          await this.start();
        }
      });

      eagle.event.onPluginBeforeExit(() => {
        eagle.log.info("Eagle WebDAV Plugin shutting down");
        this.stop();
      });

      eagle.event.onLibraryChanged(async (libraryPath: string) => {
        eagle.log.info(`Library changed to: ${libraryPath}`);
        // Restart server if running to reflect new library
        if (this.getStatus().running) {
          await this.restart();
        }
      });

      this.initialized = true;
      eagle.log.info("Eagle WebDAV background service initialized");
    } catch (error) {
      console.error("Failed to initialize background service:", error);
    }
  }

  // Public method to ensure initialization
  public async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.delayedInit();
    }
  }

  async start(): Promise<boolean> {
    try {
      if (typeof eagle === "undefined") {
        console.warn("Eagle API not available - cannot start WebDAV server");
        return false;
      }

      eagle.log.info("Starting Eagle WebDAV background service");

      const success = await eagleWebDAVServer.start();
      if (success) {
        this.startTime = new Date();
        eagle.log.info("Eagle WebDAV background service started successfully");

        // Show notification
        await eagle.notification.show({
          title: "Eagle WebDAV Server",
          description: `Server started on ${eagleWebDAVServer.serverInfo.host}:${eagleWebDAVServer.serverInfo.port}`,
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

      await eagleWebDAVServer.stop();
      this.startTime = null;

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
    if (typeof eagle !== "undefined") {
      eagle.log.info("Restarting Eagle WebDAV background service");
    }
    await this.stop();
    // Small delay to ensure clean shutdown
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return await this.start();
  }

  getStatus(): ServiceStatus {
    const serverInfo = eagleWebDAVServer.serverInfo;

    return {
      running: eagleWebDAVServer.running,
      port: serverInfo.port,
      host: serverInfo.host,
      startTime: this.startTime || undefined,
    };
  }

  setAutoStart(enabled: boolean): void {
    this.autoStart = enabled;
    localStorage.setItem("eagle-webdav-autostart", enabled.toString());
    if (typeof eagle !== "undefined") {
      eagle.log.info(`Auto-start ${enabled ? "enabled" : "disabled"}`);
    } else {
    }
  }

  getAutoStart(): boolean {
    return this.autoStart;
  }

  async getServerUrl(): Promise<string> {
    const status = this.getStatus();
    return `http://${status.host}:${status.port}`;
  }

  async getConnectionInfo(): Promise<{
    url: string;
    username: string;
    password: string;
    endpoints: string[];
  }> {
    try {
      const url = await this.getServerUrl();

      const serverInfo = eagleWebDAVServer.serverInfo;

      // Also check localStorage directly
      // const storedPassword = localStorage.getItem("eagle-webdav-password");

      // Get hostname for username
      const hostname =
        typeof eagle !== "undefined" && eagle.os
          ? eagle.os.hostname()
          : "localhost";

      const endpoints = [
        `${url}/files/{item-id}`,
        `${url}/folders/{folder-id}`,
        `${url}/index/{folder-path}`,
      ];

      const result = {
        url,
        username: hostname, // Use hostname as username
        password: serverInfo.password,
        endpoints,
      };
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
          error: "Service not running",
        };
      }

      const uptime = status.startTime
        ? Date.now() - status.startTime.getTime()
        : 0;

      return {
        healthy: true,
        uptime,
      };
    } catch (error) {
      return {
        healthy: false,
        error: String(error),
      };
    }
  }
}

export const backgroundService = new BackgroundService();
console.log("[DEBUG] backgroundService created:", backgroundService);
