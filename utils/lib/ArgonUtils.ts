export default class ArgonUtils {
  static ArgonSymbol = '₳';
  static MicrogonsSymbol = 'm';
  static MicrogonsPerArgon = 1000000n;

  static parseUnits(units: string, output: 'microgons'): bigint;
  static parseUnits(units: string, output: 'argons'): bigint;
  static parseUnits(units: string, output: 'microgons' | 'argons'): bigint {
    if (!units.endsWith(this.MicrogonsSymbol) && !units.endsWith('a')) {
      units += this.MicrogonsSymbol;
    }

    let value = BigInt(units.substring(0, units.length - 1));
    if (output === 'microgons') {
      if (units.endsWith('a')) value = this.microgonsToArgons(value);

      return value;
    }

    // else argons
    if (units.endsWith(this.MicrogonsSymbol)) return this.microgonsToArgons(value);

    return value;
  }

  static printArgons(argons: number): string {
    let argonsb = argons;
    const prefix = argonsb < 0 ? '-' : '';
    if (argonsb < 0) {
      argonsb *= -1;
    }
    return `${prefix}${this.ArgonSymbol}${argonsb}`;
  }

  static format(
    value: number | bigint,
    fromUnits: 'microgons' | 'argons',
    toUnits?: 'microgons' | 'argons',
  ): string {
    if (typeof value === 'number') {
      value = BigInt(value);
    }

    if (fromUnits === 'microgons') {
      if (toUnits === 'argons' || value % this.MicrogonsPerArgon === 0n) {
        const argons = this.microgonsToRoundedArgons(value);
        return this.printArgons(argons);
      }
      return `${value}${this.MicrogonsSymbol}`;
    }

    if (toUnits === 'microgons') {
      return `${value * this.MicrogonsPerArgon}${this.MicrogonsSymbol}`;
    }
    return this.printArgons(Number(value));
  }

  private static microgonsToArgons(microgons: number | bigint): bigint {
    if (typeof microgons === 'number') {
      microgons = BigInt(microgons);
    }

    return microgons / this.MicrogonsPerArgon;
  }

  private static microgonsToRoundedArgons(microgons: number | bigint): number {
    return Math.round(Number(this.microgonsToArgons(microgons) * 1000n)) / 1000;
  }
}
