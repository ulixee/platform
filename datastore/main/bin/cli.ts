#!/usr/bin/env node

import '@ulixee/commons/lib/SourceMapSupport';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import cli from '../cli';

// Required to capture signals. Something is trapping them if not registered before the cli runs
ShutdownHandler.registerSignals();

cli().name('@ulixee/datastore').parseAsync().catch(console.error);
