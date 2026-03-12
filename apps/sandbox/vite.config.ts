import { defineConfig } from 'vite';
import typegpu from 'unplugin-typegpu/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [typegpu(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@engine/engine': new URL('../../packages/engine/src', import.meta.url).pathname,
      '@engine/ecs': new URL('../../packages/ecs/src', import.meta.url).pathname,
      '@engine/math': new URL('../../packages/math/src', import.meta.url).pathname,
      '@engine/assets': new URL('../../packages/assets/src', import.meta.url).pathname,
      '@engine/shaders': new URL('../../packages/shaders/src', import.meta.url).pathname,
      '@engine/render-typegpu': new URL('../../packages/render-typegpu/src', import.meta.url).pathname,
      '@engine/physics-rapier': new URL('../../packages/physics-rapier/src', import.meta.url).pathname,
    },
  },
});
