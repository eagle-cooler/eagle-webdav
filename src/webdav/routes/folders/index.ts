/**
 * Folders route handler for WebDAV server
 * Handles all folder-related requests and operations
 */

import { getAllEagleFolders, getFolderByName, getFileById } from '../../eagleUtils';
import { generateFolderListXML, generateFolderContentXML } from './xml';

/**
 * Handles GET requests for folder routes - including file serving within folders
 * @param pathname Request pathname
 * @param req HTTP request object
 * @param res HTTP response object
 * @param sendResponse Response sending function
 * @param serveFileContent File serving function
 */
export async function handleFolderGET(
  pathname: string, 
  res: any, 
  sendResponse: (res: any, status: number, data: any) => void,
  serveFileContent: (file: any, res: any) => Promise<void>
): Promise<void> {
  const pathParts = pathname.substring(9).split('/'); // Remove '/folders/' prefix
  
  if (pathname === '/folders' || pathname === '/folders/') {
    // Folders container - not allowed for GET
    sendResponse(res, 405, { error: 'Method not allowed on collections' });
  } else if (pathParts.length === 1 && pathParts[0]) {
    // Individual folder - not allowed for GET
    sendResponse(res, 405, { error: 'Method not allowed on collections' });
  } else if (pathParts.length >= 2 && pathParts[0] && pathParts[1]) {
    // File within folder: /folders/{folderName}/{filename}
    const folderName = decodeURIComponent(pathParts[0]);
    const filename = pathParts.slice(1).join('/'); // Handle filenames with slashes
    
    console.log(`[DEBUG] File request in folder - Folder: "${folderName}", Filename: "${filename}"`);
    
    await handleFolderFileRequest(folderName, filename, res, sendResponse, serveFileContent);
  } else {
    sendResponse(res, 404, { error: 'Not found' });
  }
}

/**
 * Handles file requests within folders
 * @param folderName Name of the folder
 * @param filename Name of the file
 * @param res HTTP response object
 * @param sendResponse Response sending function
 * @param serveFileContent File serving function
 */
async function handleFolderFileRequest(
  folderName: string,
  filename: string,
  res: any,
  sendResponse: (res: any, status: number, data: any) => void,
  serveFileContent: (file: any, res: any) => Promise<void>
): Promise<void> {
  try {
    console.log(`[DEBUG] Looking for file "${filename}" in folder "${folderName}"`);
    
    // Get the folder
    const folder = await getFolderByName(folderName);
    if (!folder) {
      console.log(`[DEBUG] Folder "${folderName}" not found`);
      sendResponse(res, 404, { error: 'Folder not found' });
      return;
    }
    
    // Get all files in the folder
    if (!folder.children || folder.children.length === 0) {
      console.log(`[DEBUG] No files found in folder "${folderName}"`);
      sendResponse(res, 404, { error: 'File not found' });
      return;
    }
    
    // Look for the file by matching the filename (with or without extension)
    let targetFile = null;
    for (const item of folder.children) {
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
      sendResponse(res, 404, { error: 'File not found' });
      return;
    }
    
    console.log(`[DEBUG] Found file "${filename}" with ID "${targetFile.id}" in folder "${folderName}"`);
    
    // Get the full file object with path information
    const file = await getFileById(targetFile.id);
    if (!file) {
      console.log(`[DEBUG] Could not get file details for ID "${targetFile.id}"`);
      sendResponse(res, 404, { error: 'File not found' });
      return;
    }
    
    // Serve the file
    await serveFileContent(file, res);
  } catch (error) {
    console.error('[DEBUG] Error handling folder file request:', error);
    sendResponse(res, 500, { error: 'Internal server error' });
  }
}

/**
 * Handles PROPFIND requests for folder routes
 * @param pathname Request pathname
 * @param req HTTP request object
 * @param res HTTP response object
 * @param sendResponse Response sending function
 */
export async function handleFolderPROPFIND(
  pathname: string, 
  req: any, 
  res: any, 
  sendXMLResponse: (res: any, statusCode: number, xml: string) => void
): Promise<void> {
  const depth = req.headers.depth || '1';
  
  if (pathname === '/folders' || pathname === '/folders/') {
    // Folders container - show all Eagle folders (flattened)
    const folders = await getAllEagleFolders();
    const xmlResponse = generateFolderListXML('/folders', folders, depth === '0');
    res.writeHead(207, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xmlResponse);
  } else if (pathname.startsWith('/folders/')) {
    // Individual folder contents - get folder by name
    const folderName = decodeURIComponent(pathname.substring(9).replace(/\/$/, ''));
    
    if (!folderName) {
      // Empty folder name, show all Eagle folders
      const folders = await getAllEagleFolders();
      const xmlResponse = generateFolderListXML('/folders', folders, depth === '0');
      res.writeHead(207, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(xmlResponse);
      return;
    }
    
    const folder = await getFolderByName(folderName);
    if (!folder) {
      const errorXML = '<?xml version="1.0" encoding="utf-8"?>\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
      sendXMLResponse(res, 404, errorXML);
      return;
    }
    
    // For folder content, pass children and the folder name for proper display
    const xmlResponse = generateFolderContentXML(pathname, folder.children || [], depth === '0', folder.name);
    res.writeHead(207, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xmlResponse);
  } else {
    const errorXML = '<?xml version="1.0" encoding="utf-8"?>\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
    sendXMLResponse(res, 404, errorXML);
  }
}
