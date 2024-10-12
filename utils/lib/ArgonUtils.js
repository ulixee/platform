"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ArgonUtils {
    static parseUnits(units, output) {
        if (!units.endsWith(this.MicrogonsSymbol) &&
            !units.endsWith('u') &&
            !units.endsWith(this.MilligonsSymbol) &&
            !units.endsWith('a')) {
            if (output === 'milligons')
                units += this.MilligonsSymbol;
            else
                units += this.MicrogonsSymbol;
        }
        let value = BigInt(units.substring(0, units.length - 1));
        if (output === 'microgons') {
            if (units.endsWith(this.MilligonsSymbol))
                value = BigInt(this.milligonsToMicrogons(value));
            if (units.endsWith('a'))
                value = this.microgonsToArgons(value);
            return value;
        }
        if (output === 'milligons') {
            if (units.endsWith(this.MicrogonsSymbol) || units.endsWith('u'))
                return this.microgonsToMilligons(value);
            if (units.endsWith('a'))
                return this.microgonsToArgons(value);
            return BigInt(value);
        }
        // else argons
        if (units.endsWith(this.MilligonsSymbol))
            return this.milligonsToArgons(value);
        if (units.endsWith(this.MicrogonsSymbol))
            return this.microgonsToArgons(value);
        return value;
    }
    static printArgons(argons) {
        let argonsb = argons;
        const prefix = argonsb < 0 ? '-' : '';
        if (argonsb < 0) {
            argonsb *= -1;
        }
        return `${prefix}${this.ArgonSymbol}${argonsb}`;
    }
    static format(value, fromUnits, toUnits) {
        if (typeof value === 'number') {
            value = BigInt(value);
        }
        if (fromUnits === 'microgons') {
            if (toUnits === 'argons' ||
                value % (this.MicrogonsPerMilligon * this.MilligonsPerArgon) === 0n) {
                const argons = this.microgonsToRoundedArgons(value);
                return this.printArgons(argons);
            }
            if (toUnits === 'milligons' || value % this.MicrogonsPerMilligon === 0n) {
                return `${this.microgonsToMilligons(value).toString()}${this.MilligonsSymbol}`;
            }
            return `${value}${this.MicrogonsSymbol}`;
        }
        if (fromUnits === 'milligons') {
            if (toUnits === 'argons' || value % this.MilligonsPerArgon === 0n) {
                const argons = this.milligonsToRoundedArgons(value);
                return this.printArgons(argons);
            }
            if (toUnits === 'microgons') {
                return `${this.milligonsToMicrogons(value)}${this.MicrogonsSymbol}`;
            }
            return `${value}${this.MilligonsSymbol}`;
        }
        // from argons
        if (toUnits === 'milligons') {
            const milligons = value * this.MilligonsPerArgon;
            return `${milligons}${this.MilligonsSymbol}`;
        }
        if (toUnits === 'microgons') {
            return `${value * this.MilligonsPerArgon * this.MicrogonsPerMilligon}${this.MicrogonsSymbol}`;
        }
        return this.printArgons(Number(value));
    }
    static microgonsToMilligons(microgons, floor = true) {
        if (typeof microgons === 'number') {
            if (!floor)
                microgons = BigInt(Math.ceil(microgons));
            // don't allow any extra precision
            else
                microgons = BigInt(Math.floor(microgons));
        }
        return microgons / this.MicrogonsPerMilligon;
    }
    static milligonsToMicrogons(milligons) {
        if (typeof milligons === 'number') {
            milligons = BigInt(milligons);
        }
        return Math.ceil(Number(milligons * this.MicrogonsPerMilligon));
    }
    static microgonsToArgons(microgons, floor = true) {
        if (typeof microgons === 'number') {
            if (!floor)
                microgons = BigInt(Math.ceil(microgons));
            // don't allow any extra precision
            else
                microgons = BigInt(Math.floor(microgons));
        }
        return microgons / this.MicrogonsPerMilligon / this.MilligonsPerArgon;
    }
    static microgonsToRoundedArgons(microgons) {
        return Math.round(Number(this.microgonsToArgons(BigInt(microgons) * 1000n))) / 1000;
    }
    static milligonsToArgons(milligons) {
        return milligons / this.MilligonsPerArgon;
    }
    static milligonsToRoundedArgons(milligons) {
        if (typeof milligons === 'number') {
            milligons = BigInt(milligons);
        }
        return Math.round(Number(this.milligonsToArgons(1000n * milligons))) / 1000;
    }
}
ArgonUtils.ArgonSymbol = '₳';
ArgonUtils.MilligonsSymbol = 'm';
ArgonUtils.MicrogonsSymbol = 'μ';
ArgonUtils.MilligonsPerArgon = 1000n;
ArgonUtils.MicrogonsPerArgon = 1000000n;
ArgonUtils.MicrogonsPerMilligon = 1000n;
exports.default = ArgonUtils;
//# sourceMappingURL=ArgonUtils.js.map