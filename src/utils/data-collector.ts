import {
  CreateAntifraudSessionParams,
  AntifraudDeviceInfo,
  AntifraudBrowserInfo,
  AntifraudTimeInfo,
  AntifraudHashesInfo,
  AntifraudGraphicsInfo,
  AntifraudConnectionInfo,
  AntifraudBotInfo,
} from '../types';

export class DataCollector {
  async collect(): Promise<CreateAntifraudSessionParams> {
    const [hashes, fingerprint] = await Promise.all([
      this.collectHashes(),
      this.generateFingerprint(),
    ]);

    return {
      fingerprint,
      device: this.collectDevice(),
      browser: this.collectBrowser(),
      time: this.collectTime(),
      hashes,
      graphics: this.collectGraphics(),
      connection: this.collectConnection(),
      bot: this.collectBot(),
    };
  }

  private collectDevice(): AntifraudDeviceInfo {
    const screen = typeof window !== 'undefined' ? window.screen : undefined;
    const nav = this.getNavigator();

    return {
      screenWidth: screen?.width,
      screenHeight: screen?.height,
      availWidth: screen?.availWidth,
      availHeight: screen?.availHeight,
      colorDepth: screen?.colorDepth,
      pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : undefined,
      hardwareConcurrency: nav?.hardwareConcurrency,
      deviceMemory: (nav as any)?.deviceMemory,
      maxTouchPoints: nav?.maxTouchPoints,
    };
  }

  private collectBrowser(): AntifraudBrowserInfo {
    const nav = this.getNavigator();
    if (!nav) return {};

    return {
      platform: nav.platform,
      vendor: nav.vendor,
      language: nav.language,
      languages: nav.languages ? Array.from(nav.languages) : undefined,
      cookieEnabled: nav.cookieEnabled,
      doNotTrack: nav.doNotTrack,
      pdfViewerEnabled: (nav as any).pdfViewerEnabled,
    };
  }

  private collectTime(): AntifraudTimeInfo {
    const now = new Date();
    let timezone: string | undefined;

    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}

    return {
      timezone,
      timezoneOffset: now.getTimezoneOffset(),
    };
  }

  private async collectHashes(): Promise<AntifraudHashesInfo> {
    const [canvas, webgl, audio] = await Promise.all([
      this.hashCanvas(),
      this.hashWebGL(),
      this.hashAudio(),
    ]);

    return { canvas, webgl, audio };
  }

  private collectGraphics(): AntifraudGraphicsInfo {
    const gl = this.getWebGLContext();
    if (!gl) return {};

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return {};

    return {
      webglRenderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || undefined,
      webglVendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || undefined,
    };
  }

  private collectConnection(): AntifraudConnectionInfo {
    const conn = (this.getNavigator() as any)?.connection;
    if (!conn) return {};

    return {
      type: conn.type,
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
    };
  }

  private collectBot(): AntifraudBotInfo {
    const nav = this.getNavigator();
    const flags: string[] = [];

    if (typeof window !== 'undefined') {
      if ('__webdriver_evaluate' in document) flags.push('__webdriver_evaluate');
      if ('__selenium_unwrapped' in document) flags.push('__selenium_unwrapped');
      if ('__fxdriver_unwrapped' in document) flags.push('__fxdriver_unwrapped');
      if ('_phantom' in window) flags.push('_phantom');
      if ('callPhantom' in window) flags.push('callPhantom');
      if ('_selenium' in window) flags.push('_selenium');
      if ('domAutomation' in window) flags.push('domAutomation');
      if ('domAutomationController' in window) flags.push('domAutomationController');
    }

    return {
      webdriver: nav?.webdriver ?? false,
      automationFlags: flags.length > 0 ? flags : undefined,
    };
  }

  // -- Hash helpers --

  private async hashCanvas(): Promise<string | undefined> {
    if (typeof document === 'undefined') return undefined;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;

      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(100, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.font = '14px Arial';
      ctx.fillText('upag-antifraud', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.font = '18px Times New Roman';
      ctx.fillText('upag-antifraud', 4, 45);

      const dataUrl = canvas.toDataURL();
      return await this.sha256(dataUrl);
    } catch {
      return undefined;
    }
  }

  private async hashWebGL(): Promise<string | undefined> {
    const gl = this.getWebGLContext();
    if (!gl) return undefined;

    try {
      const params = [
        gl.getParameter(gl.VERSION),
        gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        gl.getParameter(gl.VENDOR),
        gl.getParameter(gl.RENDERER),
        gl.getParameter(gl.MAX_TEXTURE_SIZE),
        gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      ];
      return await this.sha256(params.join('|'));
    } catch {
      return undefined;
    }
  }

  private async hashAudio(): Promise<string | undefined> {
    if (typeof window === 'undefined' || !window.AudioContext && !(window as any).webkitAudioContext) {
      return undefined;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const analyser = ctx.createAnalyser();
      const gain = ctx.createGain();
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);

      oscillator.connect(analyser);
      analyser.connect(processor);
      processor.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(0);

      const hash = await new Promise<string | undefined>((resolve) => {
        const timeout = setTimeout(() => {
          resolve(undefined);
        }, 1000);

        processor.onaudioprocess = async (e) => {
          clearTimeout(timeout);
          const data = e.inputBuffer.getChannelData(0);
          const slice = Array.from(data.slice(0, 100));
          const result = await this.sha256(slice.join(','));
          resolve(result);
        };
      });

      oscillator.stop();
      processor.disconnect();
      gain.disconnect();
      analyser.disconnect();
      ctx.close();

      return hash;
    } catch {
      return undefined;
    }
  }

  // -- Utilities --

  private async generateFingerprint(): Promise<string> {
    const components = [
      this.getNavigator()?.userAgent,
      this.getNavigator()?.language,
      this.getNavigator()?.platform,
      typeof window !== 'undefined' ? `${window.screen?.width}x${window.screen?.height}` : undefined,
      typeof window !== 'undefined' ? window.devicePixelRatio : undefined,
      this.getNavigator()?.hardwareConcurrency,
      Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone,
    ].filter(Boolean).join('|');

    return await this.sha256(components);
  }

  private async sha256(input: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(input);
      const buffer = await crypto.subtle.digest('SHA-256', encoded);
      const array = Array.from(new Uint8Array(buffer));
      return array.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private getNavigator(): Navigator | undefined {
    return typeof navigator !== 'undefined' ? navigator : undefined;
  }

  private getWebGLContext(): WebGLRenderingContext | null {
    if (typeof document === 'undefined') return null;

    try {
      const canvas = document.createElement('canvas');
      return (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    } catch {
      return null;
    }
  }
}
