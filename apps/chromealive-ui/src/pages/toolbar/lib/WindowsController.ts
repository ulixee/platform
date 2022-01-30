import mitt, { Emitter } from 'mitt';

export enum EmitterName {
  showMenu = 'showMenu',
  hideMenu = 'hideMenu',
  showFinder = 'showFinder',
  hideFinder = 'hideFinder',
}

type IEmitterEvents = {
  [EmitterName.showMenu]: DOMRect,
  [EmitterName.hideMenu]: void,
  [EmitterName.showFinder]: DOMRect,
  [EmitterName.hideFinder]: void,
}

const emitter: Emitter<IEmitterEvents> = mitt<IEmitterEvents>();

let isFocused = false;
window.addEventListener('focus', () => isFocused = true);
window.addEventListener('blur', () => isFocused = false);

export default class WindowsController {
  static primaryMenu;
  static finderMenu;

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
      const features = `top=${top},left=${left},width=${260},height=${161}`;
      this.primaryMenu = window.open('/menu-primary.html', frameName, features);
      this.primaryMenu.hideMenu = () => {
        if (isFocused) return;
        this.hideMenuPrimary();
      }
    }
  }

  static hideMenuPrimary() {
    const frameName = 'MenuPrimary';
    document.dispatchEvent(
      new CustomEvent('App:hideChildWindow', {
        detail: { frameName },
      }),
    );
    emitter.emit(EmitterName.hideMenu);
  }

  static showFinder(rect: DOMRect) {
    const frameName = 'Finder';
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
      this.finderMenu = window.open('/finder.html', frameName, features);
      this.finderMenu.hideMenu = () => {
        if (isFocused) return;
        this.hideFinder();
      }
    }
  }

  static hideFinder() {
    const frameName = 'Finder';
    document.dispatchEvent(
      new CustomEvent('App:hideChildWindow', {
        detail: { frameName },
      }),
    );
    emitter.emit(EmitterName.hideFinder);
  }

  static on(eventName: EmitterName, callback: () => void) {
    emitter.on(eventName, callback);
  }

  static off(eventName: EmitterName, callback: () => void) {
    emitter.off(eventName, callback);
  }
}
