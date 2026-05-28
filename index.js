// Removed inlined HTML rendering; root now redirects to repository

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const isCalendar = pathname === '/calendar' || pathname === '/calendar.ics';

    // Redirect root requests to repository URL (env.REDIRECT)
    if (pathname === '/' || pathname === '/index.html') {
      const redirectUrl = env.REDIRECT || 'https://github.com/andesco/CalendarBlocker';
      return Response.redirect(redirectUrl, 302);
    }

    // Only allow ICS feed at /calendar or /calendar.ics; all other paths 404
    if (!isCalendar) {
      return new Response('Not found', { status: 404 });
    }


    // ICS generation at /calendar or /calendar.ics
    // Determine seed from env.SEED (defaulting to "default-seed"), optionally overridden by URL query if enabled
    let seed = env.SEED || 'default-seed';
    // Parse SEED_VIA_URL env var as boolean: accept true, 1, or yes (case-insensitive)
    const _seedViaUrlRaw = (env.SEED_VIA_URL || "").toLowerCase();
    const seedViaUrl = ["true", "1", "yes"].includes(_seedViaUrlRaw);
    if (seedViaUrl && url.searchParams.has("seed")) {
      const qSeed = url.searchParams.get("seed");
      if (qSeed) seed = qSeed;
    }

    // Configure calendar parameters from environment, with URL query overrides if provided
    // Number of days: current day + next X days; allow 'days' or alias 'd'
    let totalDays = clamp(parseInt(env.DAYS || "14", 10), 1, 21);
    if (url.searchParams.has("days") || url.searchParams.has("d")) {
      const rawDays = url.searchParams.has("days")
        ? url.searchParams.get("days")
        : url.searchParams.get("d");
      const qDays = parseInt(rawDays, 10);
      if (!isNaN(qDays)) totalDays = clamp(qDays, 1, 21);
    }
    // Block size in hours; allow 'hours' or alias 'h'
    let blockHours = validateBlockHours(parseFloat(env.HOURS || "3"));
    if (url.searchParams.has("hours") || url.searchParams.has("h")) {
      const rawHours = url.searchParams.has("hours")
        ? url.searchParams.get("hours")
        : url.searchParams.get("h");
      const qHours = parseFloat(rawHours);
      if (!isNaN(qHours)) blockHours = validateBlockHours(qHours);
    }
    // Probability of blocking a time slot; allow full range 0.00–1.00; alias 'p'
    let blockProbability = clamp(parseFloat(env.PROBABILITY || "0.50"), 0.00, 1.00);
    if (url.searchParams.has("probability") || url.searchParams.has("p")) {
      const rawProb = url.searchParams.has("probability")
        ? url.searchParams.get("probability")
        : url.searchParams.get("p");
      const qProb = parseFloat(rawProb);
      if (!isNaN(qProb)) blockProbability = clamp(qProb, 0.00, 1.00);
    }
    const calendarName = env.NAME || "CalendarBlocker";
    const uidHost = url.hostname || "blocker.andrewe.ca";

    const calendar = generateICS({
      seedSalt: seed,
      blockProbability,
      calendarName,
      uidHost,
      timezone: env.TIMEZONE || "America/Toronto",
      blockHours,
      totalDays,
    });
    // Build response
    const response = new Response(calendar, {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="${seed}.ics"`,
      },
    });
    return response;
  }
};

function generateICS({ seedSalt, blockProbability, calendarName, uidHost, timezone, blockHours, totalDays }) {
  // Get current date in local time with time set to midnight
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Create a base domain for UIDs from the seed
  // This ensures UIDs are stable but unique per calendar
  const seedHash = hashString(seedSalt).toString(16);
  const uidDomain = `${seedHash}@${uidHost || "blocker.andrewe.ca"}`;
  
  const events = [];

  // Use date strings with timezone properly specified for ICS file
  // Include current day (offset 0) and the next totalDays days (offset 1..totalDays)
  for (let dayOffset = 0; dayOffset <= totalDays; dayOffset++) {
    // Create date for this day at midnight
    const currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dateStr = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Generate deterministic seed for this date and salt
    const daySeed = hashString(seedSalt + dateStr);
    const rng = mulberry32(daySeed);

    // Generate possible time blocks for this day
    const blocksPerDay = 24 / blockHours;
    for (let i = 0; i < blocksPerDay; i++) {
      if (rng() < blockProbability) {
        // Calculate start and end times based on blockHours (supports fractional hours)
        const icsDate = dateStr.replace(/-/g, ''); // yyyymmdd
        const minutesStart = Math.round(i * blockHours * 60);
        const minutesEnd = Math.round((i + 1) * blockHours * 60);
        const startHourInt = Math.floor(minutesStart / 60);
        const startMinute = minutesStart % 60;
        const endHourInt = Math.floor(minutesEnd / 60);
        const endMinute = minutesEnd % 60;
        const formatTime = (hour, minute) => `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
        const startTime = `${icsDate}T${formatTime(startHourInt, startMinute)}`;
        const endTime = `${icsDate}T${formatTime(endHourInt, endMinute)}`;

        // Generate a deterministic UID for this event based on seed, date and time offset
        const eventIdSeed = hashString(`${seedSalt}-${dateStr}-${minutesStart}`);
        const eventId = eventIdSeed.toString(16);

        events.push(`
BEGIN:VEVENT
UID:${eventId}-${uidDomain}
DTSTAMP:${formatDateUTC(new Date())}
DTSTART;TZID=${timezone}:${startTime}
DTEND;TZID=${timezone}:${endTime}
SUMMARY:${calendarName}
TRANSP:OPAQUE
STATUS:BUSY
END:VEVENT`);
      }
    }
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cloudflare Worker//CalendarBlocker//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${calendarName}
X-WR-TIMEZONE:${timezone}
${buildVTimezone(timezone)}
${events.join("\n")}
END:VCALENDAR`;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatDateLocal(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0].slice(0, 15);
}

function formatDateUTC(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function clamp(num, min, max) {
  return isNaN(num) ? min : Math.max(min, Math.min(num, max));
}

/**
 * Validate the HOURS value, only allowing specific block sizes.
 * Allowed: 0.5, 1, 2, 3, 4, 6, 8, 12, 24
 * Defaults to 3 if invalid.
 */
function validateBlockHours(h) {
  const allowed = [0.5, 1, 2, 3, 4, 6, 8, 12, 24];
  return allowed.includes(h) ? h : 3;
}

function buildVTimezone(tzid) {
  if (tzid !== "America/Toronto") return "";
  return `
BEGIN:VTIMEZONE
TZID:America/Toronto
X-LIC-LOCATION:America/Toronto
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`;
}
