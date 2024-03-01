export default class ArgonUtils {
  static ArgonSymbol = '₳';
  static MilligonsSymbol = 'm';
  static MicrogonsSymbol = 'μ';
  static MilligonsPerArgon = 1000n;
  static MicrogonsPerArgon = 1000000n;
  static MicrogonsPerMilligon = 1000n;

  static parseUnits(units: string, output: 'milligons'): bigint;
  static parseUnits(units: string, output: 'microgons'): bigint;
  static parseUnits(units: string, output: 'argons'): bigint;
  static parseUnits(units: string, output: 'milligons' | 'microgons' | 'argons'): bigint {
    if (
      !units.endsWith(this.MicrogonsSymbol) &&
      !units.endsWith('u') &&
      !units.endsWith(this.MilligonsSymbol) &&
      !units.endsWith('a')
    ) {
      if (output === 'milligons') units += this.MilligonsSymbol;
      else units += this.MicrogonsSymbol;
    }

    let value = BigInt(units.substring(0, units.length - 1));
    if (output === 'microgons') {
      if (units.endsWith(this.MilligonsSymbol)) value = BigInt(this.milligonsToMicrogons(value));
      if (units.endsWith('a')) value = this.microgonsToArgons(value);

      return value;
    }

    if (output === 'milligons') {
      if (units.endsWith(this.MicrogonsSymbol) || units.endsWith('u'))
        return this.microgonsToMilligons(value);
      if (units.endsWith('a')) return this.microgonsToArgons(value);
      return BigInt(value);
    }

    // else argons
    if (units.endsWith(this.MilligonsSymbol)) return this.milligonsToArgons(value);
    if (units.endsWith(this.MicrogonsSymbol)) return this.microgonsToArgons(value);

    return value;
  }

  static format(
    value: number | bigint,
    fromUnits: 'milligons' | 'microgons' | 'argons',
    toUnits?: 'milligons' | 'microgons' | 'argons',
  ): string {
    if (typeof value === 'number') {
      value = BigInt(value);
    }

    if (fromUnits === 'microgons') {
      if (
        toUnits === 'argons' ||
        value % (this.MicrogonsPerMilligon * this.MilligonsPerArgon) === 0n
      ) {
        return `${this.ArgonSymbol}${this.microgonsToRoundedArgons(value)}`;
      }
      if (toUnits === 'milligons' || value % this.MicrogonsPerMilligon === 0n) {
        return `${this.microgonsToMilligons(value).toString()}${this.MilligonsSymbol}`;
      }
      return `${value}${this.MicrogonsSymbol}`;
    }

    if (fromUnits === 'milligons') {
      if (toUnits === 'argons' || value % this.MilligonsPerArgon === 0n) {
        return `${this.ArgonSymbol}${this.milligonsToRoundedArgons(value)}`;
      }
      if (toUnits === 'microgons') {
        return `${this.milligonsToMicrogons(value)}${this.MicrogonsSymbol}`;
      }
      return `${value}${this.MilligonsSymbol}`;
    }

    // from argons

    if (toUnits === 'milligons') {
      return `${this.ArgonSymbol}${value * this.MilligonsPerArgon}`;
    }
    if (toUnits === 'microgons') {
      return `${value * this.MilligonsPerArgon * this.MicrogonsPerMilligon}${this.MicrogonsSymbol}`;
    }
    return `${this.ArgonSymbol}${value}`;
  }

  public static microgonsToMilligons(microgons: number | bigint, floor = true): bigint {
    if (typeof microgons === 'number') {
      if (!floor) microgons = BigInt(Math.ceil(microgons));
      // don't allow any extra precision
      else microgons = BigInt(Math.floor(microgons));
    }

    return microgons / this.MicrogonsPerMilligon;
  }

  public static milligonsToMicrogons(milligons: number | bigint): number {
    if (typeof milligons === 'number') {
      milligons = BigInt(milligons);
    }
    return Math.ceil(Number(milligons * this.MicrogonsPerMilligon));
  }

  private static microgonsToArgons(microgons: number | bigint, floor = true): bigint {
    if (typeof microgons === 'number') {
      if (!floor) microgons = BigInt(Math.ceil(microgons));
      // don't allow any extra precision
      else microgons = BigInt(Math.floor(microgons));
    }

    return microgons / this.MicrogonsPerMilligon / this.MilligonsPerArgon;
  }

  private static microgonsToRoundedArgons(microgons: number | bigint): number {
    return Math.round(Number(this.microgonsToArgons(BigInt(microgons) * 1000n))) / 1000;
  }

  private static milligonsToArgons(milligons: bigint): bigint {
    return milligons / this.MilligonsPerArgon;
  }

  private static milligonsToRoundedArgons(milligons: number | bigint): number {
    if (typeof milligons === 'number') {
      milligons = BigInt(milligons);
    }
    return Math.round(1000 * Number(this.milligonsToArgons(milligons))) / 1000;
  }
}
