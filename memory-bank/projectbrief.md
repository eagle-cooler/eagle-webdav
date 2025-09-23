# Eagle WebDAV Plugin - Project Brief

## Project Overview
A background service plugin for Eagle (image/asset management application) that exposes the user's Eagle library content via a WebDAV server on localhost:41596.

## Core Requirements
- **Background Service**: Runs as an Eagle plugin in service mode
- **WebDAV Server**: HTTP server implementing WebDAV protocol for file/folder access
- **Port 41596**: Fixed port for consistent client connections
- **Authentication**: Basic HTTP auth using hostname as username and auto-generated UUID as password
- **Read-Only Access**: Browse and download Eagle library content, no write operations
- **Compact UI**: Minimal interface showing server status and connection information

## Success Criteria
1. WebDAV clients (like AirExplorer, Windows Explorer, macOS Finder) can connect successfully
2. Users can browse Eagle folder structure through WebDAV
3. Users can download actual file content from Eagle library
4. Server automatically starts when Eagle runs
5. Authentication works seamlessly with generated credentials
6. Proper file extensions and folder names are displayed

## Technical Constraints
- Must work within Eagle's Electron plugin environment
- Can only use Node.js built-in modules (no external npm packages like Express.js)
- Must integrate with Eagle Plugin API for folder/item access
- Files served from actual file system paths using Eagle's item.filePath

## User Experience Goals
- **Zero Configuration**: Works immediately after installation
- **Standard WebDAV**: Compatible with existing WebDAV clients
- **Reliable Access**: Consistent connection information and authentication
- **Intuitive Navigation**: Proper folder/file names with extensions displayed