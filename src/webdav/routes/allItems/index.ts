/**
 * AllItems route handler for WebDAV server
 * Handles all item-related requests and operations with performance optimization
 */

import { getAllEagleItems, getFileById } from '../../eagleUtils';
import { generateAllItemsListXML } from './xml';

/**
 * Handles GET requests for allItems routes - including file serving
 * @param pathname Request pathname
 * @param res HTTP response object
 * @param sendResponse Response sending function
 * @param serveFileContent File serving function
 */
export async function handleAllItemsGET(
  pathname: string, 
  res: any, 
  sendResponse: (res: any, status: number, data: any) => void,
  serveFileContent: (file: any, res: any) => Promise<void>
): Promise<void> {
  if (pathname === '/allItems' || pathname === '/allItems/') {
    // AllItems container - not allowed for GET (collections can't be downloaded)
    sendResponse(res, 405, { error: 'Method not allowed on collections' });
  } else if (pathname.startsWith('/allItems/')) {
    // File within allItems: /allItems/{filename}
    const filename = decodeURIComponent(pathname.substring(10)); // Remove '/allItems/' prefix
    
    console.log(`[DEBUG] File request in allItems - Filename: "${filename}"`);
    
    await handleAllItemsFileRequest(filename, res, sendResponse, serveFileContent);
  } else {
    sendResponse(res, 404, { error: 'Not found' });
  }
}

/**
 * Handles file requests within allItems
 * @param filename Name of the file
 * @param res HTTP response object
 * @param sendResponse Response sending function
 * @param serveFileContent File serving function
 */
async function handleAllItemsFileRequest(
  filename: string,
  res: any,
  sendResponse: (res: any, status: number, data: any) => void,
  serveFileContent: (file: any, res: any) => Promise<void>
): Promise<void> {
  try {
    console.log(`[DEBUG] Looking for file "${filename}" in allItems`);
    
    // Get all items
    const items = await getAllEagleItems();
    if (!items || items.length === 0) {
      console.log(`[DEBUG] No items found in allItems`);
      sendResponse(res, 404, { error: 'File not found' });
      return;
    }
    
    // Look for the file by matching the filename (with or without extension)
    let targetFile = null;
    for (const item of items) {
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
      console.log(`[DEBUG] File "${filename}" not found in allItems`);
      sendResponse(res, 404, { error: 'File not found' });
      return;
    }
    
    console.log(`[DEBUG] Found file "${filename}" with ID "${targetFile.id}" in allItems`);
    
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
    console.error('[DEBUG] Error handling allItems file request:', error);
    sendResponse(res, 500, { error: 'Internal server error' });
  }
}

/**
 * Handles PROPFIND requests for allItems routes
 * @param pathname Request pathname
 * @param req HTTP request object
 * @param res HTTP response object
 * @param sendXMLResponse Response sending function
 * @param generateSingleFilePROPFIND Function to generate file PROPFIND XML
 */
export async function handleAllItemsPROPFIND(
  pathname: string, 
  req: any, 
  res: any, 
  sendXMLResponse: (res: any, statusCode: number, xml: string) => void,
  generateSingleFilePROPFIND?: (requestPath: string, file: any) => string
): Promise<void> {
  const depth = req.headers.depth || '1';
  
  if (pathname === '/allItems' || pathname === '/allItems/') {
    // AllItems container - show all Eagle items with count-based logic
    const items = await getAllEagleItems();
    const xmlResponse = generateAllItemsListXML('/allItems', items, depth === '0');
    res.writeHead(207, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xmlResponse);
  } else if (pathname.startsWith('/allItems/') && generateSingleFilePROPFIND) {
    // Individual file PROPFIND in allItems
    const filename = decodeURIComponent(pathname.substring(10)); // Remove '/allItems/' prefix
    console.log(`[DEBUG] File PROPFIND in allItems - Filename: "${filename}"`);
    
    // Get all items and find the file
    const items = await getAllEagleItems();
    let targetFile = null;
    
    for (const item of items) {
      if ('size' in item && item.size !== undefined) { // It's a file
        const itemExt = 'ext' in item ? item.ext : '';
        const itemName = item.name + (itemExt ? `.${itemExt}` : '');
        if (itemName === filename || item.name === filename ||
            itemName.toLowerCase() === filename.toLowerCase() || 
            item.name.toLowerCase() === filename.toLowerCase()) {
          targetFile = item;
          break;
        }
      }
    }
    
    if (!targetFile) {
      console.log(`[DEBUG] File "${filename}" not found in allItems for PROPFIND`);
      const errorXML = '<?xml version="1.0" encoding="utf-8"?>\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
      sendXMLResponse(res, 404, errorXML);
    } else {
      console.log(`[DEBUG] Found file "${filename}" for PROPFIND, generating response`);
      // Get full file object
      const file = await getFileById(targetFile.id);
      if (file) {
        const xml = generateSingleFilePROPFIND(pathname, file);
        sendXMLResponse(res, 207, xml);
      } else {
        const errorXML = '<?xml version="1.0" encoding="utf-8"?>\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
        sendXMLResponse(res, 404, errorXML);
      }
    }
  } else {
    const errorXML = '<?xml version="1.0" encoding="utf-8"?>\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
    sendXMLResponse(res, 404, errorXML);
  }
}