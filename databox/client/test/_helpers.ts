import FullstackHero, { IHeroCreateOptions } from '@ulixee/hero-fullstack';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import IDataboxRunOptions from '../interfaces/IDataboxRunOptions';
import DataboxInternal from '../lib/DataboxInternal';

export const needsClosing: { close: () => Promise<any> | void; onlyCloseOnFinal?: boolean }[] = [];

export function afterEach(): Promise<void> {
  return closeAll(false);
}

export async function afterAll(): Promise<void> {
  await closeAll(true);
}

async function closeAll(isFinal = false): Promise<void> {
  const closeList = [...needsClosing];
  needsClosing.length = 0;

  await Promise.all(
    closeList.map(async (toClose, i) => {
      if (!toClose.close) {
        // eslint-disable-next-line no-console
        console.log('Error closing', { closeIndex: i });
        return;
      }
      if (toClose.onlyCloseOnFinal && !isFinal) {
        needsClosing.push(toClose);
        return;
      }

      try {
        await toClose.close();
      } catch (err) {
        if (err instanceof CanceledPromiseError) return;
        // eslint-disable-next-line no-console
        console.log('Error shutting down', err);
      }
    }),
  );
}

export function createFullstackDataboxInternal(
  options: IDataboxRunOptions = {},
): FullstackDataboxInternal {
  const databoxInternal = new FullstackDataboxInternal(options);
  needsClosing.push(databoxInternal);
  return databoxInternal;
}

export function onClose(
  closeFn: (() => Promise<any>) | (() => any),
  onlyCloseOnFinal = false,
): void {
  needsClosing.push({ close: closeFn, onlyCloseOnFinal });
}

class FullstackDataboxInternal extends DataboxInternal<any, any> {
  protected initializeHero(): void {
    const heroOptions: IHeroCreateOptions = {};
    for (const [key, value] of Object.entries(this.runOptions)) {
      heroOptions[key] = value;
    }
    this.hero = new FullstackHero(heroOptions);
  }
}
