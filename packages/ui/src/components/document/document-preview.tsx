import { useUIStore } from '@/stores/ui-store';
import { CodeEditor } from './code-editor';
import { MarkdownPreview } from './markdown-preview';
import { HTMLPreview } from './html-preview';
import { DocxPreview } from './docx-preview';
import { XlsxPreview } from './xlsx-preview';
import { PptxPreview } from './pptx-preview';
import { PDFPreview } from './pdf-preview';
import { EmptyPreview } from './empty-preview';
import { MemoryFilePreview } from './memory-file-preview';

export function DocumentPreview() {
  const filePath = useUIStore((s) => s.activePreviewFilePath);

  if (!filePath) return <EmptyPreview />;

  if (filePath.startsWith('__memory__/')) return <MemoryFilePreview />;
  if (filePath.endsWith('.md')) return <MarkdownPreview />;
  if (filePath.endsWith('.html')) return <HTMLPreview />;
  if (filePath.endsWith('.docx')) return <DocxPreview />;
  if (filePath.endsWith('.xlsx')) return <XlsxPreview />;
  if (filePath.endsWith('.pptx')) return <PptxPreview />;
  if (filePath.endsWith('.pdf')) return <PDFPreview />;

  return <CodeEditor />;
}
