import tgpu from 'typegpu';
import { attempt } from '@engine/engine/attempt.js';
import { EngineError } from '@engine/engine/errors.js';
import type { AttemptResultAsync } from '@engine/engine/attempt.js';

export type TgpuRoot = Awaited<ReturnType<typeof tgpu.init>>;

export interface GpuServices {
  root: TgpuRoot;
  context: ReturnType<TgpuRoot['configureContext']>;
  enabledFeatures: ReadonlySet<string>;
  destroy(): void;
}

export async function createGpuServices(
  canvas: HTMLCanvasElement,
): AttemptResultAsync<EngineError, GpuServices> {
  const [initErr, root] = await attempt<Error, TgpuRoot>(
    tgpu.init({
      adapter: { powerPreference: 'high-performance' },
      device: {
        optionalFeatures: ['shader-f16', 'timestamp-query'],
      },
    }),
  );

  if (initErr) {
    return [
      new EngineError('GPU_INIT_FAILED', 'Failed to initialize WebGPU', {
        cause: initErr,
      }),
      null,
    ];
  }

  const [ctxErr, context] = attempt<Error, ReturnType<TgpuRoot['configureContext']>>(
    () =>
      root.configureContext({
        canvas,
        alphaMode: 'premultiplied',
      }),
  );

  if (ctxErr) {
    root.destroy();
    return [
      new EngineError('GPU_CONTEXT_FAILED', 'Failed to configure canvas context', {
        cause: ctxErr,
      }),
      null,
    ];
  }

  return [
    null,
    {
      root,
      context,
      enabledFeatures: root.enabledFeatures,
      destroy: () => root.destroy(),
    },
  ];
}
