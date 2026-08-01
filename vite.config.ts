import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 配置：使用 React 插件。
// 使用固定且不易冲突的端口，并开启 strictPort，避免与本机其它项目
// 抢占默认 5173 端口导致浏览器打开到别的应用（出现 @/pages/Home 之类的报错）。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: true,
    host: true,
  },
});

