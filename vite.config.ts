import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 1. 加载环境变量
  // 第三个参数 '' 表示加载所有变量，不仅仅是 VITE_ 开头的
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: './', // 确保生产环境下的资源路径正确
    
    // 2. 关键修复：告诉 Vite 在打包时如何替换代码中的变量
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    }
  };
});