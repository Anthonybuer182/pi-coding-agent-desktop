import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, FileText, Text } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';
import { LoadingSpinner } from '@/components/common/loading-spinner';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function PDFPreview() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);

  const { data: file, isLoading: isFileLoading } = useQuery({
    queryKey: ['file', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.read(activeWorkspaceId!, activePreviewFilePath!),
    enabled: !!activeWorkspaceId && !!activePreviewFilePath && activePreviewFilePath.endsWith('.pdf'),
  });

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [extractingPage, setExtractingPage] = useState(false);
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
      if (!file?.content) return;
      setLoading(true);
      setError(null);

      try {
        let pdfData: ArrayBuffer;
        if (file.encoding === 'base64') {
          const binaryStr = atob(file.content);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          pdfData = bytes.buffer;
        } else {
          // Legacy: assume content is a binary string or empty
          pdfData = new ArrayBuffer(0);
        }

        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        if (pdf.numPages > 0) {
          await renderPage(1, pdf);
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setLoading(false);
      }
    }

    loadPDF();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [file, renderPage]);

  const goToPage = useCallback(
    (pageNum: number) => {
      if (!pdfDocRef.current || pageNum < 1 || pageNum > numPages) return;
      setCurrentPage(pageNum);
      renderPage(pageNum, pdfDocRef.current);
    },
    [numPages, renderPage],
  );

  const extractText = useCallback(async () => {
    if (!pdfDocRef.current) return;
    setExtractingPage(true);
    setShowTextPanel(true);
    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => {
          if ('str' in item) return item.str;
          return '';
        })
        .join(' ');
      setExtractedText(text.trim());
    } catch {
      setExtractedText('Failed to extract text.');
    } finally {
      setExtractingPage(false);
    }
  }, [currentPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel();
    };
  }, []);

  if (!activePreviewFilePath) return null;
  if (isFileLoading) return <LoadingSpinner message="Loading PDF..." />;

  const fileName = activePreviewFilePath.split('/').pop() ?? 'PDF Document';

  // Show error or no-content state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground p-8">
          <FileText className="h-12 w-12 text-destructive" />
          <p className="text-sm font-medium">Failed to load PDF</p>
          <p className="text-xs text-destructive text-center">{error}</p>
        </div>
      </div>
    );
  }

  if (!loading && numPages === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <FileText className="h-12 w-12" />
          <p className="text-sm font-medium">PDF Preview</p>
          <p className="text-xs">{fileName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground truncate flex-1 mr-2">
          {fileName}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={extractText}
            disabled={extractingPage}
            className="h-7 text-xs gap-1.5"
          >
            <Text className="h-3 w-3" />
            {extractingPage ? 'Extracting...' : 'Extract Text'}
          </Button>
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
        ) : (
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        )}
      </div>

      {/* Text extraction panel */}
      {showTextPanel && (
        <div className="shrink-0 border-t bg-muted/10">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground">
              Extracted Text (Page {currentPage})
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowTextPanel(false)}
              className="h-5 w-5"
              aria-label="Close text panel"
            >
              <Text className="h-3 w-3" />
            </Button>
          </div>
          <div className="p-3 max-h-40 overflow-auto">
            <pre className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed">
              {extractedText || 'No text extracted yet.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
