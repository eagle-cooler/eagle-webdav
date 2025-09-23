const http = require('http');
const url = require('url');

// Import modular components
import { WebDAVServerConfig } from './types';
import { authenticateWebDAV, getServerCredentials } from './auth/auth';
import { handleFolderGET, handleFolderPROPFIND } from './routes/folders';
import { handleAllItemsGET, handleAllItemsPROPFIND } from './routes/allItems';
import { getRootContainer, getFileById } from './eagleUtils';
import { generateFolderContentXML } from './routes/folders/xml';

// Re-export types for backward compatibility
export type { WebDAVServerConfig, EagleWebDAVFile, EagleWebDAVFolder } from './types';

export class EagleWebDAVServer {
  private static instance: EagleWebDAVServer | null = null;
  private httpServer: any = null;
  private config!: WebDAVServerConfig;
  private isRunning = false;

  constructor() {
    if (EagleWebDAVServer.instance) {
      return EagleWebDAVServer.instance;
    }
    
    const { password } = getServerCredentials();
    
    this.config = {
      port: 41596,
      host: 'localhost',
      password: password
    };
    
    EagleWebDAVServer.instance = this;
  }

  static getInstance(): EagleWebDAVServer {
    if (!EagleWebDAVServer.instance) {
      EagleWebDAVServer.instance = new EagleWebDAVServer();
    }
    return EagleWebDAVServer.instance;
  }

  async start(): Promise<boolean> {
    console.log(await eagle.library.info());
    try {
      if (typeof eagle !== 'undefined') {
        eagle.log.info(`Starting Eagle WebDAV server on ${this.config.host}:${this.config.port}`);
      }
      
      // Create HTTP server
      this.httpServer = http.createServer((req: any, res: any) => {
        this.handleRequest(req, res);
      });
      
      // Start HTTP server
      return new Promise((resolve) => {
        this.httpServer!.listen(this.config.port, () => {
          this.isRunning = true;
          if (typeof eagle !== 'undefined') {
            eagle.log.info(`Eagle WebDAV server started successfully on port ${this.config.port}`);
          }
          resolve(true);
        });
        
        this.httpServer!.on('error', (error: any) => {
          if (typeof eagle !== 'undefined') {
            eagle.log.error(`Failed to start server: ${error.message}`);
          } else {
            console.error(`Failed to start server: ${error.message}`);
          }
          resolve(false);
        });
      });
    } catch (error) {
      if (typeof eagle !== 'undefined') {
        eagle.log.error(`Failed to start WebDAV server: ${error}`);
      } else {
        console.error(`Failed to start WebDAV server: ${error}`);
      }
      this.isRunning = false;
      return false;
    }
  }

  async stop(): Promise<void> {
    if (this.httpServer && this.isRunning) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          this.isRunning = false;
          if (typeof eagle !== 'undefined') {
            eagle.log.info('Eagle WebDAV server stopped');
          }
          resolve();
        });
      });
    }
  }

  private async handleRequest(req: any, res: any): Promise<void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Basic authentication
    if (!authenticateWebDAV(req, res, this.sendResponse.bind(this))) {
      return;
    }
    
    // Parse URL
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname || '/';
    const method = req.method;

    try {
      if (method === 'GET') {
        await this.handleGetRequest(pathname, res);
      } else if (method === 'PROPFIND') {
        await this.handlePropfindRequest(pathname, req, res);
      } else if (method === 'HEAD') {
        await this.handleHeadRequest(pathname, res);
      } else {
        this.sendResponse(res, 405, { error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('[DEBUG] Request handling error:', error);
      this.sendResponse(res, 500, { error: 'Internal server error' });
    }
  }

  private async handleGetRequest(pathname: string, res: any): Promise<void> {
    if (pathname === '/') {
      // Root endpoint - show main containers
      const containers = await getRootContainer();
      this.sendResponse(res, 200, containers);
    } else if (pathname === '/allItems' || pathname === '/allItems/') {
      // Use allItems route handler
      await handleAllItemsGET(pathname, res, this.sendResponse.bind(this));
    } else if (pathname === '/uncategorized' || pathname === '/uncategorized/') {
      // TODO: Implement uncategorized - show uncategorized Eagle items
      this.sendResponse(res, 200, []);
    } else if (pathname === '/folders' || pathname === '/folders/') {
      // Use folder route handler
      await handleFolderGET(pathname, res, this.sendResponse.bind(this));
    } else if (pathname === '/tags' || pathname === '/tags/') {
      // TODO: Implement tags - show all Eagle tags
      this.sendResponse(res, 200, []);
    } else if (pathname.startsWith('/folders/')) {
      // Use folder route handler
      await handleFolderGET(pathname, res, this.sendResponse.bind(this));
    } else if (pathname.startsWith('/files/')) {
      // File endpoint - serve actual file content by ID
      // Handle both /files/{id} and /files/{id}/{filename} formats
      const pathParts = pathname.substring(7).replace(/\/$/, '').split('/');
      const id = pathParts[0]; // First part is always the ID
      console.log(`[DEBUG] GET file ID: "${id}"`);
      const file = await getFileById(id);
      if (!file) {
        this.sendResponse(res, 404, { error: 'File not found' });
        return;
      }
      
      // Serve the actual file content (need to implement file serving)
      await this.serveFileContent(file, res);
    } else if (pathname === '/health') {
      this.sendResponse(res, 200, { status: 'ok', uptime: process.uptime() });
    } else {
      this.sendResponse(res, 404, { error: 'Not found' });
    }
  }

  private async handlePropfindRequest(pathname: string, req: any, res: any): Promise<void> {
    // Read request body to check depth header
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      const depth = req.headers.depth || 'infinity';
      const isDepthZero = depth === '0';
      
      console.log(`[DEBUG] PROPFIND request - Path: ${pathname}, Depth: ${depth}, Body: ${body.substring(0, 200)}`);

      try {
        if (pathname === '/') {
          // Root endpoint
          const containers = await getRootContainer();
          const xml = generateFolderContentXML(pathname, containers, isDepthZero);
          this.sendXMLResponse(res, 207, xml);
        } else if (pathname === '/allItems' || pathname === '/allItems/') {
          // Use allItems route handler
          await handleAllItemsPROPFIND(pathname, req, res, this.sendXMLResponse.bind(this));
        } else if (pathname === '/uncategorized' || pathname === '/uncategorized/') {
          // TODO: Implement uncategorized PROPFIND
          const xml = generateFolderContentXML(pathname, [], isDepthZero, 'Uncategorized');
          this.sendXMLResponse(res, 207, xml);
        } else if (pathname === '/folders' || pathname === '/folders/') {
          // Use folder route handler
          await handleFolderPROPFIND(pathname, req, res, this.sendXMLResponse.bind(this));
        } else if (pathname === '/tags' || pathname === '/tags/') {
          // TODO: Implement tags PROPFIND
          const xml = generateFolderContentXML(pathname, [], isDepthZero, 'Tags');
          this.sendXMLResponse(res, 207, xml);
        } else if (pathname.startsWith('/folders/')) {
          // Use folder route handler
          await handleFolderPROPFIND(pathname, req, res, this.sendXMLResponse.bind(this));
        } else if (pathname.startsWith('/files/')) {
          // File PROPFIND - get file info by ID
          // Handle both /files/{id} and /files/{id}/{filename} formats
          const pathParts = pathname.substring(7).replace(/\/$/, '').split('/');
          const id = pathParts[0]; // First part is always the ID
          const file = await getFileById(id);
          if (!file) {
            const errorXML = '<?xml version="1.0" encoding="utf-8"?>\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
            this.sendXMLResponse(res, 404, errorXML);
          } else {
            // Generate PROPFIND response for single file
            const xml = generateFolderContentXML(pathname, [file], isDepthZero);
            this.sendXMLResponse(res, 207, xml);
          }
        } else {
          this.sendResponse(res, 404, { error: 'Not found' });
        }
      } catch (error) {
        console.error('[DEBUG] PROPFIND error:', error);
        this.sendResponse(res, 500, { error: 'Internal server error' });
      }
    });
  }

  private async handleHeadRequest(pathname: string, res: any): Promise<void> {
    if (pathname.startsWith('/files/')) {
      // File HEAD request - just return headers without content
      // Handle both /files/{id} and /files/{id}/{filename} formats
      const pathParts = pathname.substring(7).replace(/\/$/, '').split('/');
      const id = pathParts[0]; // First part is always the ID
      const file = await getFileById(id);
      if (!file) {
        res.writeHead(404);
        res.end();
        return;
      }
      
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', file.size || 0);
      res.writeHead(200);
      res.end();
    } else {
      // For collections, just return 200
      res.writeHead(200);
      res.end();
    }
  }

  private async serveFileContent(file: any, res: any): Promise<void> {
    try {
      // Set proper headers
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', file.size || 0);
      
      // Properly encode filename for Content-Disposition header (RFC 6266)
      const filename = file.name || 'download';
      const encodedFilename = encodeURIComponent(filename);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFilename}`);
      
      if (file.path && typeof eagle !== 'undefined') {
        // Stream file from Eagle
        const fs = require('fs');
        if (fs.existsSync(file.path)) {
          const stream = fs.createReadStream(file.path);
          stream.pipe(res);
          return;
        }
      }
      
      // Fallback to empty response
      res.writeHead(404);
      res.end('File not found');
    } catch (error) {
      console.error('[DEBUG] File serving error:', error);
      res.writeHead(500);
      res.end('Internal server error');
    }
  }

  private sendResponse(res: any, statusCode: number, data: any): void {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(JSON.stringify(data));
  }

  private sendXMLResponse(res: any, statusCode: number, xml: string): void {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.writeHead(statusCode);
    res.end(xml);
  }

  getServerInfo(): any {
    const { username, password } = getServerCredentials();
    return {
      isRunning: this.isRunning,
      config: {
        ...this.config,
        password: password // Return actual password for UI copy functionality
      },
      serverUrl: `http://${username}:${password}@${this.config.host}:${this.config.port}/`,
      credentials: {
        username,
        password
      }
    };
  }
}