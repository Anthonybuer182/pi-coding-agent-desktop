import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface SlashCommandDialogSection {
  title: string;
  items: Array<{ name: string; desc: string }>;
}

export interface SlashCommandDialogData {
  title: string;
  subtitle: string;
  sections: SlashCommandDialogSection[];
}

interface SlashCommandDialogProps {
  data: SlashCommandDialogData | null;
  onClose: () => void;
}

export function SlashCommandDialog({ data, onClose }: SlashCommandDialogProps) {
  return (
    <Dialog open={!!data} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        {data && (
          <>
            <DialogHeader>
              <DialogTitle>{data.title}</DialogTitle>
              <DialogDescription>{data.subtitle}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {data.sections.map((section) => (
                <div key={section.title}>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h4>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <div key={item.name} className="flex items-baseline gap-2 text-sm">
                        <span className="font-medium text-foreground whitespace-nowrap">{item.name}</span>
                        {item.desc && (
                          <span className="text-muted-foreground">— {item.desc}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
