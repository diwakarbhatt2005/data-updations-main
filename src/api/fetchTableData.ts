export type ColumnType =
  | 'int'
  | 'integer'
  | 'bigint'
  | 'float'
  | 'double'
  | 'str'
  | 'string'
  | 'bool'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | string;

export type ColumnTypesMap = Record<string, ColumnType>;
export type Row = Record<string, any>;

export interface TableDataResponse {
  status: string;
  table_name: string;
  data: Row[];
}

export interface ValidationResult {
  rowIndex: number;
  valid: boolean;
  errors: string[];
  parsed?: Row;
}

function normalizeType(t: string | undefined): ColumnType {
  if (!t) return 'string';
  return t.toLowerCase() as ColumnType;
}

function tryParseJSON(v: any) {
  if (v == null) return { ok: true, value: v };
  if (typeof v === 'object') return { ok: true, value: v };
  if (typeof v === 'string') {
    try {
      return { ok: true, value: JSON.parse(v) };
    } catch {
      return { ok: false, error: 'invalid json string' };
    }
  }
  return { ok: false, error: 'unsupported json value' };
}

function validateAndParseValue(value: any, expectedType: ColumnType) {
  const t = normalizeType(expectedType);
  if (value == null) return { ok: true, parsed: null };

  switch (t) {
    case 'int':
    case 'integer': {
      if (typeof value === 'number' && Number.isInteger(value)) return { ok: true, parsed: value };
      if (typeof value === 'string' && /^\s*-?\d+\s*$/.test(value)) return { ok: true, parsed: parseInt(value, 10) };
      return { ok: false, error: `expected integer, got ${typeof value}` };
    }

    case 'bigint': {
      if (typeof value === 'bigint') return { ok: true, parsed: value };
      if (typeof value === 'number' && Number.isInteger(value)) return { ok: true, parsed: BigInt(value) };
      if (typeof value === 'string' && /^\s*-?\d+\s*$/.test(value)) {
        try {
          return { ok: true, parsed: BigInt(value.trim()) };
        } catch {
          return { ok: false, error: 'cannot parse bigint' };
        }
      }
      return { ok: false, error: `expected bigint, got ${typeof value}` };
    }

    case 'float':
    case 'double': {
      if (typeof value === 'number') return { ok: true, parsed: value };
      if (typeof value === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(value)) return { ok: true, parsed: parseFloat(value) };
      return { ok: false, error: `expected float, got ${typeof value}` };
    }

    case 'bool':
    case 'boolean': {
      if (typeof value === 'boolean') return { ok: true, parsed: value };
      if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (s === 'true' || s === 'false') return { ok: true, parsed: s === 'true' };
      }
      return { ok: false, error: `expected boolean, got ${typeof value}` };
    }

    case 'date': {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: true, parsed: value };
      if (value instanceof Date && !Number.isNaN(value.getTime())) return { ok: true, parsed: value.toISOString().slice(0, 10) };
      return { ok: false, error: `expected date(YYYY-MM-DD), got ${typeof value}` };
    }

    case 'datetime': {
      if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return { ok: true, parsed: value };
      if (value instanceof Date && !Number.isNaN(value.getTime())) return { ok: true, parsed: value.toISOString() };
      return { ok: false, error: `expected datetime (ISO), got ${typeof value}` };
    }

    case 'json': {
      const r = tryParseJSON(value);
      if (r.ok) return { ok: true, parsed: r.value };
      return { ok: false, error: `expected json, ${r.error}` };
    }

    case 'str':
    case 'string':
    default: {
      if (typeof value === 'string') return { ok: true, parsed: value };
      if (typeof value === 'number' || typeof value === 'boolean') return { ok: true, parsed: String(value) };
      return { ok: false, error: `expected string, got ${typeof value}` };
    }
  }
}

export async function fetchTableData(tableName: string): Promise<{
  types: ColumnTypesMap;
  rows: Row[];
  validation: ValidationResult[];
}> {
  const tablesUrl = import.meta.env.VITE_TABLES as string | undefined;
  const defaultBase = 'http://default-url.com/api/simulator';
  let base = defaultBase;

  if (tablesUrl && typeof tablesUrl === 'string') {
    base = tablesUrl.replace(/\/tables\/?$/i, '').replace(/\/+$/, '') || defaultBase;
  }

  const apiUrl = `${base}/table/${encodeURIComponent(tableName)}/data`;

  const res = await fetch(apiUrl, { method: 'GET', headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Failed to fetch table data: ${res.status} ${res.statusText}`);

  const data: TableDataResponse = await res.json();

  if (!Array.isArray(data.data) || data.data.length === 0) {
    throw new Error('Invalid response: data must be a non-empty array (first entry = types map)');
  }

  const typesEntry = data.data[0];
  if (!typesEntry || typeof typesEntry !== 'object' || Array.isArray(typesEntry)) {
    throw new Error('Invalid response: first data entry must be an object mapping column -> type');
  }

  const types: ColumnTypesMap = typesEntry as ColumnTypesMap;
  const rowsRaw = data.data.slice(1);

  const validation: ValidationResult[] = [];
  const parsedRows: Row[] = [];

  rowsRaw.forEach((rawRow, idx) => {
    const rowIndex = idx + 1;
    const errors: string[] = [];
    const parsedRow: Row = {};

    if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
      validation.push({ rowIndex, valid: false, errors: ['row is not an object'] });
      return;
    }

    for (const col of Object.keys(types)) {
      const expected = normalizeType(types[col]);
      const value = (rawRow as Row)[col];
      const r = validateAndParseValue(value, expected);
      if (!r.ok) {
        errors.push(`${col}: ${r.error ?? 'type mismatch'}`);
      } else {
        parsedRow[col] = r.parsed;
      }
    }

    for (const col of Object.keys(rawRow)) {
      if (!(col in types)) parsedRow[col] = (rawRow as Row)[col];
    }

    const valid = errors.length === 0;
    validation.push({ rowIndex, valid, errors, parsed: parsedRow });
    parsedRows.push(parsedRow);
  });

  return { types, rows: parsedRows, validation };
}