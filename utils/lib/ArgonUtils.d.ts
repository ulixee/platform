export default class ArgonUtils {
    static ArgonSymbol: string;
    static MilligonsSymbol: string;
    static MicrogonsSymbol: string;
    static MilligonsPerArgon: bigint;
    static MicrogonsPerArgon: bigint;
    static MicrogonsPerMilligon: bigint;
    static parseUnits(units: string, output: 'milligons'): bigint;
    static parseUnits(units: string, output: 'microgons'): bigint;
    static parseUnits(units: string, output: 'argons'): bigint;
    static printArgons(argons: number): string;
    static format(value: number | bigint, fromUnits: 'milligons' | 'microgons' | 'argons', toUnits?: 'milligons' | 'microgons' | 'argons'): string;
    static microgonsToMilligons(microgons: number | bigint, floor?: boolean): bigint;
    static milligonsToMicrogons(milligons: number | bigint): number;
    private static microgonsToArgons;
    private static microgonsToRoundedArgons;
    private static milligonsToArgons;
    private static milligonsToRoundedArgons;
}
