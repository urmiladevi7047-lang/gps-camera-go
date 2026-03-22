import { Toaster } from "@/components/ui/sonner";
import { Camera, Images, Map as MapIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CameraView } from "./components/CameraView";
import { GalleryView } from "./components/GalleryView";
import { MapView } from "./components/MapView";

type Tab = "camera" | "gallery" | "map";

interface CapturedPhoto {
  dataUrl: string;
  lat: number;
  lon: number;
  time: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("camera");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  const handlePhotoCaptured = (
    dataUrl: string,
    lat: number,
    lon: number,
    time: string,
  ) => {
    setPhotos((prev) => [{ dataUrl, lat, lon, time }, ...prev]);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Toaster />

      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border">
        <img
          src="/assets/generated/gps-camera-logo-transparent.dim_120x120.png"
          alt="GPS Camera Go logo"
          className="w-8 h-8 object-contain"
        />
        <div>
          <h1 className="text-base font-bold leading-tight tracking-tight">
            GPS Camera Go
          </h1>
          <p className="text-xs text-muted-foreground leading-none">
            Location-stamped photos
          </p>
        </div>
        {photos.length > 0 && (
          <motion.div
            className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            {photos.length}
          </motion.div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "camera" ? (
            <motion.div
              key="camera"
              className="flex-1 flex flex-col min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <CameraView onPhotoCaptured={handlePhotoCaptured} />
            </motion.div>
          ) : activeTab === "map" ? (
            <motion.div
              key="map"
              className="flex-1 flex flex-col min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MapView photos={photos} />
            </motion.div>
          ) : (
            <motion.div
              key="gallery"
              className="flex-1 flex flex-col min-h-0 overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <GalleryView localPhotos={photos} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom tab bar */}
      <nav className="flex-shrink-0 bg-card/90 backdrop-blur-xl border-t border-border">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab("camera")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "camera"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="nav.camera.tab"
          >
            <div className="relative">
              <Camera className="w-5 h-5" />
              {activeTab === "camera" && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                />
              )}
            </div>
            <span className="text-xs font-semibold">Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "map"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="nav.map.tab"
          >
            <div className="relative">
              <MapIcon className="w-5 h-5" />
              {activeTab === "map" && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                />
              )}
            </div>
            <span className="text-xs font-semibold">Map</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "gallery"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="nav.gallery.tab"
          >
            <div className="relative">
              <Images className="w-5 h-5" />
              {activeTab === "gallery" && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                />
              )}
            </div>
            <span className="text-xs font-semibold">Gallery</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pb-2 pt-0.5">
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/50 text-[10px] hover:text-muted-foreground transition-colors"
          >
            © {new Date().getFullYear()}. Built with ❤️ using caffeine.ai
          </a>
        </div>
      </nav>
    </div>
  );
}
