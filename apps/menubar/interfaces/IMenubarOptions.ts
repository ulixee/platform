export default interface IMenubarOptions {
  tooltip: string;
  width: number;
  height: number;
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
