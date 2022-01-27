import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';

export default class CollectedResources {
  constructor(private readonly getResources: (name: string) => Promise<ICollectedResource[]>) {}

  async get(name: string): Promise<ICollectedResource> {
    const resources = await this.getResources(name);
    if (resources.length) return resources[0];
    return null;
  }

  getAll(name: string): Promise<ICollectedResource[]> {
    return this.getResources(name);
  }
}
