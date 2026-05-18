/**
 * Simplified planetary ephemeris for Vedic astrology
 * Based on Jean Meeus "Astronomical Algorithms", 2nd edition
 * Accuracy: Sun ~1', Moon ~5', Planets ~1-2° for 1900-2100
 */

const RAD = Math.PI / 180;

function mod360(x) {
  return ((x % 360) + 360) % 360;
}

/**
 * Julian Day Number from calendar date (Gregorian, UTC)
 */
export function julianDay(year, month, day, hour = 12, minute = 0) {
  const h = hour + minute / 60;
  let y = year, m = month;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day + B - 1524.5 + h / 24
  );
}

/** Julian Day from a JS Date object */
export function dateToJD(date) {
  return julianDay(
    date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
    date.getUTCHours(), date.getUTCMinutes()
  );
}

/** Julian centuries since J2000.0 */
function jT(jd) {
  return (jd - 2451545.0) / 36525;
}

/** Solve Kepler's equation M = E - e*sin(E) iteratively */
function solveKepler(M_rad, e) {
  let E = M_rad;
  for (let i = 0; i < 50; i++) {
    const dE = (M_rad - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/**
 * Sun's apparent ecliptic longitude (tropical, degrees)
 * Meeus Chapter 25, ~1' accuracy
 */
export function sunLongitude(jd) {
  const T = jT(jd);
  const L0 = mod360(280.46646 + 36000.76983 * T);
  const M = mod360(357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  const sun = mod360(L0 + C);
  const omega = mod360(125.04 - 1934.136 * T) * RAD;
  return mod360(sun - 0.00569 - 0.00478 * Math.sin(omega));
}

/**
 * Moon's ecliptic longitude (tropical, degrees)
 * Meeus Chapter 47, 30-term series, ~5' accuracy
 */
export function moonLongitude(jd) {
  const T = jT(jd);
  const L  = mod360(218.3165 + 481267.8813 * T);
  const M  = mod360(357.5291 + 35999.0503 * T) * RAD;
  const Mp = mod360(134.9634 + 477198.8676 * T) * RAD;
  const D  = mod360(297.8502 + 445267.1115 * T) * RAD;
  const F  = mod360(93.2721  + 483202.0175 * T) * RAD;

  const dL =
      6288774 * Math.sin(Mp) +
      1274027 * Math.sin(2*D - Mp) +
       658314 * Math.sin(2*D) +
       213618 * Math.sin(2*Mp) -
       185116 * Math.sin(M) -
       114332 * Math.sin(2*F) +
        58793 * Math.sin(2*D - 2*Mp) +
        57066 * Math.sin(2*D - M - Mp) +
        53322 * Math.sin(2*D + Mp) +
        45758 * Math.sin(2*D - M) -
        40923 * Math.sin(M - Mp) -
        34720 * Math.sin(D) -
        30383 * Math.sin(M + Mp) +
        15327 * Math.sin(2*D - 2*F) -
        12528 * Math.sin(Mp + 2*F) +
        10980 * Math.sin(Mp - 2*F) +
        10675 * Math.sin(4*D - Mp) +
        10034 * Math.sin(3*Mp) +
         8548 * Math.sin(4*D - 2*Mp) -
         7888 * Math.sin(2*D + M - Mp) -
         6766 * Math.sin(2*D + M) -
         5163 * Math.sin(D - Mp) +
         4987 * Math.sin(D + M) +
         4036 * Math.sin(2*D - M + Mp) +
         3994 * Math.sin(2*D + 2*Mp) +
         3861 * Math.sin(4*D) +
         3665 * Math.sin(2*D - 3*Mp) -
         2689 * Math.sin(M - 2*Mp) -
         2602 * Math.sin(2*D - Mp + 2*F) +
         2390 * Math.sin(2*Mp - 2*D - 2*F);

  return mod360(L + dL / 1e6);
}

/**
 * Moon's mean ascending node — Rahu (tropical, degrees)
 */
export function moonNode(jd) {
  const T = jT(jd);
  return mod360(125.0445 - 1934.1363 * T + 0.0020708 * T * T + T * T * T / 450000);
}

// Planetary orbital elements at J2000.0 (Meeus Table 31.a)
// [L0 (°), n (°/day), e, omega (°), a (AU)]
const ELEMENTS = {
  mercury: [252.250906, 4.09233445, 0.205635, 77.45779,  0.387098],
  venus:   [181.979801, 1.60213034, 0.006773, 131.56370, 0.723330],
  earth:   [100.466457, 0.98564736, 0.016708, 102.93735, 1.000000],
  mars:    [355.433275, 0.52402068, 0.093400, 336.06023, 1.523688],
  jupiter: [ 34.351519, 0.08308529, 0.048498,  14.72847, 5.202603],
  saturn:  [ 50.077444, 0.03349791, 0.055508,  92.43194, 9.554909],
};

/** Heliocentric ecliptic longitude (degrees) and radius (AU) */
function helio(el, d) {
  const [L0, n, e, omega, a] = el;
  const L = mod360(L0 + n * d);
  const M = mod360(L - omega) * RAD;
  const E = solveKepler(M, e);
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
  const lon = mod360(nu / RAD + omega);
  const r = a * (1 - e * e) / (1 + e * Math.cos(nu));
  return { lon, r };
}

/** Geocentric ecliptic longitude (tropical, degrees) for a named planet */
function geoLon(planet, d) {
  const { lon: lp, r: rp } = helio(ELEMENTS[planet], d);
  const { lon: le, r: re } = helio(ELEMENTS.earth, d);
  const lpR = lp * RAD;
  const leR = le * RAD;
  return mod360(
    Math.atan2(rp * Math.sin(lpR) - re * Math.sin(leR),
               rp * Math.cos(lpR) - re * Math.cos(leR)) / RAD
  );
}

/**
 * Lahiri (Chitra-Paksha) ayanamsa (degrees) — for tropical → sidereal conversion.
 * Value at J2000.0 epoch: ~23.853°; precession rate: ~50.3"/year = 1.3972°/century.
 * Source: Indian Astronomical Ephemeris (IAE); see also Meeus "Astronomical Algorithms"
 * Ch. 27 for the general precession context.
 */
export function lahiriAyanamsa(jd) {
  const T = jT(jd);
  return mod360(23.853 + 1.3972 * T);
}

/**
 * Mean obliquity of the ecliptic (degrees) — IAU 2006 simplified.
 */
function meanObliquity(jd) {
  const T = jT(jd);
  return 23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
}

/**
 * Greenwich Mean Sidereal Time at `jd` (degrees, 0–360).
 * Meeus eq. 12.4.
 */
function gmstDeg(jd) {
  const T = jT(jd);
  const theta =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return mod360(theta);
}

/**
 * Compute the sidereal (Lahiri) Ascendant — the ecliptic longitude rising on
 * the eastern horizon at the given moment and geographic location.
 *
 * @param {number} jd       Julian Day (UTC).
 * @param {number} latDeg   Geographic latitude, degrees (north +).
 * @param {number} lonEast  Geographic longitude, degrees east of Greenwich.
 * @returns {number} Sidereal longitude of the ascendant in degrees (0–360).
 */
export function ascendant(jd, latDeg, lonEast) {
  const eps = meanObliquity(jd) * RAD;
  const lst = mod360(gmstDeg(jd) + lonEast); // local sidereal time = RAMC
  const ramc = lst * RAD;
  const phi = latDeg * RAD;
  // Standard ascendant formula (tropical):
  //   ASC = atan2( cos(RAMC), -(sin(RAMC)*cos(eps) + tan(phi)*sin(eps)) )
  let asc =
    Math.atan2(
      Math.cos(ramc),
      -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
    ) / RAD;
  asc = mod360(asc);
  // atan2 returns either the ascendant or its opposite (the descendant). The
  // true ascendant lies ~90° east of the MC along the ecliptic; if our value
  // landed on the descendant half, flip it by 180°.
  const mc = mod360(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / RAD);
  const diff = mod360(asc - mc);
  if (diff < 90 || diff > 270) asc = mod360(asc + 180);
  // Convert tropical → sidereal (Lahiri)
  return mod360(asc - lahiriAyanamsa(jd));
}

/** Planet metadata */
export const PLANETS = [
  { id: 'sun',     name: 'Sun',     symbol: '☉', abbr: 'Su', color: '#FFD700' },
  { id: 'moon',    name: 'Moon',    symbol: '☽', abbr: 'Mo', color: '#C8D8F0' },
  { id: 'mercury', name: 'Mercury', symbol: '☿', abbr: 'Me', color: '#9DB4C8' },
  { id: 'venus',   name: 'Venus',   symbol: '♀', abbr: 'Ve', color: '#98D8A0' },
  { id: 'mars',    name: 'Mars',    symbol: '♂', abbr: 'Ma', color: '#FF6B6B' },
  { id: 'jupiter', name: 'Jupiter', symbol: '♃', abbr: 'Ju', color: '#FFA040' },
  { id: 'saturn',  name: 'Saturn',  symbol: '♄', abbr: 'Sa', color: '#B09AD8' },
  { id: 'rahu',    name: 'Rahu',    symbol: '☊', abbr: 'Ra', color: '#888899' },
  { id: 'ketu',    name: 'Ketu',    symbol: '☋', abbr: 'Ke', color: '#997799' },
];

/**
 * Compute all planet sidereal (Vedic/Lahiri) longitudes for a given JD.
 * Returns array matching PLANETS with an added `lon` field (0-360°).
 */
export function computePlanets(jd) {
  const d = jd - 2451545;
  const ayan = lahiriAyanamsa(jd);

  const rahuT = moonNode(jd);
  const tropical = {
    sun:     sunLongitude(jd),
    moon:    moonLongitude(jd),
    mercury: geoLon('mercury', d),
    venus:   geoLon('venus', d),
    mars:    geoLon('mars', d),
    jupiter: geoLon('jupiter', d),
    saturn:  geoLon('saturn', d),
    rahu:    rahuT,
    ketu:    mod360(rahuT + 180),
  };

  return PLANETS.map(p => ({
    ...p,
    lon: mod360(tropical[p.id] - ayan),
    tropicalLon: tropical[p.id],
  }));
}
