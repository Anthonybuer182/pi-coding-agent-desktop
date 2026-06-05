import { useUIStore } from '@/stores/ui-store';
import { CodeEditor } from './code-editor';
import { MarkdownPreview } from './markdown-preview';
import { ImagePreview } from './image-preview';
import { PDFPreview } from './pdf-preview';
import { OfficeDocPreview } from './office-doc-preview';
import { EmptyPreview } from './empty-preview';

export function DocumentPreview() {
  const filePath = useUIStore((s) => s.activePreviewFilePath);

  if (!filePath) return <EmptyPreview />;

  if (filePath.endsWith('.md')) return <MarkdownPreview />;
  if (filePath.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return <ImagePreview />;
  if (filePath.endsWith('.pdf')) return <PDFPreview />;
  if (filePath.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)) return <OfficeDocPreview />;

  return <CodeEditor />;
}
