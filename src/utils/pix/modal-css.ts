export const PIX_MODAL_CSS_ID = 'upag-pix-modal-css';

export const PIX_MODAL_CSS = `
.upag-pix-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.6);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.upag-pix-overlay *,
.upag-pix-overlay *::before,
.upag-pix-overlay *::after {
  box-sizing: border-box;
}

.upag-pix-dialog {
  position: relative;
  width: 100%;
  max-width: 380px;
  max-height: 100%;
  overflow-y: auto;
  padding: 28px 24px 24px;
  border-radius: 12px;
  background: #fff;
  color: #111827;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  text-align: center;
  outline: none;
}

.upag-pix-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #6b7280;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.upag-pix-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.upag-pix-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
}

.upag-pix-amount {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.upag-pix-expires {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.upag-pix-qr {
  display: block;
  width: 220px;
  height: 220px;
  max-width: 100%;
  margin: 16px auto 0;
  object-fit: contain;
}

.upag-pix-hint {
  margin: 16px 0 6px;
  font-size: 13px;
  color: #6b7280;
}

.upag-pix-code {
  margin: 0;
  max-height: 84px;
  overflow-y: auto;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.4;
  text-align: left;
  word-break: break-all;
  user-select: all;
}

.upag-pix-copy {
  width: 100%;
  margin-top: 12px;
  padding: 12px 16px;
  border: 0;
  border-radius: 8px;
  background: #111827;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.upag-pix-copy:hover {
  background: #1f2937;
}

.upag-pix-copy:focus-visible,
.upag-pix-close:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
`;
