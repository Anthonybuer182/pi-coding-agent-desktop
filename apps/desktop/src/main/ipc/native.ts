import { ipcMain, dialog, shell, clipboard, app, BrowserWindow, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';

export function registerNativeIpcHandlers(): void {
  // ── Window Management ──

  ipcMain.handle('pi:window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  ipcMain.handle('pi:window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('pi:window:close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  ipcMain.handle('pi:window:isMaximized', () => {
    return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false;
  });

  // ── File Dialogs ──

  ipcMain.handle('pi:dialog:openFile', async (_event, options?: Electron.OpenDialogOptions) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(win, {
      properties: ['openFile'],
      ...options,
    });
  });

  ipcMain.handle('pi:dialog:openDirectory', async (_event, options?: Electron.OpenDialogOptions) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      ...options,
    });
  });

  ipcMain.handle('pi:dialog:saveFile', async (_event, options?: Electron.SaveDialogOptions) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { canceled: true, filePath: undefined };
    return dialog.showSaveDialog(win, options ?? {});
  });

  // ── File System ──

  ipcMain.handle('pi:fs:readFile', async (_event, filePath: string) => {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    const content = fs.readFileSync(resolved, 'utf-8');
    return { content, path: resolved };
  });

  ipcMain.handle('pi:fs:writeFile', async (_event, filePath: string, content: string) => {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, 'utf-8');
    return { success: true, path: resolved };
  });

  ipcMain.handle('pi:fs:readFileBuffer', async (_event, filePath: string) => {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    const buffer = fs.readFileSync(resolved);
    return { buffer, path: resolved };
  });

  ipcMain.handle('pi:fs:writeFileBuffer', async (_event, filePath: string, buffer: ArrayBuffer) => {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, Buffer.from(buffer));
    return { success: true, path: resolved };
  });

  ipcMain.handle('pi:fs:stat', async (_event, filePath: string) => {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    const stat = fs.statSync(resolved);
    return {
      exists: true,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      ctime: stat.ctime.toISOString(),
    };
  });

  ipcMain.handle('pi:fs:exists', async (_event, filePath: string) => {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    return fs.existsSync(resolved);
  });

  ipcMain.handle('pi:fs:mkdir', async (_event, dirPath: string) => {
    const resolved = path.isAbsolute(dirPath) ? dirPath : path.resolve(dirPath);
    fs.mkdirSync(resolved, { recursive: true });
    return { success: true, path: resolved };
  });

  ipcMain.handle('pi:fs:listDir', async (_event, dirPath: string) => {
    const resolved = path.isAbsolute(dirPath) ? dirPath : path.resolve(dirPath);
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      path: path.join(resolved, entry.name),
    }));
  });

  ipcMain.handle('pi:fs:delete', async (_event, targetPath: string) => {
    const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(targetPath);
    if (fs.statSync(resolved).isDirectory()) {
      fs.rmSync(resolved, { recursive: true, force: true });
    } else {
      fs.unlinkSync(resolved);
    }
    return { success: true };
  });

  ipcMain.handle('pi:fs:rename', async (_event, oldPath: string, newPath: string) => {
    const resolvedOld = path.isAbsolute(oldPath) ? oldPath : path.resolve(oldPath);
    const resolvedNew = path.isAbsolute(newPath) ? newPath : path.resolve(newPath);
    fs.renameSync(resolvedOld, resolvedNew);
    return { success: true, path: resolvedNew };
  });

  // ── Shell ──

  ipcMain.handle('pi:shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('pi:shell:openPath', async (_event, targetPath: string) => {
    const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(targetPath);
    await shell.openPath(resolved);
  });

  ipcMain.handle('pi:shell:showItemInFolder', (_event, targetPath: string) => {
    const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(targetPath);
    shell.showItemInFolder(resolved);
  });

  // ── Clipboard ──

  ipcMain.handle('pi:clipboard:write', (_event, text: string) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('pi:clipboard:read', () => {
    return clipboard.readText();
  });

  ipcMain.handle('pi:clipboard:writeImage', (_event, imagePath: string) => {
    const resolved = path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath);
    const img = nativeImage.createFromPath(resolved);
    clipboard.writeImage(img);
  });

  ipcMain.handle('pi:clipboard:clear', () => {
    clipboard.clear();
  });

  // ── App Info ──

  ipcMain.handle('pi:app:getPath', (_event, name: string) => {
    return app.getPath(name as any);
  });

  ipcMain.handle('pi:app:getVersion', () => {
    return app.getVersion();
  });
}
