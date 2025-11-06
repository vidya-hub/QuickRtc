#!/usr/bin/env node

/**
 * QuickRTC - Refresh Dependencies Script (Node.js)
 * This script builds all the modules and installs them in the example folder
 * Cross-platform compatible version
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function colorLog(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printStep(message) {
  console.log("");
  colorLog(`🔧 ${message}`, "cyan");
  colorLog("----------------------------------------", "cyan");
}

function printSuccess(message) {
  colorLog(`✅ ${message}`, "green");
}

function printError(message) {
  colorLog(`❌ ${message}`, "red");
  process.exit(1);
}

async function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      cwd,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  colorLog("🔄 QuickRTC - Refreshing Dependencies", "blue");
  colorLog("=============================================", "blue");

  const projectRoot = path.resolve(__dirname, "..");
  const exampleDir = path.resolve(projectRoot, "quickrtc_example");

  colorLog(`📁 Project root: ${projectRoot}`, "yellow");
  colorLog(`📁 Example directory: ${exampleDir}`, "yellow");

  // Check if we're in the right directory
  const requiredDirs = [
    "quickrtc_types",
    "quickrtc_server",
    "quickrtc_client",
  ];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(projectRoot, dir))) {
      printError(
        `Required directory ${dir} not found. Make sure you're running this from the correct location.`
      );
    }
  }

  try {
    // Clean previous builds
    printStep("Cleaning previous builds");
    const moduleDirs = [
      "quickrtc_types",
      "quickrtc_server",
      "quickrtc_client",
      "quickrtc_example",
    ];

    for (const moduleDir of moduleDirs) {
      const distPath = path.join(projectRoot, moduleDir, "dist");
      const nodeModulesPath = path.join(projectRoot, moduleDir, "node_modules");

      if (fs.existsSync(distPath)) {
        console.log(`Cleaning ${moduleDir}/dist`);
        fs.rmSync(distPath, { recursive: true, force: true });
      }

      if (fs.existsSync(nodeModulesPath)) {
        console.log(`Cleaning ${moduleDir}/node_modules`);
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }
    }
    printSuccess("Previous builds cleaned");

    // Build modules in dependency order
    printStep("Building quickrtc_types");
    await runCommand("npm install", path.join(projectRoot, "quickrtc_types"));
    await runCommand(
      "npm run build",
      path.join(projectRoot, "quickrtc_types")
    );
    printSuccess("quickrtc_types built successfully");

    printStep("Building quickrtc_server");
    await runCommand("npm install", path.join(projectRoot, "quickrtc_server"));
    await runCommand(
      "npm run build",
      path.join(projectRoot, "quickrtc_server")
    );
    printSuccess("quickrtc_server built successfully");

    printStep("Building quickrtc_client");
    await runCommand("npm install", path.join(projectRoot, "quickrtc_client"));
    await runCommand(
      "npm run build",
      path.join(projectRoot, "quickrtc_client")
    );
    printSuccess("quickrtc_client built successfully");

    // Install dependencies in example project
    printStep("Installing dependencies in example project");
    await runCommand("npm install", exampleDir);
    printSuccess("Example project dependencies installed");

    // Build the example project
    printStep("Building example project");
    await runCommand("npm run build:example", exampleDir);
    printSuccess("Example project built successfully");

    // Create directories for client access
    printStep("Creating development directories");
    const publicClientDir = path.join(exampleDir, "public", "quickrtc_client");
    const clientDistDir = path.join(publicClientDir, "dist");
    const sourceDistDir = path.join(projectRoot, "quickrtc_client", "dist");

    if (!fs.existsSync(publicClientDir)) {
      fs.mkdirSync(publicClientDir, { recursive: true });
    }

    // Remove existing dist link/directory
    if (fs.existsSync(clientDistDir)) {
      fs.rmSync(clientDistDir, { recursive: true, force: true });
    }

    // Create symlink on Unix systems, copy on Windows
    try {
      fs.symlinkSync(sourceDistDir, clientDistDir, "dir");
      console.log("Created symlink for client dist");
    } catch (error) {
      // Fallback to copying files (for Windows or when symlinks aren't available)
      console.log("Symlink failed, copying files instead");
      fs.cpSync(sourceDistDir, clientDistDir, { recursive: true });
    }

    printSuccess("Development directories created");

    // Final verification
    printStep("Verifying builds");
    for (const moduleDir of moduleDirs) {
      const distPath = path.join(projectRoot, moduleDir, "dist");
      if (fs.existsSync(distPath)) {
        colorLog(`✅ ${moduleDir}/dist exists`, "green");
      } else {
        printError(`${moduleDir}/dist not found`);
      }
    }

    console.log("");
    colorLog("🎉 All dependencies refreshed successfully!", "green");
    console.log("");
    colorLog("📋 What was done:", "yellow");
    console.log("  • Cleaned all previous builds and node_modules");
    console.log("  • Built quickrtc_types");
    console.log("  • Built quickrtc_server");
    console.log("  • Built quickrtc_client");
    console.log("  • Installed example project dependencies");
    console.log("  • Built example project");
    console.log("  • Created development directories");
    console.log("");
    colorLog("🚀 You can now run the example server:", "green");
    console.log("  npm start        # HTTP server");
    console.log("  npm start:https  # HTTPS server");
    console.log("");
    colorLog("🔧 For development with auto-rebuild:", "green");
    console.log("  npm run watch        # HTTP with auto-reload");
    console.log("  npm run watch:https  # HTTPS with auto-reload");
  } catch (error) {
    printError(`Build failed: ${error.message}`);
  }
}

main().catch(console.error);
