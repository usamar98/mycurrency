export const PAKISTAN_TIMEZONE = "Asia/Karachi";

const timeFormatterOptions: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
};

function parseOffsetLabel(label: string): number | null {
  if (label === "UTC" || label === "GMT") {
    return 0;
  }

  const match = label.match(/^(?:UTC|GMT)([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return sign * (hours * 60 + minutes);
}

function formatFixedOffsetTime(timezone: string, date: Date): string {
  const offsetMinutes = parseOffsetLabel(timezone);
  if (offsetMinutes === null) {
    return "Not available";
  }

  const shiftedDate = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  return new Intl.DateTimeFormat("en-PK", {
    ...timeFormatterOptions,
    timeZone: "UTC"
  }).format(shiftedDate);
}

function getIanaOffsetMinutes(timezone: string, date: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset"
    }).formatToParts(date);
    const offsetName = parts.find((part) => part.type === "timeZoneName")?.value;

    return offsetName ? parseOffsetLabel(offsetName) : null;
  } catch {
    return null;
  }
}

function getTimezoneOffsetMinutes(timezone: string, date: Date): number | null {
  const fixedOffset = parseOffsetLabel(timezone);
  if (fixedOffset !== null) {
    return fixedOffset;
  }

  return getIanaOffsetMinutes(timezone, date);
}

function formatDifference(diffMinutes: number): string {
  if (diffMinutes === 0) {
    return "Same as Pakistan";
  }

  const absMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }

  const direction =
    diffMinutes > 0 ? "ahead of Pakistan" : "behind Pakistan";
  const sign = diffMinutes > 0 ? "+" : "-";

  return `${sign}${parts.join(" ")} ${direction}`;
}

export function getPrimaryTimezone(country: {
  timezones?: string[];
}): string | null {
  return country.timezones?.[0] ?? null;
}

export function getCurrentTimeInTimezone(timezone: string | null | undefined): string {
  if (!timezone) {
    return "Not available";
  }

  const date = new Date();
  if (parseOffsetLabel(timezone) !== null) {
    return formatFixedOffsetTime(timezone, date);
  }

  try {
    return new Intl.DateTimeFormat("en-PK", {
      ...timeFormatterOptions,
      timeZone: timezone
    }).format(date);
  } catch {
    return "Not available";
  }
}

export function getTimeDifferenceFromPakistan(
  timezone: string | null | undefined
): string {
  if (!timezone) {
    return "Not available";
  }

  const date = new Date();
  const pakistanOffset = getTimezoneOffsetMinutes(PAKISTAN_TIMEZONE, date);
  const targetOffset = getTimezoneOffsetMinutes(timezone, date);

  if (pakistanOffset === null || targetOffset === null) {
    return "Not available";
  }

  return formatDifference(targetOffset - pakistanOffset);
}
