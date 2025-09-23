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