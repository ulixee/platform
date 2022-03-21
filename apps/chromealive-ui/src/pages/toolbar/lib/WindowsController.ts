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

let isFocused = false;
window.addEventListener('focus', () => (isFocused = true));
window.addEventListener('blur', () => (isFocused = false));

export default class WindowsController {
  static primaryMenu;
  static finderMenu;
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
      this.primaryMenu.hideMenu = () => {
        if (isFocused) return;
        this.hideMenuPrimary();
      };
    }
  }

  static hideMenuPrimary() {
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
      document.dispatchEvent(
        new CustomEvent('App:showChildWindow', {
          detail: { frameName },
        }),
      );
    } else {
      const features = `top=${top},left=${left},width=${400},height=${400}`;
      this.finderMenu = window.open('/menu-finder.html', frameName, features);
      this.finderMenu.hideMenu = () => {
        if (isFocused) return;
        this.hideMenuFinder();
      };
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
      const features = `top=${top},left=${left},width=${rect.width*2},height=${400}`;
      this.urlMenu = window.open('/menu-url.html', frameName, features);
      this.urlMenu.addEventListener('blur', () => this.hideMenuUrl())
      this.urlMenu.hideMenu = () => {
        if (isFocused) return;
        this.hideMenuUrl();
      };
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
