import ICoreRequestPayload from './ICoreRequestPayload';
import ICoreResponsePayload from './ICoreResponsePayload';
import ICoreConnectionEventPayload from './ICoreConnectionEventPayload';
import ISessionCreateOptions from './ISessionCreateOptions';
import ICoreSession from './ICoreSession';

export default interface IConnectionToCore {
  connect(): Promise<Error | null>;
  disconnect(fatalError?: Error): Promise<void>;
  willDisconnect(): void;
  sendRequest(
    payload: Omit<ICoreRequestPayload, 'messageId' | 'sendDate'>,
  ): Promise<ICoreResponsePayload>
  onMessage(
    payload: ICoreResponsePayload | ICoreConnectionEventPayload,
  ): void
  createSession(options: ISessionCreateOptions): Promise<ICoreSession>
  getSession(sessionId: string): ICoreSession
  closeSession(coreSession: ICoreSession): void
  logUnhandledError(error: Error): Promise<void>
}
