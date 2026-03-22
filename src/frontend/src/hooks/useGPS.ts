import { useEffect, useState } from "react";

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
}

export interface GPSError {
  message: string;
}

export function useGPS() {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<GPSError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError({ message: "Geolocation is not supported by this browser" });
      setIsLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
        });
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError({ message: err.message });
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { position, error, isLoading };
}
