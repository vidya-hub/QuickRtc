# Refresh Dependencies Scripts

This directory contains multiple scripts to refresh and rebuild all QuickRTC dependencies. These scripts are designed to handle the complete build pipeline for the monorepo structure.

## Available Scripts

### 1. Shell Script (Unix/macOS/Linux)

```bash
./refresh-dependencies.sh
# or
npm run refresh-deps
```

### 2. Node.js Script (Cross-platform)

```bash
node refresh-dependencies.js
# or
npm run refresh-deps:node
```

### 3. Batch Script (Windows)

```cmd
refresh-dependencies.bat
```

## What These Scripts Do

1. **Clean Previous Builds**

   - Removes all `dist/` directories
   - Removes all `node_modules/` directories

2. **Build Dependencies in Order**

   - Builds `quickrtc_types` (shared TypeScript types)
   - Builds `quickrtc_server` (server library)
   - Builds `quickrtc_client` (client library)

3. **Setup Example Project**

   - Installs dependencies in the example project
   - Builds the example project
   - Creates necessary symlinks/copies for browser access

4. **Verify Build**
   - Checks that all `dist/` directories exist
   - Reports success or failure

## When to Use

Run these scripts when:

- Setting up the project for the first time
- After making changes to any of the core libraries
- When dependencies seem out of sync
- After pulling updates from git that affect dependencies
- When encountering module resolution issues

## Output

The scripts will provide colored output showing:

- ✅ Successful operations
- ❌ Errors (with script termination)
- 🔧 Current operation being performed
- 📁 Directory information
- 🎉 Success message with next steps

## Platform Compatibility

- **Unix/macOS/Linux**: Use `refresh-dependencies.sh` (fastest, uses symlinks)
- **Windows**: Use `refresh-dependencies.bat` (copies files instead of symlinks)
- **Cross-platform**: Use `refresh-dependencies.js` (Node.js, works everywhere)

## Troubleshooting

If the script fails:

1. **Permission Issues**: Make sure scripts are executable

   ```bash
   chmod +x refresh-dependencies.sh
   chmod +x refresh-dependencies.js
   ```

2. **Node.js/npm Issues**: Ensure you have Node.js and npm installed

   ```bash
   node --version
   npm --version
   ```

3. **Directory Issues**: Run the script from the `quickrtc_example` directory

4. **Clean Start**: If issues persist, manually delete all `node_modules` and `dist` directories, then run the script

## Manual Alternative

If the scripts don't work, you can manually run the build process:

```bash
# From project root
cd quickrtc_types && npm install && npm run build && cd ..
cd quickrtc_server && npm install && npm run build && cd ..
cd quickrtc_client && npm install && npm run build && cd ..
cd quickrtc_example && npm install && npm run build:example
```
