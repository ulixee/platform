export default function humanizeBytes(bytes: number): string {
  if (!bytes) return '0KB';

  if (bytes < 500) {
    return `${bytes}B`;
  }

  const kb = bytes / 1000;

  if (kb > 1000) {
    const mb = kb / 1000;
    return `${Math.round(mb * 10) / 10}MB`;
  }
  return `${Math.round(kb * 10) / 10}KB`;
}
