import { getDataDirectory } from '@ulixee/commons/lib/dirUtils';
import { readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import { IPayment } from '@ulixee/platform-specification';

export default class CreditsStore {
  public static storePath = `${getDataDirectory()}/ulixee/credits.json`;

  private static creditsByDatastore: Promise<ICreditsStore>;

  public static async storeFromUrl(url: string, microgons: number): Promise<void> {
    const datastoreURL = new URL(url);
    datastoreURL.protocol = 'ws:';
    const [datastoreId, version] = datastoreURL.pathname.slice(1).split('/');
    await this.store(datastoreId, version, datastoreURL.host, {
      id: datastoreURL.username,
      secret: datastoreURL.password,
      remainingCredits: microgons,
    });
  }

  public static async store(
    datastoreId: string,
    datastoreVersion: string,
    host: string,
    credits: { id: string; secret: string; remainingCredits: number },
  ): Promise<void> {
    const allCredits = await this.load();
    const key = `${datastoreId}__${datastoreVersion}`;
    allCredits[key] ??= {};
    allCredits[key][credits.id] = {
      ...credits,
      host,
      allocated: credits.remainingCredits,
    };
    await this.writeToDisk(allCredits);
  }

  public static async getPayment(
    datastoreId: string,
    datastoreVersion: string,
    microgons: number,
  ): Promise<
    (IPayment & { onFinalized(result: { microgons: number; bytes: number }): void }) | undefined
  > {
    const credits = await this.load();
    const datastoreCredits = credits[`${datastoreId}__${datastoreVersion}`];
    if (!datastoreCredits) return;

    for (const [creditId, credit] of Object.entries(datastoreCredits)) {
      if (credit.remainingCredits >= microgons) {
        credit.remainingCredits -= microgons;
        return {
          credits: { id: creditId, secret: credit.secret },
          onFinalized: this.finalizePayment.bind(this, microgons, credit),
        };
      }
    }
  }

  public static async asList(): Promise<ICredit[]> {
    const allCredits = await this.load();
    const credits: ICredit[] = [];
    for (const [key, credit] of Object.entries(allCredits)) {
      const [datastoreId, datastoreVersion] = key.split('__');
      const [creditsId, entry] = Object.entries(credit)[0];
      credits.push({
        datastoreId,
        datastoreVersion,
        host: entry.host,
        remainingBalance: entry.remainingCredits,
        allocated: entry.allocated,
        creditsId,
      });
    }
    return credits;
  }

  protected static finalizePayment(
    originalMicrogons: number,
    credits: ICreditsStore[0][0],
    result: { microgons: number; bytes: number },
  ): void {
    if (!result) return;
    const fundsToReturn = originalMicrogons - result.microgons;
    if (fundsToReturn && Number.isInteger(fundsToReturn)) {
      credits.remainingCredits += fundsToReturn;
    }
  }

  private static async load(): Promise<ICreditsStore> {
    this.creditsByDatastore ??= readFileAsJson<ICreditsStore>(this.storePath).catch(() => ({}));
    return (await this.creditsByDatastore) ?? {};
  }

  private static writeToDisk(data: any): Promise<void> {
    return safeOverwriteFile(this.storePath, JSON.stringify(data));
  }
}

interface ICreditsStore {
  [datastoreId_Version: string]: {
    [creditsId: string]: {
      secret: string;
      host: string;
      remainingCredits: number;
      allocated: number;
    };
  };
}
export type ICredit = {
  datastoreId: string;
  datastoreVersion: string;
  remainingBalance: number;
  allocated: number;
  creditsId: string;
  host: string;
};
