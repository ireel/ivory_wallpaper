import { getNativeBridge } from '../hooks/useNativeBridge';

export type FrontendLogLevel = 'debug' | 'info' | 'warn' | 'error';

export function reportFrontendLog(level: FrontendLogLevel, message: string, detail?: unknown) {
  const context = serializeDetail(detail);
  const consoleMethod = level === 'debug' ? 'debug' : level;
  console[consoleMethod](message, detail ?? '');

  const bridge = getNativeBridge();
  if (bridge.available) {
    void bridge.invoke('logFrontend', { level, message, context }).catch(() => {});
  }
}

function serializeDetail(detail: unknown): string {
  if (detail instanceof Error) return detail.stack || detail.message;
  if (typeof detail === 'string') return detail;
  if (detail === undefined) return '';
  try {
    return JSON.stringify(detail).slice(0, 4000);
  } catch {
    return String(detail);
  }
}
