import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import wyw from '@wyw-in-js/vite';

export default defineConfig({
  plugins: [wyw(), solid()],
})
