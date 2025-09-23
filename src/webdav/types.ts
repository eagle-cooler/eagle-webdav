/**
 * Shared types for Eagle WebDAV Server
 */

export interface WebDAVServerConfig {
  port: number;
  host: string;
  password: string;
}

export interface EagleWebDAVFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path: string;
  lastModified: Date;
  ext?: string; // Extension from Eagle item
}

export interface EagleWebDAVFolder {
  id: string;
  name: string;
  path: string;
  lastModified: Date;
  children: (EagleWebDAVFile | EagleWebDAVFolder)[];
}

/**
 * WebDAV request types
 */
export type WebDAVMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PROPFIND' | 'PROPPATCH' | 'MKCOL' | 'COPY' | 'MOVE' | 'LOCK' | 'UNLOCK';

/**
 * WebDAV depth header values
 */
export type WebDAVDepth = '0' | '1' | 'infinity';

/**
 * Route handler function type
 */
export interface RouteHandler {
  (pathname: string, req: any, res: any, sendResponse: (res: any, status: number, data: any) => void): Promise<void>;
}

/**
 * Route configuration
 */
export interface RouteConfig {
  pattern: string | RegExp;
  methods: WebDAVMethod[];
  handler: RouteHandler;
}