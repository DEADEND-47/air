const titleize = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, (char) => char.toUpperCase());

export function rowsToDelimited(rows: Array<Record<string, unknown>>, delimiter = ',') {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value == null ? '' : String(value);
    return delimiter === ',' && /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers.map(titleize).join(delimiter), ...rows.map((row) => headers.map((header) => escape(row[header])).join(delimiter))].join('\n');
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const csv = rowsToDelimited(rows, ',');
  if (!csv) return;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function copyRowsToClipboard(rows: Array<Record<string, unknown>>) {
  const text = rowsToDelimited(rows, '\t');
  if (!text) return false;
  await navigator.clipboard.writeText(text);
  return true;
}
