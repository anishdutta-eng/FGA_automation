import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'),
) as { version: string };

// Base public path for deployment. Defaults to '/' (root domain, e.g. a custom
// amazon.dev domain via Supernova). For subpath hosting (e.g. Console Harmony
// at /some-app/), set APP_BASE_PATH=/some-app/ at build time. The value is
// normalized so a leading and trailing slash are always present.
function resolveBase(): string {
  const raw = process.env.APP_BASE_PATH?.trim();
  if (!raw || raw === '/') return '/';
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    host: true,
    // Allow public tunnel hostnames (Cloudflare / localtunnel / ngrok) so the
    // dev server can be demoed on a phone when the LAN blocks device-to-device.
    allowedHosts: [
      '.trycloudflare.com',
      '.loca.lt',
      '.ngrok-free.app',
      '.ngrok.io',
    ],
  },
});
