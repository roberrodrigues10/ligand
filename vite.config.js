import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import obfuscator from 'rollup-plugin-obfuscator';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [
        obfuscator({
          compact: true,
          controlFlowFlattening: true,
          deadCodeInjection: true,
          stringArrayEncoding: ['rc4'],
          rotateStringArray: true,
          selfDefending: true,
        }),
      ],
    },
  },
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.1.109:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
