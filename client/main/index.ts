import Client from './lib/Client';
import ClientForDatastore from './lib/ClientForDatastore';
import ClientForTable from './lib/ClientForTable';
import ClientForFunction from './lib/ClientForFunction';
import ClientForCrawler from './lib/ClientForCrawler';
import { IInputFilter, IOutputSchema } from './interfaces/IInputOutput';

export default Client;
export {
  ClientForDatastore,
  ClientForTable,
  ClientForFunction,
  ClientForCrawler,
  IOutputSchema,
  IInputFilter,
}