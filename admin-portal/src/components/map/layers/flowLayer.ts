import { ArcLayer } from '@deck.gl/layers';
import type { FlowArc } from '@/types/geo';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PickHandler = (info: any) => boolean | void;

export function makeFlowLayer(
  data: FlowArc[],
  opacity: number,
  onHover: PickHandler,
) {
  return new ArcLayer<FlowArc>({
    id:                 'flows',
    data,
    opacity,
    getSourcePosition:  (d) => d.from,
    getTargetPosition:  (d) => d.to,
    getWidth:           (d) => Math.max(1, Math.sqrt(d.weight) * 2),
    getSourceColor:     [251, 191, 36, 180],
    getTargetColor:     [34,  211, 238, 200],
    pickable:           true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onHover:            onHover as any,
    widthUnits:         'pixels',
    greatCircle:        true,
    transitions:        { opacity: { duration: 400 } },
  });
}
