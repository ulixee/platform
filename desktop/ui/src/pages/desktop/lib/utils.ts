import ArgonUtils from '@ulixee/platform-utils/lib/ArgonUtils';

export function toArgons(amount: number | bigint, isMicrogons = false): string {
  return ArgonUtils.format(amount, isMicrogons ? 'microgons' : 'milligons', 'argons');
}
