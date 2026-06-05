import { useQuery } from '@tanstack/react-query';
import { Cpu } from 'lucide-react';
import { useSDK } from '@/hooks/use-sdk';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface ModelSelectorProps {
  value?: string;
  onChange?: (modelId: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const sdk = useSDK();

  const { data: models, isLoading } = useQuery({
    queryKey: ['models'],
    queryFn: () => sdk.config.listModels(),
  });

  if (isLoading) return <Skeleton className="h-8 w-[180px]" />;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[180px] border-0 bg-transparent hover:bg-accent text-xs" aria-label="Select model">
        <Cpu className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {models?.map((model) => (
          <SelectItem key={model.id} value={model.id} disabled={!model.isAvailable}>
            <div className="flex items-center gap-2">
              <span>{model.name}</span>
              {!model.isAvailable && (
                <span className="text-[10px] text-muted-foreground">unavailable</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
