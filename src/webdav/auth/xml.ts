/**
 * XML utilities for WebDAV authentication responses
 */

import { getXMLDeclaration, escapeXML } from '../xmlUtils';

/**
 * Generates XML error response for authentication failures
 * @param errorMessage Error message to include
 * @returns XML error response string
 */
export function generateAuthErrorXML(errorMessage: string): string {
  let xml = getXMLDeclaration();
  xml += '<D:error xmlns:D="DAV:">\n';
  xml += '  <D:need-authentication>\n';
  xml += `    <D:description>${escapeXML(errorMessage)}</D:description>\n`;
  xml += '  </D:need-authentication>\n';
  xml += '</D:error>';
  return xml;
}

/**
 * Generates XML response for unauthorized access
 * @returns XML unauthorized response
 */
export function generateUnauthorizedXML(): string {
  return generateAuthErrorXML('Authentication required to access this resource');
}

/**
 * Generates XML response for invalid credentials
 * @returns XML invalid credentials response
 */
export function generateInvalidCredentialsXML(): string {
  return generateAuthErrorXML('Invalid username or password provided');
}
