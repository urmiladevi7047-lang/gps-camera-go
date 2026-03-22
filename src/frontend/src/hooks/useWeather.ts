import { useEffect, useRef, useState } from "react";

export interface WeatherData {
  temperature: number | null;
  windSpeed: number | null;
  humidity: number | null;
}

export function useWeather(
  lat: number | null,
  lon: number | null,
): WeatherData {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [windSpeed, setWindSpeed] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lat === null || lon === null) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,relative_humidity_2m`,
        );
        const data = await res.json();
        const c = data?.current;
        if (c) {
          setTemperature(Math.round(c.temperature_2m ?? null));
          setWindSpeed(Math.round(c.wind_speed_10m ?? null));
          setHumidity(Math.round(c.relative_humidity_2m ?? null));
        }
      } catch {
        // silently fail
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lat, lon]);

  return { temperature, windSpeed, humidity };
}
