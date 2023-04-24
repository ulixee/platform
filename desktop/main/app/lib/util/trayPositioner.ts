import { BrowserWindow, Display, Rectangle, screen } from 'electron';

export default {
  alignTrayMenu(trayWindow: BrowserWindow, trayBounds: Rectangle): void {
    if (process.platform === 'linux') {
      trayBounds = { width: 0, height: 0, ...screen.getCursorScreenPoint() };
    }

    const windowBounds = trayWindow.getBounds();
    const display = screen.getDisplayNearestPoint(trayBounds);

    let x: number;
    let y: number;
    if (display.workArea.y > display.bounds.y) {
      // bar is top,
      x = calculateXAlign(display, windowBounds, trayBounds);
      y = display.workArea.y;
    } else if (display.workArea.x > display.bounds.x) {
      // bar is left
      x = display.workArea.x;
      y = calculateYAlign(display, windowBounds, trayBounds);
    } else if (display.workArea.width === display.bounds.width) {
      // bar is bottom
      x = calculateXAlign(display, windowBounds, trayBounds);
      y = display.workArea.height - windowBounds.height;

      // windows 11 can jump into the workarea
      if (trayBounds.y < display.workArea.y + display.workArea.height) {
        y = trayBounds.y - windowBounds.height;
      }
    } else {
      // bar is right
      x = display.workArea.width - windowBounds.width;
      y = calculateYAlign(display, windowBounds, trayBounds);
    }
    y = Math.round(y);
    x = Math.round(x);

    trayWindow.setPosition(x, y);
  },
};

function calculateXAlign(display: Display, windowBounds: Rectangle, trayBounds: Rectangle): number {
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);

  // handle overflows
  if (x + windowBounds.width > display.bounds.width + display.bounds.x) {
    x = trayBounds.x + trayBounds.width - windowBounds.width;
  } else if (x < display.bounds.x) {
    x = trayBounds.x;
  }

  return x;
}

function calculateYAlign(display: Display, windowBounds: Rectangle, trayBounds: Rectangle): number {
  let y = trayBounds.y;

  // handle overflows
  if (y + windowBounds.height > display.bounds.height) {
    y = trayBounds.y + trayBounds.height - windowBounds.height;
  }

  return y;
}
