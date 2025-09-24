/**
 * Tags route handler for WebDAV server
 * Handles tag-based browsing and file serving
 */

import { getItemsByTag, getFileById } from '../../eagleUtils';
import { generateTagsListXML } from './xml';

/**
 * Handles GET requests for tags routes - including file serving within tags
 * @param pathname Request pathname
 * @param res HTTP response object
 * @param sendResponse Response sending function
 * @param serveFileContent File serving function
 */
export async function handleTagsGET(
  pathname: string, 
  res: any, 
  sendResponse: (res: any, status: number, data: any) => void,
  serveFileContent: (file: any, res: any) => Promise<void>
): Promise<void> {
  if (pathname === '/tags' || pathname === '/tags/') {
    // Tags container - not allowed for GET
    sendResponse(res, 405, { error: 'Method not allowed on collections' });
  } else if (pathname.startsWith('/tags/')) {
    // File within tag: /tags/{tagName}/{filename}
    const pathParts = pathname.substring(6).split('/').filter(part => part); // Remove '/tags/' prefix
    
    if (pathParts.length === 1) {
      // Single tag - collections cannot be downloaded
      sendResponse(res, 405, { error: 'Method not allowed on collections' });
    } else if (pathParts.length >= 2) {
      // File within tag: /tags/{tagName}/{filename}
      const tagName = decodeURIComponent(pathParts[0]);
      const filename = pathParts.slice(1).join('/'); // Handle filenames with slashes
      
      console.log(`[DEBUG] File request in tag - Tag: "${tagName}", Filename: "${filename}"`);
      
      await handleTagFileRequest(tagName, filename, res, sendResponse, serveFileContent);
    } else {
      sendResponse(res, 404, { error: 'Not found' });
    }
  } else {
    sendResponse(res, 404, { error: 'Not found' });
  }
}

/**
 * Handles file requests within tags
 * @param tagName Name of the tag
 * @param filename Name of the file
 * @param res HTTP response object
 * @param sendResponse Response sending function
 * @param serveFileContent File serving function
 */
async function handleTagFileRequest(
  tagName: string,
  filename: string,
  res: any,
  sendResponse: (res: any, status: number, data: any) => void,
  serveFileContent: (file: any, res: any) => Promise<void>
): Promise<void> {
  try {
    console.log(`[DEBUG] Looking for file "${filename}" in tag "${tagName}"`);
    
    // Get items with the specified tag
    const items = await getItemsByTag(tagName);
    if (!items || items.length === 0) {
      console.log(`[DEBUG] No items found with tag "${tagName}"`);
      sendResponse(res, 404, { error: 'File not found' });
      return;
    }
    
    // Look for the file by matching the filename
    let targetFile = null;
    for (const item of items) {
      if ('size' in item && item.size !== undefined) { // It's a file
        // Try exact match first
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
      console.log(`[DEBUG] File "${filename}" not found in tag "${tagName}"`);
      sendResponse(res, 404, { error: 'File not found' });
      return;
    }
    
    console.log(`[DEBUG] Found file "${filename}" with ID "${targetFile.id}" in tag "${tagName}"`);
    
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
    console.error('[DEBUG] Error handling tag file request:', error);
    sendResponse(res, 500, { error: 'Internal server error' });
  }
}

/**
 * Handles PROPFIND requests for tags routes
 * @param pathname Request pathname
 * @param req HTTP request object
 * @param res HTTP response object
 * @param sendXMLResponse Response sending function
 * @param generateSingleFilePROPFIND Function to generate file PROPFIND XML
 */
export async function handleTagsPROPFIND(
  pathname: string, 
  req: any, 
  res: any
): Promise<void> {
  const depth = req.headers.depth || '1';
  
  if (pathname === '/tags' || pathname === '/tags/') {
    // Tags container - show all tags
    const tags = await getAllTagsWithCounts();
    const xmlResponse = generateTagsListXML('/tags', tags, depth === '0');
    res.writeHead(207, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xmlResponse);
  } else if (pathname.startsWith('/tags/')) {
    // Individual tag contents - get items by tag
    const tagName = decodeURIComponent(pathname.substring(6).replace(/\/$/, ''));
    
    if (!tagName) {
      // Empty tag name, show all tags
      const tags = await getAllTagsWithCounts();
      const xmlResponse = generateTagsListXML('/tags', tags, depth === '0');
      res.writeHead(207, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(xmlResponse);
      return;
    }
    
    const items = await getItemsByTag(tagName);
    if (!items) {
      const errorXML = '<?xml version="1.0" encoding="utf-8"?>\\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
      res.writeHead(404, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(errorXML);
      return;
    }
    
    // For tag content, pass the base path and items for proper display
    const basePath = `/tags/${tagName}`;
    const xmlResponse = generateTagsListXML(basePath, items, depth === '0', tagName);
    res.writeHead(207, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xmlResponse);
  } else {
    const errorXML = '<?xml version="1.0" encoding="utf-8"?>\\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
    res.writeHead(404, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(errorXML);
  }
}

/**
 * Gets all tags with their item counts
 * @returns Array of tags with count information
 */
async function getAllTagsWithCounts(): Promise<any[]> {
  try {
    if (typeof eagle === 'undefined') return [];
    
    console.log('[DEBUG] Getting all tags with counts');
    const tags = await eagle.tag.get();
    
    if (!tags || !Array.isArray(tags)) {
      console.warn('[DEBUG] No tags returned from Eagle API');
      return [];
    }
    
    console.log(`[DEBUG] Got ${tags.length} tags from Eagle`);
    
    // Convert tags to WebDAV folder format
    return tags.map(tag => ({
      id: tag.id || tag.name,
      name: tag.name,
      count: tag.count || 0,
      path: `/tags/${tag.name}`,
      lastModified: new Date(),
      children: []
    }));
  } catch (error) {
    console.error('[DEBUG] Error getting tags:', error);
    return [];
  }
}