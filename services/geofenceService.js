import { KARUNYA_LOCATION } from '../constants';

/**
 * Geofencing Service
 * Defines campus boundaries and monitors if cycles leave the area
 */

// Karunya University Campus Boundary (approximate polygon)
// These coordinates define the perimeter of the campus
export const KARUNYA_CAMPUS_BOUNDARY = [
  { latitude: 10.9420, longitude: 76.7380 }, // North-West corner
  { latitude: 10.9420, longitude: 76.7520 }, // North-East corner
  { latitude: 10.9300, longitude: 76.7520 }, // South-East corner
  { latitude: 10.9300, longitude: 76.7380 }, // South-West corner
];

// Safe zones within campus (e.g., hostels, academic blocks)
export const SAFE_ZONES = {
  ACADEMIC_BLOCK: {
    name: 'Academic Block',
    center: { latitude: 10.9362, longitude: 76.7441 },
    radius: 200, // meters
  },
  HOSTEL_ZONE: {
    name: 'Hostel Area',
    center: { latitude: 10.9380, longitude: 76.7460 },
    radius: 150,
  },
  SPORTS_COMPLEX: {
    name: 'Sports Complex',
    center: { latitude: 10.9340, longitude: 76.7420 },
    radius: 100,
  },
};

/**
 * Check if a location is within campus boundaries
 * @param {object} location - {latitude, longitude}
 * @returns {boolean}
 */
export const isWithinCampus = (location) => {
  return isPointInPolygon(location, KARUNYA_CAMPUS_BOUNDARY);
};

/**
 * Check if a location is in a safe zone
 * @param {object} location - {latitude, longitude}
 * @returns {object|null} Safe zone info if inside, null otherwise
 */
export const isInSafeZone = (location) => {
  for (const [key, zone] of Object.entries(SAFE_ZONES)) {
    const distance = calculateDistance(location, zone.center);
    if (distance <= zone.radius) {
      return { ...zone, key };
    }
  }
  return null;
};

/**
 * Calculate penalty for taking cycle outside campus
 * @param {number} distanceOutside - Distance outside boundary in meters
 * @param {number} timeOutside - Time outside in minutes
 * @returns {number} Penalty amount in rupees
 */
export const calculateOutOfBoundsPenalty = (distanceOutside, timeOutside) => {
  const basePenalty = 100; // ₹100 base penalty
  const distancePenalty = Math.floor(distanceOutside / 100) * 10; // ₹10 per 100m
  const timePenalty = Math.floor(timeOutside / 10) * 20; // ₹20 per 10 minutes
  
  return basePenalty + distancePenalty + timePenalty;
};

/**
 * Get warning message based on distance from boundary
 * @param {number} distanceToBoundary - Distance to boundary in meters
 * @returns {string|null} Warning message or null if safe
 */
export const getGeofenceWarning = (distanceToBoundary) => {
  if (distanceToBoundary < 0) {
    return '⚠️ You are outside campus! Return immediately to avoid penalty.';
  } else if (distanceToBoundary < 50) {
    return '⚠️ Warning: Approaching campus boundary!';
  } else if (distanceToBoundary < 100) {
    return 'ℹ️ Notice: You are near the campus edge.';
  }
  return null;
};

/**
 * Calculate distance from a point to the nearest boundary edge
 * @param {object} location - {latitude, longitude}
 * @param {array} polygon - Boundary polygon
 * @returns {number} Distance in meters (negative if outside)
 */
export const distanceToBoundary = (location, polygon) => {
  const isInside = isPointInPolygon(location, polygon);
  
  // Find nearest edge
  let minDistance = Infinity;
  
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const distance = distanceToLineSegment(
      location,
      polygon[i],
      polygon[j]
    );
    minDistance = Math.min(minDistance, distance);
  }
  
  return isInside ? minDistance : -minDistance;
};

/**
 * Point in polygon test (Ray casting algorithm)
 * @param {object} point - {latitude, longitude}
 * @param {array} polygon - Array of {latitude, longitude}
 * @returns {boolean}
 */
const isPointInPolygon = (point, polygon) => {
  let inside = false;
  const x = point.latitude;
  const y = point.longitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Calculate distance between two points (Haversine formula)
 * @param {object} coord1 - {latitude, longitude}
 * @param {object} coord2 - {latitude, longitude}
 * @returns {number} Distance in meters
 */
const calculateDistance = (coord1, coord2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Distance from point to line segment
 * @param {object} point - {latitude, longitude}
 * @param {object} lineStart - {latitude, longitude}
 * @param {object} lineEnd - {latitude, longitude}
 * @returns {number} Distance in meters
 */
const distanceToLineSegment = (point, lineStart, lineEnd) => {
  const A = point.latitude - lineStart.latitude;
  const B = point.longitude - lineStart.longitude;
  const C = lineEnd.latitude - lineStart.latitude;
  const D = lineEnd.longitude - lineStart.longitude;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.latitude;
    yy = lineStart.longitude;
  } else if (param > 1) {
    xx = lineEnd.latitude;
    yy = lineEnd.longitude;
  } else {
    xx = lineStart.latitude + param * C;
    yy = lineStart.longitude + param * D;
  }

  return calculateDistance(point, { latitude: xx, longitude: yy });
};

/**
 * Get recommended return path to campus
 * @param {object} currentLocation - {latitude, longitude}
 * @returns {object} {direction: string, distance: number, destination: object}
 */
export const getReturnPath = (currentLocation) => {
  const campusCenter = KARUNYA_LOCATION;
  const distance = calculateDistance(currentLocation, campusCenter);
  
  // Calculate bearing
  const dLon = (campusCenter.longitude - currentLocation.longitude) * Math.PI / 180;
  const lat1 = currentLocation.latitude * Math.PI / 180;
  const lat2 = campusCenter.latitude * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;
  
  // Convert bearing to direction
  const directions = ['North', 'NE', 'East', 'SE', 'South', 'SW', 'West', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  
  return {
    direction: directions[index],
    distance: Math.round(distance),
    destination: campusCenter,
    bearing,
  };
};
