import RAPIER from '@dimforge/rapier3d-compat';
import { beforeAll } from 'vitest';

beforeAll(async () => {
  await RAPIER.init();
});
