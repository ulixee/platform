export function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function bigintRound(value: bigint, precision: number): bigint {
  const factor = BigInt(10) ** BigInt(precision);
  return (value + factor / BigInt(2)) / factor;
}
