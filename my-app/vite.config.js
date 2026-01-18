import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from 'fs';

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: [
      "172.20.0.49",
      "localhost",
    ],
    https: {
      key: fs.readFileSync('./172.20.0.49-key.pem'),
      cert: fs.readFileSync('./172.20.0.49.pem'),
    },
    hmr: {
      host: '172.20.0.49',
      port: 5173,
      protocol: 'wss',
      clientPort: 5173,
    },
  },
});
