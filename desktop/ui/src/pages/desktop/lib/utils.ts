import ArgonUtils from '@ulixee/platform-utils/lib/ArgonUtils';

export function toArgons(amount: number | bigint, isMicrogons = false): string {
  if (amount === null || amount === undefined) return `${ArgonUtils.ArgonSymbol}0`;
  return ArgonUtils.format(amount, isMicrogons ? 'microgons' : 'milligons', 'argons');
}

export function titleCase(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDate(date: Date | number): string {
  if (!date) return 'now';
  if (typeof date === 'number') date = new Date(date);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
}
