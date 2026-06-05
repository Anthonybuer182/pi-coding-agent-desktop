import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { FileSpreadsheet, FileText, FileIcon } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

interface OfficeDocPreviewProps {
  filePath?: string;
  fileContent?: string;
}

const COLORS = ['primary', 'success', 'warning', 'danger', 'info', 'neutral', 'accent', 'muted'];
const FORMULA_TEMPLATES = ['=SUM(A:A)', '=AVERAGE(B:B)', '=COUNT(C:C)', '=MAX(D:D)', '=MIN(E:E)'];
const SAMPLE_LABELS = ['Revenue', 'Expenses', 'Profit', 'Users', 'Growth', 'ARPU', 'Churn', 'Retention'];

function getFileIcon(ext: string) {
  if (ext === 'xlsx' || ext === 'xls') return FileSpreadsheet;
  return FileText;
}

function generateSampleSheetData(rows: number, cols: number) {
  const rowData: Record<string, string | number>[] = [];
  for (let r = 0; r < rows; r++) {
    const row: Record<string, string | number> = {};
    for (let c = 0; c < cols; c++) {
      const colKey = String.fromCharCode(65 + c);
      if (r === 0 && c > 0) {
        row[colKey] = SAMPLE_LABELS[(c - 1) % SAMPLE_LABELS.length];
      } else if (c === 0 && r > 0) {
        row[colKey] = `Row ${r}`;
      } else if (r > 0 && c > 0) {
        row[colKey] = Math.round(Math.random() * 10000) / 100;
      } else {
        row[colKey] = '';
      }
    }
    rowData.push(row);
  }
  return rowData;
}

const SAMPLE_COLUMNS = 8;
const SAMPLE_ROWS = 4;

export function OfficeDocPreview({ filePath, fileContent }: OfficeDocPreviewProps) {
  const storePath = useUIStore((s) => s.activePreviewFilePath);
  const activePath = filePath ?? storePath;
  const fileName = activePath?.split('/').pop() ?? '';
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const FileIconComp = getFileIcon(ext);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _fileContent = fileContent; // reserved for future use

  const { rowData, columnDefs } = useMemo(() => {
    const cols: ColDef[] = [];
    for (let c = 0; c < SAMPLE_COLUMNS; c++) {
      const colKey = String.fromCharCode(65 + c);
      cols.push({
        field: colKey,
        headerName: c === 0 ? '' : colKey,
        width: c === 0 ? 100 : 130,
        editable: true,
        resizable: true,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellStyle: c === 0 ? { fontWeight: 600, color: 'var(--muted-foreground)' } : undefined,
      });
    }

    return {
      rowData: generateSampleSheetData(SAMPLE_ROWS, SAMPLE_COLUMNS),
      columnDefs: cols,
    };
  }, []);

  // Show document info panel for non-spreadsheet types (doc, ppt)
  const isSpreadsheet = ext === 'xlsx' || ext === 'xls' || ext === 'csv';

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <FileIconComp className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">
            {fileName || 'Office Document'}
          </span>
          <span className="text-[10px] text-muted-foreground/60 uppercase bg-muted px-1.5 py-0.5 rounded">
            {ext}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {isSpreadsheet ? 'Sheet1' : 'Preview'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isSpreadsheet ? (
          <div className="ag-theme-alpine h-full w-full" style={{ '--ag-font-size': '13px' } as React.CSSProperties}>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              rowSelection="multiple"
              enableCellTextSelection
              suppressMovableColumns={false}
              animateRows
              rowHeight={36}
              headerHeight={40}
              defaultColDef={{
                flex: 1,
                minWidth: 80,
              }}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground p-8">
              <FileIconComp className="h-16 w-16" />
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs text-center max-w-xs">
                {ext === 'docx' || ext === 'doc'
                  ? 'Word document preview will render document content here. Connect an Office document parser for full preview.'
                  : ext === 'pptx' || ext === 'ppt'
                    ? 'PowerPoint preview will render slides here. Connect a presentation parser for full preview.'
                    : 'Office document preview. Select a file to view its contents.'}
              </p>
              <div className="flex gap-1 mt-2">
                {FORMULA_TEMPLATES.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] bg-muted px-2 py-1 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-t bg-muted/20 shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {isSpreadsheet
            ? `Ready | ${SAMPLE_ROWS} rows × ${SAMPLE_COLUMNS - 1} cols`
            : 'Ready'}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {COLORS.slice(0, 5).map((color) => (
            <div
              key={color}
              className="w-2.5 h-2.5 rounded-full border"
              style={
                {
                  backgroundColor: `var(--${color})`,
                  borderColor: `var(--${color}-foreground)`,
                  opacity: 0.6,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
