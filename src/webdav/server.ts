const http = require('http');
const url = require('url');

// Import modular components
import { WebDAVServerConfig } from './types';
import { authenticateWebDAV, getServerCredentials } from './auth/auth';
import { handleFolderPROPFIND } from './routes/folders';
import { handleAllItemsPROPFIND } from './routes/allItems';
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
    } else if (pathname === '/allItems' || pathname === '/allItems/') {
      // Collections can't be downloaded, only browsed via PROPFIND
      this.sendMethodNotAllowedForCollection(res, pathname);
    } else if (pathname === '/uncategorized' || pathname === '/uncategorized/') {
      // Collections can't be downloaded, only browsed via PROPFIND
      this.sendMethodNotAllowedForCollection(res, pathname);
    } else if (pathname === '/folders' || pathname === '/folders/') {
      // Collections can't be downloaded, only browsed via PROPFIND
      this.sendMethodNotAllowedForCollection(res, pathname);
    } else if (pathname === '/tags' || pathname === '/tags/') {
      // Collections can't be downloaded, only browsed via PROPFIND
      this.sendMethodNotAllowedForCollection(res, pathname);
    } else if (pathname.startsWith('/folders/')) {
      // Check if this is a file request within a folder (e.g., /folders/fonts/filename.ext)
      const pathParts = pathname.substring(9).split('/'); // Remove '/folders/' prefix
      if (pathParts.length >= 2 && pathParts[1]) {
        // This looks like a file request: /folders/{folderName}/{filename}
        const folderName = pathParts[0];
        const filename = pathParts.slice(1).join('/'); // Handle filenames with slashes
        console.log(`[DEBUG] File request in folder - Folder: "${folderName}", Filename: "${filename}"`);
        
        // Try to find the file by name in the specified folder
        await this.handleFolderFileRequest(folderName, filename, res);
        return;
      } else {
        // Individual folders can't be downloaded, only browsed via PROPFIND
        this.sendMethodNotAllowedForCollection(res, pathname);
      }
    } else if (pathname.startsWith('/files/')) {
      // File endpoint - serve actual file content by ID
      // Handle both /files/{id} and /files/{id}/{filename} formats
      const pathParts = pathname.substring(7).replace(/\/$/, '').split('/');
      const id = pathParts[0]; // First part is always the ID
      console.log(`[DEBUG] GET file request - Full pathname: "${pathname}", pathParts: ${JSON.stringify(pathParts)}, extracted ID: "${id}"`);
      const file = await getFileById(id);
      if (!file) {
        console.log(`[DEBUG] File not found for ID: "${id}"`);
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
          console.log(`[DEBUG] File PROPFIND - Full path: ${pathname}, Extracted ID: ${id}`);
          const file = await getFileById(id);
          if (!file) {
            console.log(`[DEBUG] File not found for ID: ${id}`);
            const errorXML = '<?xml version="1.0" encoding="utf-8"?>\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
            this.sendXMLResponse(res, 404, errorXML);
          } else {
            console.log(`[DEBUG] File found: ${file.name}, generating PROPFIND response`);
            // Generate PROPFIND response for single file
            const xml = this.generateSingleFilePROPFIND(pathname, file);
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

  private async handleFolderFileRequest(folderName: string, filename: string, res: any): Promise<void> {
    try {
      console.log(`[DEBUG] Looking for file "${filename}" in folder "${folderName}"`);
      
      // Import the folder utilities to get items in folder
      const { getFolderByName } = await import('./eagleUtils');
      
      // Get the folder
      const folder = await getFolderByName(folderName);
      if (!folder) {
        console.log(`[DEBUG] Folder "${folderName}" not found`);
        this.sendResponse(res, 404, { error: 'Folder not found' });
        return;
      }
      
      // Get all files in the folder
      const folderData = await folder;
      if (!folderData.children || folderData.children.length === 0) {
        console.log(`[DEBUG] No files found in folder "${folderName}"`);
        this.sendResponse(res, 404, { error: 'File not found' });
        return;
      }
      
      // Look for the file by matching the filename (with or without extension)
      let targetFile = null;
      for (const item of folderData.children) {
        // Check if it's a file (has size property) vs folder (has children property)
        if ('size' in item && item.size !== undefined) { // It's a file
          // Check exact match first
          const itemExt = 'ext' in item ? item.ext : '';
          const itemName = item.name + (itemExt ? `.${itemExt}` : '');
          if (itemName === filename || item.name === filename) {
            targetFile = item;
            break;
          }
          
          // Also try case-insensitive match
          if (itemName.toLowerCase() === filename.toLowerCase() || 
              item.name.toLowerCase() === filename.toLowerCase()) {
            targetFile = item;
            break;
          }
        }
      }
      
      if (!targetFile) {
        console.log(`[DEBUG] File "${filename}" not found in folder "${folderName}"`);
        this.sendResponse(res, 404, { error: 'File not found' });
        return;
      }
      
      console.log(`[DEBUG] Found file "${filename}" with ID "${targetFile.id}" in folder "${folderName}"`);
      
      // Get the full file object with path information
      const file = await getFileById(targetFile.id);
      if (!file) {
        console.log(`[DEBUG] Could not get file details for ID "${targetFile.id}"`);
        this.sendResponse(res, 404, { error: 'File not found' });
        return;
      }
      
      // Serve the file
      await this.serveFileContent(file, res);
    } catch (error) {
      console.error('[DEBUG] Error handling folder file request:', error);
      this.sendResponse(res, 500, { error: 'Internal server error' });
    }
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