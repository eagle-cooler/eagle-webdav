# Eagle WebDAV Plugin

A background service plugin for Eagle that exposes your Eagle library content via a WebDAV server, enabling access from any WebDAV-compatible client on your local network.

## Features

### 🌐 **WebDAV Server**
- Runs on `localhost:41596` with automatic startup
- Standard WebDAV protocol compatibility
- Works with Windows Explorer, macOS Finder, mobile apps, and third-party WebDAV clients

### 🔒 **Secure Access**
- HTTP Basic authentication with auto-generated credentials
- Username: Your computer hostname
- Password: Automatically generated UUID (stored securely)

### 📁 **Library Access**
- **All Items**: Browse all items in your Eagle library (✅ performance-optimized for <5000 items)
- **Folders**: Navigate your Eagle folder structure with flattened hierarchy (✅ all folders accessible)
- **Hierarchy**: Hierarchical folder navigation preserving parent-child relationships (✅ implemented)
- **Tags**: Browse items by tags with full tag support (✅ implemented)
- **Files**: Direct file access by Eagle ID with mobile client compatibility (✅ implemented)
- **File Downloads**: Download original files with proper extensions and metadata
- **Read-Only**: Safe browsing without risk of accidental modifications
- **Ghost Folder Fix**: Resolved recursive duplicate folder issues (✅ fixed)

### ⚡ **Performance Optimized**
- Smart item count checking (returns empty folder if >5000 items for performance)
- Efficient Eagle API integration
- Minimal memory footprint

### 🎨 **Clean Interface**
- Dark theme UI
- Real-time server status
- One-click connection info with copy-to-clipboard
- Auto-start/stop controls

## Installation

1. Download the plugin package
2. Install in Eagle via Plugin Manager
3. The plugin will auto-start when Eagle launches

## Usage

### Starting the Server
- The WebDAV server starts automatically when Eagle launches
- Use the plugin UI to manually start/stop/restart if needed

### Connecting WebDAV Clients

#### Windows Explorer
1. Open "This PC" 
2. Click "Map network drive"
3. Enter: `http://localhost:41596`
4. Use the credentials shown in the plugin interface

#### macOS Finder
1. Go to "Go" → "Connect to Server"
2. Enter: `http://localhost:41596`
3. Use the credentials shown in the plugin interface

#### Mobile Apps
Use any WebDAV client app with:
- **Server**: `http://[your-computer-ip]:41596`
- **Username**: Your hostname (shown in plugin)
- **Password**: Generated UUID (shown in plugin)

### Available Paths
- `/` - Root directory with main containers
- `/allItems/` - All items in your library (if ≤5000 items) ✅
- `/folders/` - Browse by Eagle folders (flattened structure) ✅
- `/hierarchy/` - Hierarchical folder navigation ✅
- `/tags/` - Browse by tags with full tag support ✅
- `/files/{id}/` - Direct file access by Eagle ID ✅
- `/files/{id}/{filename}` - Mobile client compatible URLs ✅



## Compatibility

- **Eagle**: Compatible with current Eagle versions
- **WebDAV Clients**: Any RFC-compliant WebDAV client
- **Operating Systems**: Windows, macOS, Linux
- **Mobile**: iOS Files app, Android WebDAV clients

## Security Notes

- Server only binds to localhost by default
- Read-only access prevents accidental file modifications
- Credentials are auto-generated and stored locally
- No external network access required

## Troubleshooting

### Server Won't Start
- Check if port 41596 is available
- Restart Eagle application
- Check Eagle plugin permissions

### Can't Connect from WebDAV Client
- Verify server is running (check plugin UI)
- Use exact credentials shown in plugin interface
- Ensure no firewall blocking port 41596



## License

This project is developed for the Eagle ecosystem and follows Eagle's plugin development guidelines.
