import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 1. Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Cast process to any to avoid TS errors in some environments
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // 2. Double Insurance: Check both Vercel system env (process.env) and loaded .env file
  const apiKey = process.env.API_KEY || env.API_KEY;

  // 3. LOGGING FOR VERCEL BUILD DEBUGGING
  // This log will appear in the Vercel Build Logs
  if (apiKey) {
    console.log('✅ Success! API_KEY found checking both process.env and loadEnv.');
  } else {
    console.warn('⚠️ WARNING: API_KEY is missing. Please check Vercel Project Settings -> Environment Variables.');
  }

  return {
    plugins: [react()],
    base: './', // Ensure relative paths for assets in production
    
    // 4. Inject the variable into the code
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    }
  };
});