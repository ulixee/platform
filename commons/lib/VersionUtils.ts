import semver = require('semver/preload');

export function isSemverSatisfied(version: string, isSatisfiedByVersion: string): boolean {
  return semver.satisfies(isSatisfiedByVersion, `~${version}`, { includePrerelease: true });
}
