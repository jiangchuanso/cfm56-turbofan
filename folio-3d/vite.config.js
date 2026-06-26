import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: true,
    // El proyecto vive en /mnt/c (disco Windows en WSL2): inotify no detecta
    // cambios ahí, así que usamos sondeo para que HMR funcione.
    watch: { usePolling: true, interval: 200 },
  },
});
