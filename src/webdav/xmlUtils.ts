/**
 * XML utilities for WebDAV server
 * Shared utilities for generating and formatting XML responses
 */

/**
 * Escapes special XML characters in text content
 * @param text Text to escape
 * @returns XML-safe text
 */
export function escapeXML(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a basic XML declaration with UTF-8 encoding
 * @returns XML declaration string
 */
export function getXMLDeclaration(): string {
  return '<?xml version="1.0" encoding="utf-8"?>\n';
}

/**
 * Generates WebDAV multistatus opening tag
 * @returns WebDAV multistatus opening XML
 */
export function getMultistatusOpen(): string {
  return '<D:multistatus xmlns:D="DAV:">\n';
}

/**
 * Generates WebDAV multistatus closing tag
 * @returns WebDAV multistatus closing XML
 */
export function getMultistatusClose(): string {
  return '</D:multistatus>';
}

/**
 * Generates a WebDAV response opening tag
 * @returns WebDAV response opening XML
 */
export function getResponseOpen(): string {
  return '  <D:response>\n';
}

/**
 * Generates a WebDAV response closing tag
 * @returns WebDAV response closing XML
 */
export function getResponseClose(): string {
  return '  </D:response>\n';
}

/**
 * Generates a WebDAV propstat opening tag
 * @returns WebDAV propstat opening XML
 */
export function getPropstatOpen(): string {
  return '    <D:propstat>\n';
}

/**
 * Generates a WebDAV propstat closing tag
 * @returns WebDAV propstat closing XML
 */
export function getPropstatClose(): string {
  return '    </D:propstat>\n';
}

/**
 * Generates a WebDAV prop opening tag
 * @returns WebDAV prop opening XML
 */
export function getPropOpen(): string {
  return '      <D:prop>\n';
}

/**
 * Generates a WebDAV prop closing tag
 * @returns WebDAV prop closing XML
 */
export function getPropClose(): string {
  return '      </D:prop>\n';
}

/**
 * Generates a WebDAV status element for successful operations
 * @returns WebDAV status XML for 200 OK
 */
export function getSuccessStatus(): string {
  return '      <D:status>HTTP/1.1 200 OK</D:status>\n';
}

/**
 * Generates a WebDAV href element
 * @param path The path for the href
 * @returns WebDAV href XML element
 */
export function generateHref(path: string): string {
  return `    <D:href>${path}</D:href>\n`;
}

/**
 * Generates a WebDAV displayname element
 * @param name The display name (will be XML-escaped)
 * @returns WebDAV displayname XML element
 */
export function generateDisplayName(name: string): string {
  return `        <D:displayname>${escapeXML(name)}</D:displayname>\n`;
}

/**
 * Generates a WebDAV getlastmodified element
 * @param date The last modified date
 * @returns WebDAV getlastmodified XML element
 */
export function generateLastModified(date: Date): string {
  return `        <D:getlastmodified>${date.toUTCString()}</D:getlastmodified>\n`;
}

/**
 * Generates a WebDAV resourcetype element for collections (folders)
 * @returns WebDAV resourcetype XML element for collection
 */
export function generateCollectionResourceType(): string {
  return '        <D:resourcetype><D:collection/></D:resourcetype>\n';
}

/**
 * Generates a WebDAV resourcetype element for files (empty)
 * @returns WebDAV resourcetype XML element for file
 */
export function generateFileResourceType(): string {
  return '        <D:resourcetype/>\n';
}

/**
 * Generates a WebDAV getcontentlength element
 * @param size The file size in bytes
 * @returns WebDAV getcontentlength XML element
 */
export function generateContentLength(size: number): string {
  return `        <D:getcontentlength>${size || 0}</D:getcontentlength>\n`;
}

/**
 * Generates a WebDAV getcontenttype element
 * @param mimeType The MIME type of the file
 * @returns WebDAV getcontenttype XML element
 */
export function generateContentType(mimeType: string): string {
  return `        <D:getcontenttype>${mimeType || 'application/octet-stream'}</D:getcontenttype>\n`;
}

/**
 * Generates a complete WebDAV error response
 * @param statusCode HTTP status code
 * @param message Error message
 * @returns Complete WebDAV error XML response
 */
export function generateErrorXML(statusCode: number, message: string): string {
  let xml = getXMLDeclaration();
  xml += '<D:error xmlns:D="DAV:">\n';
  xml += '  <D:response>\n';
  xml += `    <D:status>HTTP/1.1 ${statusCode} ${message}</D:status>\n`;
  xml += '  </D:response>\n';
  xml += '</D:error>';
  return xml;
}