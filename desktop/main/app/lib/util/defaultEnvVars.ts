import { app } from 'electron';

if (app.isPackaged) {
  process.env.DEBUG = [process.env.DEBUG ?? '', 'ulx:*'].filter(Boolean).join(',');
  process.env.NODE_DISABLE_COLORS = 'true';
}
