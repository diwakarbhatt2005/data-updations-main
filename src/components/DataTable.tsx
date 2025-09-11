import { useState, useMemo, useCallback } from 'react';
import { ValidationError } from '@/api/tableData';
import { bulkReplaceTableDataApi3 } from '@/api/api3';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Loader2,
  AlertCircle 
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export const DataTable = () => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkPasteValue, setBulkPasteValue] = useState('');
  const [bulkPasteError, setBulkPasteError] = useState('');
  
  const {
    tableData,
    selectedDatabase,
    isEditMode,
    error,
    setEditMode,
    updateCell,
    addRow,
    addMultipleRows,
    addColumn,
    deleteRow,
    renameColumn,
    resetToOriginal,
    saveChanges,
    setError,
  } = useDashboardStore();

  // Handles cell value change
  const handleCellChange = (rowIndex: number, field: string, value: any) => {
    updateCell(rowIndex, field, value);
  };

  const columns = useMemo(() => {
    if (tableData.length === 0) return [];
    return Object.keys(tableData[0]);
  }, [tableData]);

  // Helper: guess column type by scanning data
  const getColumnType = (col: string): 'int' | 'string' => {
    // If all values are numbers (or empty), treat as int
    let isInt = true;
    for (const row of tableData) {
      const v = row[col];
      if (v === '' || v === null || v === undefined) continue;
      if (isNaN(Number(v)) || String(v).includes('.')) {
        isInt = false;
        break;
      }
    }
    return isInt ? 'int' : 'string';
  };

  const handlePaste = useCallback((e: React.ClipboardEvent, rowIndex: number, field: string) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // Support both tab and comma separated data
    const rows = pastedData.split('\n').filter(row => row.trim());
    
    if (rows.length === 0) {
      toast({
        title: "Paste Error",
        description: "No valid data found to paste.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate and detect delimiter
    const sampleRow = rows[0];
    const delimiter = sampleRow.includes('\t') ? '\t' : ',';
    
    // Calculate how many new rows we need
    const neededRows = Math.max(0, (rowIndex + rows.length) - tableData.length);
    
    // Add required rows all at once
    if (neededRows > 0) {
      addMultipleRows(neededRows);
    }
    
    // Use setTimeout to ensure rows are added before updating cells
    setTimeout(() => {
      let pastedCells = 0;
      let truncatedCells = 0;
      const startFieldIndex = columns.indexOf(field);
      
      rows.forEach((row, rowOffset) => {
        const cells = row.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''));
        const currentRowIndex = rowIndex + rowOffset;
        
        cells.forEach((cell, cellIndex) => {
          const fieldIndex = startFieldIndex + cellIndex;
          const currentField = columns[fieldIndex];
          
          if (currentField && currentRowIndex < tableData.length + neededRows) {
            updateCell(currentRowIndex, currentField, cell);
            pastedCells++;
          } else if (!currentField) {
            truncatedCells++;
          }
        });
      });
      
      toast({
        title: "Data Pasted Successfully",
        description: `Pasted ${pastedCells} cells across ${rows.length} rows.${truncatedCells > 0 ? ` ${truncatedCells} cells were truncated.` : ''}`,
      });
    }, 200);
  }, [columns, tableData, updateCell, addMultipleRows, toast]);

  const handleSave = async () => {
    if (!selectedDatabase) return;
    try {
      setIsSaving(true);
      setError(null);

      // Assign unique IDs to rows with missing/null/empty id before saving
      let maxId = Math.max(0, ...tableData.map(row => Number(row.id) || 0));
      let safeData = tableData.map(row => {
        if (row.id === undefined || row.id === null || row.id === '') {
          maxId += 1;
          return { ...row, id: String(maxId) };
        }
        return row;
      });

      // Only remove id field for tables that do NOT use id
      // List tables that should NOT have id field here:
      const tablesWithoutId = ['employees']; // add more if needed
      let sendData = safeData;
      if (tablesWithoutId.includes(selectedDatabase)) {
        sendData = safeData.map(({ id, ...rest }) => ({ ...rest }));
      }

      // Call API to bulk replace
      await bulkReplaceTableDataApi3(selectedDatabase, sendData);
      saveChanges();
      toast({
        title: 'Success',
        description: 'Data updated successfully!',
      });
    } catch (err: any) {
      if (err && err.detail) {
        let msg = '';
        if (Array.isArray(err.detail)) {
          msg = err.detail.map((d: any) => d.msg).join(', ');
        } else {
          msg = err.detail;
        }
        setError(msg);
        toast({
          title: 'Validation Error',
          description: msg,
          variant: 'destructive',
        });
      } else if (err && err.message) {
        setError(err.message);
        toast({
          title: 'Error',
          description: err.message,
          variant: 'destructive',
        });
      } else {
        setError('Failed to save changes. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to save changes. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleColumnRename = (oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName) {
      renameColumn(oldName, newName);
      toast({
        title: "Column Renamed",
        description: `Column "${oldName}" renamed to "${newName}".`,
      });
    }
    setEditingColumn(null);
    setNewColumnName('');
  };


  // Bulk Add logic
  const handleBulkAdd = () => {
    setBulkPasteValue('');
    setBulkPasteError('');
    setBulkModalOpen(true);
  };

  const handleBulkPaste = () => {
    setBulkPasteError('');
    const lines = bulkPasteValue.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) {
      setBulkPasteError('No data found.');
      return;
    }
    if (lines.length > 500) {
      setBulkPasteError('You can paste up to 500 rows at once.');
      return;
    }
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const newRows = lines.map(line => {
      const cells = line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''));
      const rowObj = {};
      columns.forEach((col, i) => {
        rowObj[col] = cells[i] || '';
      });
      return rowObj;
    });
    addMultipleRows(newRows.length);
    setTimeout(() => {
      // Fill new rows
      const startIdx = tableData.length;
      newRows.forEach((row, i) => {
        columns.forEach(col => {
          updateCell(startIdx + i, col, row[col]);
        });
      });
      setBulkModalOpen(false);
      toast({
        title: 'Bulk Add Success',
        description: `Added ${newRows.length} rows.`,
      });
    }, 200);
  };

  if (tableData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
  <div className="space-y-6">
      {/* Header */}
  <Card className="bg-gradient-card shadow-card border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {selectedDatabase?.replace('admin_panel_db/', '').replace('_', ' ').toUpperCase()}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {tableData.length} records • {columns.length} columns
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isEditMode ? (
                <Button
                  onClick={() => setEditMode(true)}
                  className="bg-gradient-primary hover:bg-primary-hover text-white shadow-primary transition-smooth"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={resetToOriginal}
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive hover:text-white transition-smooth"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-accent hover:bg-accent/90 text-white shadow-primary transition-smooth"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Row Actions (only in edit mode) */}
      {isEditMode && (
  <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 flex-wrap">
              <Button
                onClick={addRow}
                variant="outline"
                className="border-accent text-accent hover:bg-accent hover:text-white transition-smooth"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
              <Button
                onClick={handleBulkAdd}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white transition-smooth"
              >
                <Plus className="w-4 h-4 mr-2" />
                Bulk Add
              </Button>
              <Button
                onClick={resetToOriginal}
                variant="outline"
                className="border-muted-foreground text-muted-foreground hover:bg-muted transition-smooth"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset All
              </Button>
              <Button
                onClick={() => {
                  // Example: sum all values in a column named 'amount' for the current month
                  const now = new Date();
                  const thisMonth = now.getMonth();
                  const thisYear = now.getFullYear();
                  let sum = 0;
                  tableData.forEach(row => {
                    // Try to find a date column
                    const dateCol = Object.keys(row).find(k => k.toLowerCase().includes('date'));
                    const amountCol = Object.keys(row).find(k => k.toLowerCase().includes('amount'));
                    if (dateCol && amountCol && row[dateCol] && row[amountCol]) {
                      const d = new Date(row[dateCol]);
                      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
                        const val = Number(row[amountCol]);
                        if (!isNaN(val)) sum += val;
                      }
                    }
                  });
                  alert(`Total for this month: ${sum}`);
                }}
                variant="outline"
                className="border-info text-info hover:bg-info hover:text-white transition-smooth"
              >
                Calculate Month Data
              </Button>
            </div>
            {/* Bulk Add Modal */}
            {bulkModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg mx-2 animate-fade-in">
                  <h2 className="text-lg font-semibold mb-2">Bulk Add Rows</h2>
                  <textarea
                    className="w-full h-40 p-2 border rounded text-sm bg-background text-foreground mb-2"
                    placeholder="Paste up to 500 rows (tab or comma separated)"
                    value={bulkPasteValue}
                    onChange={e => setBulkPasteValue(e.target.value)}
                  />
                  {bulkPasteError && <div className="text-red-500 text-xs mb-2">{bulkPasteError}</div>}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setBulkModalOpen(false)} className="h-8 px-3">Cancel</Button>
                    <Button onClick={handleBulkPaste} className="h-8 px-3">Add</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
  <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[70vh] relative">
            <table className="min-w-max w-full border-separate border-spacing-0 text-xs md:text-sm">
              <thead className="sticky top-0 bg-table-header text-white z-10 shadow-md">
                <tr>
                  {isEditMode && (
                    <th className="px-2 py-1 md:px-3 md:py-2 text-left font-medium bg-table-header sticky left-0 z-20 border-b border-table-border">Actions</th>
                  )}
                  {columns.map((column, index) => (
                    <th key={column} className={`px-2 py-1 md:px-3 md:py-2 text-left font-medium min-w-[120px] md:min-w-[150px] bg-table-header border-b border-table-border ${index === 0 && !isEditMode ? 'sticky left-0 z-20' : ''}`}>
                      {isEditMode ? (
                        <div className="flex items-center space-x-2">
                          {editingColumn === column ? (
                            <div className="flex items-center space-x-1">
                              <Input
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleColumnRename(column, newColumnName);
                                  } else if (e.key === 'Escape') {
                                    setEditingColumn(null);
                                    setNewColumnName('');
                                  }
                                }}
                                className="h-7 md:h-8 text-xs md:text-sm text-black"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleColumnRename(column, newColumnName)}
                                className="h-6 w-6 p-0"
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span>{column.replace('_', ' ').toUpperCase()}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingColumn(column);
                                  setNewColumnName(column);
                                }}
                                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        column.replace('_', ' ').toUpperCase()
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex}
                    className="border-b border-table-border hover:bg-table-row-hover transition-smooth"
                  >
                    {isEditMode && (
                      <td className="px-2 py-1 md:px-3 md:py-2 sticky left-0 bg-background z-15 border-r border-table-border">
                        <Button
                          onClick={() => deleteRow(rowIndex)}
                          size="sm"
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive hover:text-white transition-smooth"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    )}
                    {columns.map((column, colIndex) => (
                      <td key={`${rowIndex}-${column}`} className={`px-2 py-1 md:px-3 md:py-2 border-r border-table-border ${colIndex === 0 && !isEditMode ? 'sticky left-0 bg-background z-15' : ''}`}>
                        {isEditMode ? (
                          <Input
                            value={row[column] || ''}
                            onChange={(e) => handleCellChange(rowIndex, column, e.target.value)}
                            onPaste={(e) => handlePaste(e, rowIndex, column)}
                            className="border-input focus:border-primary transition-smooth text-xs md:text-sm"
                            placeholder={`Enter ${column}`}
                            title={`Paste data here to auto-fill multiple cells. Row ${rowIndex + 1}, Column: ${column}`}
                          />
                        ) : (
                          <span className="text-foreground">
                            {row[column] || '-'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isEditMode && (
            <div className="p-2 md:p-4 border-t border-table-border bg-muted/30">
              <p className="text-xs md:text-sm text-muted-foreground">
                💡 <strong>Copy-Paste Tip:</strong> Copy data from Excel/Sheets and paste in any cell. 
                Data will auto-expand to fill rows and columns. New rows will be created automatically if needed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};