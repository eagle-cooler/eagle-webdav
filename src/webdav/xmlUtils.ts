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
 * Checks if a path is already URL-encoded
 * @param path The path to check
 * @returns True if the path appears to be already encoded
 */
function isAlreadyEncoded(path: string): boolean {
  // If no % characters, definitely not encoded
  if (!path.includes('%')) {
    return false;
  }
  
  try {
    // Try to decode and see if it changes
    const decoded = decodeURIComponent(path);
    // If decoding changes the string, it was encoded
    // If decoding doesn't change it, it probably wasn't properly encoded
    return decoded !== path;
  } catch (e) {
    // If decoding fails, assume it's malformed encoding, treat as not encoded
    return false;
  }
}

/**
 * Generates a WebDAV href path (without XML tags)
 * @param path The path to include (will be URL-encoded if not already encoded)
 * @returns URL-encoded path string
 */
export function generateHrefPath(path: string): string {
  // If the path is already properly encoded, don't encode again
  if (isAlreadyEncoded(path)) {
    return path;
  }
  
  // Otherwise, encode it normally
  const encodedPath = encodeURI(path);
  return encodedPath;
}

/**
 * Generates a WebDAV href element
 * @param path The path to include (URL-encoded)
 * @returns WebDAV href XML element
 */
export function generateHref(path: string): string {
  const hrefPath = generateHrefPath(path);
  return `    <D:href>${hrefPath}</D:href>\n`;
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

/**
 * Recursively decodes a URL-encoded path until no more encoding is detected
 * This handles cases where paths get encoded multiple times (demo%252520video → demo video)
 * @param path The encoded path to decode
 * @returns Fully decoded path
 */
export function recursiveDecodeURI(path: string): string {
  let decoded = path;
  let previousDecoded = '';
  
  // Keep decoding until we get the same result twice (fully decoded)
  while (decoded !== previousDecoded && decoded.includes('%')) {
    previousDecoded = decoded;
    try {
      decoded = decodeURIComponent(decoded);
    } catch (e) {
      // If decoding fails, return the last valid decoded version
      break;
    }
  }
  
  return decoded;
}

/**
 * Normalizes a path by recursively decoding it and trimming whitespace
 * This ensures that paths with different encoding levels are treated as the same
 * Examples:
 * - "demo video" → "demo video"  
 * - "demo%20video" → "demo video"
 * - "demo%2520video" → "demo video"
 * - "demo%252520video" → "demo video"
 * @param path The path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  // Remove leading/trailing slashes and whitespace
  const cleanPath = path.replace(/^\/+|\/+$/g, '').trim();
  
  // Recursively decode to handle multiple encoding levels
  const decodedPath = recursiveDecodeURI(cleanPath);
  
  // Return the normalized path
  return decodedPath;
}