import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  // VITE_BASE is injected by the GitHub Actions deploy workflow so asset
  // paths resolve correctly under the repo sub-path on GitHub Pages.
  // Cloudflare Pages (and local dev) leave it unset → defaults to '/'.
  base: process.env.VITE_BASE ?? '/',
  plugins: [svelte()],
})
