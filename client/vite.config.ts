import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.BASE_URL || "./",
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      "/ws": {
        target: "http://127.0.0.1:3000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});

