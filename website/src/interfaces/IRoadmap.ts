export default interface IRoadmap {
  intro: string[];
  minorReleases: {
    [version: string]: IMinorRelease;
  };
  unversionedFeatures: {
    [key: string]: IUnversionedFeature;
  }
}

export interface IMinorRelease {
  version: string;
  heading: string;
  description: string;
  items: string[];
}

export interface IUnversionedFeature {
  heading: string;
  description: string;
  items: string[];
}