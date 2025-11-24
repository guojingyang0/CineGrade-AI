
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: './', 
    
    // We no longer strictly need process.env.API_KEY in the client
    // because the key lives on the server now. 
    // However, keeping define avoids breaking old code refs if any exist.
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },

    server: {
      proxy: {
        // This is for local development if you run `vercel dev` or similar
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        }
      }
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    }
  };
});
