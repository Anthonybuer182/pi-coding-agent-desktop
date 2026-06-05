import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Plus } from 'lucide-react';
import { useSDK } from '@/hooks/use-sdk';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function folderBasename(filePath: string): string {
  return filePath.split('/').filter(Boolean).pop() || filePath.split('\\').filter(Boolean).pop() || filePath;
}

export function WorkspaceCreateDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const sdk = useSDK();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => sdk.workspace.create(name, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setOpen(false);
      setName('');
      setPath('');
    },
  });

  const handleSelectFolder = async () => {
    try {
      const selectedPath = await sdk.transport.request('system.selectDirectory');
      if (selectedPath && typeof selectedPath === 'string') {
        setPath(selectedPath);
        setName(folderBasename(selectedPath));
      }
    } catch {
      // user cancelled or platform not supported
    }
  };

  const handleCreate = () => {
    if (!name || !path) return;
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Create workspace">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Select a folder on your computer to use as a workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Folder</Label>
            {path ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{path}</span>
              </div>
            ) : (
              <div className="rounded-md border-2 border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">No folder selected</p>
                <Button variant="outline" size="sm" onClick={handleSelectFolder}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Choose Folder
                </Button>
              </div>
            )}
            {path && (
              <Button variant="ghost" size="sm" className="w-fit" onClick={handleSelectFolder}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Change Folder
              </Button>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. my-project"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name || !path || createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
