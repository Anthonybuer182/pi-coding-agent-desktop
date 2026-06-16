#!/usr/bin/env node
/**
 * Prepare for electron-builder packaging.
 *
 * pnpm creates symlinks for workspace packages (node_modules/@pi/sdk-wrapper →
 * ../../../packages/sdk-wrapper). electron-builder follows these symlinks and
 * tries to include files from outside the app directory, which fails.
 *
 * This script cleans up the symlinks before packaging.
 * Restore them with "pnpm install" afterwards.
 */
const fs = require('fs');
const path = require('path');

const appDir = path.resolve(__dirname, '..');

// Workspace packages that are bundled by electron-vite / vite
// and do NOT need to be in node_modules at runtime.
const WORKSPACE_SYMLINKS = [
  '@pi/sdk-wrapper',
  '@pi/types',
  '@pi/ui',
];

const nodeModulesDir = path.join(appDir, 'node_modules');

for (const pkg of WORKSPACE_SYMLINKS) {
  const linkPath = path.join(nodeModulesDir, pkg);
  if (!fs.existsSync(linkPath)) continue;

  const stat = fs.lstatSync(linkPath);
  if (stat.isSymbolicLink()) {
    console.log(`Removing workspace symlink: node_modules/${pkg} → ${fs.readlinkSync(linkPath)}`);
    fs.unlinkSync(linkPath);
  }
}

console.log('Ready for packaging.');
