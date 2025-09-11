// Bulk replace all data in a table
export interface BulkReplaceResponse {
  success: boolean;
  message: string;
  details: any;
}

export async function bulkReplaceTableData(tableName: string, data: any[]): Promise<BulkReplaceResponse> {
  const url = `https://mentify.srv880406.hstgr.cloud/api/tables/${encodeURIComponent(tableName)}/bulk-replace`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ table_name: tableName, data }),
  });
  const resData = await response.json();
  if (!response.ok) {
    // Validation error or other error
    throw resData;
  }
  return resData;
}
// src/api/tableData.ts
// Fetches data from a specific table with pagination

export interface TableDataResponse {
  table_name: string;
  data: any[];
  total_count: number;
  limit: number;
  offset: number;
}

export interface ValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

export async function fetchTableData(tableName: string, limit = 1000, offset = 0): Promise<TableDataResponse> {
  const url = `https://mentify.srv880406.hstgr.cloud/api/tables/${encodeURIComponent(tableName)}/data?limit=${limit}&offset=${offset}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
    },
  });
  const data = await response.json();
  if (!response.ok) {
    // Validation error or other error
    throw data;
  }
  return data;
}
