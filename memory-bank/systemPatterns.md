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

### 1. WebDAV Server (`webdav.ts`)
- **Singleton Pattern**: Ensures single server instance
- **HTTP Server**: Node.js built-in `http` module
- **Method Handlers**: PROPFIND, GET, HEAD, OPTIONS
- **Authentication**: Basic HTTP auth with challenge-response
- **File Streaming**: Direct file system access using Eagle item paths

### 2. Background Service (`background.ts`)
- **Service Lifecycle**: Start, stop, restart operations
- **Eagle Event Integration**: Plugin lifecycle hooks
- **Connection Info**: Provides client connection details
- **Health Monitoring**: Server status and health checks

### 3. UI Component (`App.tsx`)
- **Server Control**: Start/stop buttons
- **Connection Display**: URL, credentials, endpoints
- **Status Monitoring**: Real-time server state
- **Compact Layout**: Two-column design for minimal footprint

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
- **Root**: `/` → Lists Eagle folders
- **Folders**: `/folders/{id}` → Folder contents (subfolders + files)
- **Files**: `/files/{id}` → Individual file content
- **Trailing Slash Handling**: Automatically stripped from IDs

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
5. Stream file content using fs.createReadStream()

## Module Dependencies
- **Node.js Built-ins Only**: http, url, querystring, fs
- **Eagle Plugin API**: Complete integration
- **React Components**: Minimal UI with TypeScript
- **Singleton Management**: Prevents multiple server instances