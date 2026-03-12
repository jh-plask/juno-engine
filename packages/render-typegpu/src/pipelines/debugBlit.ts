/**
 * Debug blit pipeline for development overlays.
 * Uses TypeGPU's low-level render pass API for multi-pipeline passes.
 * This is a placeholder for future debug visualization.
 */
export interface DebugBlitPipeline {
  readonly label: string;
}

export function createDebugBlitPipelineDesc(): DebugBlitPipeline {
  return {
    label: 'debug-blit',
  };
}
