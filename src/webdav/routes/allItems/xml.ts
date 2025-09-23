/**
 * XML generation utilities for allItems routes
 */

import { EagleWebDAVFile } from '../../types';
import {
  getXMLDeclaration,
  getMultistatusOpen,
  getMultistatusClose,
  getResponseOpen,
  getResponseClose,
  getPropstatOpen,
  getPropstatClose,
  getPropOpen,
  getPropClose,
  getSuccessStatus,
  generateHref,
  generateDisplayName,
  generateLastModified,
  generateCollectionResourceType,
  generateFileResourceType,
  generateContentLength,
  generateContentType
} from '../../xmlUtils';

/**
 * Generates WebDAV PROPFIND XML response for allItems listings
 * @param pathname The requested path
 * @param items Array of items to include in the response
 * @param isDepthZero Whether this is a depth 0 request
 * @returns Formatted XML string for WebDAV PROPFIND response
 */
export function generateAllItemsListXML(pathname: string, items: EagleWebDAVFile[], isDepthZero: boolean): string {
  let xml = getXMLDeclaration();
  xml += getMultistatusOpen();
  
  // Add the requested resource itself (the current directory)
  xml += getResponseOpen();
  xml += generateHref(pathname);
  xml += getPropstatOpen();
  xml += getPropOpen();
  xml += generateCollectionResourceType();
  xml += generateDisplayName('All Items');
  xml += generateLastModified(new Date());
  xml += getPropClose();
  xml += getSuccessStatus();
  xml += getPropstatClose();
  xml += getResponseClose();
  
  // Add child items if depth > 0
  if (!isDepthZero && items && Array.isArray(items)) {
    for (const item of items) {
      let displayName: string;
      
      // Add extension if not already present
      if (item.ext && !item.name.toLowerCase().endsWith(`.${item.ext.toLowerCase()}`)) {
        displayName = `${item.name}.${item.ext}`;
      } else {
        displayName = item.name;
      }
      
      // Use the display name in the path for better client compatibility
      const itemPath = `/files/${item.id}/${displayName}`;
      
      xml += getResponseOpen();
      xml += generateHref(itemPath);
      xml += getPropstatOpen();
      xml += getPropOpen();
      xml += generateFileResourceType();
      xml += generateContentLength(item.size || 0);
      xml += generateContentType(item.mimeType || 'application/octet-stream');
      xml += generateDisplayName(displayName);
      xml += generateLastModified(item.lastModified || new Date());
      xml += getPropClose();
      xml += getSuccessStatus();
      xml += getPropstatClose();
      xml += getResponseClose();
    }
  }
  
  xml += getMultistatusClose();
  return xml;
}

/**
 * Generates WebDAV PROPFIND XML response for allItems contents
 * @param pathname The requested path
 * @param items Array of files to include in the response
 * @param isDepthZero Whether this is a depth 0 request (only the resource itself)
 * @returns Formatted XML string for WebDAV PROPFIND response
 */
export function generateAllItemsContentXML(pathname: string, items: EagleWebDAVFile[], isDepthZero: boolean): string {
  let xml = getXMLDeclaration();
  xml += getMultistatusOpen();
  
  // Add the requested resource itself (the current directory)
  xml += getResponseOpen();
  xml += generateHref(pathname);
  xml += getPropstatOpen();
  xml += getPropOpen();
  xml += generateCollectionResourceType();
  xml += generateDisplayName('All Items');
  xml += generateLastModified(new Date());
  xml += getPropClose();
  xml += getSuccessStatus();
  xml += getPropstatClose();
  xml += getResponseClose();
  
  // Add child resources if depth > 0
  if (!isDepthZero && items && Array.isArray(items)) {
    for (const item of items) {
      let displayName: string;
      
      // Add extension if not already present
      if (item.ext && !item.name.toLowerCase().endsWith(`.${item.ext.toLowerCase()}`)) {
        displayName = `${item.name}.${item.ext}`;
      } else {
        displayName = item.name;
      }
      
      // Use the display name in the path for better client compatibility
      const itemPath = `/files/${item.id}/${displayName}`;
      
      xml += getResponseOpen();
      xml += generateHref(itemPath);
      xml += getPropstatOpen();
      xml += getPropOpen();
      xml += generateFileResourceType();
      xml += generateContentLength(item.size || 0);
      xml += generateContentType(item.mimeType || 'application/octet-stream');
      xml += generateDisplayName(displayName);
      xml += generateLastModified(item.lastModified || new Date());
      xml += getPropClose();
      xml += getSuccessStatus();
      xml += getPropstatClose();
      xml += getResponseClose();
    }
  }
  
  xml += getMultistatusClose();
  return xml;
}