import { EagleWebDAVFile, EagleWebDAVFolder } from './types';
import { getMimeType } from './fileHandler';

/**
 * Gets all root folders from the Eagle API
 * @returns Array of Eagle WebDAV folders
 */
export async function getRootFolders(): Promise<EagleWebDAVFolder[]> {
  if (typeof eagle === 'undefined') {
    return [];
  }
  
  try {
    const folders = await eagle.folder.getAll();
    console.log('[DEBUG] Raw folders from Eagle API:', folders);
                
    if (!folders || !Array.isArray(folders)) {
      console.warn('[DEBUG] No folders returned from Eagle API or not an array');
      return [];
    }
    
    const result = folders.map((folder) => {
      console.log('[DEBUG] Processing folder:', folder);
      return {
        id: folder.id,
        name: folder.name,
        path: `/folders/${folder.id}`,
        lastModified: new Date(folder.createdAt),
        children: []
      };
    });
    console.log('[DEBUG] Processed folders result:', result);
    return result;
  } catch (error) {
    console.error('[DEBUG] Error getting root folders:', error);
    return [];
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
 * Gets a folder by its ID from the Eagle API, including all children
 * @param id The folder ID
 * @returns Eagle WebDAV folder or null if not found
 */
export async function getFolderById(id: string): Promise<EagleWebDAVFolder | null> {
  try {
    if (typeof eagle === 'undefined') return null;
    
    console.log(`[DEBUG] Getting folder by ID: ${id}`);
    const folder = await eagle.folder.getById(id);
    console.log('[DEBUG] Folder data:', folder);
    if (!folder) return null;

    const children: (EagleWebDAVFile | EagleWebDAVFolder)[] = [];

    // Add subfolders first
    if (folder.children && Array.isArray(folder.children)) {
      console.log('[DEBUG] Adding subfolders:', folder.children);
      for (const subfolder of folder.children) {
        children.push({
          id: subfolder.id,
          name: subfolder.name,
          path: `/folders/${subfolder.id}`,
          lastModified: new Date(subfolder.createdAt),
          children: [] // Don't load nested children for performance
        });
      }
    }

    // Get items in this folder - using the correct API call
    console.log(`[DEBUG] Getting items for folder: ${id}`);
    const items = await eagle.item.get({ folders: [id] });
    console.log('[DEBUG] Items in folder:', items);
    
    // Add files
    if (items && Array.isArray(items)) {
      console.log(`[DEBUG] Adding ${items.length} items to folder`);
      for (const item of items) {
        children.push({
          id: item.id,
          name: item.name,
          size: item.size,
          mimeType: getMimeType(item.ext),
          path: item.filePath,
          lastModified: new Date(item.importedAt),
          ext: item.ext
        });
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
 * Gets a folder or file by navigating through path segments
 * @param pathSegments Array of path segments to navigate
 * @returns Eagle WebDAV folder/file or null if not found
 */
export async function getIndexPath(pathSegments: string[]): Promise<EagleWebDAVFolder | EagleWebDAVFile | null> {
  try {
    if (typeof eagle === 'undefined') return null;
    
    // Start from root folders
    const allFolders = await eagle.folder.getAll();
    
    if (!allFolders || !Array.isArray(allFolders)) {
      console.warn('No folders available from Eagle API');
      return {
        id: 'root',
        name: 'Eagle Library',
        path: '/index',
        lastModified: new Date(),
        children: []
      };
    }
    
    if (pathSegments.length === 0) {
      // Return root structure
      return {
        id: 'root',
        name: 'Eagle Library',
        path: '/index',
        lastModified: new Date(),
        children: allFolders.map(folder => ({
          id: folder.id,
          name: folder.name,
          path: `/index/${folder.name}`,
          lastModified: new Date(folder.createdAt),
          children: []
        }))
      };
    }

    // Navigate through path segments
    let currentFolder: Folder | undefined = allFolders.find(f => f.name === pathSegments[0]);
    if (!currentFolder) return null;

    for (let i = 1; i < pathSegments.length; i++) {
      const children: Folder[] = currentFolder.children || [];
      if (!Array.isArray(children)) break;
      currentFolder = children.find((child: Folder) => child.name === pathSegments[i]);
      if (!currentFolder) return null;
    }

    return await getFolderById(currentFolder.id);
  } catch (error) {
    if (typeof eagle !== 'undefined') {
      eagle.log.error(`Failed to get index path ${pathSegments.join('/')}: ${error}`);
    } else {
      console.error(`Failed to get index path ${pathSegments.join('/')}: ${error}`);
    }
    return null;
  }
}