# Active Context - Eagle WebDAV Plugin

## Current State ✅
WebDAV server on port 41596 with 5 working routes: `/folders/`, `/hierarchy/`, `/allItems/`, `/files/`, `/tags/`

## CRITICAL: Mobile Client Filename Support ✅ RESOLVED
**Issue**: Android WebDAV clients sending URL-encoded filenames causing 404s
**Root Cause**: Server not decoding URLs before matching filenames  
**Solution**: Added proper `decodeURIComponent()` in all route handlers
**Result**: All routes now handle encoded filenames like `%E9%AD%94%E7%8E%8B.m4a` → `魔王.m4a`

## CRITICAL FIX: Ghost Folder Issue ✅ RESOLVED

**Problem**: Recursive duplicate folders (`demo video/demo video/demo video/`)

**Root Cause**: Double URL encoding inconsistency
- Folder hrefs: `demo%2520video` (double encoded)
- File hrefs: `demo%20video/file.mp4` (single encoded)
- WebDAV client sees different URLs as separate folders

**Solution**: Fixed `generateHrefPath()` in xmlUtils.ts
```typescript
function isAlreadyEncoded(path: string): boolean {
  if (!path.includes('%')) return false;
  try {
    return decodeURIComponent(path) !== path;
  } catch { return false; }
}

export function generateHrefPath(path: string): string {
  return isAlreadyEncoded(path) ? path : encodeURI(path);
}
```

**Result**: Consistent URL encoding eliminates ghost folders.

## Current Architecture
- **Modular structure**: Migrated from monolithic to `/webdav/routes/{name}/` pattern
- **Route handlers**: Each route has `index.ts` (handlers) and `xml.ts` (WebDAV XML)
- **Shared utilities**: `xmlUtils.ts` (XML generation + escaping), `eagleUtils.ts` (Eagle API)
- **Singleton server**: `webdav/server.ts` with proper Eagle event integration
- **Eagle integration**: Full API access to folders, items, tags, metadata

## Key Implementation Details

### AllItems Route Performance ✅
- **Smart loading**: Uses `eagle.item.countAll()` before `eagle.item.getAll()`
- **Performance limit**: Returns empty folder if >5000 items
- **XML escaping**: `escapeXML()` function prevents client parsing errors

### Mobile Client URL Support ✅
```typescript
// Files route: Supports both formats
/files/{id}           → Desktop clients (legacy)  
/files/{id}/{filename} → Mobile clients (shows proper names)

// Server extracts ID, ignores filename
const pathParts = pathname.substring(7).replace(/\/$/, '').split('/');
const id = pathParts[0]; // Always use first segment as ID

// All routes: Proper URL decoding for encoded filenames
const filename = decodeURIComponent(encodedFilename); // %E9%AD%94%E7%8E%8B.m4a → 魔王.m4a
```

### Hierarchical vs Flat Folder Access ✅
```typescript
// getFolderById(id, includeSubfolders)
//   includeSubfolders = true  → /hierarchy/ (full tree navigation)
//   includeSubfolders = false → /folders/ (flat folder access only)

// Folder route limitations:
// ✅ Individual file access: /folders/folderName/file.ext
// ❌ Folder copying: Not supported (use /hierarchy/ instead)
```

### Flattened Folder Structure ✅
- **Recursive collection**: Traverses entire Eagle folder hierarchy
- **Flat presentation**: ALL folders (root + nested) accessible at `/folders/`
- **Improved navigation**: Root → "Folders" → All folders → Files

### Authentication & Auto-start ✅
```typescript
// Simplified initialization pattern
eagle.event.onPluginCreate(async () => {
  const shouldAutoStart = localStorage.getItem("eagle-webdav-server-state") !== "stopped";
  if (shouldAutoStart) await this.start();
});
```

## Critical Patterns (DO NOT CHANGE)
- **URL parsing**: `decodeURIComponent(pathname.substring(N).replace(/\/$/, ''))`
- **File serving**: Stream from `item.filePath` using `fs.createReadStream()`
- **Root containers**: Must include ALL route names: `['allItems', 'folders', 'hierarchy', 'tags']`
- **XML utilities**: Use shared `xmlUtils.ts` with proper escaping for WebDAV compliance

## Next Priorities
1. Performance optimization (API response caching)
2. Enhanced error handling
3. Metadata support (thumbnails, EXIF data)
