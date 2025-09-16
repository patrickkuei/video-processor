import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy worker-api endpoints to localhost:8787 in dev
      "/upload-url": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
      "/jobs": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
      "/wake": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
