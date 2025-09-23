# Technical Context - Eagle WebDAV Plugin

## Technology Stack

### Core Technologies
- **Eagle Plugin API**: Complete integration with Eagle application
- **Node.js**: Built-in modules only (http, url, querystring, fs)
- **TypeScript**: Full type safety with Eagle API definitions
- **React**: UI components with hooks
- **TailwindCSS + DaisyUI**: Styling and component library

### Build Tools
- **Vite**: Modern build tool and dev server
- **PostCSS**: CSS processing
- **TypeScript Compiler**: Type checking and compilation

## Development Environment

### Project Structure
```
eagle-webdav/
├── dist/                    # Built plugin files
├── public/                  # Static assets
├── src/
│   ├── services/
│   │   ├── webdav.ts       # HTTP server implementation
│   │   └── background.ts    # Service lifecycle
│   ├── App.tsx             # Main UI component
│   ├── main.tsx            # Entry point
│   ├── init.ts             # Plugin initialization
│   └── eagle.d.ts          # Eagle API type definitions
├── manifest.json           # Eagle plugin configuration
├── package.json            # Dependencies and scripts
└── memory-bank/            # Documentation system
```

### Build Configuration
- **Entry Point**: `src/main.tsx`
- **Output**: `dist/` directory with plugin bundle
- **Bundle Size**: ~165KB compressed
- **ES Modules**: Converted to CommonJS for Eagle compatibility

## Technical Constraints

### Eagle Plugin Environment
- **Electron Context**: Runs within Eagle's Electron renderer
- **Module Restrictions**: Cannot use external npm packages that require Node.js APIs
- **API Limitations**: Must use Eagle's provided interfaces
- **Service Mode**: Background plugin with persistent lifecycle

### Node.js Module Limitations
```typescript
// ✅ Allowed - Built-in modules
const http = require('http');
const fs = require('fs');
const url = require('url');

// ❌ Not allowed - External packages
// const express = require('express'); // Not available in Eagle
// const cors = require('cors');       // Not available in Eagle
```

### WebDAV Protocol Requirements
- **HTTP 1.1 Compliance**: Standard methods (GET, POST, OPTIONS, etc.)
- **WebDAV Extensions**: PROPFIND method for directory listing
- **XML Responses**: Proper WebDAV XML format for PROPFIND
- **Authentication**: Basic HTTP auth with challenge-response

## Dependencies

### Production Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

### Development Dependencies
```json
{
  "@types/react": "^18.3.12",
  "@types/react-dom": "^18.3.1",
  "@vitejs/plugin-react-swc": "^3.7.1",
  "autoprefixer": "^10.4.20",
  "daisyui": "^4.12.14",
  "postcss": "^8.5.0",
  "tailwindcss": "^3.4.16",
  "typescript": "~5.6.2",
  "vite": "^6.3.6"
}
```

## API Integration

### Eagle Plugin Manifest
```json
{
  "id": "rao-pics-webdav-plugin",
  "name": "Eagle WebDAV Server",
  "version": "1.0.0",
  "serviceMode": true,
  "window": {
    "width": 800,
    "height": 600,
    "resizable": true,
    "minimizable": true
  }
}
```

### Eagle API Usage Patterns
```typescript
// Folder Operations
eagle.folder.getAll() → Folder[]
eagle.folder.getById(id) → Folder
eagle.item.get({folders: [id]}) → Item[]

// Item Operations  
eagle.item.getById(id) → Item
item.filePath → string (file system path)
item.ext → string (file extension)

// System Integration
eagle.os.hostname() → string (for auth username)
eagle.log.info/warn/error() → void (logging)
```

## Development Workflow

### Build Process
```bash
npm run dev    # Development server
npm run build  # Production build
npm run preview # Preview built plugin
```

### Plugin Installation
1. Build plugin: `npm run build`
2. Copy `dist/` contents to Eagle plugins directory
3. Install in Eagle: Plugins → Install from folder
4. Activate plugin and configure as service

### Debugging
- **Eagle Developer Tools**: Access through Eagle menu
- **Console Logging**: Use `console.log()` and `eagle.log.*()`
- **Network Monitoring**: Watch HTTP requests to port 41596
- **File System**: Verify Eagle item paths are accessible

## Security Considerations

### Authentication
- **Username**: System hostname (public information)
- **Password**: Auto-generated UUID stored in localStorage
- **Scope**: localhost only, no external network access
- **Transport**: HTTP (acceptable for localhost)

### File Access
- **Read-Only**: No write operations to Eagle library
- **Path Validation**: Only serve files from Eagle item paths
- **Error Handling**: No sensitive path information in errors