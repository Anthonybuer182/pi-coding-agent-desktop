export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt: string;
}

export interface FileContent {
  path: string;
  content: string;
  language?: string;
  size: number;
  encoding?: 'utf-8' | 'base64';
  mimeType?: string;
}

// --- Office document structured content ---

export type OfficeFileType = 'docx' | 'xlsx' | 'pptx';

export interface DocxContent {
  type: 'docx';
  html: string;
  text: string;
}

export interface XlsxContent {
  type: 'xlsx';
  sheets: { name: string; rows: string[][] }[];
}

export interface PptxSlide {
  index: number;
  title: string;
  texts: string[];
  notes: string;
  imageCount: number;
}

export interface PptxContent {
  type: 'pptx';
  slides: PptxSlide[];
}

export type OfficeDocContent = DocxContent | XlsxContent | PptxContent;

export interface OfficeContent {
  path: string;
  size: number;
  doc: OfficeDocContent;
}

export interface FileService {
  list(workspaceId: string, directory?: string): Promise<FileEntry[]>;
  read(workspaceId: string, filePath: string): Promise<FileContent>;
  write(workspaceId: string, filePath: string, content: string): Promise<void>;
  delete(workspaceId: string, filePath: string): Promise<void>;
  readOffice(workspaceId: string, filePath: string): Promise<OfficeContent>;
}
