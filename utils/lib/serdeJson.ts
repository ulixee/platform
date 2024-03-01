export default function serdeJson(toSerialize: any): string {
  return JSON.stringify(toSerialize, (_name: string, value: unknown) => {
    if (Buffer.isBuffer(value)) {
      return `0x${value.toString('hex')}`;
    }
    // translate the pre-parsed Buffer to a hex string
    if (
      value &&
      typeof value === 'object' &&
      'type' in value &&
      'data' in value &&
      value.type === 'Buffer'
    ) {
      return `0x${Buffer.from(value.data as any).toString('hex')}`;
    }
    if (typeof value === 'bigint') {
      if (value > Number.MAX_SAFE_INTEGER) {
        return value.toString();
      }
      return Number(value);
    }
    return value;
  });
}
