export default interface IMenubarOptions {
  tooltip: string;
  width: number;
  height: number;
  iconPath: string;
  vueDistPath: string;
  windowPosition?:
    | 'trayLeft'
    | 'trayBottomLeft'
    | 'trayRight'
    | 'trayBottomRight'
    | 'trayCenter'
    | 'trayBottomCenter'
    | 'topLeft'
    | 'topRight'
    | 'bottomLeft'
    | 'bottomRight'
    | 'topCenter'
    | 'bottomCenter'
    | 'leftCenter'
    | 'rightCenter'
    | 'center';
}
