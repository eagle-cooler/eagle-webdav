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
    .replace(/'/g, '&#39;');
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
  return '</D:multistatus>\n';
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
 * Generates a WebDAV getlastmodified element
 * @param date The last modified date
 * @returns WebDAV getlastmodified XML element
 */
export function generateLastModified(date?: Date | string | number): string {
  const modDate = date ? new Date(date) : new Date();
  return `        <D:getlastmodified>${modDate.toUTCString()}</D:getlastmodified>\n`;
}

/**
 * Generates a WebDAV resourcetype element for collections (folders)
 * @returns WebDAV resourcetype collection XML element
 */
export function generateCollectionResourceType(): string {
  return `        <D:resourcetype><D:collection/></D:resourcetype>\n`;
}

/**
 * Generates a WebDAV resourcetype element for files
 * @returns WebDAV resourcetype file XML element
 */
export function generateFileResourceType(): string {
  return `        <D:resourcetype/>\n`;
}

/**
 * Generates a WebDAV getcontentlength element
 * @param size The content length in bytes
 * @returns WebDAV getcontentlength XML element
 */
export function generateContentLength(size: number): string {
  return `        <D:getcontentlength>${size}</D:getcontentlength>\n`;
}

/**
 * Generates a WebDAV getcontenttype element
 * @param mimeType The MIME type
 * @returns WebDAV getcontenttype XML element
 */
export function generateContentType(mimeType: string): string {
  return `        <D:getcontenttype>${mimeType}</D:getcontenttype>\n`;
}

/**
 * Generates a WebDAV href element
 * @param path The path to include (spaces converted to underscores, then URL-encoded)
 * @returns WebDAV href XML element
 */
export function generateHref(path: string): string {
  // Convert spaces to underscores to avoid URL encoding issues
  const pathWithUnderscores = convertSpacesToUnderscores(path);
  const encodedPath = encodeURI(pathWithUnderscores);
  return `    <D:href>${encodedPath}</D:href>\n`;
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
 * Generates a WebDAV error response XML
 * @param statusCode HTTP status code
 * @param message Error message
 * @returns WebDAV error XML response
 */
export function generateErrorXML(statusCode: number, message: string): string {
  return getXMLDeclaration() +
    '<D:error xmlns:D="DAV:">\n' +
    '  <D:response>\n' +
    `    <D:status>HTTP/1.1 ${statusCode} ${message}</D:status>\n` +
    '  </D:response>\n' +
    '</D:error>\n';
}

/**
 * Converts underscores back to spaces in paths
 * Use this when parsing incoming WebDAV paths that used underscores to avoid URL encoding
 * @param path Path with underscores
 * @returns Path with spaces
 */
export function convertUnderscoresToSpaces(path: string): string {
  return path.replace(/_/g, ' ');
}

/**
 * Converts spaces to underscores in paths
 * Use this when generating href paths to avoid URL encoding issues
 * @param path Path with spaces
 * @returns Path with underscores
 */
export function convertSpacesToUnderscores(path: string): string {
  return path.replace(/ /g, '_');
}