import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Serve production asset paths (/images, /models, /fonts, /css, /scripts) straight from local assets
// so every URL in the original bundle and the clean rebuild resolves with zero 404s.
const assetRoot = path.resolve(__dirname, 'agent_assets/webgl');
const dalaFilesRoot = path.resolve(__dirname, 'Dala_files');
const types = {
  '.exr': 'image/x-exr',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.css': 'text/css',
  '.js': 'application/javascript',
};

const prodAssets = () => ({
  name: 'prod-assets',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = decodeURIComponent((req.url || '').split('?')[0]);
      if (url === '/css/style.css') {
        const file = path.join(dalaFilesRoot, 'style.css');
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return fs.createReadStream(file).pipe(res);
      }
      const scriptMatch = url.match(/^\/scripts\/(manifest\.js|vendor\.js|theme\.js)$/);
      if (scriptMatch) {
        const file = path.join(dalaFilesRoot, scriptMatch[1]);
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return fs.createReadStream(file).pipe(res);
      }
      const m = url.match(/^\/(images|models|fonts)\/(.+)$/);
      if (!m) return next();
      let file = path.join(assetRoot, m[1], m[2]);
      if (!fs.existsSync(file)) {
        const flat = path.join(assetRoot, m[1], path.basename(m[2]));
        if (fs.existsSync(flat)) file = flat;
      }
      if (!file.startsWith(assetRoot) || !fs.existsSync(file)) return next();
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Access-Control-Allow-Origin', '*');
      fs.createReadStream(file).pipe(res);
    });
  },
  writeBundle(opts) {
    for (const d of ['images', 'models', 'fonts']) {
      fs.cpSync(path.join(assetRoot, d), path.join(opts.dir, d), { recursive: true });
    }
    fs.cpSync(dalaFilesRoot, path.join(opts.dir, 'Dala_files'), { recursive: true });
    fs.mkdirSync(path.join(opts.dir, 'css'), { recursive: true });
    fs.cpSync(path.join(dalaFilesRoot, 'style.css'), path.join(opts.dir, 'css/style.css'));
  },
});

export default defineConfig({
  plugins: [prodAssets()],
  publicDir: false,
  server: { port: 5173, fs: { allow: ['.'] } },
  build: { rollupOptions: { input: { index: 'index.html', reference: 'reference.html' } } },
});
