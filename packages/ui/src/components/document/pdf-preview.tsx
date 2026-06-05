import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewProps {
  filePath?: string;
  fileContent?: string; // base64 PDF content
}

export function PDFPreview({ filePath, fileContent }: PDFPreviewProps) {
  const storePath = useUIStore((s) => s.activePreviewFilePath);
  const activePath = filePath ?? storePath;

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  const renderPage = useCallback(async (pageNum: number, doc: pdfjsLib.PDFDocumentProxy) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cancel any in-flight render
    renderTaskRef.current?.cancel();

    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      renderTaskRef.current = page.render({ canvas, viewport });
      await renderTaskRef.current.promise;
    } catch (err) {
      if (err instanceof Error && err.name === 'RenderingCancelledException') return;
      throw err;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPDF() {
      setLoading(true);
      setError(null);

      try {
        // For now, create an empty PDF as placeholder
        // In production, this would load from filePath or fileContent
        const pdf = await pdfjsLib.getDocument({
          data: new Uint8Array(0),
        }).promise;

        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        if (pdf.numPages > 0) {
          await renderPage(1, pdf);
        }
      } catch {
        // If no PDF data is available, show the placeholder state
        // In production, this would load from an actual file
        setLoading(false);
        return;
      }

      if (!cancelled) setLoading(false);
    }

    loadPDF();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [activePath, fileContent, renderPage]);

  const goToPage = useCallback(
    (pageNum: number) => {
      if (!pdfDocRef.current || pageNum < 1 || pageNum > numPages) return;
      setCurrentPage(pageNum);
      renderPage(pageNum, pdfDocRef.current);
    },
    [numPages, renderPage],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel();
    };
  }, []);

  // If no content is available, show placeholder
  if (!loading && numPages === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <FileText className="h-12 w-12" />
          <p className="text-sm font-medium">PDF Preview</p>
          <p className="text-xs">
            {activePath ?? 'Select a PDF file to preview'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground truncate flex-1 mr-2">
          {activePath?.split('/').pop() ?? 'PDF Document'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums min-w-[3rem] text-center">
            {currentPage} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={currentPage >= numPages}
            onClick={() => goToPage(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-muted/20 flex justify-center p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        )}
      </div>
    </div>
  );
}
