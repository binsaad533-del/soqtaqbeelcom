/// <reference types="google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X, Search, ClipboardPaste } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { findNearestCity } from "@/lib/saudiCities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface PlaceDetails {
  city?: string;
  district?: string;
  address?: string;
}

interface GoogleMapPickerProps {
  lat?: number | null;
  lng?: number | null;
  onLocationChange: (lat: number, lng: number, address?: string, placeDetails?: PlaceDetails) => void;
  className?: string;
}

let mapsApiLoaded = false;
let mapsApiLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsApi(apiKey: string): Promise<void> {
  if (mapsApiLoaded) return Promise.resolve();
  if (mapsApiLoading) {
    return new Promise((resolve) => loadCallbacks.push(resolve));
  }
  mapsApiLoading = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ar`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      mapsApiLoaded = true;
      mapsApiLoading = false;
      resolve();
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    script.onerror = () => {
      mapsApiLoading = false;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });
}

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 }; // Riyadh

const GoogleMapPicker = ({ lat, lng, onLocationChange, className }: GoogleMapPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Initialize address from existing coordinates so users see their saved location immediately on remount
  const [selectedAddress, setSelectedAddress] = useState<string | null>(() => {
    if (lat && lng) {
      const nearest = findNearestCity(lat, lng);
      return nearest?.name ? `بالقرب من ${nearest.name}` : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    return null;
  });
  const [manualSearch, setManualSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [pasteInput, setPasteInput] = useState("");

  // Keep address in sync if parent updates lat/lng externally (e.g., loaded from draft after mount)
  useEffect(() => {
    if (lat && lng && !selectedAddress) {
      const nearest = findNearestCity(lat, lng);
      setSelectedAddress(nearest?.name ? `بالقرب من ${nearest.name}` : `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  const extractPlaceDetails = useCallback((components: google.maps.GeocoderAddressComponent[]): PlaceDetails => {
    let city = "";
    let district = "";
    components.forEach((c) => {
      if (c.types.includes("locality")) city = c.long_name;
      if (c.types.includes("sublocality") || c.types.includes("neighborhood")) district = c.long_name;
    });
    return { city, district };
  }, []);

  const reverseGeocode = useCallback((position: google.maps.LatLng) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: position }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        setSelectedAddress(results[0].formatted_address);
        const details = extractPlaceDetails(results[0].address_components || []);
        details.address = results[0].formatted_address;
        onLocationChange(position.lat(), position.lng(), results[0].formatted_address, details);
      } else {
        const nearest = findNearestCity(position.lat(), position.lng());
        setSelectedAddress(`بالقرب من ${nearest.name}`);
        onLocationChange(position.lat(), position.lng(), undefined, { city: nearest.name });
      }
    });
  }, [extractPlaceDetails, onLocationChange]);

  const initMap = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-maps-key");
      if (fnError || !data?.key) {
        console.error("[GoogleMapPicker] Failed to get API key:", fnError);
        setError("maps_key_failed");
        setLoading(false);
        return;
      }

      await loadGoogleMapsApi(data.key);

      if (!mapRef.current) return;

      const center = lat && lng ? { lat, lng } : DEFAULT_CENTER;
      const zoom = lat && lng ? 15 : 6;

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_LEFT,
          mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID],
        },
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });

      mapInstanceRef.current = map;

      const marker = new google.maps.Marker({
        position: center,
        map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        visible: !!(lat && lng),
      });

      markerRef.current = marker;

      if (lat && lng) {
        reverseGeocode(new google.maps.LatLng(lat, lng));
      }

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        marker.setPosition(e.latLng);
        marker.setVisible(true);
        reverseGeocode(e.latLng);
      });

      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (!pos) return;
        reverseGeocode(pos);
      });

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "ابحث عن موقع...";
      input.className = "map-search-input";
      input.dir = "rtl";
      input.style.cssText =
        "margin:10px;padding:8px 12px;width:260px;font-size:13px;border:1px solid #ccc;border-radius:8px;outline:none;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.15);";

      map.controls[google.maps.ControlPosition.TOP_RIGHT].push(input);

      const searchBox = new google.maps.places.SearchBox(input);
      searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();
        if (!places?.length) return;
        const place = places[0];
        if (!place.geometry?.location) return;
        map.setCenter(place.geometry.location);
        map.setZoom(15);
        marker.setPosition(place.geometry.location);
        marker.setVisible(true);
        const details = extractPlaceDetails(place.address_components || []);
        details.address = place.formatted_address;
        onLocationChange(place.geometry.location.lat(), place.geometry.location.lng(), place.formatted_address, details);
        setSelectedAddress(place.formatted_address || null);
      });

      // Detect Google Maps auth failures (domain restrictions, etc.)
      // Google fires an "authFailure" callback on window when API key is restricted
      const origAuthFailure = (window as any).gm_authFailure;
      (window as any).gm_authFailure = () => {
        console.warn("[GoogleMapPicker] Google Maps auth failure — switching to fallback");
        setMapReady(false);
        setError("maps_auth_failed");
        origAuthFailure?.();
      };

      // Check if tiles actually loaded after a timeout
      setTimeout(() => {
        const tiles = mapRef.current?.querySelectorAll("img");
        const hasTiles = tiles && tiles.length > 2;
        if (!hasTiles) {
          console.warn("[GoogleMapPicker] Map tiles may not have loaded");
        }
      }, 5000);

      setMapReady(true);
      setLoading(false);
    } catch (err) {
      console.error("Map init error:", err);
      setError("maps_load_failed");
      setLoading(false);
    }
  }, [lat, lng, onLocationChange, reverseGeocode, extractPlaceDetails]);

  useEffect(() => {
    initMap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback geocode search using Nominatim (free, no key needed)
  const handleFallbackSearch = async () => {
    if (!manualSearch.trim()) return;
    setSearching(true);
    try {
      const q = encodeURIComponent(manualSearch.trim() + " السعودية");
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&accept-language=ar`);
      const results = await res.json();
      if (results.length > 0) {
        const r = results[0];
        const rLat = parseFloat(r.lat);
        const rLng = parseFloat(r.lon);
        const nearest = findNearestCity(rLat, rLng);
        const addr = r.display_name || `بالقرب من ${nearest.name}`;
        setSelectedAddress(addr);
        onLocationChange(rLat, rLng, addr, { city: nearest.name, address: addr });

        // If map is ready, center it on the result
        if (mapInstanceRef.current && markerRef.current) {
          const pos = new google.maps.LatLng(rLat, rLng);
          mapInstanceRef.current.setCenter(pos);
          mapInstanceRef.current.setZoom(15);
          markerRef.current.setPosition(pos);
          markerRef.current.setVisible(true);
        }
      } else {
        setSelectedAddress("لم يتم العثور على نتائج");
      }
    } catch {
      setSelectedAddress("فشل البحث");
    }
    setSearching(false);
  };

  const clearLocation = () => {
    if (markerRef.current) {
      markerRef.current.setVisible(false);
    }
    setSelectedAddress(null);
    onLocationChange(0, 0);
  };

  const applyParsedLocation = (pLat: number, pLng: number) => {
    const addr = `${pLat.toFixed(5)}, ${pLng.toFixed(5)}`;
    const nearest = findNearestCity(pLat, pLng);
    setSelectedAddress(nearest.name ? `بالقرب من ${nearest.name}` : addr);
    // Always pass city from nearest city lookup so disclosure gets filled
    onLocationChange(pLat, pLng, addr, { city: nearest.name, address: addr });
    setPasteInput("");

    if (mapInstanceRef.current && markerRef.current) {
      const pos = new google.maps.LatLng(pLat, pLng);
      mapInstanceRef.current.setCenter(pos);
      mapInstanceRef.current.setZoom(15);
      markerRef.current.setPosition(pos);
      markerRef.current.setVisible(true);
    }

    // If Google Maps loaded, do a proper reverse geocode to get accurate city/district
    if (typeof google !== "undefined" && google.maps) {
      reverseGeocode(new google.maps.LatLng(pLat, pLng));
    }
  };

  const isShortLink = (input: string) => /\b(goo\.gl|maps\.app)\b/i.test(input.trim());

  const handlePasteLocation = async () => {
    const trimmed = pasteInput.trim();
    if (!trimmed) return;

    let inputToParse = trimmed;

    if (isShortLink(trimmed)) {
      setSearching(true);
      setSelectedAddress("جاري تحويل الرابط...");
      try {
        const { data } = await supabase.functions.invoke("resolve-maps-url", {
          body: { url: trimmed },
        });

        if (data?.resolvedUrl) {
          inputToParse = data.resolvedUrl;
        } else {
          setSelectedAddress("جرب نسخ الرابط الكامل من متصفح الخرائط بدل التطبيق");
          setSearching(false);
          return;
        }
      } catch {
        setSelectedAddress("جرب نسخ الرابط الكامل من متصفح الخرائط بدل التطبيق");
        setSearching(false);
        return;
      }
    }

    const parsed = parseLocationInput(inputToParse);
    if (parsed) {
      applyParsedLocation(parsed.lat, parsed.lng);
      setSearching(false);
      return;
    }

    if (isShortLink(trimmed)) {
      setSelectedAddress("جرب نسخ الرابط الكامل من متصفح الخرائط بدل التطبيق");
      setSearching(false);
      return;
    }

    setSelectedAddress("لم يتم التعرف على الإحداثيات — جرب لصق رابط خرائط قوقل أو إحداثيات مثل: 24.7136, 46.6753");
  };

  // Pure fallback UI when maps completely failed
  if (error && !mapReady) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={16} className="text-primary" />
            <span>الصق رابط الموقع من خرائط قوقل</span>
          </div>
          <PasteLocationBar pasteInput={pasteInput} setPasteInput={setPasteInput} onPaste={handlePasteLocation} loading={searching} />
          <AddressDisplay address={selectedAddress} onClear={clearLocation} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Paste coordinates / Google Maps link — PROMINENT at top */}
      <div className="rounded-xl border-2 border-primary/50 bg-primary/10 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <ClipboardPaste size={16} />
          <span>📍 الصق رابط الموقع من خرائط قوقل</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          افتح خرائط قوقل → اضغط على الموقع → انسخ الرابط والصقه هنا
        </p>
        <PasteLocationBar pasteInput={pasteInput} setPasteInput={setPasteInput} onPaste={handlePasteLocation} loading={searching} />
      </div>

      <AddressDisplay address={selectedAddress} onClear={clearLocation} />

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-border/50">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}
        <div ref={mapRef} className="w-full h-[280px]" />
      </div>
    </div>
  );
};

/** Parse Google Maps URL or raw coordinates */
function parseLocationInput(input: string): { lat: number; lng: number } | null {
  const trimmed = input.trim();

  // Try raw coordinates: "24.7136, 46.6753" or "24.7136 46.6753"
  const coordMatch = trimmed.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  }

  // Try Google Maps URL patterns
  // https://www.google.com/maps/@24.7136,46.6753,15z
  const atMatch = trimmed.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // https://www.google.com/maps/place/.../@24.7136,46.6753
  // https://maps.google.com/?q=24.7136,46.6753
  const qMatch = trimmed.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  // https://maps.app.goo.gl or goo.gl/maps short links — can't resolve without redirect
  // https://www.google.com/maps/place/24°42'49.0"N+46°40'31.1"E
  const dmsMatch = trimmed.match(/(\d+)°(\d+)'([\d.]+)"([NS])\+?(\d+)°(\d+)'([\d.]+)"([EW])/);
  if (dmsMatch) {
    let lat = parseInt(dmsMatch[1]) + parseInt(dmsMatch[2]) / 60 + parseFloat(dmsMatch[3]) / 3600;
    let lng = parseInt(dmsMatch[5]) + parseInt(dmsMatch[6]) / 60 + parseFloat(dmsMatch[7]) / 3600;
    if (dmsMatch[4] === "S") lat = -lat;
    if (dmsMatch[8] === "W") lng = -lng;
    return { lat, lng };
  }

  // /place/ pattern with decimal coords
  const placeMatch = trimmed.match(/\/place\/[^/]*\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) {
    return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  }

  // ll= parameter
  const llMatch = trimmed.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch) {
    return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
  }

  // Google internal !3dLAT!4dLNG (used in directions, place, and share URLs)
  const bangMatch = trimmed.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
  if (bangMatch) {
    return { lat: parseFloat(bangMatch[1]), lng: parseFloat(bangMatch[2]) };
  }

  // /dir/LAT,LNG/ pattern (Google directions start point)
  const dirMatch = trimmed.match(/\/dir\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (dirMatch) {
    return { lat: parseFloat(dirMatch[1]), lng: parseFloat(dirMatch[2]) };
  }

  return null;
}

/** Reusable fallback search input */
const FallbackSearchBar = ({
  manualSearch,
  setManualSearch,
  searching,
  onSearch,
}: {
  manualSearch: string;
  setManualSearch: (v: string) => void;
  searching: boolean;
  onSearch: () => void;
}) => (
  <div className="flex gap-2" dir="rtl">
    <Input
      placeholder="ابحث: اسم الحي، المدينة، الشارع..."
      value={manualSearch}
      onChange={(e) => setManualSearch(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onSearch()}
      className="flex-1 rounded-lg text-sm"
    />
    <Button
      size="sm"
      onClick={onSearch}
      disabled={searching || !manualSearch.trim()}
      className="rounded-lg gap-1.5"
    >
      {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
      بحث
    </Button>
  </div>
);

/** Reusable paste location input */
const PasteLocationBar = ({
  pasteInput,
  setPasteInput,
  onPaste,
  loading: pasteLoading,
}: {
  pasteInput: string;
  setPasteInput: (v: string) => void;
  onPaste: () => void;
  loading?: boolean;
}) => (
  <div className="flex gap-2" dir="ltr">
    <Input
      placeholder="الصق رابط قوقل ماب هنا"
      value={pasteInput}
      onChange={(e) => setPasteInput(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onPaste()}
      className="flex-1 rounded-lg text-sm text-left"
      dir="ltr"
    />
    <Button
      size="sm"
      onClick={onPaste}
      disabled={!pasteInput.trim() || pasteLoading}
      className="rounded-lg gap-1.5"
    >
      {pasteLoading ? <Loader2 size={14} className="animate-spin" /> : <ClipboardPaste size={14} />}
      تحديد
    </Button>
  </div>
);

/** Reusable address display */
const AddressDisplay = ({ address, onClear }: { address: string | null; onClear: () => void }) => {
  if (!address) return null;
  if (address === "لم يتم العثور على نتائج") {
    return <p className="text-xs text-destructive">لم يتم العثور على نتائج، حاول بكلمات مختلفة</p>;
  }
  if (address === "فشل البحث") {
    return <p className="text-xs text-destructive">فشل البحث، حاول مرة أخرى</p>;
  }
  if (address.startsWith("لم يتم التعرف على")) {
    return <p className="text-xs text-destructive">{address}</p>;
  }
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg px-3 py-2">
      <MapPin size={12} className="text-primary shrink-0" />
      <span className="flex-1 truncate">{address}</span>
      <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
        <X size={12} />
      </button>
    </div>
  );
};

export default GoogleMapPicker;
