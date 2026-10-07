export function isJavascriptEnabled(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof Array !== 'undefined' &&
      typeof Object !== 'undefined'
    );
  } catch {
    return false;
  }
}

export function collectDevice(): {
  channel: 'BROWSER';
  color_depth: number;
  screen_height: number;
  screen_width: number;
  time_zone_offset: string;
  java_enabled: boolean;
  javascript_enabled: boolean;
} {
  return {
    channel: 'BROWSER',
    color_depth: window.screen.colorDepth,
    screen_height: window.screen.height,
    screen_width: window.screen.width,
    time_zone_offset: new Date().getTimezoneOffset().toString(),
    java_enabled: !!window.WebGLRenderingContext,
    javascript_enabled: isJavascriptEnabled(),
  };
}
