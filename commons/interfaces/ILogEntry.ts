export interface ILogEntry {
  id: number;
  timestamp: Date;
  action: string;
  module: string;
  sessionId?: string;
  parentId?: number;
  data?: any;
  level: LogLevel;
}
export type LogLevel = 'stats' | 'info' | 'warn' | 'error';
