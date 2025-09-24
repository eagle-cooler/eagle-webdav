/**
 * XML generation utilities for hierarchy route
 * Handles hierarchical folder structure XML generation
 */

import { escapeXML, generateHref } from '../../xmlUtils';

/**
 * Generates XML content for hierarchical folder listings in hierarchy route
 * @param requestPath The request path (e.g., '/hierarchy/' or '/hierarchy/folder/')
 * @param items Array of folder/file items to include
 * @param isDepthZero Whether this is a depth=0 request (only current folder info)
 * @param displayName Display name for the current folder
 * @returns WebDAV XML response string
 */
export function generateIndexContentXML(
  requestPath: string, 
  items: any[], 
  isDepthZero: boolean = false,
  displayName: string = 'Hierarchy'
): string {
  const responses: string[] = [];
  
  // First response: The folder itself
  const folderHref = generateHref(requestPath);
  responses.push(`
  <D:response>
    <D:href>${folderHref}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${escapeXML(displayName)}</D:displayname>
        <D:resourcetype><D:collection/></D:resourcetype>
        <D:getlastmodified>${new Date().toUTCString()}</D:getlastmodified>
        <D:creationdate>${new Date().toISOString()}</D:creationdate>
        <D:getetag>"${Date.now()}"</D:getetag>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`);
  
  // If depth is 0, only return the folder itself
  if (isDepthZero) {
    return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${responses.join('')}
</D:multistatus>`;
  }
  
  // Add child items (folders and files)
  for (const item of items) {
    try {
      // Construct the item path based on the request path and item
      let itemPath: string;
      
      if (requestPath.endsWith('/')) {
        // Handle hierarchical folder structure
        if (item.children !== undefined) {
          // This is a folder - use folder name as path segment
          itemPath = requestPath + encodeURI(item.name) + '/';
        } else {
          // This is a file - use filename with extension
          const filename = item.name + (item.ext ? '.' + item.ext : '');
          itemPath = requestPath + encodeURI(filename);
        }
      } else {
        // Handle edge case where requestPath doesn't end with '/'
        if (item.children !== undefined) {
          itemPath = requestPath + '/' + encodeURI(item.name) + '/';
        } else {
          const filename = item.name + (item.ext ? '.' + item.ext : '');
          itemPath = requestPath + '/' + encodeURI(filename);
        }
      }
      
      const itemHref = generateHref(itemPath);
      
      // Check if it's a file (has size property) vs folder (has children property)
      if (item.children !== undefined) {
        // This is a folder
        const folderName = escapeXML(item.name);
        responses.push(`
  <D:response>
    <D:href>${itemHref}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${folderName}</D:displayname>
        <D:resourcetype><D:collection/></D:resourcetype>
        <D:getlastmodified>${item.lastModified ? new Date(item.lastModified).toUTCString() : new Date().toUTCString()}</D:getlastmodified>
        <D:creationdate>${item.lastModified ? new Date(item.lastModified).toISOString() : new Date().toISOString()}</D:creationdate>
        <D:getetag>"${item.id || Date.now()}"</D:getetag>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`);
      } else {
        // This is a file
        const filename = escapeXML(item.name + (item.ext ? '.' + item.ext : ''));
        const mimeType = item.mimeType || 'application/octet-stream';
        const fileSize = item.size || 0;
        const lastModified = item.lastModified ? new Date(item.lastModified).toUTCString() : new Date().toUTCString();
        const creationDate = item.lastModified ? new Date(item.lastModified).toISOString() : new Date().toISOString();
        
        responses.push(`
  <D:response>
    <D:href>${itemHref}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${filename}</D:displayname>
        <D:resourcetype/>
        <D:getcontenttype>${escapeXML(mimeType)}</D:getcontenttype>
        <D:getcontentlength>${fileSize}</D:getcontentlength>
        <D:getlastmodified>${lastModified}</D:getlastmodified>
        <D:creationdate>${creationDate}</D:creationdate>
        <D:getetag>"${item.id || Date.now()}"</D:getetag>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`);
      }
    } catch (error) {
      console.error('[DEBUG] Error processing item for XML:', error, item);
      // Skip this item if there's an error
      continue;
    }
  }
  
  return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${responses.join('')}
</D:multistatus>`;
}

/**
 * Generates XML for a single file in hierarchy route (used for individual file PROPFIND)
 * @param requestPath The full request path to the file
 * @param file The file object
 * @returns WebDAV XML response string
 */
export function generateIndexFilePROPFIND(requestPath: string, file: any): string {
  const fileHref = generateHref(requestPath);
  const filename = escapeXML(file.name + (file.ext ? '.' + file.ext : ''));
  const mimeType = file.mimeType || 'application/octet-stream';
  const fileSize = file.size || 0;
  const lastModified = file.lastModified ? new Date(file.lastModified).toUTCString() : new Date().toUTCString();
  const creationDate = file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString();
  
  return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>${fileHref}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${filename}</D:displayname>
        <D:resourcetype/>
        <D:getcontenttype>${escapeXML(mimeType)}</D:getcontenttype>
        <D:getcontentlength>${fileSize}</D:getcontentlength>
        <D:getlastmodified>${lastModified}</D:getlastmodified>
        <D:creationdate>${creationDate}</D:creationdate>
        <D:getetag>"${file.id || Date.now()}"</D:getetag>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;
}