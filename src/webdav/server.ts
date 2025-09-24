const http = require('http');
const url = require('url');

// Import modular components
import { WebDAVServerConfig } from './types';
import { authenticateWebDAV, getServerCredentials } from './auth/auth';
import { handleFolderGET, handleFolderPROPFIND } from './routes/folders';
import { handleAllItemsGET, handleAllItemsPROPFIND } from './routes/allItems';
import { handleFilesGET, handleFilesPROPFIND, handleFilesHEAD } from './routes/files';
import { handleIndexGET, handleIndexPROPFIND } from './routes/hierarchy';
import { handleTagsGET, handleTagsPROPFIND } from './routes/tags';
import { getRootContainer } from './eagleUtils';
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
    // Log all incoming requests
    console.log(`[DEBUG] ${req.method} ${req.url} - Headers:`, JSON.stringify(req.headers, null, 2));
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PROPFIND, COPY, MOVE, MKCOL, LOCK, UNLOCK, PROPPATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Depth, Destination, Overwrite');
    
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
      } else if (['COPY', 'MOVE', 'MKCOL', 'DELETE', 'PUT', 'LOCK', 'UNLOCK', 'PROPPATCH'].includes(method)) {
        // Read-only server - reject write operations with proper WebDAV error
        this.sendReadOnlyError(res, method);
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
      // Root endpoint - return method not allowed for GET on collections
      this.sendMethodNotAllowedForCollection(res, pathname);
    } else if (pathname === '/allItems' || pathname === '/allItems/' || pathname.startsWith('/allItems/')) {
      // Use allItems route handler (handles both collection requests and file requests within allItems)
      await handleAllItemsGET(pathname, res, this.sendResponse.bind(this), this.serveFileContent.bind(this));
    } else if (pathname === '/folders' || pathname === '/folders/' || pathname.startsWith('/folders/')) {
      // Use folder route handler (handles both folder requests and file requests within folders)
      await handleFolderGET(pathname, res, this.sendResponse.bind(this), this.serveFileContent.bind(this));
    } else if (pathname === '/hierarchy' || pathname === '/hierarchy/' || pathname.startsWith('/hierarchy/')) {
      // Use hierarchy route handler (handles hierarchical folder structure and file requests)
      await handleIndexGET(pathname, res, this.sendResponse.bind(this), this.serveFileContent.bind(this));
    } else if (pathname === '/tags' || pathname === '/tags/' || pathname.startsWith('/tags/')) {
      // Use tags route handler (handles both tag requests and file requests within tags)
      await handleTagsGET(pathname, res, this.sendResponse.bind(this), this.serveFileContent.bind(this));
    } else if (pathname.startsWith('/files/')) {
      // Use files route handler
      await handleFilesGET(pathname, res, this.sendResponse.bind(this), this.serveFileContent.bind(this));
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
        } else if (pathname === '/allItems' || pathname === '/allItems/' || pathname.startsWith('/allItems/')) {
          // Use allItems route handler (handles both collection and individual file PROPFIND)
          await handleAllItemsPROPFIND(pathname, req, res, this.sendXMLResponse.bind(this), this.generateSingleFilePROPFIND.bind(this));
        } else if (pathname === '/folders' || pathname === '/folders/') {
          // Use folder route handler
          await handleFolderPROPFIND(pathname, req, res, this.sendXMLResponse.bind(this));
        } else if (pathname === '/hierarchy' || pathname === '/hierarchy/' || pathname.startsWith('/hierarchy/')) {
          // Use hierarchy route handler (handles hierarchical folder structure PROPFIND)
          await handleIndexPROPFIND(pathname, req, res, this.sendXMLResponse.bind(this), this.generateSingleFilePROPFIND.bind(this));
        } else if (pathname === '/tags' || pathname === '/tags/' || pathname.startsWith('/tags/')) {
          // Use tags route handler
          await handleTagsPROPFIND(pathname, req, res);
        } else if (pathname.startsWith('/folders/')) {
          // Use folder route handler
          await handleFolderPROPFIND(pathname, req, res, this.sendXMLResponse.bind(this));
        } else if (pathname.startsWith('/files/')) {
          // Use files route handler
          await handleFilesPROPFIND(pathname, req, res, this.sendXMLResponse.bind(this), this.generateSingleFilePROPFIND.bind(this));
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
      // Use files route handler
      await handleFilesHEAD(pathname, res);
    } else {
      // For collections, just return 200
      res.writeHead(200);
      res.end();
    }
  }

  private async serveFileContent(file: any, res: any): Promise<void> {
    try {
      console.log(`[DEBUG] Serving file: ${file.name}, size: ${file.size}, path: ${file.path || file.filePath}`);
      
      // Set proper headers
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', file.size || 0);
      
      // Properly encode filename for Content-Disposition header (RFC 6266)
      const filename = file.name || 'download';
      const encodedFilename = encodeURIComponent(filename);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFilename}`);
      
      const filePath = file.path || file.filePath;
      if (filePath && typeof eagle !== 'undefined') {
        // Stream file from Eagle
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          console.log(`[DEBUG] File exists at: ${filePath}, starting stream`);
          
          // Write response headers before streaming
          res.writeHead(200);
          
          const stream = fs.createReadStream(filePath);
          
          stream.on('error', (error: any) => {
            console.error(`[DEBUG] File streaming error for ${file.name}:`, error);
            if (!res.headersSent) {
              res.writeHead(500);
              res.end('File streaming error');
            } else {
              res.destroy();
            }
          });
          
          stream.on('end', () => {
            console.log(`[DEBUG] File streaming completed for: ${file.name}`);
          });
          
          stream.on('close', () => {
            console.log(`[DEBUG] File stream closed for: ${file.name}`);
          });
          
          stream.pipe(res);
          return;
        } else {
          console.error(`[DEBUG] File does not exist at path: ${filePath}`);
        }
      } else {
        console.error(`[DEBUG] No file path available for file: ${file.name}`);
      }
      
      // Fallback to empty response
      console.log(`[DEBUG] Sending 404 for file: ${file.name}`);
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

  private sendReadOnlyError(res: any, method: string): void {
    // Send proper WebDAV error for read-only operations
    const errorXML = `<?xml version="1.0" encoding="utf-8"?>
<D:error xmlns:D="DAV:">
  <D:response>
    <D:status>HTTP/1.1 403 Forbidden</D:status>
    <D:responsedescription>Read-only WebDAV server. ${method} operations are not allowed.</D:responsedescription>
  </D:response>
</D:error>`;
    
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(403);
    res.end(errorXML);
  }

  private sendMethodNotAllowedForCollection(res: any, pathname: string): void {
    // WebDAV collections (folders) don't support GET method
    // They should be accessed via PROPFIND instead
    const errorXML = `<?xml version="1.0" encoding="utf-8"?>
<D:error xmlns:D="DAV:">
  <D:response>
    <D:href>${encodeURI(pathname)}</D:href>
    <D:status>HTTP/1.1 405 Method Not Allowed</D:status>
    <D:responsedescription>GET method is not allowed on collections. Use PROPFIND to browse folder contents.</D:responsedescription>
  </D:response>
</D:error>`;
    
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Allow', 'OPTIONS, PROPFIND, HEAD');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(405);
    res.end(errorXML);
  }

  private generateSingleFilePROPFIND(requestPath: string, file: any): string {
    // Generate proper WebDAV PROPFIND response for a single file
    const filename = file.name + (file.ext ? `.${file.ext}` : '');
    const lastModified = file.importedAt ? new Date(file.importedAt).toUTCString() : new Date().toUTCString();
    
    return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>${encodeURI(requestPath)}</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype/>
        <D:displayname>${filename}</D:displayname>
        <D:getcontentlength>${file.size || 0}</D:getcontentlength>
        <D:getlastmodified>${lastModified}</D:getlastmodified>
        <D:getcontenttype>${file.mimeType || 'application/octet-stream'}</D:getcontenttype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;
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