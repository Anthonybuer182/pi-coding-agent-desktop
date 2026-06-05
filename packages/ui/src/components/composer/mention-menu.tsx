import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

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

export function MentionMenu({ items, query, onSelect }: MentionMenuProps) {
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

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72">
      <Command className="rounded-lg border shadow-md">
        <CommandList>
          <CommandEmpty>No matches found</CommandEmpty>
          {Object.entries(grouped).map(([type, groupItems]) => (
            <CommandGroup key={type} heading={typeLabels[type as MentionTarget] || type}>
              {groupItems.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => onSelect(item)}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground mr-2">
                    {typeIcons[item.type as MentionTarget] || '?'}
                  </span>
                  <span className="font-medium">@{item.label}</span>
                  {item.description && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </div>
  );
}
