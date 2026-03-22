import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Download, ImageOff, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useGetPhotos } from "../hooks/useQueries";
import { LeafletMap } from "./LeafletMap";

interface CapturedPhoto {
  dataUrl: string;
  lat: number;
  lon: number;
  time: string;
}

interface GalleryViewProps {
  localPhotos: CapturedPhoto[];
}

export function GalleryView({ localPhotos }: GalleryViewProps) {
  const { isLoading } = useGetPhotos();

  const handleDownload = (dataUrl: string, index: number) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `gps-camera-go-${index + 1}.jpg`;
    a.click();
  };

  const formatTime = (isoStr: string) => {
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
  };

  const formatCoords = (lat: number, lon: number) =>
    `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(5)}°${lon >= 0 ? "E" : "W"}`;

  return (
    <div className="flex-1 overflow-y-auto p-4" data-ocid="gallery.panel">
      {localPhotos.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center h-64 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-ocid="gallery.empty_state"
        >
          <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center">
            No captures yet.
            <br />
            Switch to Camera tab to start.
          </p>
        </motion.div>
      ) : (
        <>
          <p className="text-muted-foreground text-sm mb-4">
            {localPhotos.length}{" "}
            {localPhotos.length !== 1 ? "captures" : "capture"} saved
          </p>
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            data-ocid="gallery.list"
          >
            {localPhotos.map((photo, i) => (
              <motion.div
                key={photo.time}
                className="bg-card rounded-2xl overflow-hidden border border-border shadow-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                data-ocid={`gallery.item.${i + 1}`}
              >
                <div className="relative aspect-video">
                  <img
                    src={photo.dataUrl}
                    alt={`GPS stamp ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDownload(photo.dataUrl, i)}
                    className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-primary transition-colors"
                    data-ocid={`gallery.download_button.${i + 1}`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 text-primary" />
                    <span>{formatTime(photo.time)}</span>
                  </div>
                  {(photo.lat !== 0 || photo.lon !== 0) && (
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="font-mono">
                          {formatCoords(photo.lat, photo.lon)}
                        </span>
                      </div>
                      {/* Mini Leaflet map thumbnail */}
                      <div
                        className="mt-1.5 rounded-lg overflow-hidden border border-border"
                        style={{ height: 100 }}
                      >
                        <LeafletMap
                          lat={photo.lat}
                          lon={photo.lon}
                          zoom={15}
                          mini
                        />
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {isLoading && (
            <div className="mt-6" data-ocid="gallery.loading_state">
              <p className="text-muted-foreground text-sm mb-3">
                Loading saved data...
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
