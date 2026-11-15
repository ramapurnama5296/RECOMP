import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { writeServiceWorker } from './scripts/offline-build.ts'
import { pagesBase } from './scripts/pages-base.ts'

export default defineConfig({
  base: pagesBase(),
  plugins: [
    react(), tailwind(),
    {
      name: 'recomp-offline-shell', apply: 'build',
      closeBundle: () => writeServiceWorker(resolve('dist')),
    },
  ],
})

