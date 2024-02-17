import ArgonUtils from '@ulixee/platform-utils/lib/ArgonUtils';

export function toArgons(amount: number, isMicrogons = false): string {
  let centagons = amount;
  if (isMicrogons) {
    centagons = Number(ArgonUtils.microgonsToCentagons(amount));
  }
  centagons = Number(centagons) / 100;
  return `₳${centagons.toFixed(2)}`;
}
