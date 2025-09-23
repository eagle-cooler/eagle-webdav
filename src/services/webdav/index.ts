// Main exports for the WebDAV module
export { eagleWebDAVServer, EagleWebDAVServer } from '../webdav';
export type { WebDAVServerConfig, EagleWebDAVFile, EagleWebDAVFolder } from './types';

// Individual module exports for advanced usage
export { generatePropfindXML, generateFilePropfindXML } from './xml';
export { getMimeType, serveFileContent } from './fileHandler';
export { getRootContainer, getAllEagleFolders, getFileById, getFolderById, getFolderByName, getIndexPath } from './eagleParser';