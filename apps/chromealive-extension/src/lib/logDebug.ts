let isDebugEnabled = false;
export function enableDebugLogging(off = false) {
  isDebugEnabled = !off;
}

// @ts-ignore
// eslint-disable-next-line no-restricted-globals
self.enableDebugLogging = enableDebugLogging;

export default function logDebug(message: string, ...args: any[]) {
  if (isDebugEnabled) {
    // eslint-disable-next-line no-console
    console.log(message, ...args);
  }
}
