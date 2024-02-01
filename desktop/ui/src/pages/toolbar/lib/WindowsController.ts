import * as Vue from 'vue';

export default class WindowsController {
  public static get isShowingFinder(): boolean {
    return this._isShowingFinderRef.value;
  }

  public static get isShowingUrlMenu(): boolean {
    return this._isShowingUrlMenuRef.value;
  }

  public static get isShowingPrimaryMenu(): boolean {
    return this._isShowingPrimaryRef.value;
  }

  static _isShowingFinderRef = Vue.ref(false);
  static _isShowingUrlMenuRef = Vue.ref(false);
  static _isShowingPrimaryRef = Vue.ref(false);

  private static lastFinderFrameName: string;
  private static lastUrlFrameName: string;
  private static lastPrimaryFrameName: string;

  static showMenuPrimary(rect: DOMRect) {
    if (this._isShowingPrimaryRef.value === true) return;
    this._isShowingPrimaryRef.value = true;

    // frame names have to be unique across windows in electron
    this.lastPrimaryFrameName = `MenuPrimary${Date.now()}`;
    const left = rect.x + window.screenLeft - 10;
    const top = rect.y + rect.height + window.screenTop - 5;
    const features = `top=${top},left=${left},width=${380},height=${245}`;
    const primaryMenu = window.open('/menu-primary.html', this.lastPrimaryFrameName, features);

    const onClose = this.hideMenu.bind(this, this.lastPrimaryFrameName, this._isShowingPrimaryRef);
    primaryMenu.addEventListener('blur', onClose);
    primaryMenu.addEventListener('manual-close', onClose);
    primaryMenu.addEventListener('close', onClose);
  }

  static hideMenuPrimary() {
    this.hideMenu(this.lastPrimaryFrameName, this._isShowingPrimaryRef);
  }

  static showMenuFinder(rect: DOMRect) {
    console.log('on MenuFinder hide. already showing?', this._isShowingFinderRef.value);
    if (this._isShowingFinderRef.value === true) return;
    this._isShowingFinderRef.value = true;

    // frame names have to be unique across windows in electron
    this.lastFinderFrameName = `MenuFinder${Date.now()}`;
    const left = rect.x + window.screenLeft - 10;
    const top = rect.y + rect.height + window.screenTop - 5;

    const features = `top=${top},left=${left},width=${400},height=${400}`;
    const finderMenu = window.open('/menu-finder.html', this.lastFinderFrameName, features);

    const onClose = this.hideMenu.bind(this, this.lastFinderFrameName, this._isShowingFinderRef);
    finderMenu.addEventListener('manual-close', onClose);
    finderMenu.addEventListener('close', onClose);
  }

  static hideMenuFinder() {
    this.hideMenu(this.lastFinderFrameName, this._isShowingFinderRef);
  }

  static showMenuUrl(rect: DOMRect) {
    console.log('on showMenuUrl. already showing?', this._isShowingUrlMenuRef.value);
    if (this._isShowingUrlMenuRef.value === true) return;
    this._isShowingUrlMenuRef.value = true;

    this.lastUrlFrameName = `MenuUrl${Date.now()}`;
    const left = rect.x + window.screenLeft - 10;
    const top = rect.y + rect.height + window.screenTop - 5;

    const features = `top=${top},left=${left},width=${rect.width * 2},height=${400}`;
    const urlMenu = window.open('/menu-url.html', this.lastUrlFrameName, features);

    const onClose = this.hideMenu.bind(this, this.lastUrlFrameName, this._isShowingUrlMenuRef);
    urlMenu.addEventListener('blur', onClose);
    urlMenu.addEventListener('manual-close', onClose);
    urlMenu.addEventListener('close', onClose);
  }

  static hideMenuUrl() {
    this.hideMenu(this.lastUrlFrameName, this._isShowingUrlMenuRef);
  }

  private static hideMenu(frameName: string, toggleRef: Vue.Ref<boolean>) {
    console.log('on hide menu. already hidden?', frameName, !toggleRef.value);

    if (toggleRef.value === false) return;
    toggleRef.value = false;

    document.dispatchEvent(
      new CustomEvent('App:hideChildWindow', {
        detail: { frameName },
      }),
    );
  }
}
