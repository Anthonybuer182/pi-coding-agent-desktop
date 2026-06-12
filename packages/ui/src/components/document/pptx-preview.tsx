import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { ChevronLeft, ChevronRight, Presentation, ExternalLink } from 'lucide-react';
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
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['office', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.readOffice(activeWorkspaceId!, activePreviewFilePath!),
    enabled: !!activeWorkspaceId && !!activePreviewFilePath && activePreviewFilePath.endsWith('.pptx'),
  });

  if (!activePreviewFilePath) return null;
  if (isLoading) return <LoadingSpinner message="Loading presentation..." />;

  const fileName = activePreviewFilePath.split('/').pop() ?? 'Presentation.pptx';

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
  const slide: SlideInfo = slides[currentSlideIdx];

  if (!slide) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground truncate flex-1 mr-2">
          {fileName}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openWithSystemApp(activePreviewFilePath!, activeWorkspaceId!)}
          className="h-7 text-xs gap-1.5 mr-1"
          title="Open with system app"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={currentSlideIdx <= 0}
            onClick={() => setCurrentSlideIdx((s) => s - 1)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums min-w-[4rem] text-center">
            {currentSlideIdx + 1} / {slides.length}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={currentSlideIdx >= slides.length - 1}
            onClick={() => setCurrentSlideIdx((s) => s + 1)}
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content: thumbnails + slide */}
      <div className="flex flex-1 min-h-0">
        {/* Slide thumbnails sidebar */}
        <div className="w-36 border-r bg-muted/10 overflow-y-auto shrink-0 p-2">
          {slides.map((s: SlideInfo, i: number) => (
            <button
              key={s.index}
              onClick={() => setCurrentSlideIdx(i)}
              className={`w-full text-left p-2 mb-1.5 rounded border text-xs transition-colors ${
                i === currentSlideIdx
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-transparent hover:bg-muted/30 text-muted-foreground'
              }`}
            >
              <div className="font-medium text-[11px] truncate">
                {s.title || `Slide ${s.index}`}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {s.texts.length} text blocks
                {s.imageCount > 0 && ` • ${s.imageCount} images`}
              </div>
            </button>
          ))}
        </div>

        {/* Current slide preview */}
        <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
          <div className="border rounded-lg shadow-sm bg-white p-6 w-full max-w-2xl aspect-[16/10] flex flex-col">
            {/* Slide title */}
            <h2 className="text-xl font-bold mb-4 border-b pb-2">
              {slide.title || `Slide ${slide.index}`}
            </h2>

            {/* Text content */}
            <div className="flex-1 overflow-auto space-y-2">
              {slide.texts.slice(1).map((text: string, i: number) => (
                <p key={i} className="text-sm leading-relaxed">
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

            {/* Notes */}
            {slide.notes && (
              <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                <span className="font-medium">Notes:</span> {slide.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
