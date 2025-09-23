/**
 * Folders route handler for WebDAV server
 * Handles all folder-related requests and operations
 */

import { getAllEagleFolders, getFolderByName } from '../../eagleUtils';
import { generateFolderListXML, generateFolderContentXML } from './xml';

/**
 * Handles GET requests for folder routes
 * @param pathname Request pathname
 * @param req HTTP request object
 * @param res HTTP response object
 * @param sendResponse Response sending function
 */
export async function handleFolderGET(
  pathname: string, 
  res: any, 
  sendResponse: (res: any, status: number, data: any) => void
): Promise<void> {
  if (pathname === '/folders' || pathname === '/folders/') {
    // Folders container - show all Eagle folders (flattened)
    const folders = await getAllEagleFolders();
    sendResponse(res, 200, folders);
  } else if (pathname.startsWith('/folders/')) {
    // Individual folder contents - get folder by name
    const folderName = decodeURIComponent(pathname.substring(9).replace(/\/$/, ''));
    
    if (!folderName) {
      // Empty folder name, redirect to folders container
      const folders = await getAllEagleFolders();
      sendResponse(res, 200, folders);
      return;
    }
    
    const folder = await getFolderByName(folderName);
    if (!folder) {
      sendResponse(res, 404, { error: 'Folder not found' });
      return;
    }
    sendResponse(res, 200, folder);
  } else {
    sendResponse(res, 404, { error: 'Not found' });
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
