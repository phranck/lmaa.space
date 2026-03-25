/**
 * Triggers a browser download of the given data as a formatted JSON file.
 *
 * @param filename - The suggested filename including `.json` extension.
 * @param data - The value to serialize and download.
 */
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
