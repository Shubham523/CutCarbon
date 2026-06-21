import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import removeConsole from 'vite-plugin-remove-console'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    removeConsole(),
  ],
  build: {
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Firebase: covers both the main package and its @firebase/* sub-packages
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
          // React runtime
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor';
          // Charting library
          if (id.includes('node_modules/recharts')) return 'charts';
          // UI / icon libraries
          if (id.includes('node_modules/lucide-react')) return 'ui-vendor';
          // Everything else from node_modules
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
})
