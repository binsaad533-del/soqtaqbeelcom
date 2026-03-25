/**
 * Saudi cities with approximate lat/lng for "Near Me" geolocation matching.
 * Arabic name matches the city field used in listings.
 */
export interface CityCoord {
  name: string;
  lat: number;
  lng: number;
}

export const SAUDI_CITIES: CityCoord[] = [
  { name: "الرياض", lat: 24.7136, lng: 46.6753 },
  { name: "جدة", lat: 21.4858, lng: 39.1925 },
  { name: "مكة", lat: 21.3891, lng: 39.8579 },
  { name: "المدينة", lat: 24.5247, lng: 39.5692 },
  { name: "الدمام", lat: 26.3927, lng: 49.9777 },
  { name: "الخبر", lat: 26.2172, lng: 50.1971 },
  { name: "الظهران", lat: 26.2361, lng: 50.0393 },
  { name: "الطائف", lat: 21.2703, lng: 40.4158 },
  { name: "تبوك", lat: 28.3835, lng: 36.5662 },
  { name: "بريدة", lat: 26.3260, lng: 43.9750 },
  { name: "عنيزة", lat: 26.0841, lng: 43.9932 },
  { name: "حائل", lat: 27.5219, lng: 41.6903 },
  { name: "خميس مشيط", lat: 18.3066, lng: 42.7294 },
  { name: "أبها", lat: 18.2164, lng: 42.5053 },
  { name: "نجران", lat: 17.4933, lng: 44.1277 },
  { name: "جازان", lat: 16.8892, lng: 42.5511 },
  { name: "ينبع", lat: 24.0895, lng: 38.0618 },
  { name: "الباحة", lat: 20.0000, lng: 41.4667 },
  { name: "سكاكا", lat: 29.9697, lng: 40.2064 },
  { name: "عرعر", lat: 30.9753, lng: 41.0381 },
  { name: "القطيف", lat: 26.5197, lng: 49.9983 },
  { name: "الجبيل", lat: 27.0046, lng: 49.6225 },
  { name: "الأحساء", lat: 25.3830, lng: 49.5853 },
  { name: "الرس", lat: 25.8636, lng: 43.4978 },
  { name: "المجمعة", lat: 25.9013, lng: 45.3435 },
  { name: "حفر الباطن", lat: 28.4328, lng: 45.9619 },
  { name: "الخرج", lat: 24.1556, lng: 47.3122 },
  { name: "الزلفي", lat: 26.2919, lng: 44.8167 },
  { name: "الدوادمي", lat: 24.5072, lng: 44.3939 },
  { name: "شقراء", lat: 25.2311, lng: 45.2519 },
  { name: "وادي الدواسر", lat: 20.4667, lng: 44.7333 },
  { name: "بيشة", lat: 19.9833, lng: 42.6000 },
  { name: "القنفذة", lat: 19.1264, lng: 41.0789 },
  { name: "رابغ", lat: 22.8006, lng: 39.0346 },
  { name: "الليث", lat: 20.1500, lng: 40.2667 },
  { name: "محايل عسير", lat: 18.5333, lng: 42.0500 },
  { name: "صبيا", lat: 17.1500, lng: 42.6333 },
  { name: "القريات", lat: 31.3319, lng: 37.3428 },
  { name: "رفحاء", lat: 29.6167, lng: 43.5000 },
  { name: "طريف", lat: 31.6667, lng: 38.6667 },
];

/** Haversine distance in km */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Find the nearest Saudi city to given coordinates */
export function findNearestCity(lat: number, lng: number): CityCoord {
  let nearest = SAUDI_CITIES[0];
  let minDist = Infinity;
  for (const city of SAUDI_CITIES) {
    const d = haversine(lat, lng, city.lat, city.lng);
    if (d < minDist) {
      minDist = d;
      nearest = city;
    }
  }
  return nearest;
}

/** Get nearby cities within a radius (default 100km) */
export function getNearbyCities(lat: number, lng: number, radiusKm = 100): string[] {
  return SAUDI_CITIES
    .map(c => ({ name: c.name, dist: haversine(lat, lng, c.lat, c.lng) }))
    .filter(c => c.dist <= radiusKm)
    .sort((a, b) => a.dist - b.dist)
    .map(c => c.name);
}

/** Request browser geolocation */
export function requestGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000, // cache for 5 minutes
    });
  });
}
