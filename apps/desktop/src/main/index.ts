import { app, BrowserWindow } from 'electron';
import { createMainWindow } from '@main/window-manager';
import { registerIpcHandlers } from '@main/ipc/index';
import { registerNativeIpcHandlers } from '@main/ipc/native';
import { SettingsManager, getAgentDir } from '@earendil-works/pi-coding-agent';
import { existsSync, mkdirSync, readdirSync, cpSync } from 'fs';
import { exec, execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

let mainWindow: BrowserWindow | null = null;

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  /**
   * On first launch, copy bundled skills from the app's resources into
   * ~/.pi/agent/skills/ so the pi-coding-agent SDK auto-discovers them.
   *
   * Each bundled skill directory is only copied if it doesn't already
   * exist in the target (won't overwrite user-installed skills).
   */
  function migrateSkills(): void {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const bundledSource = app.isPackaged
      ? join(process.resourcesPath, 'skills')
      : join(__dirname, '..', '..', 'skills');

    if (!existsSync(bundledSource)) return;

    const targetDir = join(getAgentDir(), 'skills');
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    const bundledDirs = readdirSync(bundledSource, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const dir of bundledDirs) {
      const target = join(targetDir, dir.name);
      if (!existsSync(target)) {
        cpSync(join(bundledSource, dir.name), target, { recursive: true });
      }
    }
  }

  /**
   * Pre-install CLI tools required by bundled skills during app startup.
   * Runs non-blocking: failures are silent (Agent can install on demand).
   */
  function ensureSkillBinaries(): void {
    // install.sh is bash-based, macOS/Linux only
    if (process.platform === 'win32') return;

    try {
      execSync('command -v officecli', { stdio: 'ignore' });
      return; // Already in PATH
    } catch {
      // Not installed — download in background
    }

    exec('curl -fsSL https://d.officecli.ai/install.sh | bash', (error) => {
      if (error) {
        console.error('[officecli] Install failed:', error.message);
        return;
      }
      console.log('[officecli] Installed successfully');
    });
  }

  app.whenReady().then(() => {
    const settingsManager = SettingsManager.create(app.getPath('home'));

    migrateSkills();
    ensureSkillBinaries();
    injectBundledShell(settingsManager);

    mainWindow = createMainWindow();
    registerIpcHandlers(settingsManager);
    registerNativeIpcHandlers();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * On Windows, detect the bundled MinGit BusyBox environment (shipped as
 * extraResources) and configure SettingsManager to use it.
 *
 * MinGit BusyBox provides:
 *   - ash.exe (BusyBox POSIX shell)      → set as shellPath
 *   - busybox.exe (coreutils: ls, cat…)  → added to PATH
 *   - git.exe                            → added to PATH
 *
 * This is a no-op on macOS and Linux, where the OS ships a shell natively.
 */
function injectBundledShell(settingsManager: SettingsManager): void {
  if (process.platform !== 'win32') return;

  // process.resourcesPath → app's resources directory.
  // The bundled shell is at resources/bash-bundle/ (from extraResources).
  const bundleRoot = join(process.resourcesPath, 'bash-bundle');

  // MinGit BusyBox doesn't include bash.exe — it has ash.exe (BusyBox
  // Almquist shell) which supports POSIX shell syntax with "-c" flag.
  // Search for bash.exe first (preferred), then ash.exe.
  const shellNames = ['bash.exe', 'ash.exe'];
  const binDirs = ['mingw64/bin', 'bin', 'usr/bin'].map((d) => join(bundleRoot, d));

  let shellPath: string | null = null;
  for (const dir of binDirs) {
    for (const name of shellNames) {
      const p = join(dir, name);
      if (existsSync(p)) { shellPath = p; break; }
    }
    if (shellPath) break;
  }

  if (!shellPath) {
    // Bundled shell not found. SDK will fall back to searching for Git
    // Bash on the system, then show a clear error if nothing is found.
    return;
  }

  settingsManager.setShellPath(shellPath);

  // Add bundled bin dirs to PATH so git, busybox utilities, and msys-2.0.dll
  // can be found. On MSYS2, Windows paths are mapped as:
  //   C:\foo\bar → /c/foo/bar
  const pathDirs = [
    join(bundleRoot, 'mingw64', 'bin'),
    join(bundleRoot, 'usr', 'bin'),
    join(bundleRoot, 'cmd'),
    join(bundleRoot, 'bin'),
  ].filter((p) => existsSync(p));

  if (pathDirs.length > 0) {
    const unixPaths = pathDirs.map((p) =>
      '/' + p.replace(/^([A-Z]):/i, (_, d) => d.toLowerCase()).replace(/\\/g, '/'),
    );
    settingsManager.setShellCommandPrefix(
      `export PATH="${unixPaths.join(':')}:$PATH"`,
    );
  }
}
