import { EagleWebDAVFile } from './types';

/**
 * Gets the MIME type for a file extension
 * @param ext File extension (without the dot)
 * @returns MIME type string
 */
export function getMimeType(ext: string): string {
  const mimeTypes: { [key: string]: string } = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json'
  };

  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Serves actual file content for WebDAV clients using streams
 * @param file The file object to serve
 * @param res The HTTP response object
 */
export async function serveFileContent(file: EagleWebDAVFile, res: any): Promise<void> {
  const fs = require('fs');
  
  try {
    // Check if file exists
    if (!fs.existsSync(file.path)) {
      console.error(`File not found at path: ${file.path}`);
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    // Get file stats
    const stats = fs.statSync(file.path);
    
    // Set appropriate headers
    res.writeHead(200, {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Length': stats.size,
      'Last-Modified': stats.mtime.toUTCString(),
      'Access-Control-Allow-Origin': '*'
    });

    // Create read stream and pipe to response
    const readStream = fs.createReadStream(file.path);
    readStream.on('error', (error: any) => {
      console.error(`Error reading file ${file.path}:`, error);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal server error');
      }
    });
    
    readStream.pipe(res);
    
  } catch (error) {
    console.error(`Error serving file ${file.path}:`, error);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal server error');
    }
  }
}