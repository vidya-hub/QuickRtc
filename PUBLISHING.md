# Publishing QuickRTC Packages to npm

This guide explains how to publish the three QuickRTC packages (`quickrtc-types`, `quickrtc-server`, and `quickrtc-client`) to npm using GitHub Actions.

## Package Overview

The monorepo contains three publishable packages:

1. **quickrtc-types** - Shared TypeScript types
2. **quickrtc-server** - Server-side WebRTC abstraction
3. **quickrtc-client** - Client-side browser library

## Prerequisites

### 1. npm Account and Token

1. Create an account on [npmjs.com](https://www.npmjs.com) if you don't have one
2. Generate an npm access token:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type
   - Copy the token (you won't be able to see it again)

### 2. Configure GitHub Secrets

Add your npm token to GitHub repository secrets:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm access token
6. Click **Add secret**

## Publishing Methods

### Method 1: Automatic Publishing with Git Tags (Recommended)

This method automatically publishes all packages when you create a version tag:

```bash
# 1. Update version in all package.json files
cd quickrtc_types
npm version patch  # or minor, major

cd ../quickrtc_server
npm version patch

cd ../quickrtc_client
npm version patch

# 2. Create and push a git tag
cd ..
git add .
git commit -m "Bump version to 1.0.1"
git tag v1.0.1
git push origin handling_client --tags
```

The GitHub Action will automatically:

1. Detect the tag push
2. Build all three packages
3. Publish them to npm in the correct order (types → server & client)

### Method 2: Manual Publishing via GitHub Actions

You can manually trigger the workflow to publish specific packages:

1. Go to your GitHub repository
2. Click on **Actions** tab
3. Select **Publish to npm** workflow
4. Click **Run workflow**
5. Select which package(s) to publish:
   - `all` - Publish all three packages
   - `types` - Publish only quickrtc-types
   - `server` - Publish only quickrtc-server
   - `client` - Publish only quickrtc-client
6. Click **Run workflow**

### Method 3: Local Publishing (Development/Testing)

For testing or one-time publishing:

```bash
# Publish types first (other packages depend on it)
cd quickrtc_types
pnpm install
pnpm run build
npm publish

# Then publish server
cd ../quickrtc_server
pnpm install
pnpm run build
npm publish

# Finally publish client
cd ../quickrtc_client
pnpm install
pnpm run build
npm publish
```

**Note:** You must be logged in to npm (`npm login`) before local publishing.

## Version Management

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

### Keeping Versions in Sync

It's recommended to keep all three packages at the same version:

```bash
# Use this script to bump all packages at once
VERSION="1.0.1"

cd quickrtc_types && npm version $VERSION --no-git-tag-version
cd ../quickrtc_server && npm version $VERSION --no-git-tag-version
cd ../quickrtc_client && npm version $VERSION --no-git-tag-version
cd ..

git add .
git commit -m "Bump version to $VERSION"
git tag "v$VERSION"
git push origin handling_client --tags
```

## Updating Dependencies Between Packages

When publishing to npm, update the local file references to use the published packages:

### Before Publishing (Development)

```json
{
  "dependencies": {
    "quickrtc-types": "file:../quickrtc_types"
  }
}
```

### After Publishing (Production)

```json
{
  "dependencies": {
    "quickrtc-types": "^1.0.0"
  }
}
```

**Important:** The GitHub Actions workflow handles building with local dependencies. When consuming these packages externally, they will use the published versions from npm.

## Workflow Details

The GitHub Actions workflow (`.github/workflows/publish.yml`) does the following:

1. **Triggers:**

   - On push of tags matching `v*.*.*` pattern
   - Manual workflow dispatch

2. **Jobs:**

   - `publish-types`: Builds and publishes quickrtc-types
   - `publish-server`: Waits for types, then publishes quickrtc-server
   - `publish-client`: Waits for types, then publishes quickrtc-client

3. **Each job:**
   - Checks out code
   - Sets up Node.js 20 and pnpm
   - Installs dependencies
   - Builds the package
   - Publishes to npm using the NPM_TOKEN secret

## Verifying Publication

After publishing, verify your packages:

```bash
# Check if packages are available
npm view quickrtc-types
npm view quickrtc-server
npm view quickrtc-client

# Install in a test project
npm install quickrtc-types quickrtc-server quickrtc-client
```

## Troubleshooting

### "You cannot publish over the previously published versions"

- Bump the version number in package.json
- Each version can only be published once

### "You must be logged in to publish packages"

- Ensure NPM_TOKEN secret is correctly set in GitHub
- For local publishing, run `npm login`

### "Package name already exists"

- Scoped packages (@quickrtc/) are configured with `"access": "public"`
- Ensure you have permission to publish under the @quickrtc scope
- You may need to create an npm organization named "quickrtc"

### Build Failures

- Ensure all TypeScript code compiles without errors
- Check that all dependencies are listed in package.json
- Verify Node.js version compatibility

## Best Practices

1. **Test Before Publishing:** Always test packages locally before publishing
2. **Changelog:** Maintain a CHANGELOG.md to track changes
3. **Git Tags:** Use annotated tags: `git tag -a v1.0.0 -m "Release v1.0.0"`
4. **Breaking Changes:** When making breaking changes, bump the major version
5. **Deprecation:** Use `npm deprecate` for versions with critical bugs
6. **Documentation:** Keep README.md files updated with usage examples

## Package Structure

Each package includes:

- `dist/` - Compiled JavaScript and TypeScript declarations
- `README.md` - Package documentation
- `package.json` - Package metadata
- `.npmignore` - Files to exclude from npm package

Files in published packages are controlled by the `files` field in package.json:

- `quickrtc-types`: `dist`, `src` (for TypeScript source maps)
- `quickrtc-server`: `dist`, `README.md`
- `quickrtc-client`: `dist`, `README.md`

## Next Steps

1. Set up NPM_TOKEN secret in GitHub
2. Update all package versions to your desired starting version
3. Test local builds: `pnpm run build` in each package
4. Create your first release tag and push
5. Monitor the GitHub Actions workflow
6. Verify packages on npmjs.com

For more information, see:

- [npm Publishing Documentation](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
