import Datastore, { Crawler, Function, Table } from '@ulixee/datastore';
import ILocationStringOrObject from "../interfaces/ILocationStringOrObject";
import ClientForDatastore from "./ClientForDatastore";
import ClientForFunction from './ClientForFunction';
import ClientForTable from './ClientForTable';
import ClientForCrawler from './ClientForCrawler';
import ClientForRemote from './ClientForRemote';

function Client(this: ClientForRemote, remote?: ILocationStringOrObject): void;
function Client<T extends Datastore>(this: ClientForDatastore<T>, datastore: T): void;
function Client<T extends Table>(this: ClientForTable<T>, table: T): void;
function Client<T extends Function>(this: ClientForFunction<T>, func: T): void;
function Client<T extends Crawler>(this: ClientForCrawler<T>, crawler: T): void;
function Client(
  this: ClientForRemote | ClientForDatastore<Datastore> | ClientForTable<Table> | ClientForFunction<Function> | ClientForCrawler<Crawler>, 
  object: ILocationStringOrObject | Datastore | Table | Function | Crawler
): void {
  if (object instanceof Datastore) {
    // @ts-ignore
    return new ClientForDatastore(object);
  }
  if (object instanceof Table) {
    // @ts-ignore
    return new ClientForTable(object);
  } 
  if (object instanceof Function) {
    // @ts-ignore
    return new ClientForFunction(object);
  } 
  if (object instanceof Crawler) {
    // @ts-ignore
    return new ClientForCrawler(object);
  }
  // @ts-ignore
  return new ClientForRemote(object);
}

export default Client;