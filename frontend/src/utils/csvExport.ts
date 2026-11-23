export function downloadCsvFile(csvContent: string, filename: string): void {
  const safeName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const payload = csvContent.startsWith('\uFEFF') ? csvContent : `\uFEFF${csvContent}`;
  const blob = new Blob([payload], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1500);
}
