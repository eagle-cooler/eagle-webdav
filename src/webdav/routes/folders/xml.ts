/**
 * XML generation utilities for folder routes
 */

import { EagleWebDAVFolder } from '../../types';

/**
 * Generates WebDAV PROPFIND XML response for folder listings
 * @param pathname The requested path
 * @param folders Array of folders to include in the response
 * @param isDepthZero Whether this is a depth 0 request
 * @returns Formatted XML string for WebDAV PROPFIND response
 */
export function generateFolderListXML(pathname: string, folders: EagleWebDAVFolder[], isDepthZero: boolean): string {
  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<D:multistatus xmlns:D="DAV:">\n';
  
  // Add the requested resource itself (the current directory)
  xml += `  <D:response>\n`;
  xml += `    <D:href>${pathname}</D:href>\n`;
  xml += `    <D:propstat>\n`;
  xml += `      <D:prop>\n`;
  xml += `        <D:resourcetype><D:collection/></D:resourcetype>\n`;
  xml += `        <D:displayname>Folders</D:displayname>\n`;
  xml += `        <D:getlastmodified>${new Date().toUTCString()}</D:getlastmodified>\n`;
  xml += `      </D:prop>\n`;
  xml += `      <D:status>HTTP/1.1 200 OK</D:status>\n`;
  xml += `    </D:propstat>\n`;
  xml += `  </D:response>\n`;
  
  // Add child folders if depth > 0
  if (!isDepthZero && folders && Array.isArray(folders)) {
    for (const folder of folders) {
      xml += `  <D:response>\n`;
      xml += `    <D:href>/folders/${folder.name}</D:href>\n`;
      xml += `    <D:propstat>\n`;
      xml += `      <D:prop>\n`;
      xml += `        <D:resourcetype><D:collection/></D:resourcetype>\n`;
      xml += `        <D:displayname>${folder.name}</D:displayname>\n`;
      xml += `        <D:getlastmodified>${folder.lastModified.toUTCString()}</D:getlastmodified>\n`;
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
 * Generates WebDAV PROPFIND XML response for folder contents
 * @param pathname The requested path
 * @param items Array of files and folders to include in the response
 * @param isDepthZero Whether this is a depth 0 request (only the resource itself)
 * @param folderName Optional folder name for display (overrides path-based name)
 * @returns Formatted XML string for WebDAV PROPFIND response
 */
export function generateFolderContentXML(pathname: string, items: any[], isDepthZero: boolean, folderName?: string): string {
  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<D:multistatus xmlns:D="DAV:">\n';
  
  // Only add the requested resource itself for root paths or when depth is 0
  // For specific folders, skip this to prevent WebDAV clients from showing duplicate entries
  const shouldIncludeCurrentDirectory = pathname === '/' || pathname === '/folders' || pathname === '/allItems' || pathname === '/tags' || pathname === '/uncategorized' || isDepthZero;
  
  if (shouldIncludeCurrentDirectory) {
    // Add the requested resource itself (the current directory)
    xml += `  <D:response>\n`;
    xml += `    <D:href>${pathname}</D:href>\n`;
    xml += `    <D:propstat>\n`;
    xml += `      <D:prop>\n`;
    xml += `        <D:resourcetype><D:collection/></D:resourcetype>\n`;
    
    // Use folderName if provided, otherwise determine from pathname
    let displayName: string;
    if (folderName) {
      displayName = folderName;
    } else if (pathname === '/') {
      displayName = 'Eagle Library';
    } else if (pathname === '/folders') {
      displayName = 'Folders';
    } else {
      displayName = pathname.split('/').pop() || 'Unknown';
    }
    
    xml += `        <D:displayname>${displayName}</D:displayname>\n`;
    xml += `        <D:getlastmodified>${new Date().toUTCString()}</D:getlastmodified>\n`;
    xml += `      </D:prop>\n`;
    xml += `      <D:status>HTTP/1.1 200 OK</D:status>\n`;
    xml += `    </D:propstat>\n`;
    xml += `  </D:response>\n`;
  }
  
  // Add child resources if depth > 0
  if (!isDepthZero && items && Array.isArray(items)) {
    for (const item of items) {
      let itemPath: string;
      let displayName: string;
      let isFolder = false;
      
      // Determine if this is a file or folder and construct proper path and name
      if (item.children !== undefined) {
        // It's a folder - check if it's a root container or actual Eagle folder
        isFolder = true;
        
        // Root containers (allItems, uncategorized, folders, tags) should use their own paths
        if (item.id && ['allItems', 'uncategorized', 'folders', 'tags'].includes(item.id)) {
          itemPath = item.path || `/${item.name}`;
          displayName = item.name;
        } else {
          // Regular Eagle folder - use folders path
          itemPath = `/folders/${item.name}`;
          displayName = item.name;
        }
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
