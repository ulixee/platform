import mitt, { Emitter } from 'mitt';

export enum EmitterName {
  showMenuPrimary = 'showMenuPrimary',
  hideMenuPrimary = 'hideMenuPrimary',
  showMenuFinder = 'showMenuFinder',
  hideMenuFinder = 'hideMenuFinder',
  showMenuUrl = 'showMenuUrl',
  hideMenuUrl = 'hideMenuUrl',
}

type IEmitterEvents = {
  [EmitterName.showMenuPrimary]: DOMRect;
  [EmitterName.hideMenuPrimary]: void;
  [EmitterName.showMenuFinder]: DOMRect;
  [EmitterName.hideMenuFinder]: void;
  [EmitterName.showMenuUrl]: DOMRect;
  [EmitterName.hideMenuUrl]: void;
};

const windowsControllerEmitter: Emitter<IEmitterEvents> = mitt<IEmitterEvents>();

export default class WindowsController {
  static primaryMenu;
  static finderMenu: Window;
  static urlMenu;

  static showMenuPrimary(rect: DOMRect) {
    const frameName = 'MenuPrimary';
    const left = rect.x + window.screenLeft - 10;
    const top = rect.y + rect.height + window.screenTop - 5;
    if (this.primaryMenu) {
      document.dispatchEvent(
        new CustomEvent('App:showChildWindow', {
          detail: { frameName },
        }),
      );
    } else {
      const features = `top=${top},left=${left},width=${380},height=${228}`;
      this.primaryMenu = window.open('/menu-primary.html', frameName, features);
      this.primaryMenu.addEventListener('blur', () => {
        this.hideMenuPrimary();
      });
      this.primaryMenu.addEventListener('close', () => {
        this.primaryMenu = null;
      });
    }
  }

  static hideMenuPrimary() {
    if (!this.primaryMenu) return;

    const frameName = 'MenuPrimary';
    document.dispatchEvent(
      new CustomEvent('App:hideChildWindow', {
        detail: { frameName },
      }),
    );
    windowsControllerEmitter.emit(EmitterName.hideMenuPrimary);
  }

  static showMenuFinder(rect: DOMRect) {
    const frameName = 'MenuFinder';
    const left = rect.x + window.screenLeft - 10;
    const top = rect.y + rect.height + window.screenTop - 5;
    if (this.finderMenu) {
      this.finderMenu.moveTo(left, top);
      document.dispatchEvent(
        new CustomEvent('App:showChildWindow', {
          detail: { frameName },
        }),
      );
    } else {
      const features = `top=${top},left=${left},width=${400},height=${400}`;
      this.finderMenu = window.open('/menu-finder.html', frameName, features);
      this.finderMenu.addEventListener('manual-close', () => {
        this.finderMenu = null;
        windowsControllerEmitter.emit(EmitterName.hideMenuFinder);
      });
      this.finderMenu.addEventListener('close', () => {
        this.finderMenu = null;
        windowsControllerEmitter.emit(EmitterName.hideMenuFinder);
      });
    }
  }

  static hideMenuFinder() {
    const frameName = 'MenuFinder';
    document.dispatchEvent(
      new CustomEvent('App:hideChildWindow', {
        detail: { frameName },
      }),
    );
    windowsControllerEmitter.emit(EmitterName.hideMenuFinder);
  }

  static showMenuUrl(rect: DOMRect) {
    const frameName = 'MenuUrl';
    const left = rect.x + window.screenLeft - 10;
    const top = rect.y + rect.height + window.screenTop - 5;
    if (this.urlMenu) {
      document.dispatchEvent(
        new CustomEvent('App:showChildWindow', {
          detail: { frameName },
        }),
      );
    } else {
      const features = `top=${top},left=${left},width=${rect.width * 2},height=${400}`;
      this.urlMenu = window.open('/menu-url.html', frameName, features);
      this.urlMenu.addEventListener('blur', () => {
        this.hideMenuUrl();
      });
      this.urlMenu.addEventListener('close', () => {
        this.urlMenu = null;
      });
    }
  }

  static hideMenuUrl() {
    const frameName = 'MenuUrl';
    document.dispatchEvent(
      new CustomEvent('App:hideChildWindow', {
        detail: { frameName },
      }),
    );
    windowsControllerEmitter.emit(EmitterName.hideMenuUrl);
  }

  static on(eventName: EmitterName, callback: () => void) {
    windowsControllerEmitter.on(eventName, callback);
  }

  static off(eventName: EmitterName, callback: () => void) {
    windowsControllerEmitter.off(eventName, callback);
  }
}
