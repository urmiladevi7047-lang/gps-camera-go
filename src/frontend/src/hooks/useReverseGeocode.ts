import { useEffect, useRef, useState } from "react";

export interface ReverseGeocodeResult {
  placeName: string | null;
  district: string | null;
  fullAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  plusCode: string | null;
  isLoading: boolean;
}

function toPlusCode(lat: number, lon: number): string {
  const CODE_ALPHABET = "23456789CFGHJMPQRVWX";
  const ENCODING_BASE = 20;
  const LAT_MAX = 90;
  const LON_MAX = 180;
  const PAIR_CODE_LENGTH = 10;

  let latVal = (lat + LAT_MAX) * 8000;
  let lonVal = (lon + LON_MAX) * 8000;

  let code = "";
  for (let i = 0; i < PAIR_CODE_LENGTH / 2; i++) {
    const latDigit =
      Math.floor(latVal / ENCODING_BASE ** (PAIR_CODE_LENGTH / 2 - 1 - i)) %
      ENCODING_BASE;
    const lonDigit =
      Math.floor(lonVal / ENCODING_BASE ** (PAIR_CODE_LENGTH / 2 - 1 - i)) %
      ENCODING_BASE;
    code += CODE_ALPHABET[lonDigit] + CODE_ALPHABET[latDigit];
  }
  return `${code.slice(0, 4)}+${code.slice(4, 8)}`;
}

export function useReverseGeocode(
  lat: number | null,
  lon: number | null,
): ReverseGeocodeResult {
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [fullAddress, setFullAddress] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [plusCode, setPlusCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lat === null || lon === null) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    setPlusCode(toPlusCode(lat, lon));

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
          { headers: { "User-Agent": "GPSCameraGo/1.0" } },
        );
        const data = await res.json();
        const addr = data?.address ?? {};

        // Place name (most specific)
        const place =
          addr.village ??
          addr.hamlet ??
          addr.neighbourhood ??
          addr.suburb ??
          addr.town ??
          addr.city ??
          null;

        // District: prefer state_district (used in India), then district, then county
        const dist =
          addr.state_district ?? addr.district ?? addr.county ?? null;

        const cityVal = addr.city ?? addr.town ?? addr.village ?? null;
        const stateVal = addr.state ?? null;
        const countryVal = addr.country ?? null;

        const road = addr.road ?? addr.pedestrian ?? addr.footway ?? null;
        const houseNumber = addr.house_number ?? null;
        const postcode = addr.postcode ?? null;

        const parts: string[] = [];
        if (road) parts.push(houseNumber ? `${houseNumber} ${road}` : road);
        if (cityVal) parts.push(cityVal);
        if (dist) parts.push(dist);
        if (stateVal) parts.push(stateVal);
        if (postcode) parts.push(postcode);
        if (countryVal) parts.push(countryVal);

        setPlaceName(place);
        setDistrict(dist);
        setFullAddress(
          parts.length > 0 ? parts.join(", ") : (data?.display_name ?? null),
        );
        setCity(cityVal);
        setState(stateVal);
        setCountry(countryVal);
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lat, lon]);

  return {
    placeName,
    district,
    fullAddress,
    city,
    state,
    country,
    plusCode,
    isLoading,
  };
}
