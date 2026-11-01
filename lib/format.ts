const TZ = "Europe/Prague";

function parts(iso: string) {
  // ISO datum bez času bereme jako kalendářní den, ne jako okamžik.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", timeZone: TZ }).format(parts(iso));
}

export function formatRange(startsOn: string, endsOn: string): string {
  if (startsOn === endsOn) return formatDate(startsOn);
  const a = parts(startsOn);
  const b = parts(endsOn);
  const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("cs-CZ", { ...o, timeZone: TZ }).format(d);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${a.getUTCDate()}.–${f(b, { day: "numeric", month: "numeric", year: "numeric" })}`;
  }
  return `${formatDate(startsOn)} – ${formatDate(endsOn)}`;
}

export function monthLabel(iso: string): string {
  const s = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric", timeZone: TZ }).format(parts(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function weekday(iso: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { weekday: "short", timeZone: TZ }).format(parts(iso));
}
