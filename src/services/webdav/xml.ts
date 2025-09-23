import { EagleWebDAVFile } from './types';

/**
 * Generates WebDAV PROPFIND XML response for directory listings
 * @param pathname The requested path
 * @param items Array of files and folders to include in the response
 * @param isDepthZero Whether this is a depth 0 request (only the resource itself)
 * @returns Formatted XML string for WebDAV PROPFIND response
 */
export function generatePropfindXML(pathname: string, items: any[], isDepthZero: boolean): string {
  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<D:multistatus xmlns:D="DAV:">\n';
  
  // Add the requested resource itself (the current directory)
  xml += `  <D:response>\n`;
  xml += `    <D:href>${pathname}</D:href>\n`;
  xml += `    <D:propstat>\n`;
  xml += `      <D:prop>\n`;
  xml += `        <D:resourcetype><D:collection/></D:resourcetype>\n`;
  xml += `        <D:displayname>${pathname === '/' ? 'Eagle Library' : pathname.split('/').pop()}</D:displayname>\n`;
  xml += `        <D:getlastmodified>${new Date().toUTCString()}</D:getlastmodified>\n`;
  xml += `      </D:prop>\n`;
  xml += `      <D:status>HTTP/1.1 200 OK</D:status>\n`;
  xml += `    </D:propstat>\n`;
  xml += `  </D:response>\n`;
  
  // Add child resources if depth > 0
  if (!isDepthZero && items && Array.isArray(items)) {
    for (const item of items) {
      let itemPath: string;
      let displayName: string;
      let isFolder = false;
      
      // Determine if this is a file or folder and construct proper path and name
      if (item.children !== undefined) {
        // It's a folder
        isFolder = true;
        itemPath = `/folders/${item.id}`;
        displayName = item.name; // Use the actual folder name
      } else if (item.size !== undefined) {
        // It's a file - add extension if not already present
        itemPath = `/files/${item.id}`;
        if (item.ext && !item.name.toLowerCase().endsWith(`.${item.ext.toLowerCase()}`)) {
          displayName = `${item.name}.${item.ext}`;
        } else {
          displayName = item.name;
        }
      } else {
        // Fallback
        itemPath = `${pathname}${pathname.endsWith('/') ? '' : '/'}${item.name || item.id}`;
        displayName = item.name || item.id;
      }
      
      xml += `  <D:response>\n`;
      xml += `    <D:href>${itemPath}</D:href>\n`;
      xml += `    <D:propstat>\n`;
      xml += `      <D:prop>\n`;
      
      if (isFolder) {
        xml += `        <D:resourcetype><D:collection/></D:resourcetype>\n`;
      } else {
        xml += `        <D:resourcetype/>\n`;
        xml += `        <D:getcontentlength>${item.size || 0}</D:getcontentlength>\n`;
        xml += `        <D:getcontenttype>${item.mimeType || 'application/octet-stream'}</D:getcontenttype>\n`;
      }
      
      xml += `        <D:displayname>${displayName}</D:displayname>\n`;
      xml += `        <D:getlastmodified>${item.lastModified ? new Date(item.lastModified).toUTCString() : new Date().toUTCString()}</D:getlastmodified>\n`;
      xml += `      </D:prop>\n`;
      xml += `      <D:status>HTTP/1.1 200 OK</D:status>\n`;
      xml += `    </D:propstat>\n`;
      xml += `  </D:response>\n`;
    }
  }
  
  xml += '</D:multistatus>';
  return xml;
}

/**
 * Generates WebDAV PROPFIND XML response for individual files
 * @param pathname The requested file path
 * @param file The file object to generate XML for
 * @returns Formatted XML string for WebDAV PROPFIND response
 */
export function generateFilePropfindXML(pathname: string, file: EagleWebDAVFile): string {
  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<D:multistatus xmlns:D="DAV:">\n';
  xml += `  <D:response>\n`;
  xml += `    <D:href>${pathname}</D:href>\n`;
  xml += `    <D:propstat>\n`;
  xml += `      <D:prop>\n`;
  xml += `        <D:resourcetype/>\n`;
  
  // Include extension in display name if not already present
  let displayName = file.name;
  if (file.ext && !file.name.toLowerCase().endsWith(`.${file.ext.toLowerCase()}`)) {
    displayName = `${file.name}.${file.ext}`;
  }
  
  xml += `        <D:displayname>${displayName}</D:displayname>\n`;
  xml += `        <D:getcontentlength>${file.size}</D:getcontentlength>\n`;
  xml += `        <D:getcontenttype>${file.mimeType}</D:getcontenttype>\n`;
  xml += `        <D:getlastmodified>${new Date(file.lastModified).toUTCString()}</D:getlastmodified>\n`;
  xml += `      </D:prop>\n`;
  xml += `      <D:status>HTTP/1.1 200 OK</D:status>\n`;
  xml += `    </D:propstat>\n`;
  xml += `  </D:response>\n`;
  xml += '</D:multistatus>';
  return xml;
}