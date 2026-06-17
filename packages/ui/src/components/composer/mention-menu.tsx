import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export type MentionTarget = 'workspace' | 'session' | 'file' | 'folder' | 'code';

export interface MentionItem {
  id: string;
  type: MentionTarget;
  label: string;
  description?: string;
}

interface MentionMenuProps {
  items: MentionItem[];
  query: string;
  highlightedIndex: number;
  onSelect: (item: MentionItem) => void;
}

const typeIcons: Record<MentionTarget, string> = {
  workspace: 'W',
  session: 'S',
  file: 'F',
  folder: 'D',
  code: 'C',
};

const typeLabels: Record<MentionTarget, string> = {
  workspace: 'Workspace',
  session: 'Session',
  file: 'File',
  folder: 'Folder',
  code: 'Code',
};

export function MentionMenu({ items, query, highlightedIndex, onSelect }: MentionMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Automatically scroll the highlighted item into view
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const filtered = query
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  if (filtered.length === 0) return null;

  const grouped = filtered.reduce(
    (acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    },
    {} as Record<string, MentionItem[]>,
  );

  let globalIndex = 0;
  for (const groupItems of Object.values(grouped)) {
    globalIndex += groupItems.length;
  }

  let idx = 0;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 rounded-lg border bg-popover shadow-md z-50">
      <div ref={containerRef} className="max-h-72 overflow-y-auto p-1">
        {Object.entries(grouped).map(([type, groupItems]) => (
          <div key={type}>
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
              {typeLabels[type as MentionTarget] || type}
            </div>
            {groupItems.map((item) => {
              const currentIdx = idx++;
              return (
                <div
                  key={item.id}
                  data-index={currentIdx}
                  className={cn(
                    'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer',
                    currentIdx === highlightedIndex && 'bg-accent text-accent-foreground',
                  )}
                  onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                    {typeIcons[item.type as MentionTarget] || '?'}
                  </span>
                  <span className="font-medium truncate">@{item.label}</span>
                  {item.description && (
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {item.description}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
