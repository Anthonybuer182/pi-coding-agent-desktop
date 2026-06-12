import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { openWithSystemApp } from '@/lib/utils';

interface SheetInfo {
  name: string;
  rows: string[][];
}

export function XlsxPreview() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);
  const [activeSheetName, setActiveSheetName] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['office', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.readOffice(activeWorkspaceId!, activePreviewFilePath!),
    enabled: !!activeWorkspaceId && !!activePreviewFilePath && activePreviewFilePath.endsWith('.xlsx'),
  });

  if (!activePreviewFilePath) return null;
  if (isLoading) return <LoadingSpinner message="Loading spreadsheet..." />;

  const fileName = activePreviewFilePath.split('/').pop() ?? 'Spreadsheet.xlsx';

  if (error || !data || data.doc.type !== 'xlsx') {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-2">
          <Download className="h-8 w-8" />
          <span>{error ? 'Failed to load spreadsheet' : 'Unsupported spreadsheet'}</span>
        </div>
      </div>
    );
  }

  const doc = data.doc;
  const sheets: SheetInfo[] = doc.sheets;
  const activeSheet: SheetInfo =
    sheets.find((s: SheetInfo) => s.name === activeSheetName) ?? sheets[0];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground truncate flex-1 mr-2">
          {fileName}
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

      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex items-center border-b bg-muted/10 px-2 shrink-0 overflow-x-auto">
          {sheets.map((sheet: SheetInfo) => (
            <button
              key={sheet.name}
              className={`shrink-0 px-3 py-1.5 text-xs border-b-2 transition-colors ${
                activeSheet.name === sheet.name
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveSheetName(sheet.name)}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {activeSheet && activeSheet.rows.length > 0 ? (
          <table className="w-full border-collapse text-xs">
            <tbody>
              {activeSheet.rows.map((row: string[], rowIdx: number) => (
                <tr key={rowIdx} className={rowIdx === 0 ? 'bg-muted/30' : ''}>
                  {row.map((cell: string, colIdx: number) => (
                    <td
                      key={colIdx}
                      className={`border border-border px-2 py-1 min-w-[4rem] max-w-[20rem] truncate ${
                        rowIdx === 0 ? 'font-medium' : ''
                      }`}
                    >
                      {cell ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Empty sheet
          </div>
        )}
      </div>
    </div>
  );
}
