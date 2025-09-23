/**
 * Authentication module for Eagle WebDAV Server
 * Handles Basic HTTP authentication with auto-generated credentials
 */

/**
 * Interface for authentication result
 */
export interface AuthResult {
  success: boolean;
  username?: string;
  error?: string;
}

/**
 * Interface for server credentials
 */
export interface ServerCredentials {
  username: string;
  password: string;
}

/**
 * Generates a random UUID for password
 * @returns Random UUID string
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gets or creates a password from localStorage
 * @returns Stored or newly generated password
 */
export function getOrCreatePassword(): string {
  const key = 'eagle-webdav-password';
  try {
    const stored = localStorage.getItem(key);
    
    if (stored) {
      return stored;
    }
    
    const newPassword = generateUUID();
    localStorage.setItem(key, newPassword);
    return newPassword;
  } catch (error) {
    // Fallback to session-only password
    const fallbackPassword = generateUUID();
    return fallbackPassword;
  }
}

/**
 * Gets the expected server credentials
 * @returns Server credentials object
 */
export function getServerCredentials(): ServerCredentials {
  const username = typeof eagle !== 'undefined' && eagle.os ? eagle.os.hostname() : 'localhost';
  const password = getOrCreatePassword();
  
  return { username, password };
}

/**
 * Parses Basic Authentication header
 * @param authHeader Authorization header value
 * @returns Parsed credentials or null if invalid
 */
function parseBasicAuth(authHeader: string): { username: string; password: string } | null {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    if (!username || !password) {
      return null;
    }
    
    return { username, password };
  } catch (error) {
    return null;
  }
}

/**
 * Authenticates a WebDAV request using Basic authentication
 * @param req HTTP request object
 * @returns Authentication result
 */
export function authenticateRequest(req: any): AuthResult {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return { success: false, error: 'No authorization header provided' };
  }
  
  const parsedAuth = parseBasicAuth(authHeader);
  if (!parsedAuth) {
    return { success: false, error: 'Invalid authorization header format' };
  }
  
  const expectedCredentials = getServerCredentials();
  
  if (parsedAuth.username === expectedCredentials.username && 
      parsedAuth.password === expectedCredentials.password) {
    return { success: true, username: parsedAuth.username };
  } else {
    return { success: false, error: 'Invalid credentials' };
  }
}

/**
 * Sends authentication challenge to client
 * @param res HTTP response object
 * @param sendResponseFn Function to send HTTP response
 */
export function sendAuthChallenge(res: any, sendResponseFn: (res: any, status: number, data: any) => void): void {
  res.setHeader('WWW-Authenticate', 'Basic realm="Eagle WebDAV Server"');
  sendResponseFn(res, 401, { error: 'Authentication required' });
}

/**
 * Middleware function for WebDAV authentication
 * @param req HTTP request object
 * @param res HTTP response object
 * @param sendResponseFn Function to send HTTP response
 * @returns True if authenticated, false otherwise
 */
export function authenticateWebDAV(req: any, res: any, sendResponseFn: (res: any, status: number, data: any) => void): boolean {
  const authResult = authenticateRequest(req);
  
  if (!authResult.success) {
    sendAuthChallenge(res, sendResponseFn);
    return false;
  }
  
  return true;
}
