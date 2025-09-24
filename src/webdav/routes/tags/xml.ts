/**
 * XML generation for tags route WebDAV responses
 * Handles PROPFIND responses for tag-based browsing
 */

/**
 * Generates XML response for tags listings (both tag list and tag contents)
 * @param requestPath The request path (e.g., '/tags' or '/tags/tagName')
 * @param items Array of tags (for root) or files (for tag contents)
 * @param depthZero Whether depth=0 (only current collection info)
 * @param tagName Optional tag name when showing tag contents
 * @returns XML string for PROPFIND response
 */
export function generateTagsListXML(
  requestPath: string,
  items: any[],
  depthZero: boolean = false,
  tagName?: string
): string {
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">`;

  // Add current collection info
  xml += `
  <D:response>
    <D:href>${escapeXML(requestPath)}/</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype>
          <D:collection/>
        </D:resourcetype>
        <D:displayname>${escapeXML(tagName || 'tags')}</D:displayname>
        <D:getlastmodified>${new Date().toUTCString()}</D:getlastmodified>
        <D:creationdate>${new Date().toISOString()}</D:creationdate>
        <D:getcontenttype>httpd/unix-directory</D:getcontenttype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;

  // If depth=0, only return collection info
  if (depthZero) {
    xml += '\n</D:multistatus>';
    return xml;
  }

  // Add child items
  if (items && Array.isArray(items)) {
    for (const item of items) {
      if (tagName) {
        // This is showing content of a specific tag - only show files, no folders
        if ('size' in item && item.size !== undefined) {
          xml += generateFileXML(requestPath, item);
        }
        // Do NOT add the tag folder itself as a child when showing tag contents
      } else {
        // This is the root tags listing - show tag folders
        xml += generateTagFolderXML(requestPath, item);
      }
    }
  }

  xml += '\n</D:multistatus>';
  return xml;
}

/**
 * Generates XML for a tag folder entry
 * @param basePath Base path for the request
 * @param tag Tag object with name and properties
 * @returns XML string for tag folder
 */
function generateTagFolderXML(basePath: string, tag: any): string {
  const tagPath = `${basePath}/${encodeURIComponent(tag.name)}`;
  const displayName = tag.name || 'Unnamed Tag';
  
  return `
  <D:response>
    <D:href>${escapeXML(tagPath)}/</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype>
          <D:collection/>
        </D:resourcetype>
        <D:displayname>${escapeXML(displayName)}</D:displayname>
        <D:getlastmodified>${(tag.lastModified || new Date()).toUTCString()}</D:getlastmodified>
        <D:creationdate>${(tag.lastModified || new Date()).toISOString()}</D:creationdate>
        <D:getcontenttype>httpd/unix-directory</D:getcontenttype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
}

/**
 * Generates XML for a file entry within a tag
 * @param basePath Base path for the request
 * @param file File object with name, size, etc.
 * @returns XML string for file
 */
function generateFileXML(basePath: string, file: any): string {
  const fileExt = file.ext ? `.${file.ext}` : '';
  const fileName = `${file.name}${fileExt}`;
  const filePath = `${basePath}/${encodeURIComponent(fileName)}`;
  const mimeType = file.mimeType || 'application/octet-stream';
  
  return `
  <D:response>
    <D:href>${escapeXML(filePath)}</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype/>
        <D:displayname>${escapeXML(fileName)}</D:displayname>
        <D:getcontentlength>${file.size || 0}</D:getcontentlength>
        <D:getcontenttype>${escapeXML(mimeType)}</D:getcontenttype>
        <D:getlastmodified>${(file.lastModified || new Date()).toUTCString()}</D:getlastmodified>
        <D:creationdate>${(file.lastModified || new Date()).toISOString()}</D:creationdate>
        <D:getetag>"${file.id || 'unknown'}-${(file.lastModified || new Date()).getTime()}"</D:getetag>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
}

/**
 * Escapes XML special characters
 * @param text Text to escape
 * @returns Escaped text safe for XML
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates a single file PROPFIND response for files within tags
 * @param requestPath The request path
 * @param file File object
 * @returns XML string for single file PROPFIND
 */
export function generateSingleTagFilePROPFIND(requestPath: string, file: any): string {
  const fileExt = file.ext ? `.${file.ext}` : '';
  const fileName = `${file.name}${fileExt}`;
  const mimeType = file.mimeType || 'application/octet-stream';
  
  return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>${escapeXML(requestPath)}</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype/>
        <D:displayname>${escapeXML(fileName)}</D:displayname>
        <D:getcontentlength>${file.size || 0}</D:getcontentlength>
        <D:getcontenttype>${escapeXML(mimeType)}</D:getcontenttype>
        <D:getlastmodified>${(file.lastModified || new Date()).toUTCString()}</D:getlastmodified>
        <D:creationdate>${(file.lastModified || new Date()).toISOString()}</D:creationdate>
        <D:getetag>"${file.id || 'unknown'}-${(file.lastModified || new Date()).getTime()}"</D:getetag>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;
}