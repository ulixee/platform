import * as Fs from 'fs';
import { rootDir } from '../paths';

const AgentEnv = Fs.readFileSync(require.resolve('@unblocked-web/agent/.env.defaults'), 'utf8');
const MitmEnv = Fs.readFileSync(require.resolve('@unblocked-web/agent-mitm/.env.defaults'), 'utf8');
const HeroEnv = Fs.readFileSync(
  require.resolve('@ulixee/hero-core').replace(/index.*js/, '.env.defaults'),
  'utf8',
);
const DataboxEnv = Fs.readFileSync(
  require.resolve('@ulixee/databox-core').replace(/index.*js/, '.env.defaults'),
  'utf8',
);
const ServerEnv = Fs.readFileSync(
  require.resolve('@ulixee/server').replace(/index.*js/, `.env.server.defaults`),
  'utf8',
);

Fs.writeFileSync(
  `${rootDir}/.env.defaults`,
  clean(`## AUTOGENERATED ROLLUP OF ULIXEE ENV VARIABLES

### DO NOT EDIT THIS FILE.

## Server
${ServerEnv}
## Databox
${DataboxEnv}
## Hero
${HeroEnv}
## Agent
${AgentEnv}
## Mitm
${MitmEnv}`),
);

function clean(env: string): string {
  return env
    .replace(/\n## Sub-tool env settings\n/g, '')
    .replace(/# @ulixee.*\n/g, '')
    .replace(/# @unblocked-web.*\n/g, '');
}