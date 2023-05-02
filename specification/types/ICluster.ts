export default interface ICluster {
  leadNodeAddress?: URL;
  serviceAddresses?: {
    storageEngine: URL;
    cloudNodeLookups: URL;
  };
}
