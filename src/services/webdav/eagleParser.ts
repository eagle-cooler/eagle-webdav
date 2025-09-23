import { EagleWebDAVFile, EagleWebDAVFolder } from './types';
import { getMimeType } from './fileHandler';

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
 * Gets all root folders from the Eagle API
 * @returns Array of Eagle WebDAV folders
 */
export async function getRootFolders(): Promise<EagleWebDAVFolder[]> {
  if (typeof eagle === 'undefined') {
    return [];
  }
  
  try {
    const folders = await eagle.folder.getAll();
                    
    if (!folders || !Array.isArray(folders)) {
      console.warn('[DEBUG] No folders returned from Eagle API or not an array');
      return [];
    }
    
    const result = folders.map((folder) => {
            return {
        id: folder.id,
        name: folder.name,
        path: `/folders/${folder.id}`,
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
        // If this folder has children, search them too
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
    
    // Now get the full folder data with children using the ID
    return await getFolderById(foundFolder.id);
  } catch (error) {
    if (typeof eagle !== 'undefined') {
      eagle.log.error(`Failed to get folder by name ${name}: ${error}`);
    } else {
      console.error(`Failed to get folder by name ${name}: ${error}`);
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