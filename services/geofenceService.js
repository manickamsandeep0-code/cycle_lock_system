import { KARUNYA_LOCATION } from '../constants';

// Karunya University Campus Boundary (approximate polygon)
// Coimbatore, Tamil Nadu
const CAMPUS_BOUNDARY = {
  center: KARUNYA_LOCATION,
  radius: 2000, // 2km radius from center (simplified circular geofence)
  // For production, use actual polygon coordinates:
  // polygon: [
  //   { latitude: 10.9400, longitude: 76.7400 },
  //   { latitude: 10.9400, longitude: 76.7480 },
  //   { latitude: 10.9320, longitude: 76.7480 },
  //   { latitude: 10.9320, longitude: 76.7400 },
  // ]
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Check if location is within campus boundary
export const isWithinCampus = (latitude, longitude) => {
  const distance = calculateDistance(
    latitude,
    longitude,
    CAMPUS_BOUNDARY.center.latitude,
    CAMPUS_BOUNDARY.center.longitude
  );

  return distance <= CAMPUS_BOUNDARY.radius;
};

// Get distance from campus center
export const getDistanceFromCampus = (latitude, longitude) => {
  const distance = calculateDistance(
    latitude,
    longitude,
    CAMPUS_BOUNDARY.center.latitude,
    CAMPUS_BOUNDARY.center.longitude
  );

  return Math.round(distance); // Return distance in meters
};

// Check if cycle is outside campus and return warning
export const checkGeofence = (latitude, longitude) => {
  const withinCampus = isWithinCampus(latitude, longitude);
  const distance = getDistanceFromCampus(latitude, longitude);

  if (!withinCampus) {
    const excessDistance = distance - CAMPUS_BOUNDARY.radius;
    return {
      isViolation: true,
      message: `Cycle is ${Math.round(excessDistance)}m outside campus boundary`,
      distance: excessDistance,
      severity: excessDistance > 500 ? 'high' : 'medium'
    };
  }

  // Warning if getting close to boundary (within 100m)
  const distanceToBoundary = CAMPUS_BOUNDARY.radius - distance;
  if (distanceToBoundary < 100) {
    return {
      isViolation: false,
      message: `Warning: Approaching campus boundary (${Math.round(distanceToBoundary)}m remaining)`,
      distance: distanceToBoundary,
      severity: 'low'
    };
  }

  return {
    isViolation: false,
    message: 'Within campus boundary',
    distance: 0,
    severity: null
  };
};

// Calculate penalty for going outside campus
export const calculateGeofencePenalty = (distanceOutside, timeOutside) => {
  // Base penalty: ₹50 for going outside
  let penalty = 50;

  // Additional ₹10 per 100m outside campus
  if (distanceOutside > 0) {
    penalty += Math.floor(distanceOutside / 100) * 10;
  }

  // Additional ₹5 per minute outside campus
  if (timeOutside > 0) {
    const minutesOutside = Math.floor(timeOutside / 60000);
    penalty += minutesOutside * 5;
  }

  // Cap penalty at ₹500
  return Math.min(penalty, 500);
};

// Get formatted boundary info
export const getCampusBoundaryInfo = () => {
  return {
    center: CAMPUS_BOUNDARY.center,
    radius: CAMPUS_BOUNDARY.radius,
    radiusKm: (CAMPUS_BOUNDARY.radius / 1000).toFixed(1),
    description: `Karunya University Campus (${(CAMPUS_BOUNDARY.radius / 1000).toFixed(1)}km radius)`
  };
};
