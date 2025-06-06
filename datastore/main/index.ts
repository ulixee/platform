import '@ulixee/commons/lib/SourceMapSupport';
import Datastore from './lib/Datastore';
import ExtractorContext from './lib/ExtractorContext';
import { Observable } from './lib/ObjectObserver';
import { ExtractorPluginStatics } from './interfaces/IExtractorPluginStatics';
import IExtractorContext from './interfaces/IExtractorContext';
import IExtractorPlugin from './interfaces/IExtractorPlugin';
import IExtractorComponents from './interfaces/IExtractorComponents';
import IExtractorRunOptions from './interfaces/IExtractorRunOptions';
import IExtractorSchema, { ExtractorSchema } from './interfaces/IExtractorSchema';
import Table from './lib/Table';
import ConnectionToDatastoreCore from './connections/ConnectionToDatastoreCore';
import PassthroughExtractor from './lib/PassthroughExtractor';
import PassthroughTable from './lib/PassthroughTable';
import Extractor from './lib/Extractor';
import Crawler from './lib/Crawler';
import DefaultPaymentService from './payments/DefaultPaymentService';
import LocalchainWithSync from './payments/LocalchainWithSync';
import { IChannelHoldAllocationStrategy, IChannelHoldSource } from './payments/ArgonReserver';

export * as Schema from '@ulixee/schema';

export {
  Table,
  Datastore,
  Observable,
  ExtractorSchema,
  ExtractorContext,
  Extractor,
  Crawler,
  ConnectionToDatastoreCore,
  LocalchainWithSync,
  PassthroughExtractor,
  DefaultPaymentService,
  PassthroughTable,
  IChannelHoldAllocationStrategy,
  IChannelHoldSource,
  IExtractorComponents,
  IExtractorRunOptions,
  IExtractorSchema,
  ExtractorPluginStatics,
  IExtractorContext,
  IExtractorPlugin,
};

export default Datastore;
