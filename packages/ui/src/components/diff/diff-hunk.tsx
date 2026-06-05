import { DiffLine } from './diff-line';
import type { DiffHunk as DiffHunkType } from '@pi/types';
import { useState } from 'react';

interface DiffHunkProps {
  hunk: DiffHunkType;
}

export function DiffHunk({ hunk }: DiffHunkProps) {
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  const toggleLine = (lineId: string) => {
    const next = new Set(selectedLines);
    if (next.has(lineId)) {
      next.delete(lineId);
    } else {
      next.add(lineId);
    }
    setSelectedLines(next);
  };

  return (
    <div className="border-t">
      <div className="bg-muted/50 px-3 py-1 text-xs font-mono text-muted-foreground">
        {hunk.header}
      </div>
      {hunk.lines.map((line) => (
        <DiffLine
          key={line.id}
          line={line}
          isSelected={selectedLines.has(line.id)}
          onToggleSelect={() => toggleLine(line.id)}
        />
      ))}
    </div>
  );
}
