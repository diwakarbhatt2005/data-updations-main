// src/api/api3.ts
// API 3: Delete all data from a table and insert new data (bulk replace)
// See: https://mentify.srv880406.hstgr.cloud/docs#/default/bulk_replace_table_data_api_tables__table_name__bulk_replace_put

export interface BulkReplaceResponse {
  success: boolean;
  message: string;
  details: any;
}

export interface BulkReplaceError {
  detail: string | Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

export async function bulkReplaceTableDataApi3(tableName: string, data: any[]): Promise<BulkReplaceResponse> {
  const url = `https://mentify.srv880406.hstgr.cloud/api/tables/${encodeURIComponent(tableName)}/bulk-replace`;
  // Debug: log payload
  console.log('API3 bulk replace payload:', { table_name: tableName, data });
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ table_name: tableName, data }),
  });
  const resData = await response.json();
  // Debug: log response
  console.log('API3 bulk replace response:', response.status, resData);
  if (!response.ok) {
    // Return error details for 400/422
    // Always return error as an object with detail as array or string
    if (resData && typeof resData.detail === 'string') {
      throw { detail: resData.detail };
    } else if (resData && Array.isArray(resData.detail)) {
      throw { detail: resData.detail };
    } else {
      throw { detail: 'Unknown error occurred.' };
    }
  }
  // Notify on success
  if (typeof window !== 'undefined' && window?.alert) {
    window.alert('Data saved/updated successfully!');
  }
  return resData;
}
