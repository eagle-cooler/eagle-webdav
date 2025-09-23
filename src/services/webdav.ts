const http = require('http');
const url = require('url');

// Import modular components
import { WebDAVServerConfig } from './webdav/types';
import { generatePropfindXML, generateFilePropfindXML } from './webdav/xml';
import { serveFileContent } from './webdav/fileHandler';
import { getRootContainer, getAllEagleFolders, getFileById, getFolderByName } from './webdav/eagleParser';

// Re-export types for backward compatibility
export type { WebDAVServerConfig, EagleWebDAVFile, EagleWebDAVFolder } from './webdav/types';

// Generate UUID for password
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get or create password from localStorage
function getOrCreatePassword(): string {
  const key = 'eagle-webdav-password';
    
  const stored = localStorage.getItem(key);
    
  if (stored) {
    return stored;
  }
  
    const newPassword = generateUUID();
  localStorage.setItem(key, newPassword);
    return newPassword;
}

export class EagleWebDAVServer {
  private static instance: EagleWebDAVServer | null = null;
  private httpServer: any = null;
  private config!: WebDAVServerConfig;
  private isRunning = false;

  constructor() {
        
    if (EagleWebDAVServer.instance) {
            return EagleWebDAVServer.instance;
    }
    
    const password = getOrCreatePassword();
        
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
    } else {
          }
    return EagleWebDAVServer.instance;
  }

  async start(): Promise<boolean> {
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
          } else {
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
          } else {
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
        if (!this.authenticate(req, res)) {
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
      } else if (method === 'OPTIONS') {
        // Already handled above, but just in case
        res.writeHead(200);
        res.end();
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

  private authenticate(req: any, res: any): boolean {
        const auth = req.headers.authorization;
        
    if (!auth || !auth.startsWith('Basic ')) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Eagle WebDAV Server"');
      this.sendResponse(res, 401, { error: 'Authentication required' });
      return false;
    }

    try {
      const credentials = Buffer.from(auth.slice(6), 'base64').toString('ascii');
            const [username, password] = credentials.split(':');
                  
      // Get expected credentials
      const expectedPassword = getOrCreatePassword();
      const expectedUsername = typeof eagle !== 'undefined' && eagle.os ? eagle.os.hostname() : 'localhost';
      
                              
      if (username === expectedUsername && password === expectedPassword) {
                return true;
      } else {
                res.setHeader('WWW-Authenticate', 'Basic realm="Eagle WebDAV Server"');
        this.sendResponse(res, 401, { error: 'Invalid credentials' });
        return false;
      }
    } catch (error) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Eagle WebDAV Server"');
      this.sendResponse(res, 401, { error: 'Invalid authentication format' });
      return false;
    }
  }

  private async handleGetRequest(pathname: string, res: any): Promise<void> {
    if (pathname === '/') {
      // Root endpoint - show main containers
      const containers = await getRootContainer();
      this.sendResponse(res, 200, containers);
    } else if (pathname === '/allItems' || pathname === '/allItems/') {
      // TODO: Implement allItems - show all Eagle items
      this.sendResponse(res, 200, []);
    } else if (pathname === '/uncategorized' || pathname === '/uncategorized/') {
      // TODO: Implement uncategorized - show uncategorized Eagle items
      this.sendResponse(res, 200, []);
    } else if (pathname === '/folders' || pathname === '/folders/') {
      // Folders container - show all Eagle folders (flattened)
      const folders = await getAllEagleFolders();
      this.sendResponse(res, 200, folders);
    } else if (pathname === '/tags' || pathname === '/tags/') {
      // TODO: Implement tags - show all Eagle tags
      this.sendResponse(res, 200, []);
    } else if (pathname.startsWith('/folders/')) {
      // Individual folder contents - get folder by name
      const folderName = decodeURIComponent(pathname.substring(9).replace(/\/$/, ''));
      console.log(`[DEBUG] GET folder name: "${folderName}"`);
      
      if (!folderName) {
        // Empty folder name, redirect to folders container
        const folders = await getAllEagleFolders();
        this.sendResponse(res, 200, folders);
        return;
      }
      
      const folder = await getFolderByName(folderName);
      if (!folder) {
        this.sendResponse(res, 404, { error: 'Folder not found' });
        return;
      }
      this.sendResponse(res, 200, folder);
    } else if (pathname.startsWith('/files/')) {
      // File endpoint - serve actual file content by ID
      const id = pathname.substring(7).replace(/\/$/, '');
      console.log(`[DEBUG] GET file ID: "${id}"`);
      const file = await getFileById(id);
      if (!file) {
        this.sendResponse(res, 404, { error: 'File not found' });
        return;
      }
      
      // Serve the actual file content
      await serveFileContent(file, res);
    } else if (pathname === '/health') {
      // Health check endpoint
      this.sendResponse(res, 200, {
        status: 'ok',
        server: 'Eagle WebDAV',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } else {
      this.sendResponse(res, 404, { error: 'Not found' });
    }
  }

  private sendResponse(res: any, statusCode: number, data: any): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
  }

  private async handlePropfindRequest(pathname: string, req: any, res: any): Promise<void> {
    // WebDAV PROPFIND request - return properties of files/folders
    let depth = req.headers.depth || '1';
    
    if (pathname === '/') {
      // Root directory - show main containers (allItems, uncategorized, folders, tags)
      const containers = await getRootContainer();
      const xmlResponse = generatePropfindXML('/', containers, depth === '0');
      res.writeHead(207, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(xmlResponse);
    } else if (pathname === '/allItems' || pathname === '/allItems/') {
      // allItems container
      // TODO: Implement allItems listing
      const xmlResponse = generatePropfindXML('/allItems', [], depth === '0', 'allItems');
      res.writeHead(207, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(xmlResponse);
    } else if (pathname === '/uncategorized' || pathname === '/uncategorized/') {
      // uncategorized container
      // TODO: Implement uncategorized listing
      const xmlResponse = generatePropfindXML('/uncategorized', [], depth === '0', 'uncategorized');
      res.writeHead(207, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(xmlResponse);
    } else if (pathname === '/folders' || pathname === '/folders/') {
      // Folders container - show all Eagle folders (flattened)
      const folders = await getAllEagleFolders();
      const xmlResponse = generatePropfindXML('/folders', folders, depth === '0', 'folders');
      res.writeHead(207, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(xmlResponse);
    } else if (pathname === '/tags' || pathname === '/tags/') {
      // tags container
      // TODO: Implement tags listing
      const xmlResponse = generatePropfindXML('/tags', [], depth === '0', 'tags');
      res.writeHead(207, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(xmlResponse);
    } else if (pathname.startsWith('/folders/')) {
      // Individual folder contents - get folder by name
      const folderName = decodeURIComponent(pathname.substring(9).replace(/\/$/, ''));
      console.log(`[DEBUG] PROPFIND folder name: "${folderName}"`);
      
      if (!folderName) {
        // Empty folder name, show all Eagle folders
        const folders = await getAllEagleFolders();
        const xmlResponse = generatePropfindXML('/folders', folders, depth === '0', 'folders');
        res.writeHead(207, {
          'Content-Type': 'application/xml; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(xmlResponse);
        return;
      }
      
      const folder = await getFolderByName(folderName);
      if (!folder) {
        this.sendResponse(res, 404, { error: 'Folder not found' });
        return;
      }
      // For folder content, pass children and the folder name for proper display
      console.log(`[DEBUG] Generating XML for folder with ${folder.children?.length || 0} children`);
      console.log(`[DEBUG] Folder children:`, folder.children);
      const xmlResponse = generatePropfindXML(pathname, folder.children || [], depth === '0', folder.name);
      console.log(`[DEBUG] Generated XML response:`, xmlResponse);
      res.writeHead(207, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(xmlResponse);
    } else if (pathname.startsWith('/files/')) {
      // Handle individual file PROPFIND
      const id = pathname.substring(7).replace(/\/$/, '');
      console.log(`[DEBUG] Cleaned file ID: "${id}"`);
      const file = await getFileById(id);
      if (!file) {
        this.sendResponse(res, 404, { error: 'File not found' });
        return;
      }
      const xmlResponse = generateFilePropfindXML(pathname, file);
      res.writeHead(207, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(xmlResponse);
    } else {
      this.sendResponse(res, 404, { error: 'Not found' });
    }
  }

  private async handleHeadRequest(pathname: string, res: any): Promise<void> {
    // HEAD request - same as GET but without body
    if (pathname === '/') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end();
    } else if (pathname.startsWith('/files/')) {
      const id = pathname.substring(7).replace(/\/$/, '');
      console.log(`[DEBUG] HEAD file ID: "${id}"`);
      const file = await getFileById(id);
      if (!file) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Length': file.size.toString(),
        'Access-Control-Allow-Origin': '*'
      });
      res.end();
    } else {
      res.writeHead(404);
      res.end();
    }
  }







  get running(): boolean {
    return this.isRunning;
  }

  get serverInfo(): WebDAVServerConfig {
    return { ...this.config };
  }
}

export const eagleWebDAVServer = EagleWebDAVServer.getInstance();
console.log('[DEBUG] eagleWebDAVServer singleton created:', eagleWebDAVServer);