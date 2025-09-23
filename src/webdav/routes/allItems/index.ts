/**
 * AllItems route handler for WebDAV server
 * Handles all item-related requests and operations with performance optimization
 */

import { getAllEagleItems } from '../../eagleUtils';
import { generateAllItemsListXML } from './xml';

/**
 * Handles GET requests for allItems routes
 * @param pathname Request pathname
 * @param res HTTP response object
 * @param sendResponse Response sending function
 */
export async function handleAllItemsGET(
  pathname: string, 
  res: any, 
  sendResponse: (res: any, status: number, data: any) => void
): Promise<void> {
  if (pathname === '/allItems' || pathname === '/allItems/') {
    // AllItems container - show all Eagle items with count-based logic
    const items = await getAllEagleItems();
    sendResponse(res, 200, items);
  } else {
    sendResponse(res, 404, { error: 'Not found' });
  }
}

/**
 * Handles PROPFIND requests for allItems routes
 * @param pathname Request pathname
 * @param req HTTP request object
 * @param res HTTP response object
 * @param sendXMLResponse Response sending function
 */
export async function handleAllItemsPROPFIND(
  pathname: string, 
  req: any, 
  res: any, 
  sendXMLResponse: (res: any, statusCode: number, xml: string) => void
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
  } else {
    const errorXML = '<?xml version="1.0" encoding="utf-8"?>\n<D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
    sendXMLResponse(res, 404, errorXML);
  }
}