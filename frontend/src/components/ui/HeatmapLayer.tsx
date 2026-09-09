/**
 * HeatmapLayer – renders a Leaflet.heat layer from a grid of risk points.
 *
 * Usage inside a <MapContainer>:
 *   {active && <HeatmapLayer data={gridPoints} radius={25} blur={15} />}
 *
 * `data` is an array of `{ lat: number, lon: number, p: number }` objects
 * (as returned by GET /api/v1/ml/grid).
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type L from 'leaflet';

// leaflet.heat augments the global L namespace — import it for the side effect
// then cast to grab the factory.
import 'leaflet.heat';

interface HeatPoint {
  lat: number;
  lon: number;
  p: number;
}

interface Props {
  data: HeatPoint[];
  radius?: number;
  blur?: number;
  max?: number;
}

export function HeatmapLayer({ data, radius = 22, blur = 16, max = 1.0 }: Props) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    // Remove previous layer if data changes.
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!data.length) return;

    const L = window.L as typeof import('leaflet') & {
      heatLayer: (
        coords: [number, number, number][],
        opts?: Record<string, unknown>,
      ) => L.HeatLayer;
    };

    const coords: [number, number, number][] = data.map((pt) => [
      pt.lat,
      pt.lon,
      pt.p,
    ]);

    const heat = L.heatLayer(coords, {
      radius,
      blur,
      max,
      maxZoom: 10,
      gradient: {
        0.0: '#22c55e',  // green  – low
        0.3: '#eab308',  // yellow – moderate
        0.5: '#f97316',  // orange – high
        0.8: '#ef4444',  // red    – severe
        1.0: '#7f1d1d',  // dark   – extreme
      },
    }) as L.HeatLayer;

    heat.addTo(map);
    layerRef.current = heat;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [data, map, radius, blur, max]);

  return null; // layer management is side-effect only
}
