/**
 * Entry of the script-tag build (`dist/upag.js`). Exposes the client as `window.UpagJs`,
 * so a page can use it without a bundler or `type="module"`:
 *
 *   <script src="https://js.upag.io/v1/upag.js"></script>
 *   <script>const upag = new UpagJs('pk_test_xxx');</script>
 */
import { UpagJs } from './client';

(globalThis as Record<string, unknown>).UpagJs = UpagJs;
