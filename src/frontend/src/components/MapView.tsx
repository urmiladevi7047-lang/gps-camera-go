import { MapPin, Navigation } from "lucide-react";
import { motion } from "motion/react";
import { useGPS } from "../hooks/useGPS";
import { LeafletMap, type PhotoMarker } from "./LeafletMap";

interface CapturedPhoto {
  dataUrl: string;
  lat: number;
  lon: number;
  time: string;
}

interface MapViewProps {
  photos: CapturedPhoto[];
}

function formatCoords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(6)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(6)}°${lon >= 0 ? "E" : "W"}`;
}

function formatTime(isoStr: string) {
  try {
    return new Date(isoStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return isoStr;
  }
}

export function MapView({ photos }: MapViewProps) {
  const { position, error, isLoading } = useGPS();

  const photosWithLocation = photos.filter((p) => p.lat !== 0 || p.lon !== 0);

  const photoMarkers: PhotoMarker[] = photosWithLocation.map((p) => ({
    lat: p.lat,
    lon: p.lon,
    time: p.time,
    dataUrl: p.dataUrl,
  }));

  return (
    <div className="flex flex-col h-full bg-background" data-ocid="map.panel">
      {/* Map area */}
      <div className="relative flex-1 min-h-0">
        {isLoading && !position ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-ocid="map.loading_state"
          >
            <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground text-sm">Getting location...</p>
          </motion.div>
        ) : error && !position ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full gap-4 px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-ocid="map.error_state"
          >
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
              <Navigation className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center text-sm">
              {error.message}
            </p>
          </motion.div>
        ) : position ? (
          <motion.div
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            data-ocid="map.canvas_target"
          >
            <LeafletMap
              lat={position.latitude}
              lon={position.longitude}
              zoom={14}
              className="h-full"
              photoMarkers={photoMarkers}
            />
          </motion.div>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full gap-4"
            data-ocid="map.loading_state"
          >
            <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground text-sm">Waiting for GPS...</p>
          </div>
        )}

        {/* Coordinates overlay */}
        {position && (
          <motion.div
            className="absolute bottom-3 left-3 right-3 z-[1000] backdrop-blur-md bg-background/80 rounded-xl px-3 py-2 border border-border shadow-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs font-mono font-semibold text-foreground">
                  {formatCoords(position.latitude, position.longitude)}
                </span>
              </div>
              <span className="text-xs text-primary font-semibold">
                ±{Math.round(position.accuracy)}m
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {photosWithLocation.length > 0
                ? `📷 ${photosWithLocation.length} photo pin${photosWithLocation.length !== 1 ? "s" : ""} on map — tap to see details`
                : "Capture photos to see them pinned here"}
            </p>
          </motion.div>
        )}
      </div>

      {/* Photo locations list */}
      {photosWithLocation.length > 0 && (
        <div className="flex-shrink-0 max-h-52 overflow-y-auto border-t border-border bg-card/50">
          <p className="text-xs font-semibold text-muted-foreground px-4 pt-3 pb-2 uppercase tracking-wide">
            Captured Locations
          </p>
          <div className="px-3 pb-3 space-y-2">
            {photosWithLocation.map((photo, i) => (
              <motion.div
                key={photo.time}
                className="flex items-center gap-3 bg-card rounded-xl p-2.5 border border-border"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                data-ocid={`map.item.${i + 1}`}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                  <img
                    src={photo.dataUrl}
                    alt={`GPS capture ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-xs font-mono truncate text-foreground">
                      {formatCoords(photo.lat, photo.lon)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(photo.time)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {photosWithLocation.length === 0 && position && (
        <div
          className="flex-shrink-0 border-t border-border bg-card/30 px-4 py-4 text-center"
          data-ocid="map.empty_state"
        >
          <p className="text-xs text-muted-foreground">
            Capture photos to see their locations here
          </p>
        </div>
      )}
    </div>
  );
}
