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

const emitter: Emitter<IEmitterEvents> = mitt<IEmitterEvents>();

export default class WindowsController {
  static primaryMenu;
  static finderMenu: Window;
  static showingFinderMenuTimestamp: number;
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
    emitter.emit(EmitterName.hideMenuPrimary);
  }

  static showMenuFinder(rect: DOMRect) {
    const frameName = 'MenuFinder';
    const left = rect.x + window.screenLeft - 10;
    const top = rect.y + rect.height + window.screenTop - 5;
    if (this.finderMenu) {
      this.finderMenu.moveTo(left, top);
      this.showingFinderMenuTimestamp = Date.now();
      document.dispatchEvent(
        new CustomEvent('App:showChildWindow', {
          detail: { frameName },
        }),
      );
    } else {
      const features = `top=${top},left=${left},width=${400},height=${400}`;
      this.showingFinderMenuTimestamp = Date.now();
      this.finderMenu = window.open('/menu-finder.html', frameName, features);
      this.finderMenu.addEventListener('blur', () => {
        if (Date.now() - this.showingFinderMenuTimestamp < 500) return;
        window.focus();
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
    emitter.emit(EmitterName.hideMenuFinder);
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
    }
  }

  static hideMenuUrl() {
    const frameName = 'MenuUrl';
    document.dispatchEvent(
      new CustomEvent('App:hideChildWindow', {
        detail: { frameName },
      }),
    );
    emitter.emit(EmitterName.hideMenuUrl);
  }

  static on(eventName: EmitterName, callback: () => void) {
    emitter.on(eventName, callback);
  }

  static off(eventName: EmitterName, callback: () => void) {
    emitter.off(eventName, callback);
  }
}
