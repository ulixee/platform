export function isInt(n: any): boolean {
  if (typeof n === 'string') return !n.includes('.');
  return n % 1 === 0;
}

export function addCommasToFloat(str: string): string {
  const arr = str.split('.');
  const int = arr[0];
  const dec = arr.length > 1 ? `.${arr[1]}` : '';
  const whole = int.replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const float = parseFloat(dec).toFixed(2).split('.')[1];
  return `${whole}.${float}`;
}

export function addCommasToInt(str: string): string {
  const arr = str.toString().split('.');
  const int = arr[0];
  return int.replace(/(\d)(?=(\d{3})+$)/g, '$1,');
}

export function addCommas(num: string): string {
  return isInt(num) ? addCommasToInt(num) : addCommasToFloat(num);
}

export function formatCurrency(num: string | number): string {
  return addCommas(Number(num).toFixed(5));
}

export function getCredit(): string | null {
  let authString: string | null = location.search.replace(/^\?/, '');
  if (authString) {
    localStorage.setItem('@ulixee/credit', authString);
  } else {
    authString = localStorage.getItem('@ulixee/credit');
  }
  return authString;
}
