# System Patterns - Eagle WebDAV Plugin

## Architecture Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Eagle App     │    │  Plugin System   │    │  WebDAV Clients │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ • AirExplorer   │
│ │ Library     │ │◄───┤ │ Background   │ │    │ • Windows Exp   │
│ │ - Folders   │ │    │ │ Service      │ │    │ • macOS Finder  │
│ │ - Items     │ │    │ │              │ │    │ • Mobile Apps   │
│ │ - Metadata  │ │    │ └──────────────┘ │    │                 │
│ └─────────────┘ │    │        │         │    └─────────────────┘
└─────────────────┘    │        │         │             │
                       │ ┌──────▼──────┐  │             │
                       │ │ HTTP Server │  │◄────────────┘
                       │ │ (Node.js)   │  │
                       │ │ Port 41596  │  │
                       │ └─────────────┘  │
                       └──────────────────┘
```

## Core Components

### 1. WebDAV Server (`webdav/server.ts`)
- **Singleton Pattern**: `EagleWebDAVServer.getInstance()`
- **HTTP Server**: Node.js built-in `http` module
- **Method Handlers**: PROPFIND, GET, HEAD, OPTIONS
- **Modular Routing**: Delegates to specialized route handlers
- **Authentication**: Integrates with auth module

### 2. Background Service (`webdav/background.ts`)
- **Singleton Pattern**: `BackgroundService.getInstance()`
- **Simple Initialization**: Single `init()` method
- **Eagle Events**: `onPluginCreate()` for auto-start
- **State Management**: localStorage for auto-start preferences
- **Connection Info**: Provides client connection details

### 3. Authentication Module (`webdav/auth/`)
- **Credential Generation**: Hostname + UUID pattern
- **Password Storage**: localStorage with fallback generation
- **Challenge-Response**: Proper WWW-Authenticate implementation
- **Error Responses**: XML-formatted authentication errors

### 4. Route Handlers (`webdav/routes/`)
#### Folders Route (`webdav/routes/folders/`)
- **GET Handler**: Folder content serving
- **PROPFIND Handler**: WebDAV property discovery
- **XML Generation**: RFC-compliant WebDAV responses
- **Eagle Integration**: Folder and item retrieval

#### AllItems Route (`webdav/routes/allItems/`)
- **Performance Optimization**: Count-based loading with `eagle.item.countAll()`
- **Smart Loading**: Returns empty folder if >5000 items
- **Complete Integration**: GET/PROPFIND handlers with proper XML responses
- **Eagle API**: Uses `eagle.item.getAll()` for item retrieval

### 5. Shared XML Utilities (`webdav/xmlUtils.ts`)
- **Centralized Generation**: Reusable XML element generators
- **Automatic Escaping**: `escapeXML()` function prevents parsing errors
- **Consistent Structure**: Standardized WebDAV XML formatting
- **Error Handling**: `generateErrorXML()` for proper error responses

## Key Design Patterns

### WebDAV Protocol Implementation
```
PROPFIND Request Flow:
1. Client → PROPFIND / (discover root)
2. Server → 207 Multi-Status (folders list)
3. Client → PROPFIND /folders/{id} (browse folder)
4. Server → 207 Multi-Status (folder contents)
5. Client → GET /files/{id} (download file)
6. Server → File stream response
```

### Authentication Pattern
```
Authentication Flow:
1. Client → Request without auth
2. Server → 401 + WWW-Authenticate header
3. Client → Request with Basic auth
4. Server → Validate hostname + UUID
5. Server → Success or 401
```

### Path Resolution
- **Root**: `/` → Lists Eagle folders and containers
- **Folders**: `/folders/{name}` → Folder contents (subfolders + files)
- **Files**: `/files/{id}/{filename}` → Individual file content with mobile client compatibility
- **Legacy Files**: `/files/{id}` → Backward compatibility for old URL format
- **URL Encoding**: All paths properly encoded for special characters
- **Trailing Slash Handling**: Automatically stripped from IDs and names

### Mobile Client Compatibility
```
URL Format Evolution:
Old: /files/{id}                    → Desktop clients only
New: /files/{id}/{filename}         → Desktop + Mobile clients

Server Parsing:
1. Extract ID from first path segment
2. Support both old and new formats
3. URL encode filenames for special characters
4. Mobile clients use href as display name
```

## Data Flow Patterns

### Eagle API Integration
```typescript
// Folder Structure
eagle.folder.getAll() → Root folders
eagle.folder.getById(id) → Specific folder + children
eagle.item.get({folders: [id]}) → Items in folder

// File Access
eagle.item.getById(id) → Item metadata
item.filePath → Actual file system path
fs.createReadStream(path) → File content
```

### Error Handling Strategy
- **404 Not Found**: Invalid IDs or missing files
- **401 Unauthorized**: Authentication failures
- **500 Internal Error**: File system or Eagle API errors
- **Graceful Degradation**: Continue serving even if some items fail

## Critical Implementation Paths

### Server Initialization
1. Create singleton server instance
2. Generate/retrieve UUID password from localStorage
3. Bind to localhost:41596
4. Register Eagle plugin lifecycle events

### Request Processing
1. CORS headers for all requests
2. OPTIONS handling for preflight
3. Authentication validation
4. Path parsing and routing
5. Eagle API calls
6. Response generation (JSON/XML/Binary)

### File Serving
1. Get Eagle item by ID
2. Extract file system path from item.filePath
3. Verify file existence
4. Set appropriate headers (Content-Type, Content-Length)
5. Stream file content to WebDAV client

## Modern Patterns (Dec 2025 Refactor)

### Singleton Pattern Implementation
```typescript
export class EagleWebDAVServer {
  private static instance: EagleWebDAVServer | null = null;

  private constructor() { /* Private constructor */ }

  static getInstance(): EagleWebDAVServer {
    if (!EagleWebDAVServer.instance) {
      EagleWebDAVServer.instance = new EagleWebDAVServer();
    }
    return EagleWebDAVServer.instance;
  }
}
```

### Simple Initialization Pattern
```typescript
// init.ts - Simple, direct initialization
import { backgroundService } from './webdav/background';
backgroundService.init();

// background.ts - Clean Eagle event registration
init(): void {
  if (typeof eagle !== 'undefined' && eagle.event) {
    eagle.event.onPluginCreate(async () => {
      // Auto-start logic
      const shouldAutoStart = localStorage.getItem("eagle-webdav-server-state") !== "stopped";
      if (shouldAutoStart) {
        await this.start();
      }
    });
  }
}
```

### Modular File Organization
- **Clear Separation**: Auth, routing, utilities in separate modules
- **Single Responsibility**: Each module has one focused purpose
- **Type Safety**: Shared interfaces in dedicated types file
- **Clean Imports**: Organized module exports and dependencies
5. Stream file content using fs.createReadStream()

## Module Dependencies
- **Node.js Built-ins Only**: http, url, querystring, fs
- **Eagle Plugin API**: Complete integration
- **React Components**: Minimal UI with TypeScript
- **Singleton Management**: Prevents multiple server instances