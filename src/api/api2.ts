// src/api/api2.ts
// This file contains logic for API2 (example: advanced table operations)

import { TableDataResponse, ValidationError } from './tableData';


// Example: fetch table data with extra logic (API2)
// Enhanced return type to include errors
export interface TableDataWithErrors extends TableDataResponse {
  validationErrors?: Array<{ row: number; column: string; value: any; error: string }>;
}

export async function fetchTableDataApi2(tableName: string, limit = 1000, offset = 0): Promise<TableDataWithErrors> {
  // You can add custom logic here, e.g., transform data, add headers, etc.
  const url = `https://mentify.srv880406.hstgr.cloud/api/tables/${encodeURIComponent(tableName)}/data?limit=${limit}&offset=${offset}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      // Add custom headers if needed
    },
  });
  const data = await response.json();
  if (!response.ok) {
    // Validation error or other error
    throw data;
  }
  // Example: ensure all rows have a non-null id
  let validationErrors: Array<{ row: number; column: string; value: any; error: string }> = [];
  if (Array.isArray(data.data)) {
    // Guess column types: int if all values are numbers (or empty/null), else string
    const columns = data.data.length > 0 ? Object.keys(data.data[0]) : [];
    const colTypes: Record<string, 'int' | 'string'> = {};
    columns.forEach(col => {
      let isInt = true;
      for (const row of data.data) {
        const v = row[col];
        if (v === '' || v === null || v === undefined) continue;
        if (isNaN(Number(v)) || String(v).includes('.')) {
          isInt = false;
          break;
        }
      }
      colTypes[col] = isInt ? 'int' : 'string';
    });
    // Validate each row
    data.data = data.data.map((row: any, idx: number) => {
      if (row.id == null) {
        row.id = idx + 1; // fallback: assign a sequential id
      }
      // Validate types
      for (const col of columns) {
        const v = row[col];
        if (colTypes[col] === 'int' && v !== '' && v !== null && v !== undefined) {
          if (isNaN(Number(v)) || String(v).includes('.')) {
            validationErrors.push({ row: idx + 1, column: col, value: v, error: 'Expected integer' });
            row[col] = null; // or set to '' or throw error
          }
        }
        if (colTypes[col] === 'string' && v !== '' && v !== null && v !== undefined) {
          if (typeof v !== 'string') {
            validationErrors.push({ row: idx + 1, column: col, value: v, error: 'Expected string' });
            row[col] = String(v);
          }
        }
      }
      return row;
    });
  }
  return { ...data, validationErrors };
}
