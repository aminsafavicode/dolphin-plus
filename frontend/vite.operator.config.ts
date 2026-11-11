import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'operator-entry-rewrite',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/operator.html';
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 5174,
    host: true,
  },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        operator: resolve(__dirname, 'operator.html'),
      },
    },
  },
});
