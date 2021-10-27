import Client from '../api/Client';

const cacheBySessionId: { [sessionId: string]: { [timestamp: number]: string } } = {};

export function process(
  heroSessionId: string,
  screenshot: { tabId: number; timestamp: number },
): void {
  cacheBySessionId[heroSessionId] ??= {};

  const { timestamp, tabId } = screenshot;

  if (cacheBySessionId[heroSessionId][timestamp] !== undefined) return;

  // placeholder while retrieving
  cacheBySessionId[heroSessionId][timestamp] = null;

  Client.send('Session.getScreenshot', {
    timestamp,
    heroSessionId,
    tabId,
  })
    .then(x => {
      // eslint-disable-next-line promise/always-return
      if (x.imageBase64) {
        cacheBySessionId[heroSessionId][timestamp] = x.imageBase64;
      } else {
        cacheBySessionId[heroSessionId][timestamp] = undefined;
      }
    })
    .catch(console.error);
}

export function get(heroSessionId: string, tabId: number, timestamp: number): string {
  cacheBySessionId[heroSessionId] ??= {};
  return cacheBySessionId[heroSessionId][timestamp];
}

export function closest(heroSessionId: string, timestamp: number): string {
  let closestDiff: number = timestamp;
  let imageBase64: string;
  if (!cacheBySessionId[heroSessionId]) return null;
  for (const [time, image] of Object.entries(cacheBySessionId[heroSessionId])) {
    if (image) {
      const screenshotTime = Number(time);
      const diff = Math.abs(timestamp - screenshotTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        imageBase64 = image;
      }
    }
  }
  return imageBase64;
}

export function latest(heroSessionId: string): string {
  if (!cacheBySessionId[heroSessionId]) return null;
  const images = Object.values(cacheBySessionId[heroSessionId]);
  for (let i = images.length - 1; i >= 0; i -= 1) {
    if (images[i]) return images[i];
  }
}
