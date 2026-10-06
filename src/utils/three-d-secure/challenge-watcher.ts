/**
 * The authentication module's challenge modal can be dismissed (e.g. with Escape)
 * without settling its promise. This watcher detects a visible authentication frame
 * being removed from the page and reports a dismissal if the module's promise does
 * not settle within a short grace period (a normal completion settles right away).
 */

const MIN_VISIBLE_SIZE = 100;

function framesIn(node: Node): HTMLIFrameElement[] {
  if (!(node instanceof Element)) return [];
  if (node.tagName === 'IFRAME') return [node as HTMLIFrameElement];
  return Array.from(node.getElementsByTagName('iframe'));
}

function isVisibleFrame(frame: HTMLIFrameElement): boolean {
  const rect = frame.getBoundingClientRect();
  const width = Math.max(rect.width, parseFloat(frame.style.width) || 0, parseFloat(frame.width) || 0);
  const height = Math.max(rect.height, parseFloat(frame.style.height) || 0, parseFloat(frame.height) || 0);
  return width >= MIN_VISIBLE_SIZE && height >= MIN_VISIBLE_SIZE;
}

function afterLayout(callback: () => void): void {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => callback());
  else setTimeout(callback, 0);
}

export function watchChallengeDismissal(onDismiss: () => void, graceMs: number): () => void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body) {
    return () => {};
  }

  const visibleFrames = new WeakSet<HTMLIFrameElement>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        for (const frame of framesIn(node)) {
          afterLayout(() => {
            if (frame.isConnected && isVisibleFrame(frame)) visibleFrames.add(frame);
          });
        }
      });
      record.removedNodes.forEach((node) => {
        if (!timer && framesIn(node).some((frame) => visibleFrames.has(frame))) {
          timer = setTimeout(onDismiss, graceMs);
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    if (timer) clearTimeout(timer);
  };
}
