import { readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import { getCacheDirectory } from '@ulixee/commons/lib/dirUtils';
import { IPayment } from '@ulixee/specification';

export default class CreditsStore {
  public static storePath = `${getCacheDirectory()}/ulixee/credits.json`;

  private static creditsByDatastore: Promise<ICreditsStore>;

  public static async store(
    datastoreVersionHash: string,
    credits: { id: string; secret: string; remainingCredits: number },
  ): Promise<void> {
    const allCredits = await this.load();
    allCredits[datastoreVersionHash] ??= {};
    allCredits[datastoreVersionHash][credits.id] = credits;
    await this.writeToDisk(allCredits);
  }

  public static async getPayment(
    datastoreVersionHash: string,
    microgons: number,
  ): Promise<
    (IPayment & { onFinalized(result: { microgons: number; bytes: number }): void }) | undefined
  > {
    const credits = await this.load();
    const datastoreCredits = credits[datastoreVersionHash];
    if (!datastoreCredits) return;

    for (const [creditId, credit] of Object.entries(datastoreCredits)) {
      if (credit.remainingCredits >= microgons) {
        credit.remainingCredits -= microgons;
        return {
          credits: { id: creditId, secret: credit.secret },
          onFinalized: this.finalizePayment.bind(this, credit, microgons),
        };
      }
    }
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
  [versionHost: string]: { [creditsId: string]: { secret: string; remainingCredits: number } };
}
