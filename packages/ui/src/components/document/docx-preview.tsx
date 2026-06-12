import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { Eye, FileText, AlignLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { openWithSystemApp } from '@/lib/utils';

interface TocEntry {
  id: string;
  level: number;
  text: string;
}

function extractHeadings(html: string): TocEntry[] {
  const headings: TocEntry[] = [];
  const regex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  let id = 0;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (text) {
      headings.push({ id: `docx-h-${id++}`, level, text });
    }
  }
  return headings;
}

function addHeadingIds(html: string, headings: TocEntry[]): string {
  let result = html;
  let idx = 0;
  return result.replace(/<h([1-6])([^>]*)>/gi, (match, level, attrs) => {
    const entry = headings[idx++];
    if (entry) {
      return `<h${level}${attrs} id="${entry.id}">`;
    }
    return match;
  });
}

function wrapContentHtml(html: string, title: string): string {
  const headings = extractHeadings(html);
  const htmlWithIds = addHeadingIds(html, headings);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;color:#1a1a1a}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}img{max-width:100%}
h1,h2,h3,h4,h5,h6{scroll-margin-top:20px}
</style>
<script>
  const headings = ${JSON.stringify(headings.map((h) => h.id))};
  // Report visible heading to parent
  const observer = new IntersectionObserver((entries) => {
    let best = null;
    for (const e of entries) {
      if (e.isIntersecting && (!best || e.intersectionRatio > best.ratio)) {
        best = { id: e.target.id, ratio: e.intersectionRatio };
      }
    }
    if (best) {
      parent.postMessage({ type: 'docx-heading', headingId: best.id }, '*');
    }
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  setTimeout(() => {
    headings.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }, 100);
  // Listen for scroll requests from parent
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'docx-scroll-to') {
      const el = document.getElementById(e.data.headingId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
</script>
</head><body>${htmlWithIds}</body></html>`;
}

export function DocxPreview() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);
  const [mode, setMode] = useState<'preview' | 'text'>('preview');
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['office', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.readOffice(activeWorkspaceId!, activePreviewFilePath!),
    enabled: !!activeWorkspaceId && !!activePreviewFilePath && activePreviewFilePath.endsWith('.docx'),
  });

  // Listen for heading visibility changes from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'docx-heading' && e.data.headingId) {
        setActiveHeadingId(e.data.headingId);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const scrollToHeading = useCallback((headingId: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'docx-scroll-to', headingId },
      '*',
    );
  }, []);

  const headings = useMemo(() => {
    if (!data || data.doc.type !== 'docx') return [];
    return extractHeadings(data.doc.html);
  }, [data]);

  if (!activePreviewFilePath) return null;
  if (isLoading) return <LoadingSpinner message="Loading document..." />;

  const fileName = activePreviewFilePath.split('/').pop() ?? 'Document.docx';

  if (error || !data || data.doc.type !== 'docx') {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-2">
          <FileText className="h-8 w-8" />
          <span>{error ? 'Failed to load document' : 'Unsupported document'}</span>
        </div>
      </div>
    );
  }

  const doc = data.doc;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground truncate flex-1 mr-2">
          {fileName}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant={mode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('preview')}
            className="h-7 text-xs gap-1.5"
          >
            <Eye className="h-3 w-3" />
            Preview
          </Button>
          <Button
            variant={mode === 'text' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('text')}
            className="h-7 text-xs gap-1.5"
          >
            <AlignLeft className="h-3 w-3" />
            Text
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openWithSystemApp(activePreviewFilePath!, activeWorkspaceId!)}
            className="h-7 text-xs gap-1.5"
            title="Open with system app"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* TOC sidebar */}
        {mode === 'preview' && headings.length > 0 && (
          <div className="w-44 border-r bg-muted/10 overflow-y-auto shrink-0 p-2">
            <div className="text-[11px] font-medium text-muted-foreground mb-2 px-1">
              Contents
            </div>
            {headings.map((h) => (
              <button
                key={h.id}
                onClick={() => scrollToHeading(h.id)}
                className={`w-full text-left py-1 px-2 mb-0.5 rounded text-xs transition-colors ${
                  h.id === activeHeadingId
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/30'
                }`}
                style={{ paddingLeft: `${4 + (h.level - 1) * 10}px` }}
              >
                <span className="line-clamp-1">{h.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {mode === 'preview' ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0 bg-white rounded"
              srcDoc={wrapContentHtml(doc.html, fileName)}
              title="Document Preview"
              sandbox="allow-scripts"
            />
          ) : (
            <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">
              {doc.text}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
