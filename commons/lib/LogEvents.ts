import { ILogEntry } from '../interfaces/ILogEntry';

let idCounter = 0;
export class LogEvents {
  private static subscriptions: { [id: number]: (log: ILogEntry) => any } = {};

  public static unsubscribe(subscriptionId: number): void {
    delete LogEvents.subscriptions[subscriptionId];
  }

  public static subscribe(onLogFn: (log: ILogEntry) => any): number {
    idCounter += 1;
    const id = idCounter;
    LogEvents.subscriptions[id] = onLogFn;
    return id;
  }

  public static broadcast(entry: ILogEntry): void {
    Object.values(LogEvents.subscriptions).forEach(x => x(entry));
  }
}
