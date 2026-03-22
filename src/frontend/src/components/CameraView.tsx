import { useCamera } from "@/camera/useCamera";
import { CameraOff, FlipHorizontal, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useGPS } from "../hooks/useGPS";
import { useAddPhoto } from "../hooks/useQueries";
import { useReverseGeocode } from "../hooks/useReverseGeocode";
import { useWeather } from "../hooks/useWeather";
import { LeafletMap } from "./LeafletMap";

interface CameraViewProps {
  onPhotoCaptured: (
    dataUrl: string,
    lat: number,
    lon: number,
    time: string,
  ) => void;
}

function formatCoords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(5)}°${lon >= 0 ? "E" : "W"}`;
}

function formatFullDateTime(date: Date) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayName = days[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return {
    full: `${dayName}, ${day} ${month} ${year} ${hh}:${mm}:${ss}`,
    short: `${day} ${month} ${year}`,
    time: `${hh}:${mm}:${ss}`,
  };
}

/** Fetch OSM tile image for canvas drawing */
async function fetchMapTile(
  lat: number,
  lon: number,
  zoom: number,
): Promise<HTMLImageElement | null> {
  try {
    const n = 2 ** zoom;
    const xtile = Math.floor(((lon + 180) / 360) * n);
    const ytile = Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
        ) /
          Math.PI) /
        2) *
        n,
    );
    const url = `https://tile.openstreetmap.org/${zoom}/${xtile}/${ytile}.png`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    return await new Promise((resolve) => {
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

/** Draw rounded rectangle */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function CameraView({ onPhotoCaptured }: CameraViewProps) {
  const {
    isActive,
    isSupported,
    error,
    isLoading,
    startCamera,
    switchCamera,
    videoRef,
    canvasRef,
  } = useCamera({
    facingMode: "environment",
    quality: 0.95,
    format: "image/jpeg",
  });

  const { position } = useGPS();
  const geocode = useReverseGeocode(
    position?.latitude ?? null,
    position?.longitude ?? null,
  );
  const weather = useWeather(
    position?.latitude ?? null,
    position?.longitude ?? null,
  );
  const addPhoto = useAddPhoto();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  const positionRef = useRef(position);
  positionRef.current = position;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const startCameraRef = useRef(startCamera);
  startCameraRef.current = startCamera;
  const geocodeRef = useRef(geocode);
  geocodeRef.current = geocode;
  const weatherRef = useRef(weather);
  weatherRef.current = weather;

  useEffect(() => {
    startCameraRef.current();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!isActive || isCapturing) return;
    setIsCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const pos = positionRef.current;
    const now = currentTimeRef.current;
    const geo = geocodeRef.current;
    const wx = weatherRef.current;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw video frame
      ctx.drawImage(video, 0, 0, w, h);

      // Fetch map tile if position available
      let mapImg: HTMLImageElement | null = null;
      if (pos) {
        mapImg = await fetchMapTile(pos.latitude, pos.longitude, 15);
      }

      // ─── Bottom overlay panel ───────────────────────────────
      const panelH = Math.round(h * 0.28);
      const panelY = h - panelH;
      const pad = Math.round(w * 0.025);
      const mapSize = Math.round(panelH * 0.82);
      const mapY = panelY + Math.round((panelH - mapSize) / 2);
      const mapX = pad;

      // Panel background
      ctx.fillStyle = "rgba(20, 24, 30, 0.88)";
      ctx.fillRect(0, panelY, w, panelH);

      // Orange top border
      ctx.fillStyle = "#F39A3A";
      ctx.fillRect(0, panelY, w, Math.round(h * 0.004));

      // ─── Map thumbnail ────────────────────────────────────────
      if (mapImg && pos) {
        // Draw map tile clipped to rounded rect
        ctx.save();
        roundRect(
          ctx,
          mapX,
          mapY,
          mapSize,
          mapSize,
          Math.round(mapSize * 0.06),
        );
        ctx.clip();

        // Tile is 256x256, we need to crop/scale to mapSize centered on pin
        const tileSize = 256;
        const zoom = 15;
        const n = 2 ** zoom;
        const xtile = Math.floor(((pos.longitude + 180) / 360) * n);
        const ytile = Math.floor(
          ((1 -
            Math.log(
              Math.tan((pos.latitude * Math.PI) / 180) +
                1 / Math.cos((pos.latitude * Math.PI) / 180),
            ) /
              Math.PI) /
            2) *
            n,
        );
        // Pixel position within tile
        const xPixel = (((pos.longitude + 180) / 360) * n - xtile) * tileSize;
        const yPixel =
          (((1 -
            Math.log(
              Math.tan((pos.latitude * Math.PI) / 180) +
                1 / Math.cos((pos.latitude * Math.PI) / 180),
            ) /
              Math.PI) /
            2) *
            n -
            ytile) *
          tileSize;
        // Scale tile to mapSize
        const scale = mapSize / tileSize;
        ctx.drawImage(
          mapImg,
          mapX - xPixel * scale + (tileSize / 2) * scale - mapSize / 2,
          mapY - yPixel * scale + (tileSize / 2) * scale - mapSize / 2,
          tileSize * scale,
          tileSize * scale,
        );
        ctx.restore();

        // Red pin dot
        const pinX = mapX + mapSize / 2;
        const pinY = mapY + mapSize / 2;
        ctx.beginPath();
        ctx.arc(pinX, pinY, Math.round(mapSize * 0.07), 0, Math.PI * 2);
        ctx.fillStyle = "#E53E3E";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = Math.round(mapSize * 0.025);
        ctx.stroke();

        // Thin border around map
        ctx.save();
        roundRect(
          ctx,
          mapX,
          mapY,
          mapSize,
          mapSize,
          Math.round(mapSize * 0.06),
        );
        ctx.strokeStyle = "rgba(243,154,58,0.6)";
        ctx.lineWidth = Math.round(w * 0.003);
        ctx.stroke();
        ctx.restore();
      } else if (pos) {
        // Fallback: grey box with coordinates
        ctx.fillStyle = "#2D3748";
        roundRect(
          ctx,
          mapX,
          mapY,
          mapSize,
          mapSize,
          Math.round(mapSize * 0.06),
        );
        ctx.fill();
        ctx.fillStyle = "#F39A3A";
        ctx.font = `bold ${Math.round(w * 0.022)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("MAP", mapX + mapSize / 2, mapY + mapSize / 2);
        ctx.textAlign = "left";
      }

      // ─── Text area (right of map) ─────────────────────────────
      const textX = mapX + mapSize + pad;
      const textW = w - textX - pad;
      const { full: dateTimeFull } = formatFullDateTime(now);

      // Location name line 1: placeName, state, country (NOT district)
      const locationLine1 = [geo.placeName, geo.state, geo.country]
        .filter(Boolean)
        .join(", ");

      const fontSize1 = Math.round(w * 0.028);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${fontSize1}px sans-serif`;

      // Truncate to fit textW
      let loc1 =
        locationLine1 ||
        (pos ? formatCoords(pos.latitude, pos.longitude) : "Unknown Location");
      while (loc1.length > 5 && ctx.measureText(loc1).width > textW) {
        loc1 = `${loc1.slice(0, -4)}...`;
      }
      ctx.fillText(loc1, textX, panelY + Math.round(panelH * 0.22));

      // District line (separate, orange)
      if (geo.district) {
        const fontSizeDistrict = Math.round(w * 0.022);
        ctx.fillStyle = "#F39A3A";
        ctx.font = `bold ${fontSizeDistrict}px sans-serif`;
        let districtText = `District: ${geo.district}`;
        while (
          districtText.length > 5 &&
          ctx.measureText(districtText).width > textW
        ) {
          districtText = `${districtText.slice(0, -4)}...`;
        }
        ctx.fillText(districtText, textX, panelY + Math.round(panelH * 0.36));
      }

      // Full address line
      if (geo.fullAddress) {
        const fontSize2 = Math.round(w * 0.019);
        ctx.fillStyle = "#CBD5E0";
        ctx.font = `${fontSize2}px sans-serif`;
        let addr = geo.fullAddress;
        while (addr.length > 5 && ctx.measureText(addr).width > textW) {
          addr = `${addr.slice(0, -4)}...`;
        }
        ctx.fillText(addr, textX, panelY + Math.round(panelH * 0.5));
      }

      // Plus code
      if (geo.plusCode) {
        const fontSize3 = Math.round(w * 0.017);
        ctx.fillStyle = "#90CDF4";
        ctx.font = `${fontSize3}px sans-serif`;
        ctx.fillText(
          `Plus Code : ${geo.plusCode}`,
          textX,
          panelY + Math.round(panelH * 0.62),
        );
      }

      // Date/time
      const fontSize4 = Math.round(w * 0.019);
      ctx.fillStyle = "#F39A3A";
      ctx.font = `${fontSize4}px sans-serif`;
      ctx.fillText(dateTimeFull, textX, panelY + Math.round(panelH * 0.74));

      // ─── Weather row ────────────────────────────────────────────
      const wxY = panelY + Math.round(panelH * 0.88);
      const fontSize5 = Math.round(w * 0.018);
      ctx.font = `${fontSize5}px sans-serif`;

      const wxItems: string[] = [];
      if (wx.temperature !== null) wxItems.push(`☀ ${wx.temperature}°C`);
      if (wx.windSpeed !== null) wxItems.push(`≋ ${wx.windSpeed} km/h`);
      if (wx.humidity !== null) wxItems.push(`💧 ${wx.humidity}%`);
      if (pos?.altitude !== null && pos?.altitude !== undefined)
        wxItems.push(`⬆ ${Math.round(pos.altitude)} m`);
      if (pos) wxItems.push(`± ${Math.round(pos.accuracy)} m`);

      ctx.fillStyle = "#E2E8F0";
      let wxXCur = textX;
      for (const item of wxItems) {
        ctx.fillText(item, wxXCur, wxY);
        wxXCur += ctx.measureText(item).width + Math.round(w * 0.025);
        if (wxXCur > w - pad) break;
      }

      // ─── Watermark ─────────────────────────────────────────────
      ctx.fillStyle = "rgba(244,246,248,0.5)";
      ctx.font = `bold ${Math.round(w * 0.016)}px sans-serif`;
      ctx.fillText("GPS Camera Go", pad, Math.round(h * 0.038));

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const lat = pos?.latitude ?? 0;
      const lon = pos?.longitude ?? 0;
      const isoTime = now.toISOString();

      onPhotoCaptured(dataUrl, lat, lon, isoTime);

      const { short: d2, time: t2 } = formatFullDateTime(now);
      addPhoto.mutate({
        title: `Photo ${d2} ${t2}`,
        latitude: lat,
        longitude: lon,
      });

      toast.success("📸 Photo captured!");
    } catch {
      toast.error("Capture failed");
    } finally {
      setIsCapturing(false);
    }
  }, [isActive, isCapturing, videoRef, canvasRef, onPhotoCaptured, addPhoto]);

  const { full: fullDT } = formatFullDateTime(currentTime);

  return (
    <div
      className="relative flex flex-col h-full bg-background"
      data-ocid="camera.panel"
    >
      <div className="relative flex-1 overflow-hidden bg-black">
        {isSupported === false || error ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-4"
            data-ocid="camera.error_state"
          >
            <CameraOff className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground text-center px-8">
              {error?.message || "Camera not supported"}
            </p>
            <button
              type="button"
              onClick={() => startCamera()}
              className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold"
              data-ocid="camera.secondary_button"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {isLoading && (
              <div
                className="absolute inset-0 flex items-center justify-center z-10"
                data-ocid="camera.loading_state"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-muted-foreground text-sm">
                    Starting camera...
                  </p>
                </div>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ minHeight: 300 }}
            />
            <canvas ref={canvasRef} className="hidden" />

            <AnimatePresence>
              {flash && (
                <motion.div
                  className="absolute inset-0 bg-white z-30 pointer-events-none"
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </AnimatePresence>

            {/* Viewfinder corners */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-sm" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-sm" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-sm" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-sm" />
            </div>

            {/* Live info overlay at bottom of viewfinder */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
              <div className="bg-black/70 border-t-2 border-primary/70 px-3 py-2">
                <div className="flex gap-3 items-start">
                  {/* Mini Leaflet map */}
                  {position && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary/50 flex-shrink-0">
                      <LeafletMap
                        lat={position.latitude}
                        lon={position.longitude}
                        zoom={15}
                        mini
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Line 1: Place name, country */}
                    <div className="text-white font-bold text-xs truncate">
                      {[geocode.placeName, geocode.country]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    {/* Line 2: District in orange */}
                    {geocode.district && (
                      <div
                        className="text-xs font-bold truncate"
                        style={{ color: "#F39A3A" }}
                      >
                        District: {geocode.district}
                      </div>
                    )}
                    {geocode.fullAddress && (
                      <div className="text-white/70 text-[10px] truncate">
                        {geocode.fullAddress}
                      </div>
                    )}
                    <div className="text-primary text-[10px] mt-0.5">
                      {fullDT}
                    </div>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {weather.temperature !== null && (
                        <span className="text-white/80 text-[10px]">
                          ☀ {weather.temperature}°C
                        </span>
                      )}
                      {weather.windSpeed !== null && (
                        <span className="text-white/80 text-[10px]">
                          ≋ {weather.windSpeed} km/h
                        </span>
                      )}
                      {weather.humidity !== null && (
                        <span className="text-white/80 text-[10px]">
                          💧 {weather.humidity}%
                        </span>
                      )}
                      {position?.altitude !== null &&
                        position?.altitude !== undefined && (
                          <span className="text-white/80 text-[10px]">
                            ⬆ {Math.round(position.altitude)} m
                          </span>
                        )}
                    </div>
                  </div>
                  {position && (
                    <div className="text-right text-[10px] flex-shrink-0">
                      <div className="text-white/60">
                        {formatCoords(position.latitude, position.longitude)}
                      </div>
                      <div className="text-primary/80">
                        ±{Math.round(position.accuracy)}m
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative bg-card/90 backdrop-blur-xl border-t border-border px-6 py-5">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => switchCamera()}
            className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors disabled:opacity-40"
            disabled={isLoading || !isActive}
            data-ocid="camera.toggle"
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>

          <motion.button
            type="button"
            onClick={handleCapture}
            disabled={!isActive || isCapturing || isLoading}
            whileTap={{ scale: 0.92 }}
            className="relative w-20 h-20 rounded-full bg-primary shadow-glow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            data-ocid="camera.primary_button"
          >
            <div className="w-16 h-16 rounded-full border-4 border-primary-foreground/80 flex items-center justify-center">
              {isCapturing ? (
                <div className="w-6 h-6 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20" />
              )}
            </div>
          </motion.button>

          <button
            type="button"
            onClick={() => startCamera()}
            className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors disabled:opacity-40"
            disabled={isLoading}
            data-ocid="camera.secondary_button"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
