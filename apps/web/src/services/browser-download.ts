/**
 * Hands text to the browser as a file download: an object URL on a temporary, never-attached
 * link, clicked once and released straight away. The content never goes into a URL, the page or
 * any storage.
 */
export function saveTextFile(fileName: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
