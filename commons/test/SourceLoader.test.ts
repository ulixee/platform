import { getCallSite } from '../lib/utils';
import SourceLoader from '../lib/SourceLoader';
import ISourceCodeLocation from '../interfaces/ISourceCodeLocation';

it('can lookup source code', function () {
  let callSite: ISourceCodeLocation[];
  // run code like this so we can see the true load (?? will be translated by typescript)
  function loadCallsite() {
    callSite ??= getCallSite();
    return callSite;
  }
  const site = loadCallsite();
  expect(SourceLoader.getSource(site[0]).code).toBe(`    callSite ??= getCallSite();`);
  expect(SourceLoader.getSource(site[1]).code).toBe(`  const site = loadCallsite();`);
});
