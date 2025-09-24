import { getHierarchicalFolders, getFolderByPath, getFileById } from '../../eagleUtils';
import { generateIndexContentXML } from './xml';
import { normalizePath } from '../../xmlUtils';

/**
 * Handles GET requests for hierarchy routes - including file serving within hierarchy
 * @param pathname Request pathname
 * @param res HTTP response object
 * @param sendResponse Response sending function
 * @param serveFileContent File serving function
 */
export async function handleIndexGET(
  pathname: string, 
  res: any, 
  sendResponse: (res: any, status: number, data: any) => void,
  serveFileContent: (file: any, res: any) => Promise<void>
): Promise<void> {
  if (pathname === '/hierarchy' || pathname === '/hierarchy/') {
    // Hierarchy container - not allowed for GET
    sendResponse(res, 405, { error: 'Method not allowed on collections' });
  } else if (pathname.startsWith('/hierarchy/')) {
    // File or folder within hierarchy
    let hierarchyPath = pathname.substring(11).replace(/\/$/, ''); // Remove '/hierarchy/' prefix
    
    // Normalize the path to handle any level of URL encoding
    hierarchyPath = normalizePath(hierarchyPath);
    
    const pathParts = hierarchyPath.split('/').filter(part => part);
    
    console.log(`[DEBUG] Hierarchy GET - Path parts:`, pathParts);
    
    if (pathParts.length === 1) {
      // Single folder - collections cannot be downloaded
      sendResponse(res, 405, { error: 'Method not allowed on collections' });
    } else if (pathParts.length >= 2) {
      // File within hierarchy: /hierarchy/{folder}/{subfolder}/{filename}
      const folderParts = pathParts.slice(0, -1);
      const filename = pathParts[pathParts.length - 1];
      const folderPath = '/' + folderParts.join('/');
      
      console.log(`[DEBUG] File request in hierarchy - Folder path: "${folderPath}", Filename: "${filename}"`);
      
      await handleHierarchyFileRequest(folderPath, filename, res, sendResponse, serveFileContent);
    } else {
      sendResponse(res, 404, { error: 'Not found' });
    }
  } else {
    sendResponse(res, 404, { error: 'Not found' });
  }
}

/**
 * Handles file requests within hierarchical folders
 * @param folderPath Path to the folder in hierarchy
 * @param filename Name of the file
 * @param res HTTP response object
 * @param sendResponse Response sending function
 * @param serveFileContent File serving function
 */
async function handleHierarchyFileRequest(
  folderPath: string,
  filename: string,
  res: any,
  sendResponse: (res: any, status: number, data: any) => void,
  serveFileContent: (file: any, res: any) => Promise<void>
): Promise<void> {
  console.log(`[DEBUG] Hierarchy file request - Folder: "${folderPath}", Filename: "${filename}"`);
  
  const folder = await getFolderByPath(folderPath, false); // Only need files for serving
  if (!folder) {
    console.log(`[DEBUG] Folder not found: ${folderPath}`);
    sendResponse(res, 404, { error: 'Folder not found' });
    return;
  }
  
  if (!folder.children || folder.children.length === 0) {
    console.log(`[DEBUG] Folder has no content: ${folderPath}`);
    sendResponse(res, 404, { error: 'File not found' });
    return;
  }
  
  // Search for file in folder children (files only)
  for (const item of folder.children) {
    // Check if it's a file (has size property) vs folder (has children property)
    if ('size' in item && item.size !== undefined) {
      const itemFilename = item.name + (item.ext ? '.' + item.ext : '');
      
      console.log(`[DEBUG] Checking file: "${itemFilename}" vs requested: "${filename}"`);
      
      // Try exact match first
      if (itemFilename === filename) {
        console.log(`[DEBUG] Exact match found for: ${filename}`);
        const file = await getFileById(item.id);
        if (file) {
          await serveFileContent(file, res);
        } else {
          sendResponse(res, 404, { error: 'File content not found' });
        }
        return;
      }
      
      // Try case-insensitive match
      if (itemFilename.toLowerCase() === filename.toLowerCase()) {
        console.log(`[DEBUG] Case-insensitive match found for: ${filename}`);
        const file = await getFileById(item.id);
        if (file) {
          await serveFileContent(file, res);
        } else {
          sendResponse(res, 404, { error: 'File content not found' });
        }
        return;
      }
    }
  }
  
  console.log(`[DEBUG] File not found in folder: ${filename}`);
  sendResponse(res, 404, { error: 'File not found' });
}

/**
 * Handles PROPFIND requests for hierarchy routes - hierarchical folder structure
 * @param pathname Request pathname
 * @param req HTTP request object
 * @param res HTTP response object
 * @param sendXMLResponse XML response sending function
 * @param generateSingleFilePROPFIND Optional single file PROPFIND generator
 */
export async function handleIndexPROPFIND(
  pathname: string,
  req: any,
  res: any,
  sendXMLResponse: (res: any, statusCode: number, xml: string) => void,
  generateSingleFilePROPFIND?: (requestPath: string, file: any) => string
): Promise<void> {
  const depth = req.headers.depth || 'infinity';
  const isDepthZero = depth === '0';
  
  console.log(`[DEBUG] Hierarchy PROPFIND - Path: ${pathname}, Depth: ${depth}`);
  
  if (pathname === '/hierarchy' || pathname === '/hierarchy/') {
    // Root hierarchy - return hierarchical folder structure
    const hierarchicalFolders = await getHierarchicalFolders();
    const xmlResponse = generateIndexContentXML(pathname, hierarchicalFolders, isDepthZero, 'Hierarchy');
    console.log(`[DEBUG] Root hierarchy XML response:`, xmlResponse.substring(0, 500) + '...');
    res.writeHead(207, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xmlResponse);
  } else {
    // Subfolder in hierarchy - get folder by hierarchical path
    let hierarchyPath = pathname.substring(11).replace(/\/$/, ''); // Remove '/hierarchy/' prefix
    
    // Normalize the path to handle any level of URL encoding
    hierarchyPath = normalizePath(hierarchyPath);
    
    const folderPath = '/' + hierarchyPath;
    
    console.log(`[DEBUG] Looking for hierarchical folder: ${folderPath}`);
    
    const folder = await getFolderByPath(folderPath, true); // Include subfolders for PROPFIND
    if (!folder) {
      console.log(`[DEBUG] Folder not found: ${folderPath}`);
      const errorXML = '<?xml version="1.0" encoding="utf-8"?><D:error xmlns:D="DAV:"><D:response><D:status>HTTP/1.1 404 Not Found</D:status></D:response></D:error>';
      res.writeHead(404, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(errorXML);
      return;
    }
    
    // For folder content, pass clean base path and children for proper display
    const basePath = `/hierarchy/${hierarchyPath}`;
    const xmlResponse = generateIndexContentXML(basePath, folder.children || [], isDepthZero, folder.name);
    console.log(`[DEBUG] Hierarchy XML response for ${basePath}:`, xmlResponse.substring(0, 500) + '...');
    res.writeHead(207, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xmlResponse);
  }
}