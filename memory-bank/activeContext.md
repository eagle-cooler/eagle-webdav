# Active Context - Eagle WebDAV Plugin

## Current State ✅
- **Route-based architecture** with clean separation of concerns
- **Batch downloads working** across all WebDAV clients (desktop, mobile)
- **Universal client compatibility** - works with Windows, macOS, Android clients
- **Hierarchy route completed** - hierarchical folder navigation with proper URL encoding
- **Tags route completed** - tag-based file browsing and serving ✅ NEW

## File Access Patterns
1. **ID-based**: `/files/{id}/{filename}` (direct Eagle ID access)
2. **Folder-based**: `/folders/{folderName}/{filename}` (flat folder navigation)
3. **Hierarchical**: `/hierarchy/{folder1}/{subfolder}/{filename}` (parent-child relationships) ✅ COMPLETE
4. **Collection-based**: `/allItems/{filename}` (all items browsing)
5. **Tag-based**: `/tags/{tagName}/{filename}` (organize by tags) ✅ NEW

## Working Routes
- **`/folders/`**: Browse Eagle folders (flat structure) + download files within folders ✅
- **`/hierarchy/`**: Browse Eagle folders (hierarchical structure) + download files within hierarchy ✅  
- **`/allItems/`**: Browse all items + download any file by name ✅
- **`/files/`**: Direct file access using Eagle IDs ✅
- **`/tags/`**: Browse and download files by tag organization ✅ NEW

## Recent Implementation - Hierarchy Route ✅ COMPLETED

### Route Implementation Details
- **Path**: `/hierarchy/` - Provides hierarchical folder navigation preserving parent-child relationships
- **Files Created**:
  - `/src/webdav/hierarchy/index.ts` - Route handlers (GET/PROPFIND)
  - `/src/webdav/hierarchy/xml.ts` - XML generation utilities
- **Server Integration**: Added to server.ts routing for both GET and PROPFIND methods
- **Root Container**: Added "hierarchy" to root container listing

### Critical URL Encoding Fix ✅
**Problem**: WebDAV client accessing `/hierarchy/demo%2520video/` (double-encoded) failing to find folder
**Root Cause**: Hierarchy route not using proven URL decoding pattern from folders route  
**Solution Applied**: Used exact same pattern from folders route: `decodeURIComponent(pathname.substring(11).replace(/\\/$/, ''))`

**Key Pattern (DO NOT CHANGE)**:
```typescript
// Folders route pattern (WORKING)
const folderName = decodeURIComponent(pathname.substring(9).replace(/\\/$/, ''));

// Hierarchy route pattern (NOW WORKING)  
const hierarchyPath = decodeURIComponent(pathname.substring(11).replace(/\\/$/, ''));
```

### WebDAV Client Navigation Fix ✅
**Problem**: Client trying `/folders/hierarchy/` instead of `/hierarchy/`
**Root Cause**: Missing "hierarchy" from root containers array in generateFolderContentXML
**Solution**: Added 'hierarchy' to root containers array: `['allItems', 'folders', 'hierarchy', 'tags']`

### Hierarchy Route Features ✅
- **Hierarchical Structure**: Preserves Eagle's parent-child folder relationships
- **URL Encoding**: Proper handling of spaces and special characters in folder names
- **File Serving**: Direct file access within hierarchical paths like `/hierarchy/ProjectA/Subfolder/file.jpg`
- **WebDAV Compliance**: Full PROPFIND and GET support following established patterns
- **Error Handling**: Proper WebDAV XML error responses

## Recent Implementation - Tags Route ✅ COMPLETED

### Route Implementation Details
- **Path**: `/tags/` - Provides tag-based file browsing and organization
- **Files Created**:
  - `/src/webdav/routes/tags/index.ts` - Route handlers (GET/PROPFIND)
  - `/src/webdav/routes/tags/xml.ts` - XML generation utilities
  - Added `getTagsWithItems()` and `getItemsByTag()` utilities to `eagleUtils.ts`
- **Server Integration**: Added to server.ts routing for both GET and PROPFIND methods
- **Root Container**: Already included "tags" in root container listing

### Eagle API Integration ✅
**Tags API Usage**:
```typescript
// Get all tags
const tags = await eagle.tag.get();

// Get items with specific tag
const items = await eagle.item.get({ tags: [tagName] });
```

### Tags Route Features ✅
- **Tag Browsing**: Browse all available tags as folders
- **File Organization**: Files organized by tag categories
- **File Serving**: Direct file access within tags like `/tags/nature/sunset.jpg`
- **WebDAV Compliance**: Full PROPFIND and GET support following established patterns
- **URL Encoding**: Proper handling of tag names with spaces and special characters

## CRITICAL IMPLEMENTATION PATTERNS ⚠️
*These patterns are proven to work. DO NOT CHANGE without compelling reason.*

### URL Decoding Pattern (MANDATORY)
**Problem**: WebDAV clients send URL-encoded paths with spaces/special characters
**Solution**: Use exact pattern from working routes
```typescript
// For routes starting with /folders/ (9 chars)
const folderName = decodeURIComponent(pathname.substring(9).replace(/\/$/, ''));

// For routes starting with /hierarchy/ (11 chars)  
const hierarchyPath = decodeURIComponent(pathname.substring(11).replace(/\/$/, ''));

// For routes starting with /allItems/ (10 chars)
const filename = decodeURIComponent(pathname.substring(10));
```

**CRITICAL**: 
- Always decode ONCE at path parsing level
- Don't decode again in file/folder search functions
- Use `substring(N).replace(/\/$/, '')` pattern exactly

### Root Container Management (MANDATORY)
**File**: `webdav/routes/folders/xml.ts`, function `generateFolderContentXML`
**Root containers array**: `['allItems', 'folders', 'hierarchy', 'tags']`

**CRITICAL**: 
- New root-level routes MUST be added to this array
- Missing routes will be treated as Eagle folders and get wrong href paths
- This causes WebDAV client confusion (tries `/folders/hierarchy/` instead of `/hierarchy/`)

### Response Pattern (MANDATORY)
**Working Pattern** (use this exactly):
```typescript
// For PROPFIND responses
res.writeHead(207, {
  'Content-Type': 'application/xml; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
});
res.end(xmlResponse);

// For error responses  
res.writeHead(404, {
  'Content-Type': 'application/xml; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
});
res.end(errorXML);
```

**CRITICAL**: 
- Don't use `sendXMLResponse()` helper - use direct `res.writeHead()/res.end()`
- AllItems route works with this pattern - hierarchy route fixed to match
- Status 207 for Multi-Status, 404 for Not Found, 405 for Method Not Allowed

### File Serving Pattern (MANDATORY)
**For route handlers serving files**:
```typescript
// 1. Extract and decode path
const decodedPath = decodeURIComponent(pathname.substring(N).replace(/\/$/, ''));

// 2. Parse into folder + filename
const pathParts = decodedPath.split('/').filter(part => part);
const filename = pathParts[pathParts.length - 1];
const folderPath = '/' + pathParts.slice(0, -1).join('/');

// 3. Search files in folder children
for (const item of folder.children) {
  if ('size' in item && item.size !== undefined) { // It's a file
    const itemFilename = item.name + (item.ext ? '.' + item.ext : '');
    if (itemFilename === filename || itemFilename.toLowerCase() === filename.toLowerCase()) {
      // Found file - serve it
    }
  }
}
```

## Previous Solved Issues (DO NOT REINTRODUCE)
1. **URL Format Change**: `/files/{id}` → `/files/{id}/{filename}`
2. **Server Parsing**: Extract ID from first path segment, support both old/new formats
3. **URL Encoding**: Use `encodeURI()` for special characters in filenames
4. **Cross-Client Support**: Works with both desktop and mobile WebDAV clients

### XML Utilities Crisis Resolution (Just Completed) ✅
**Problem**: Folders route loading error due to corrupted xmlUtils.ts file
**Root Cause**: File corruption during mobile client compatibility changes
**Solution**: Complete xmlUtils.ts recreation with all required functions
**Result**: All routes working properly with shared XML utilities

**Technical Recovery**:
- Properly deleted and recreated xmlUtils.ts file
- Added all missing XML generation functions for allItems route
- Fixed import dependencies across all route modules
- Ensured consistent XML escaping and URL encoding

### AllItems Route Implementation (Just Completed) ✅
**Problem**: Missing allItems route for browsing all library items via WebDAV
**Solution**: Implemented complete allItems route with performance optimization and XML escaping
**Result**: Working allItems route with count-based performance optimization and proper XML handling

**Key Implementation**:
1. **Performance-Optimized**: Uses `eagle.item.countAll()` to check library size before loading
   - If >5000 items: Returns empty folder for performance
   - If ≤5000 items: Loads all items via `eagle.item.getAll()`
2. **Route Structure**: Following established folders pattern
   - `webdav/routes/allItems/index.ts` - Route handlers (GET/PROPFIND)
   - `webdav/routes/allItems/xml.ts` - XML generation with escaping
3. **XML Escaping Fix**: Resolved client-side XML parsing errors
   - Added `escapeXML()` function for proper character escaping
   - Fixed display names containing special characters (&, <, >, ", ')

### Complete XML Utilities Implementation ✅
**Components Created**:
- `webdav/xmlUtils.ts` - Complete shared XML generation utilities
- All XML functions properly exported and tested
- Consistent XML escaping across all routes
- Proper URL encoding for WebDAV href elements
- Error recovery from file corruption during development

**Key Features**:
- `escapeXML()` - Prevents XML parsing errors in WebDAV clients
- `generateHref()` - URL-encoded href elements for file paths
- `generateDisplayName()` - XML-escaped display names
- Complete set of WebDAV XML element generators
- Shared across allItems, folders, and auth modules

### Mobile Client URL Architecture ✅
**URL Structure**:
```
Desktop Client URLs (legacy support):
/files/{id}                    → Works but shows IDs

Mobile Client URLs (new format):
/files/{id}/{filename}         → Shows proper filenames
```

**Server Implementation**:
```typescript
// Extract ID from first path segment (both formats)
const pathParts = pathname.substring(7).replace(/\/$/, '').split('/');
const id = pathParts[0]; // First part is always the ID

// URL encoding for special characters
const encodedPath = encodeURI(`/files/${id}/${filename}`);
```

### Complete Architecture Refactoring (Previously Completed) ✅
**Problem**: Complex initialization logic was preventing auto-start and causing UI issues
**Solution**: Simplified entire initialization to use proper Eagle event hooks with singleton pattern
**Result**: Clean, working auto-start and functional UI

**Key Changes**:
1. **Modular Architecture**: Migrated from monolithic `services/webdav.ts` to modular `webdav/` structure
   - `webdav/server.ts` - Main WebDAV server (singleton)
   - `webdav/auth/auth.ts` - Authentication handling
   - `webdav/routes/folders/` - Folder routing and XML generation
   - `webdav/routes/allItems/` - All items routing and XML generation ✅ NEW
   - `webdav/xmlUtils.ts` - Shared XML utilities ✅ NEW
   - `webdav/eagleUtils.ts` - Eagle API utilities
   - `webdav/types.ts` - Shared TypeScript interfaces

2. **Simplified Initialization**: 
   - Background service uses proper singleton pattern
   - Simple `init()` method that registers Eagle event listeners
   - Auto-start logic runs in `eagle.event.onPluginCreate()`
   - No complex waiting or checking loops

3. **UI Fixes**:
   - **Theme**: Set to simple dark theme (no complex Eagle theme detection)
   - **Password Display**: Fixed server credential retrieval 
   - **Auto-start**: Working properly with localStorage state management

### Technical Implementation ✅
```typescript
// Simplified Background Service
export class BackgroundService {
  private static instance: BackgroundService | null = null;
  
  static getInstance(): BackgroundService {
    if (!BackgroundService.instance) {
      BackgroundService.instance = new BackgroundService();
    }
    return BackgroundService.instance;
  }

  init(): void {
    if (typeof eagle !== 'undefined' && eagle.event) {
      eagle.event.onPluginCreate(async () => {
        // Check auto-start preference
        const serverStatePref = localStorage.getItem("eagle-webdav-server-state");
        const shouldAutoStart = serverStatePref !== "stopped";
        
        if (shouldAutoStart) {
          await this.start();
        }
      });
    }
  }
}
```

**Initialization Flow**:
1. `main.tsx` → `init.ts` → `backgroundService.init()`
2. `init()` registers `eagle.event.onPluginCreate()`
3. Eagle fires event, checks localStorage, auto-starts if needed
4. UI shows current state and connection info

### UI Improvements ✅
- **Dark Theme**: Simple, hardcoded dark theme (no complex detection)
- **Password Display**: Shows actual password for copying to WebDAV clients
- **Auto-Start Status**: Server automatically starts unless user previously stopped it
- **Connection Info**: Working display with copy functionality

### Complete Folder Navigation Resolution ✅
**Issues Resolved**:
1. **URL Decoding**: Fixed folder names with spaces ("prior%202025" → "prior 2025")
2. **Circular References**: Eliminated self-referencing folder structures
3. **Empty Folders**: Fixed Eagle API item retrieval for folder contents  
4. **Ghost Folders**: Resolved WebDAV client XML interpretation issues

**Technical Fixes Applied**:
```typescript
// URL decoding for folder names
const folderName = decodeURIComponent(pathname.substring(9).replace(/\/$/, ''));

// Proper file item formatting
const fileItem = {
  id: item.id,
  name: item.name,
  size: item.size || 0, // Ensure size is always present
  mimeType: getMimeType(item.ext),
  // Explicitly NOT including children property
};

// Conditional XML directory entry
const shouldIncludeCurrentDirectory = pathname === '/' || pathname === '/folders' || isDepthZero;
```

### Flattened Folder Structure ✅
**User Requirement**: 
- All Eagle folders displayed at same level under "/folders"
- Regardless of Eagle's internal hierarchy
- Clean navigation: Root → "Folders" → All folders → Files

**Implementation**:
- **Recursive Collection**: Traverse entire Eagle folder hierarchy
- **Flat Presentation**: All folders accessible at `/folders/[name]`
- **File Access**: Direct file serving via `/files/[id]`
**User Requirement Clarification**: 
- User wants to see ALL Eagle folders in a flat list under "/folders"
- Regardless of parent-child relationships in Eagle's hierarchy
- Simple structure: Root → "Folders" → All folders at same level

**Problem with Previous Approach**: 
- Was only showing root-level folders from `eagle.folder.getAll()`
- Eagle has nested folder hierarchies (parent/child relationships)
- Nested folders were hidden and not accessible via WebDAV

**Solution Implemented**:
- **Recursive Folder Collection**: Traverse entire Eagle folder hierarchy
- **Flatten Structure**: Collect ALL folders (root + nested) into single array
- **Flat Navigation**: Present all folders at same level under `/folders/`

**Technical Implementation**:
```typescript
// New recursive collection function
function collectAllFolders(folderList: any[]) {
  for (const folder of folderList) {
    allFolders.push(folder);
    // Recursively collect nested folders too
    if (folder.children && Array.isArray(folder.children)) {
      collectAllFolders(folder.children);
    }
  }
}
```

**Updated Search Function**:
- `getFolderByName()` now searches through ALL folders (including nested)
- Recursive search ensures any folder can be found by name
- Supports folders that were previously hidden in Eagle's hierarchy

**Final WebDAV Structure**:
```
/                          → Shows "Folders" container
/folders/                  → Shows ALL Eagle folders (flattened)
  ├── RootFolder1/         → Root level folder  
  ├── RootFolder2/         → Root level folder
  ├── NestedFolderA/       → Previously nested folder (now flat)
  ├── NestedFolderB/       → Previously nested folder (now flat)
  └── AnyOtherFolder/      → Any folder from Eagle hierarchy
/folders/FolderName/       → Contents of any specific folder
/files/{id}                → Individual files
```

### Previous Display Name Resolution
**Problem**: WebDAV clients were showing cryptic folder IDs (like "MFKAJCAXA587I") instead of readable names, and files were missing their extensions.
**Solution**: Fixed XML generation to use `item.name` for folders and `item.name + item.ext` for files
**Status**: ✅ Completed and integrated into refactored modules

### Memory Bank Initialization (In Progress)
Creating comprehensive project documentation system for context preservation across sessions.

**Files Created**:
- ✅ `projectbrief.md` - Core project requirements
- ✅ `productContext.md` - User problems and solutions  
- ✅ `systemPatterns.md` - Architecture and design patterns
- ✅ `techContext.md` - Technology stack and constraints
- 🔄 `activeContext.md` - This file (current status)
- ⏳ `progress.md` - Remaining work and status

## Architecture Decisions Made

### HTTP Server Implementation
**Decision**: Use Node.js built-in `http` module instead of Express.js
**Rationale**: Express.js not available in Eagle's plugin environment
**Impact**: More verbose but fully compatible implementation

### Authentication Strategy  
**Decision**: Basic HTTP authentication with hostname/UUID
**Rationale**: Simple, secure for localhost, auto-generated credentials
**Implementation**: WWW-Authenticate challenge-response pattern

### WebDAV Protocol Compliance
**Decision**: Full WebDAV implementation with proper XML responses
**Rationale**: Maximum client compatibility (Windows Explorer, macOS Finder, WebDAV apps)
**Key Methods**: PROPFIND, GET, HEAD, OPTIONS with RFC-compliant XML

## Current Code State

### Refactored WebDAV Architecture (`src/services/webdav/`)
- **Status**: ✅ Complete modular structure
- **Core Server** (`webdav.ts`): Clean server logic with modular imports
- **XML Generation** (`xml.ts`): WebDAV protocol XML responses
- **File Handler** (`fileHandler.ts`): File serving and MIME type detection
- **Eagle Parser** (`eagleParser.ts`): Eagle API integration and metadata parsing
- **Types** (`types.ts`): Shared TypeScript interfaces
- **Index** (`index.ts`): Clean module exports and re-exports

### Background Service (`src/services/background.ts`)
- **Status**: ✅ Complete and unchanged
- **Lifecycle**: ✅ Start/stop/restart functionality
- **Health Monitoring**: ✅ Connection info and status
- **Eagle Integration**: ✅ Event handling and notifications

### UI Components (`src/App.tsx`)
- **Status**: ✅ Complete and unchanged
- **Layout**: ✅ Compact two-column design
- **Server Controls**: ✅ Start/stop with status display
- **Connection Info**: ✅ Endpoint details with copy buttons
- **Styling**: ✅ TailwindCSS with DaisyUI components

## Next Immediate Steps

### 1. Test Folder Navigation (Priority 1)
- Test the WebDAV server with a WebDAV client (AirExplorer, Windows Explorer)
- Verify root shows "Folders" container
- Verify clicking into "Folders" shows all Eagle folders with proper names
- Verify clicking into individual Eagle folders shows contents with proper folder name in title
- Confirm folder names no longer change to IDs during navigation

### 2. Validate Complete Functionality (Priority 2)
- Test file downloading from folders
- Verify authentication still works properly
- Check that all existing functionality remains intact
- Validate the new hierarchical structure works as expected

### 3. User Testing and Deployment (Priority 3)
- Package the updated plugin for user testing
- Document the new folder structure for users
- Monitor for any additional navigation issues

## Key Patterns and Preferences

### Error Handling Philosophy
- Graceful degradation for Eagle API failures
- Comprehensive logging without exposing sensitive paths
- User-friendly error messages in UI

### Code Organization  
- **Modular Architecture**: Clean separation of concerns with dedicated modules
- **Type Safety**: Comprehensive TypeScript coverage across all modules
- **Import/Export**: Proper module boundaries with index file for clean exports
- **Single Responsibility**: Each module has a focused, well-defined purpose

### Refactoring Benefits Achieved
- **Maintainability**: Code is easier to navigate and modify
- **Testability**: Individual modules can be tested in isolation
- **Reusability**: Components can be imported and used independently
- **Readability**: Clear separation of WebDAV protocol, file handling, and Eagle integration

## Critical Learnings

### Eagle Plugin Environment
- **Module Constraints**: Only Node.js built-ins available
- **API Surface**: Rich but specific integration patterns required
- **Service Mode**: Background plugins have different lifecycle management

### WebDAV Client Expectations
- **Authentication**: Must implement proper challenge-response
- **XML Format**: Strict compliance required for compatibility
- **File Metadata**: Display names and extensions critical for UX

### Development Workflow
- **Build Process**: Vite works well for Eagle plugin development
- **Debugging**: Eagle Developer Tools provide good debugging experience
- **Testing**: WebDAV clients provide immediate feedback on protocol compliance

## Current Working State
The plugin now provides a flattened folder browsing experience where ALL Eagle folders (regardless of their hierarchy in Eagle) are presented at the same level under the "Folders" container. This creates a simple, flat navigation structure that makes all folders easily accessible through WebDAV clients. Build successful and ready for testing with AirExplorer.