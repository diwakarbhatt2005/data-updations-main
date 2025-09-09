import { useState, useMemo, useCallback } from 'react';
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

  const columns = useMemo(() => {
    if (tableData.length === 0) return [];
    return Object.keys(tableData[0]);
  }, [tableData]);

  const handleCellChange = useCallback((rowIndex: number, field: string, value: string) => {
    updateCell(rowIndex, field, value);
  }, [updateCell]);

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
    try {
      setIsSaving(true);
      setError(null);

      // Mock save - simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Save changes to original data to persist them
      saveChanges();
      toast({
        title: "Success",
        description: "Data updated successfully!",
      });
    } catch (err) {
      setError('Failed to save changes. Please try again.');
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
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

  const handleAddColumn = () => {
    const columnName = prompt('Enter new column name:');
    if (columnName && columnName.trim()) {
      addColumn(columnName.trim());
      toast({
        title: "Column Added",
        description: `New column "${columnName}" added successfully.`,
      });
    }
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
                  onClick={handleAddColumn}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-white transition-smooth"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Column
                </Button>
                <Button
                  onClick={resetToOriginal}
                  variant="outline"
                  className="border-muted-foreground text-muted-foreground hover:bg-muted transition-smooth"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All
                </Button>
              </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh] relative">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-table-header text-white z-10 shadow-md">
                <tr>
                  {isEditMode && (
                    <th className="p-4 text-left font-medium bg-table-header sticky left-0 z-20">Actions</th>
                  )}
                  {columns.map((column, index) => (
                    <th key={column} className={`p-2 text-left font-medium min-w-[150px] bg-table-header ${index === 0 && !isEditMode ? 'sticky left-0 z-20' : ''}`}>
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
                                className="h-8 text-sm text-black"
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
                      <td className="p-4 sticky left-0 bg-background z-15 border-r border-table-border">
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
                      <td key={`${rowIndex}-${column}`} className={`p-4 ${colIndex === 0 && !isEditMode ? 'sticky left-0 bg-background z-15 border-r border-table-border' : ''}`}>
                        {isEditMode ? (
                          <Input
                            value={row[column] || ''}
                            onChange={(e) => handleCellChange(rowIndex, column, e.target.value)}
                            onPaste={(e) => handlePaste(e, rowIndex, column)}
                            className="border-input focus:border-primary transition-smooth"
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
          
          {/* Paste Instructions in Edit Mode */}
          {isEditMode && (
            <div className="p-4 border-t border-table-border bg-muted/30">
              <p className="text-sm text-muted-foreground">
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