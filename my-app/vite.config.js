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
      "10.0.0.5",
    ],
    // HTTPS disabled to support multiple IPs (10.0.0.5 and 172.20.0.49)
    // If you need HTTPS, create SSL certificates for 10.0.0.5 or use a wildcard certificate
    // https: {
    //   key: fs.readFileSync('./172.20.0.49-key.pem'),
    //   cert: fs.readFileSync('./172.20.0.49.pem'),
    // },
    hmr: {
      // HMR will work with both IPs when using HTTP
      protocol: 'ws',
    },
  },
});
