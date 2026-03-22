import { useEffect, useRef } from "react";

// Leaflet is loaded via CDN (see index.html)
declare const L: any;

export interface PhotoMarker {
  lat: number;
  lon: number;
  time: string;
  dataUrl?: string;
}

interface LeafletMapProps {
  lat: number;
  lon: number;
  zoom?: number;
  mini?: boolean;
  className?: string;
  style?: React.CSSProperties;
  photoMarkers?: PhotoMarker[];
}

function formatTime(isoStr: string) {
  try {
    return new Date(isoStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return isoStr;
  }
}

export function LeafletMap({
  lat,
  lon,
  zoom = 16,
  mini = false,
  className = "",
  style,
  photoMarkers,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const photoLayerRef = useRef<any>(null);
  const initLatRef = useRef(lat);
  const initLonRef = useRef(lon);
  const initZoomRef = useRef(zoom);
  const miniRef = useRef(mini);

  useEffect(() => {
    if (!containerRef.current || typeof L === "undefined") return;

    const isMini = miniRef.current;
    const initLat = initLatRef.current;
    const initLon = initLonRef.current;
    const initZoom = initZoomRef.current;

    const map = L.map(containerRef.current, {
      zoomControl: !isMini,
      attributionControl: !isMini,
      dragging: !isMini,
      touchZoom: !isMini,
      scrollWheelZoom: false,
      doubleClickZoom: !isMini,
      keyboard: !isMini,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: isMini ? "" : "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    map.setView([initLat, initLon], initZoom);

    const marker = L.marker([initLat, initLon]).addTo(map);
    const photoLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    photoLayerRef.current = photoLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      photoLayerRef.current = null;
    };
  }, []);

  // Update position when lat/lon changes
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    mapRef.current.setView([lat, lon], zoom);
    markerRef.current.setLatLng([lat, lon]);
  }, [lat, lon, zoom]);

  // Update photo markers
  useEffect(() => {
    if (!photoLayerRef.current || typeof L === "undefined") return;
    photoLayerRef.current.clearLayers();
    if (!photoMarkers) return;

    for (const pm of photoMarkers) {
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:36px;height:36px;
            background:linear-gradient(135deg,#f97316,#ea580c);
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
            border:2px solid #fff;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
          ">
            <span style="transform:rotate(45deg);font-size:16px;line-height:1;">📷</span>
          </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38],
      });

      const popup = L.popup({ maxWidth: 220 }).setContent(`
        <div style="font-family:system-ui,sans-serif;">
          ${pm.dataUrl ? `<img src="${pm.dataUrl}" style="width:100%;max-width:180px;border-radius:8px;margin-bottom:8px;display:block;" />` : ""}
          <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;">📍 ${pm.lat.toFixed(5)}, ${pm.lon.toFixed(5)}</div>
          <div style="font-size:11px;color:#6b7280;">🕐 ${formatTime(pm.time)}</div>
        </div>
      `);

      L.marker([pm.lat, pm.lon], { icon })
        .bindPopup(popup)
        .addTo(photoLayerRef.current);
    }
  }, [photoMarkers]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}
