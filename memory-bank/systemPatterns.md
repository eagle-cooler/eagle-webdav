# System Patterns - Eagle WebDAV Plugin

## Architecture
```
Eagle App ←→ Plugin (HTTP Server:41596) ←→ WebDAV Clients
```

## Core Components

### WebDAV Server (`webdav/server.ts`)
- **Singleton**: `EagleWebDAVServer.getInstance()`
- **Methods**: PROPFIND, GET, HEAD, OPTIONS
- **Delegates** to route handlers for all operations

### Route Pattern (`webdav/routes/{name}/index.ts`)
Each route implements:
```typescript
export async function handle{Name}GET(
  pathname: string, res: any,
  sendResponse: (res: any, status: number, data: any) => void,
  serveFileContent: (file: any, res: any) => Promise<void>
): Promise<void>

export async function handle{Name}PROPFIND(
  pathname: string, req: any, res: any,
  sendXMLResponse: (res: any, statusCode: number, xml: string) => void,
  generateSingleFilePROPFIND?: (requestPath: string, file: any) => string
): Promise<void>
```

### Current Routes
- **`/folders/`**: Flat folder navigation (no subfolder copying)
- **`/hierarchy/`**: Hierarchical navigation (full folder copying support)
- **`/allItems/`**: All items browsing (<5000 items limit)
- **`/files/`**: Direct file access by ID (mobile client compatible)  
- **`/tags/`**: Tag-based browsing + file serving

## Adding New Root Containers - CRITICAL PROCESS

### Step 1: Create Route Structure
```
src/webdav/routes/{name}/
├── index.ts    # Route handlers (GET + PROPFIND)
└── xml.ts      # WebDAV XML generation
```

### Step 2: Implement Required Functions
```typescript
// In index.ts - REQUIRED exports
export async function handle{Name}GET(pathname, res, sendResponse, serveFileContent)
export async function handle{Name}PROPFIND(pathname, req, res, sendXMLResponse?)

// In xml.ts - REQUIRED exports  
export function generate{Name}XML(basePath, items, isDepthZero?, containerName?)
```

### Step 3: Register Route in Server ✅ CRITICAL
```typescript
// In webdav/server.ts - Add to route imports
import { handle{Name}GET, handle{Name}PROPFIND } from './routes/{name}';

// Add to route delegation in handleRequest()
} else if (pathname.startsWith('/{name}/')) {
  if (method === 'PROPFIND') {
    await handle{Name}PROPFIND(pathname, req, res, this.sendXMLResponse.bind(this));
  } else if (method === 'GET') {
    await handle{Name}GET(pathname, res, this.sendResponse.bind(this), this.serveFileContent.bind(this));
  }
```

### Step 4: Add to Root Containers ✅ MANDATORY
```typescript
// In eagleUtils.ts - Update getRootContainers()
return [
  { id: 'allItems', name: 'allItems', path: '/allItems', lastModified: new Date(), children: [] },
  { id: 'folders', name: 'folders', path: '/folders', lastModified: new Date(), children: [] },
  { id: 'hierarchy', name: 'hierarchy', path: '/hierarchy', lastModified: new Date(), children: [] },
  { id: 'tags', name: 'tags', path: '/tags', lastModified: new Date(), children: [] },
  { id: '{name}', name: '{name}', path: '/{name}', lastModified: new Date(), children: [] }, // ADD THIS
];
```

### Step 5: Pattern Compliance
- **URL Decoding**: Always use `decodeURIComponent()` for filenames
- **XML Escaping**: Use `escapeXML()` from xmlUtils.ts  
- **Error Handling**: Return proper HTTP status codes
- **Eagle Integration**: Use existing eagleUtils.ts functions

## Key Utilities
- **`eagleUtils.ts`**: Eagle API integration
- **`xmlUtils.ts`**: Shared XML generation with escaping
- **`auth/auth.ts`**: Basic HTTP auth with auto-generated credentials

## Key Design Patterns

### WebDAV Protocol
Standard flow: PROPFIND (directory listing) → GET (file download)

### Authentication
Basic HTTP auth using hostname + auto-generated UUID

### Path Resolution
- **Root**: Lists containers and Eagle folders
- **Routes**: Each handles collections (PROPFIND) and files (GET)
- **URL Encoding**: Proper encoding for special characters

## Eagle API Integration
- **Folders**: `eagle.folder.getAll()`, `eagle.folder.getById()`
- **Tags**: `eagle.tag.get()`, `eagle.item.get({ tags: [tagName] })`
- **Files**: `eagle.item.getById()` → `item.filePath` → `fs.createReadStream()`

## Server Architecture
- **Singleton server** on localhost:41596
- **Route delegation**: Each route handles its URL patterns
- **Eagle integration**: Direct API calls with error handling
- **File streaming**: From Eagle `item.filePath` to WebDAV client

## Module Dependencies
- **Node.js built-ins**: http, url, fs, querystring
- **Eagle Plugin API**: Complete folder/item/tag access
- **TypeScript**: Full type safety