/// <reference types="google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { findNearestCity } from "@/lib/saudiCities";

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
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

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
      // Fetch API key from edge function
      const { data, error: fnError } = await supabase.functions.invoke("get-maps-key");
      if (fnError || !data?.key) {
        setError("تعذر تحميل خرائط قوقل");
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
        mapTypeControl: false,
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

      // Click on map to place marker
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        marker.setPosition(e.latLng);
        marker.setVisible(true);
        reverseGeocode(e.latLng);
      });

      // Drag marker
      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (!pos) return;
        reverseGeocode(pos);
      });

      // Search box
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

      setLoading(false);
    } catch (err) {
      console.error("Map init error:", err);
      setError("تعذر تحميل الخريطة");
      setLoading(false);
    }
  }, [lat, lng, onLocationChange, reverseGeocode]);

  useEffect(() => {
    initMap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearLocation = () => {
    if (markerRef.current) {
      markerRef.current.setVisible(false);
    }
    setSelectedAddress(null);
    onLocationChange(0, 0);
  };

  if (error) {
    return (
      <div className={cn("rounded-xl border border-border/50 bg-muted/30 p-6 text-center", className)}>
        <MapPin size={24} className="text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative rounded-xl overflow-hidden border border-border/50">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}
        <div ref={mapRef} className="w-full h-[280px]" />
      </div>
      {selectedAddress && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <MapPin size={12} className="text-primary shrink-0" />
          <span className="flex-1 truncate">{selectedAddress}</span>
          <button onClick={clearLocation} className="text-muted-foreground hover:text-foreground">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleMapPicker;
