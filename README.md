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
- **All Items**: Browse all items in your Eagle library (✅ implemented, performance-optimized for <5000 items)
- **Folders**: Navigate your Eagle folder structure (✅ implemented)
- **Tags**: Browse items by tags (🚧 work in progress)
- **Uncategorized**: Access items not assigned to folders (🚧 work in progress)
- **Index**: Follows Eagle's folder organization index (📋 planned)
- **Smart Folders**: Access to Eagle smart folders (⏳ pending)
- **File Downloads**: Download original files with proper extensions and metadata
- **Read-Only**: Safe browsing without risk of accidental modifications

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
- `/folders/` - Browse by Eagle folders ✅
- `/tags/` - Browse by tags (🚧 work in progress)
- `/uncategorized/` - Items without folders (🚧 work in progress)
- `/index/` - Follows Eagle folder organization index (📋 planned)
- `/smartfolders/` - Smart folder access (⏳ pending)

## Technical Details

### Architecture
- **Built with**: TypeScript, React, Vite, Tailwind CSS
- **WebDAV Server**: Node.js built-in HTTP module (no external dependencies)
- **Eagle Integration**: Official Eagle Plugin API
- **Authentication**: HTTP Basic Auth with secure credential generation

### Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build for production
pnpm build
```

### File Structure
```
src/
├── webdav/
│   ├── server.ts          # Main WebDAV server
│   ├── background.ts      # Background service
│   ├── xmlUtils.ts        # Shared XML utilities
│   ├── eagleUtils.ts      # Eagle API integration
│   ├── auth/              # Authentication system
│   └── routes/            # Route handlers
│       ├── allItems/      # ✅ All items route
│       └── folders/       # ✅ Folders route
│       # 🚧 tags/         # (work in progress)
│       # 🚧 uncategorized/ # (work in progress)
│       # 📋 index/        # (planned)
│       # ⏳ smartfolders/ # (pending)
├── App.tsx                # Main UI component
└── main.tsx              # Entry point
```

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

### Large Library Performance
- If you have >5000 items, the "All Items" folder will be empty for performance
- Use the "Folders" navigation instead
- Consider organizing items into folders for better WebDAV browsing

## License

This project is developed for the Eagle ecosystem and follows Eagle's plugin development guidelines.
