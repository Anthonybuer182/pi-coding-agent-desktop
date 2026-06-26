import { useRef, useCallback, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { Presentation, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { openWithSystemApp } from '@/lib/utils';

interface SlideInfo {
  index: number;
  title: string;
  texts: string[];
  notes: string;
  imageCount: number;
}

export function PptxPreview() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [activeIdx, setActiveIdx] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['office', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.readOffice(activeWorkspaceId!, activePreviewFilePath!),
    enabled: !!activeWorkspaceId && !!activePreviewFilePath && activePreviewFilePath.endsWith('.pptx'),
  });

  const scrollToSlide = useCallback((index: number) => {
    const el = slideRefs.current.get(index);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // IntersectionObserver for scroll-sync
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with highest intersection ratio in the viewport
        let best: { idx: number; ratio: number } = { idx: -1, ratio: 0 };
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > best.ratio) {
            const idx = Number((entry.target as HTMLElement).dataset.slideIdx);
            if (!isNaN(idx)) {
              best = { idx, ratio: entry.intersectionRatio };
            }
          }
        }
        if (best.idx >= 0) {
          setActiveIdx(best.idx);
        }
      },
      {
        root: container,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    slideRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (!activePreviewFilePath) return null;
  if (isLoading) return <LoadingSpinner message="Loading presentation..." />;

  const fileName = activePreviewFilePath.split(/[/\\]/).pop() ?? 'Presentation.pptx';

  if (error || !data || data.doc.type !== 'pptx') {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-2">
          <Presentation className="h-8 w-8" />
          <span>{error ? 'Failed to load presentation' : 'Unsupported presentation'}</span>
        </div>
      </div>
    );
  }

  const slides: SlideInfo[] = data.doc.slides;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground truncate flex-1 mr-2">
          {fileName} ({slides.length} slides)
        </span>
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

      {/* Main content: thumbnails + slide list */}
      <div className="flex flex-1 min-h-0">
        {/* Slide thumbnails sidebar */}
        <div className="w-36 border-r bg-muted/10 overflow-y-auto shrink-0 p-2">
          {slides.map((s: SlideInfo, i: number) => (
            <button
              key={s.index}
              onClick={() => scrollToSlide(i)}
              className={`w-full text-left p-2 mb-1.5 rounded border text-xs transition-colors ${
                i === activeIdx
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-transparent hover:bg-muted/30 text-muted-foreground'
              }`}
            >
              <div className="font-medium text-[11px] truncate">
                {i + 1}. {s.title || `Slide ${s.index}`}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {s.texts.length} text blocks
                {s.imageCount > 0 && ` \u2022 ${s.imageCount} images`}
              </div>
            </button>
          ))}
        </div>

        {/* Slide cards stacked vertically */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {slides.map((slide: SlideInfo, i: number) => (
            <div
              key={slide.index}
              data-slide-idx={i}
              ref={(el) => {
                if (el) slideRefs.current.set(i, el);
                else slideRefs.current.delete(i);
              }}
              className="border rounded-lg shadow-sm bg-white p-6 w-full max-w-2xl mx-auto min-h-[300px] flex flex-col"
            >
              <div className="text-xs text-muted-foreground mb-2">
                Slide {i + 1} of {slides.length}
              </div>
              <h2 className="text-xl font-bold mb-4 border-b pb-2">
                {slide.title || `Slide ${slide.index}`}
              </h2>
              <div className="flex-1 space-y-2">
                {slide.texts.slice(1).map((text: string, j: number) => (
                  <p key={j} className="text-sm leading-relaxed">
                    {text}
                  </p>
                ))}
                {slide.texts.length <= 1 && (
                  <p className="text-sm text-muted-foreground italic">
                    {slide.imageCount > 0
                      ? `Contains ${slide.imageCount} embedded image(s). No text content available.`
                      : 'No text content on this slide.'}
                  </p>
                )}
              </div>
              {slide.notes && (
                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                  <span className="font-medium">Notes:</span> {slide.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
