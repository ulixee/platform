import { app, Rectangle, BrowserWindow } from 'electron';
import * as Path from 'path';
import * as Fs from 'fs';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';

export default class WindowStateKeeper {
  public windowState: Rectangle & { isMaximized?: boolean } = {
    x: undefined,
    y: undefined,
    width: 1400,
    height: 800,
    isMaximized: false,
  };

  private readonly configPath: string;
  private events = new EventSubscriber();

  constructor(private windowName: string) {
    this.configPath = Path.join(app.getPath('userData'), `${windowName}.json`);

    if (Fs.existsSync(this.configPath)) {
      try {
        this.windowState = JSON.parse(Fs.readFileSync(this.configPath, 'utf8'));
      } catch {}
    }
  }

  public track(window: BrowserWindow): void {
    this.events.on(window, 'resize', this.save.bind(this, window));
    this.events.on(window, 'move', this.save.bind(this, window));
    this.events.once(window, 'close', this.save.bind(this, window));
    this.events.once(window, 'close', () => this.events.close());
  }

  save(window: BrowserWindow): void {
    if (!this.windowState.isMaximized) {
      this.windowState = window.getBounds();
    }
    this.windowState.isMaximized = window.isMaximized();
    Fs.writeFileSync(this.configPath, JSON.stringify(this.windowState));
  }
}
