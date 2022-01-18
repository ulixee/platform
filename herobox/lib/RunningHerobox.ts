import { RunningDatabox } from '@ulixee/databox';
import Hero, { IHeroCreateOptions } from '@ulixee/hero';
import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import ConnectionManager from '@ulixee/databox/lib/ConnectionManager';

export default class RunningHerobox extends RunningDatabox {
  public readonly hero: Hero;

  constructor(connectionManager: ConnectionManager, queryOptions: IDataboxRunOptions) {
    super(connectionManager, queryOptions);

    const heroOptions: IHeroCreateOptions = {};
    for (const [key, value] of Object.entries(queryOptions)) {
      heroOptions[key] = value;
    }

    heroOptions.connectionToCore = {
      host: this.host,
    };
    heroOptions.externalIds ??= {};
    heroOptions.externalIds.databoxSessionId = this.sessionId;

    const hero = new Hero(heroOptions);
    this.hero = hero;

    void hero.on('command', (command, commandId) => {
      this.lastExternalId = commandId;
    });

    this.beforeClose = () => hero.close();
    this.on('error', () => hero.close());
  }
}
