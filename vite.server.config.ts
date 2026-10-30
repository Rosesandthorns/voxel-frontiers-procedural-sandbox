import {defineConfig} from 'vite';
export default defineConfig({build:{ssr:'src/server/world.ts',outDir:'desktop/generated',emptyOutDir:true,rollupOptions:{output:{format:'cjs',entryFileNames:'server-world.cjs'}}}});
