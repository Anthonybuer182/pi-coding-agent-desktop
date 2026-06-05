import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import type { SlashCommand } from '@pi/types';

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  query: string;
  onSelect: (command: SlashCommand) => void;
}

export function SlashCommandMenu({ commands, query, onSelect }: SlashCommandMenuProps) {
  const filtered = query
    ? commands.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : commands;

  if (filtered.length === 0) return null;

  const grouped = filtered.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, SlashCommand[]>,
  );

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72">
      <Command className="rounded-lg border shadow-md">
        <CommandList>
          <CommandEmpty>No commands found</CommandEmpty>
          {Object.entries(grouped).map(([category, cmds]) => (
            <CommandGroup key={category} heading={category}>
              {cmds.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  onSelect={() => onSelect(cmd)}
                >
                  <span className="font-medium">{cmd.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {cmd.description}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </div>
  );
}
