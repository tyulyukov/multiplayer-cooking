const relative = new Intl.RelativeTimeFormat("uk", { numeric: "auto" });
const clock = new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit" });
const thisYear = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
const otherYear = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const minute = 60_000;
const hour = 60 * minute;

function startOfDay(at: number) {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// "щойно", "5 хвилин тому", "3 години тому", "вчора, 14:30", then the full local date with time.
export function formatRelativeTime(at: number, now: number) {
  const elapsed = Math.max(0, now - at);

  if (elapsed < minute) {
    return "щойно";
  }

  if (elapsed < hour) {
    return relative.format(-Math.floor(elapsed / minute), "minute");
  }

  if (elapsed < 24 * hour) {
    return relative.format(-Math.floor(elapsed / hour), "hour");
  }

  const days = Math.round((startOfDay(now) - startOfDay(at)) / (24 * hour));

  if (days === 1) {
    return `вчора, ${clock.format(at)}`;
  }

  const format = new Date(at).getFullYear() === new Date(now).getFullYear() ? thisYear : otherYear;

  return format.format(at);
}
