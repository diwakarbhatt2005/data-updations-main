// filepath: c:\Users\dev\OneDrive\Desktop\A.OFFICE WORK\data-updations-main\src\api\fetchDropdownData.ts
export interface TableInfo {
  table_name: string;
  description: string | null;
}

export interface TablesApiResponse {
  status: string;
  tables: TableInfo[];
}

export async function fetchDropdownData(): Promise<TableInfo[]> {
  const response = await fetch('http://168.231.103.13:6004/api/simulator/tables', {
    method: 'GET',
    headers: {
      'accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tables');
  }

  const data = await response.json();
  // API returns: { status: "success", tables: [{ table_name, description }, ...] }
  return data.tables;
}