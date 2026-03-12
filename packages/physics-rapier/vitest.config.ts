import { mergeConfig } from 'vitest/config';
import shared from '../../vitest.shared.js';

export default mergeConfig(shared, {
  resolve: {
    alias: {
      '@dimforge/rapier3d-compat': '@dimforge/rapier3d-compat/rapier.es.js',
    },
  },
  test: {
    setupFiles: ['test/setup.ts'],
  },
});
