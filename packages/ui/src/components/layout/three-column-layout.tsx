'use client';

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface ThreeColumnLayoutProps {
  leftSidebar: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  /** Content for the top bar left section (workspace controls). Shown in sidebar column when sidebar is open. */
  topLeftContent?: ReactNode;
  /** Header content for the right panel (tabs). Only rendered when rightPanelOpen. */
  rightPanelHeader?: ReactNode;
  leftWidth?: number;
  rightWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  maxLeftWidth?: number;
  maxRightWidth?: number;
  rightPanelOpen?: boolean;
  sidebarOpen?: boolean;
}

export function ThreeColumnLayout({
  leftSidebar,
  centerPanel,
  rightPanel,
  topLeftContent,
  rightPanelHeader,
  leftWidth = 260,
  rightWidth = 400,
  minLeftWidth = 200,
  minRightWidth = 300,
  maxLeftWidth = 400,
  maxRightWidth = 600,
  rightPanelOpen = true,
  sidebarOpen = true,
}: ThreeColumnLayoutProps) {
  const [currentLeftWidth, setCurrentLeftWidth] = useState(leftWidth);
  const [currentRightWidth, setCurrentRightWidth] = useState(rightWidth);
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;

      if (dragging === 'left') {
        const newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, x));
        setCurrentLeftWidth(newWidth);
      } else if (dragging === 'right') {
        const newWidth = Math.max(
          minRightWidth,
          Math.min(maxRightWidth, rect.width - x),
        );
        setCurrentRightWidth(newWidth);
      }
    },
    [dragging, minLeftWidth, maxLeftWidth, minRightWidth, maxRightWidth],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      {/* ============== Left + Center column ============== */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex h-12 shrink-0 items-center border-b bg-background">
          {sidebarOpen ? (
            <>
              <div
                style={{ width: currentLeftWidth }}
                className="flex-shrink-0 overflow-hidden h-full"
              >
                <div className="flex items-center gap-2 px-4 h-full">
                  {topLeftContent}
                </div>
              </div>
              <div className="flex-1 h-full" />
            </>
          ) : (
            <div className="flex-1 flex items-center gap-2 px-4">
              {topLeftContent}
            </div>
          )}
        </div>

        {/* Sidebar + Center */}
        <div className="flex flex-1 overflow-hidden">
          {sidebarOpen && (
            <>
              <div
                style={{ width: currentLeftWidth }}
                className="flex-shrink-0 overflow-hidden border-r"
              >
                {leftSidebar}
              </div>
              <Separator
                orientation="vertical"
                role="separator"
                tabIndex={0}
                aria-label="Resize sidebar"
                aria-valuenow={currentLeftWidth}
                aria-valuemin={minLeftWidth}
                aria-valuemax={maxLeftWidth}
                aria-orientation="vertical"
                className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                onMouseDown={() => setDragging('left')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft')
                    setCurrentLeftWidth(
                      Math.max(minLeftWidth, currentLeftWidth - 10),
                    );
                  if (e.key === 'ArrowRight')
                    setCurrentLeftWidth(
                      Math.min(maxLeftWidth, currentLeftWidth + 10),
                    );
                }}
              />
            </>
          )}
          <div className="flex-1 min-w-0 overflow-hidden">{centerPanel}</div>
        </div>
      </div>

      {/* ============== Right column ============== */}
      {rightPanelOpen && (
        <>
          <Separator
            orientation="vertical"
            role="separator"
            tabIndex={0}
            aria-label="Resize preview panel"
            aria-valuenow={currentRightWidth}
            aria-valuemin={minRightWidth}
            aria-valuemax={maxRightWidth}
            aria-orientation="vertical"
            className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
            onMouseDown={() => setDragging('right')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft')
                setCurrentRightWidth(
                  Math.max(minRightWidth, currentRightWidth - 10),
                );
              if (e.key === 'ArrowRight')
                setCurrentRightWidth(
                  Math.min(maxRightWidth, currentRightWidth + 10),
                );
            }}
          />
          <div
            style={{ width: currentRightWidth }}
            className="flex-shrink-0 overflow-hidden border-l flex flex-col"
          >
            {rightPanelHeader && (
              <div className="shrink-0">{rightPanelHeader}</div>
            )}
            <div className="flex-1 overflow-hidden">{rightPanel}</div>
          </div>
        </>
      )}
    </div>
  );
}
