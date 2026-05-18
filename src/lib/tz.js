/**
 * Time-zone utilities.
 *
 * Note: no static `tzdata.json` ships with the app — the IANA timezone
 * database is bundled with every modern JS runtime via the ECMAScript
 * Internationalization API (`Intl.DateTimeFormat`), so we lean on that
 * for DST-correct conversions instead.
 */

/** @returns {string} The browser's resolved IANA timezone, falling back to UTC. */
export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Convert a wall-clock date/time in an IANA time zone to the corresponding
 * UTC instant (as a `Date`). Handles DST and historical offset rules via
 * `Intl.DateTimeFormat`.
 *
 * Algorithm: compute the zone's UTC offset at a tentative UTC instant,
 * then correct it once (sufficient unless the wall time straddles a DST
 * transition; for ambiguous/skipped wall times the standard offset is used).
 *
 * @param {number} year
 * @param {number} month  1–12
 * @param {number} day    1–31
 * @param {number} hour   0–23
 * @param {number} minute 0–59
 * @param {string} timeZone IANA zone name (e.g. "America/New_York")
 * @returns {Date}
 */
export function zonedTimeToUtcDate(year, month, day, hour, minute, timeZone) {
  // First guess: treat the wall time as if it were UTC.
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset1 = getZoneOffsetMinutes(guess, timeZone);
  const corrected = guess - offset1 * 60_000;
  // Second pass in case the first guess landed on the wrong side of a DST flip.
  const offset2 = getZoneOffsetMinutes(corrected, timeZone);
  if (offset2 !== offset1) {
    return new Date(guess - offset2 * 60_000);
  }
  return new Date(corrected);
}

/**
 * Returns the offset (in minutes east of UTC) of the given IANA zone
 * at the supplied UTC instant.
 *
 * @param {number} utcMs    Milliseconds since the Unix epoch.
 * @param {string} timeZone IANA zone name.
 * @returns {number}
 */
export function getZoneOffsetMinutes(utcMs, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const map = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return Math.round((asUTC - utcMs) / 60_000);
}

/**
 * Format an IANA time zone label like "UTC+05:30" for a given instant.
 * @param {Date}   date
 * @param {string} timeZone
 */
export function formatOffsetLabel(date, timeZone) {
  const mins = getZoneOffsetMinutes(date.getTime(), timeZone);
  const sign = mins >= 0 ? "+" : "-";
  const a = Math.abs(mins);
  const hh = String(Math.floor(a / 60)).padStart(2, "0");
  const mm = String(a % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}
