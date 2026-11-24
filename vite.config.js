import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The admin site runs on its own port, separate from the venue app (5173).
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true },
});