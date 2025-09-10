/**
 * Defines a generic row of data from the API.
 * Since columns can be different for each table, we use an index signature.
 */
export interface TableRow {
  [key: string]: string | number | boolean | null;
}

/**
 * Defines the schema object (the first item in the 'data' array from the API response).
 */
export interface TableSchema {
  [key: string]: string;
}

/**
 * Defines the complete structure of a successful API response.
 * The 'data' array has a specific structure: the first element is always the schema,
 * and the rest are the data rows.
 */
export interface TableDataApiResponse {
  status: string;
  table_name: string;
  data: [TableSchema, ...TableRow[]];
}

/**
 * Fetches the data for a specific table from your live API.
 * This is the second API call, triggered after a user selects a table.
 * @param tableName The name of the table to fetch (e.g., "products").
 * @returns A promise that resolves to an array of data rows.
 */
export const getTableData = async (tableName: string): Promise<TableRow[]> => {
  // Construct the URL using your live endpoint and the provided table name
  const apiUrl = `https://mentify.srv880406.hstgr.cloud/api/simulator/table/${tableName}/data`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    });

    // Check if the network response was successful
    if (!response.ok) {
      // Try to parse error details from the API response body
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `Failed to fetch data for table: ${tableName}. Status: ${response.status}`;
      throw new Error(errorMessage);
    }

    const result: TableDataApiResponse = await response.json();
    
    // Validate the structure of the successful response
    if (result.status === 'success' && Array.isArray(result.data)) {
      // The API returns the schema as the first item. We slice it off to get only the data rows.
      const [, ...dataRows] = result.data;
      return dataRows;
    } else {
      // Handle cases where the response is successful (status 200) but the data is not in the expected format
      throw new Error('Received an invalid data format from the server.');
    }
  } catch (error) {
    console.error("API Error in getTableData:", error);
    // Re-throw the error so it can be caught by the calling component (e.g., in the Zustand store)
    throw error;
  }
};
