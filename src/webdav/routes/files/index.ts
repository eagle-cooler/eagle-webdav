/**
 * Files route handler for WebDAV server
 * Handles direct file access by ID
 */

import { getFileById } from '../../eagleUtils';

/**
 * Handles GET requests for file routes
 * @param pathname Request pathname
 * @param res HTTP response object
 * @param sendResponse Response sending function
 * @param serveFileContent File serving function
 */
export async function handleFilesGET(
  pathname: string, 
  res: any, 
  sendResponse: (res: any, status: number, data: any) => void,
  serveFileContent: (file: any, res: any) => Promise<void>
): Promise<void> {
  if (pathname.startsWith('/files/')) {
    // File endpoint - serve actual file content by ID
    // Handle both /files/{id} and /files/{id}/{filename} formats
    const pathParts = pathname.substring(7).replace(/\/$/, '').split('/');
    const id = pathParts[0]; // First part is always the ID
    console.log(`[DEBUG] GET file request - Full pathname: "${pathname}", pathParts: ${JSON.stringify(pathParts)}, extracted ID: "${id}"`);
    
    const file = await getFileById(id);
    if (!file) {
      console.log(`[DEBUG] File not found for ID: "${id}"`);
      sendResponse(res, 404, { error: 'File not found' });
      return;
    }
    
    // Serve the actual file content
    await serveFileContent(file, res);
  } else {
    sendResponse(res, 404, { error: 'Not found' });
  }
}

/**
 * Handles PROPFIND requests for file routes
 * @param pathname Request pathname
 * @param _req HTTP request object (unused)
 * @param res HTTP response object
 * @param sendXMLResponse Response sending function
 * @param generateSingleFilePROPFIND Function to generate file PROPFIND XML
 */
export async function handleFilesPROPFIND(
  pathname: string, 
  _req: any, 
  res: any, 
  sendXMLResponse: (res: any, statusCode: number, xml: string) => void,
  generateSingleFilePROPFIND: (requestPath: string, file: any) => string
): Promise<void> {
  if (pathname.startsWith('/files/')) {
    // File PROPFIND - get file info by ID
    // Handle both /files/{id} and /files/{id}/{filename} formats
    const pathParts = pathname.substring(7).replace(/\/$/, '').split('/');
    const id = pathParts[0]; // First part is always the ID
    console.log(`[DEBUG] File PROPFIND - Full path: ${pathname}, Extracted ID: ${id}`);
    
    const file = await getFileById(id);
    if (!file) {
      console.log(`[DEBUG] File not found for ID: ${id}`);
      const errorXML = '<?xml version="1.0" encoding="utf-8"?>\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
      sendXMLResponse(res, 404, errorXML);
    } else {
      console.log(`[DEBUG] File found: ${file.name}, generating PROPFIND response`);
      // Generate PROPFIND response for single file
      const xml = generateSingleFilePROPFIND(pathname, file);
      sendXMLResponse(res, 207, xml);
    }
  } else {
    const errorXML = '<?xml version="1.0" encoding="utf-8"?>\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
    sendXMLResponse(res, 404, errorXML);
  }
}

/**
 * Handles HEAD requests for file routes
 * @param pathname Request pathname
 * @param res HTTP response object
 */
export async function handleFilesHEAD(
  pathname: string,
  res: any
): Promise<void> {
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
    res.writeHead(404);
    res.end();
  }
}