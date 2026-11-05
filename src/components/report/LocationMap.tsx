"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLon } from "@/lib/photos/metadata";

// OpenFreeMap: no API key and no cookies; tiles are served via Cloudflare
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const CZECHIA_CENTER: [number, number] = [15.35, 49.8];

interface Props {
  point: LatLon | null;
  onPick: (point: LatLon) => void;
}

export function LocationMap({ point, onPick }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;

    import("maplibre-gl")
      .then((maplibregl) => {
        if (cancelled || !container.current) return;
        maplibregl.setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${maplibregl.getVersion()}`);
        const instance = new maplibregl.Map({
          container: container.current,
          style: STYLE_URL,
          center: CZECHIA_CENTER,
          zoom: 6.3,
          attributionControl: { compact: true },
        });
        instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        instance.on("click", (e) => onPickRef.current({ lat: e.lngLat.lat, lon: e.lngLat.lng }));
        instance.on("load", () => setReady(true));

        const pin = new maplibregl.Marker({ color: "#d7262e", draggable: true });
        pin.on("dragend", () => {
          const pos = pin.getLngLat();
          onPickRef.current({ lat: pos.lat, lon: pos.lng });
        });
        marker.current = pin;
        map.current = instance;
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current || !marker.current) return;
    if (!point) {
      marker.current.remove();
      return;
    }
    marker.current.setLngLat([point.lon, point.lat]).addTo(map.current);
    map.current.easeTo({ center: [point.lon, point.lat], zoom: Math.max(map.current.getZoom(), 17) });
  }, [point, ready]);

  if (failed) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Mapu se nepodařilo načíst. Polohu můžete zjistit tlačítkem „Použít moji polohu“.
      </p>
    );
  }

  return (
    <div
      ref={container}
      className="h-80 w-full overflow-hidden rounded-xl border border-border bg-surface"
      role="application"
      aria-label="Mapa – kliknutím nebo přetažením špendlíku upravíte místo"
    />
  );
}
