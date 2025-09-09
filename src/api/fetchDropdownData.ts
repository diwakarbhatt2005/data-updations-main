export interface TableInfo {
  table_name: string;
  description: string | null;
}

export interface TablesResponse {
  status: string;
  tables: TableInfo[];
}

/**
 * Fetches the list of all tables in the database for dropdown simulation.
 * @returns Promise<TableInfo[]>
 */
export const fetchDropdownData = async (): Promise<TableInfo[]> => {
  try {
    const response = await fetch('/api/simulator/tables', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data: TablesResponse = await response.json();

    if (data.status !== 'success' || !Array.isArray(data.tables)) {
      throw new Error('Invalid response structure');
    }

    return data.tables;
  } catch (error) {
    console.error('Failed to fetch dropdown data:', error);
    throw error;
  }
};
