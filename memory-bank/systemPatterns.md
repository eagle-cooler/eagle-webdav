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
- **`/folders/`**: Folder navigation + file serving
- **`/allItems/`**: All items browsing + file serving  
- **`/files/`**: Direct file access by ID
- **`/hierarchy/`**: Hierarchical folder navigation + file serving
- **`/tags/`**: Tag-based browsing + file serving

### Route Pattern
Each route: `/routes/{name}/index.ts` (handlers) + `xml.ts` (WebDAV XML)

**Critical**: Add new route names to root containers: `['allItems', 'folders', 'hierarchy', 'tags']`

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