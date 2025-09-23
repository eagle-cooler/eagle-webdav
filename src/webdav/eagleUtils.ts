/**
 * Eagle API utilities for WebDAV server
 * Handles all interactions with Eagle's folder and item APIs
 */

import { EagleWebDAVFile, EagleWebDAVFolder } from './types';

/**
 * Gets the MIME type for a file extension
 * @param ext File extension
 * @returns MIME type string
 */
export function getMimeType(ext?: string): string {
  if (!ext) return 'application/octet-stream';
  
  const mimeTypes: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'mkv': 'video/x-matroska',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed'
  };
  
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Gets the main containers for the root level
 * @returns Array of main WebDAV containers (allItems, uncategorized, folders, tags)
 */
export async function getRootContainer(): Promise<EagleWebDAVFolder[]> {
  return [
    {
      id: 'allItems',
      name: 'allItems',
      path: '/allItems',
      lastModified: new Date(),
      children: []
    },
    {
      id: 'uncategorized',
      name: 'uncategorized', 
      path: '/uncategorized',
      lastModified: new Date(),
      children: []
    },
    {
      id: 'folders',
      name: 'folders',
      path: '/folders',
      lastModified: new Date(),
      children: []
    },
    {
      id: 'tags',
      name: 'tags',
      path: '/tags', 
      lastModified: new Date(),
      children: []
    }
  ];
}

/**
 * Gets all Eagle folders for the /folders container (flattened structure)
 * @returns Array of ALL Eagle WebDAV folders (including nested ones, flattened)
 */
export async function getAllEagleFolders(): Promise<EagleWebDAVFolder[]> {
  if (typeof eagle === 'undefined') {
    return [];
  }
  
  try {
    const folders = await eagle.folder.getAll();
                    
    if (!folders || !Array.isArray(folders)) {
      console.warn('[DEBUG] No folders returned from Eagle API or not an array');
      return [];
    }
    
    // Flatten all folders (including nested ones) into a single array
    const allFolders: any[] = [];
    
    function collectAllFolders(folderList: any[]) {
      for (const folder of folderList) {
        allFolders.push(folder);
        // If this folder has children, recursively collect them too
        if (folder.children && Array.isArray(folder.children)) {
          collectAllFolders(folder.children);
        }
      }
    }
    
    collectAllFolders(folders);
    console.log(`[DEBUG] Collected ${allFolders.length} total folders (including nested)`);
    
    const result = allFolders.map((folder) => {
            return {
        id: folder.id,
        name: folder.name,
        path: `/folders/${folder.name}`, // Use folder name in path, not ID
        lastModified: new Date(folder.createdAt),
        children: []
      };
    });
        return result;
  } catch (error) {
    console.error('[DEBUG] Error getting root folders:', error);
    return [];
  }
}

/**
 * Gets a folder by its name from the Eagle API
 * @param name The folder name
 * @returns Eagle WebDAV folder or null if not found
 */
export async function getFolderByName(name: string): Promise<EagleWebDAVFolder | null> {
  try {
    if (typeof eagle === 'undefined') return null;
    
    console.log(`[DEBUG] Getting folder by name: ${name}`);
    // Get all folders and find the one with matching name
    const allFolders = await eagle.folder.getAll();
    if (!allFolders || !Array.isArray(allFolders)) {
      console.warn('[DEBUG] No folders returned from Eagle API');
      return null;
    }
    
    // Search through ALL folders (including nested ones) to find the name
    let foundFolder: any = null;
    
    function searchForFolder(folderList: any[]): any {
      for (const folder of folderList) {
        if (folder.name === name) {
          return folder;
        }
        // Search in children too
        if (folder.children && Array.isArray(folder.children)) {
          const found = searchForFolder(folder.children);
          if (found) return found;
        }
      }
      return null;
    }
    
    foundFolder = searchForFolder(allFolders);
        
    if (!foundFolder) {
      console.log(`[DEBUG] No folder found with name: ${name}`);
      return null;
    }
    
    // Get the full folder with contents
    return await getFolderById(foundFolder.id);
  } catch (error) {
    console.error(`[DEBUG] Error getting folder by name ${name}:`, error);
    return null;
  }
}

/**
 * Gets a folder by its ID from the Eagle API, including all children
 * @param id The folder ID
 * @returns Eagle WebDAV folder or null if not found
 */
export async function getFolderById(id: string): Promise<EagleWebDAVFolder | null> {
  try {
    if (typeof eagle === 'undefined') return null;
    
    console.log(`[DEBUG] Getting folder by ID: ${id}`);
    const folder = await eagle.folder.getById(id);
        if (!folder) return null;

    const children: (EagleWebDAVFile | EagleWebDAVFolder)[] = [];

    // For flat structure, don't add subfolders - only show files in this folder
    // This prevents circular references and maintains the flat navigation we want
    
    // Get items in this folder - using the correct API call
    console.log(`[DEBUG] Getting items for folder: ${id}`);
    
    // Test: Try to get all items first to see if there are any items at all
    try {
      const allItems = await eagle.item.get({});
      console.log(`[DEBUG] Total items in Eagle library: ${allItems ? allItems.length : 0}`);
      if (allItems && allItems.length > 0) {
        console.log(`[DEBUG] Sample item:`, allItems[0]);
      }
    } catch (e) {
      console.log(`[DEBUG] Error getting all items:`, e);
    }
    
    // Get items in this specific folder
    console.log(`[DEBUG] Trying eagle.item.get({ folders: ["${id}"] })`);
    const items = await eagle.item.get({ folders: [id] });
        
    // Add files
    if (items && Array.isArray(items)) {
      console.log(`[DEBUG] Adding ${items.length} items to folder`);
      for (const item of items) {
        // Ensure the item is treated as a file by explicitly not including children property
        const fileItem = {
          id: item.id,
          name: item.name,
          size: item.size || 0, // Ensure size is always present
          mimeType: getMimeType(item.ext),
          path: item.filePath,
          lastModified: new Date(item.importedAt),
          ext: item.ext
          // Explicitly NOT including children property to ensure it's treated as a file
        };
        children.push(fileItem);
      }
    }

    console.log(`[DEBUG] Folder ${id} has ${children.length} children total`);
    return {
      id: folder.id,
      name: folder.name,
      path: `/folders/${folder.id}`,
      lastModified: new Date(folder.createdAt),
      children
    };
  } catch (error) {
    if (typeof eagle !== 'undefined') {
      eagle.log.error(`Failed to get folder ${id}: ${error}`);
    } else {
      console.error(`Failed to get folder ${id}: ${error}`);
    }
    return null;
  }
}

/**
 * Gets a file by its ID from the Eagle API
 * @param id The file ID
 * @returns Eagle WebDAV file or null if not found
 */
export async function getFileById(id: string): Promise<EagleWebDAVFile | null> {
  try {
    if (typeof eagle === 'undefined') return null;
    
    const item = await eagle.item.getById(id);
    if (!item) return null;

    return {
      id: item.id,
      name: item.name,
      size: item.size,
      mimeType: getMimeType(item.ext),
      path: item.filePath,
      lastModified: new Date(item.importedAt),
      ext: item.ext // Add extension property for easy access
    };
  } catch (error) {
    console.error(`Failed to get file ${id}:`, error);
    return null;
  }
}

/**
 * Gets all Eagle items with performance optimization
 * Uses eagle.item.countAll() to check if items > 5000, returns empty array if so
 * Otherwise uses eagle.item.getAll() and converts to WebDAV format
 * @returns Array of Eagle WebDAV files (empty if count > 5000)
 */
export async function getAllEagleItems(): Promise<EagleWebDAVFile[]> {
  if (typeof eagle === 'undefined') {
    return [];
  }
  
  try {
    // First check the total count for performance optimization
    const totalCount = await eagle.item.countAll();
    console.log(`[DEBUG] Total items in library: ${totalCount}`);
    
    // If more than 5000 items, return empty folder for performance
    if (totalCount > 5000) {
      console.log(`[DEBUG] Too many items (${totalCount} > 5000), returning empty folder`);
      return [];
    }
    
    // Get all items since count is manageable
    console.log(`[DEBUG] Getting all ${totalCount} items from Eagle`);
    const items = await eagle.item.getAll();
    
    if (!items || !Array.isArray(items)) {
      console.warn('[DEBUG] No items returned from Eagle API or not an array');
      return [];
    }
    
    // Convert Eagle items to WebDAV format
    const webdavFiles: EagleWebDAVFile[] = [];
    for (const item of items) {
      webdavFiles.push({
        id: item.id,
        name: item.name,
        size: item.size || 0,
        mimeType: getMimeType(item.ext),
        path: item.filePath,
        lastModified: new Date(item.importedAt),
        ext: item.ext
      });
    }
    
    console.log(`[DEBUG] Converted ${webdavFiles.length} items to WebDAV format`);
    return webdavFiles;
  } catch (error) {
    if (typeof eagle !== 'undefined') {
      eagle.log.error(`Failed to get all Eagle items: ${error}`);
    } else {
      console.error(`Failed to get all Eagle items: ${error}`);
    }
    return [];
  }
}
