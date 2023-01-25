import '@ulixee/commons/lib/SourceMapSupport';
import Datastore from './lib/Datastore';
import FunctionContext from './lib/FunctionContext';
import { Observable } from './lib/ObjectObserver';
import { FunctionPluginStatics } from './interfaces/IFunctionPluginStatics';
import IFunctionContext from './interfaces/IFunctionContext';
import IFunctionPlugin from './interfaces/IFunctionPlugin';
import IFunctionComponents from './interfaces/IFunctionComponents';
import IFunctionExecOptions from './interfaces/IFunctionExecOptions';
import IFunctionSchema, { FunctionSchema } from './interfaces/IFunctionSchema';
import Table from './lib/Table';
import ConnectionToDatastoreCore from './connections/ConnectionToDatastoreCore';
import PassthroughFunction from './lib/PassthroughFunction';
import PassthroughTable from './lib/PassthroughTable';
import Function from './lib/Function';
import Crawler from './lib/Crawler';
import Autorun from './lib/utils/Autorun';

export * as Schema from '@ulixee/schema';

export {
  Table,
  Datastore,
  Observable,
  FunctionSchema,
  FunctionContext,
  Function,
  Crawler,
  ConnectionToDatastoreCore,
  PassthroughFunction,
  PassthroughTable,
  IFunctionComponents,
  IFunctionExecOptions,
  IFunctionSchema,
  FunctionPluginStatics,
  IFunctionContext,
  IFunctionPlugin,
};

Autorun.setupAutorunBeforeExitHook(require.main);

export default Datastore;
