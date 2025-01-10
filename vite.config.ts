import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import wyw from '@wyw-in-js/vite';

export default defineConfig({
  base: '/solid-worklog/',
  plugins: [
    solid(),
    wyw({
      preprocessor: 'none',
      classNameSlug(hash, title, opts) {
        const prefix = toStyleKebabCase(opts.name === 'index' ? opts.dir : opts.name);
        const className = toStyleKebabCase(title);
        return `${prefix}_${className}--${hash.substring(0, 4)}`;
      },
    }),
  ],
});

export function toStyleKebabCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/^s-/, '') // extra convention to allow `s` prefix
}
