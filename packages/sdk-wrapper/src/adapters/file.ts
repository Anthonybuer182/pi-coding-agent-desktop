import type { FileService, FileEntry, FileContent, OfficeContent, DocxContent, XlsxContent, PptxContent } from '../services/file.js';
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import AdmZip, { type IZipEntry } from 'adm-zip';

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
  '.md': 'markdown',
  '.html': 'html',
  '.css': 'css',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.sql': 'sql',
};

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg', '.tiff', '.tif',
  '.pdf',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a',
  '.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.exe', '.dll', '.so', '.dylib',
  '.bin', '.dat', '.db', '.sqlite', '.sqlite3',
]);

const MIME_TYPE_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function createRealFileService(): FileService {
  return {
    async list(workspaceId: string, dirPath?: string): Promise<FileEntry[]> {
      const dir = dirPath || workspaceId;
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        return entries.map((entry) => ({
          name: entry.name,
          path: join(dir, entry.name),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? statSync(join(dir, entry.name)).size : undefined,
          modifiedAt: statSync(join(dir, entry.name)).mtime.toISOString(),
        }));
      } catch {
        return [];
      }
    },

    async read(_workspaceId: string, filePath: string): Promise<FileContent> {
      const ext = extname(filePath).toLowerCase();
      const isBinary = BINARY_EXTENSIONS.has(ext);
      const stat = statSync(filePath);

      if (isBinary) {
        const buffer = readFileSync(filePath);
        const content = buffer.toString('base64');
        return {
          path: filePath,
          content,
          encoding: 'base64',
          mimeType: MIME_TYPE_MAP[ext],
          size: stat.size,
        };
      }

      const content = readFileSync(filePath, 'utf-8');
      return {
        path: filePath,
        content,
        encoding: 'utf-8',
        language: LANGUAGE_MAP[ext],
        size: stat.size,
      };
    },

    async write(_workspaceId: string, filePath: string, content: string): Promise<void> {
      writeFileSync(filePath, content, 'utf-8');
    },

    async delete(_workspaceId: string, filePath: string): Promise<void> {
      unlinkSync(filePath);
    },

    async readOffice(_workspaceId: string, filePath: string): Promise<OfficeContent> {
      const ext = extname(filePath).toLowerCase();
      const buffer = readFileSync(filePath);
      const stat = statSync(filePath);

      if (ext === '.docx') {
        return { path: filePath, size: stat.size, doc: await parseDocx(buffer) };
      }
      if (ext === '.xlsx') {
        return { path: filePath, size: stat.size, doc: parseXlsx(buffer) };
      }
      if (ext === '.pptx') {
        return { path: filePath, size: stat.size, doc: parsePptx(buffer) };
      }

      throw new Error(`Unsupported Office file type: ${ext}`);
    },
  };
}

// --- Office parsing helpers ---

async function parseDocx(buffer: Buffer): Promise<DocxContent> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  // Strip HTML tags for plain text
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return { type: 'docx', html, text };
}

function parseXlsx(buffer: Buffer): XlsxContent {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    // Trim trailing empty rows
    while (data.length > 0 && data[data.length - 1].every((c: string | undefined) => !c)) {
      data.pop();
    }
    return { name, rows: data as string[][] };
  });
  return { type: 'xlsx', sheets };
}

function parsePptx(buffer: Buffer): PptxContent {
  const slides: PptxContent['slides'] = [];
  const zip = new AdmZip(buffer);

  // Find all slide files
  const entries = zip.getEntries();
  const slideEntries = entries
    .filter((e: IZipEntry) => e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort((a: IZipEntry, b: IZipEntry) => {
      const na = parseInt(a.entryName.match(/slide(\d+)/)?.[1] ?? '0');
      const nb = parseInt(b.entryName.match(/slide(\d+)/)?.[1] ?? '0');
      return na - nb;
    });

  // Parse notes
  const notesMap = new Map<number, string>();
  const noteEntries = entries.filter((e: IZipEntry) => e.entryName.match(/^ppt\/notesSlides\/notesSlide\d+\.xml$/));
  for (const note of noteEntries) {
    const idx = parseInt(note.entryName.match(/notesSlide(\d+)/)?.[1] ?? '0');
    const xml = note.getData().toString('utf-8');
    const texts = extractXmlTexts(xml);
    notesMap.set(idx, texts.join(' ').trim());
  }

  for (const entry of slideEntries) {
    const index = parseInt(entry.entryName.match(/slide(\d+)/)?.[1] ?? '0');
    const xml = entry.getData().toString('utf-8');
    const texts = extractXmlTexts(xml);
    const title = texts[0] ?? '';
    const imageCount = extractImageCount(xml);

    slides.push({
      index,
      title,
      texts,
      notes: notesMap.get(index) ?? '',
      imageCount,
    });
  }

  return { type: 'pptx', slides };
}

/** Extract text from `<a:t>` elements in PowerPoint XML */
function extractXmlTexts(xml: string): string[] {
  const results: string[] = [];
  const tRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = tRegex.exec(xml)) !== null) {
    const text = m[1].trim();
    if (text) results.push(text);
  }
  return results;
}

/** Count embedded images in slide XML */
function extractImageCount(xml: string): number {
  const matches = xml.match(/<a:blip[^>]*r:embed=/g);
  return matches ? matches.length : 0;
}
