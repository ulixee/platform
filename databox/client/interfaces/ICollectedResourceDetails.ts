import IResourceMeta from '@unblocked-web/emulator-spec/net/IResourceMeta';
import IWebsocketMessage from '@ulixee/hero-interfaces/IWebsocketMessage';

export default interface ICollectedResourceDetails extends Required<IResourceMeta>, IResponseBody {
  response: Required<IResourceMeta['response']> & IResponseBody;
  messages?: IWebsocketMessage[];
}

interface IResponseBody {
  text: string;
  json: any;
}
