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

// Hermes has no Intl.RelativeTimeFormat, so the Ukrainian plural forms are spelled out here.
const plural = (count: number, [one, few, many]: readonly [string, string, string]) => {
  const ones = count % 10;
  const tens = count % 100;

  if (ones === 1 && tens !== 11) return one;

  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return few;

  return many;
};

const ago = (count: number, forms: readonly [string, string, string]) => {
  return `${count} ${plural(count, forms)} тому`;
};

const startOfDay = (at: number) => {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);

  return date.getTime();
};

// "щойно", "5 хвилин тому", "3 години тому", "вчора, 14:30", then the full local date with time.
export const formatRelativeTime = (at: number, now: number) => {
  const elapsed = Math.max(0, now - at);

  if (elapsed < minute) {
    return "щойно";
  }

  if (elapsed < hour) {
    return ago(Math.floor(elapsed / minute), ["хвилину", "хвилини", "хвилин"]);
  }

  if (elapsed < 24 * hour) {
    return ago(Math.floor(elapsed / hour), ["годину", "години", "годин"]);
  }

  const days = Math.round((startOfDay(now) - startOfDay(at)) / (24 * hour));

  if (days === 1) {
    return `вчора, ${clock.format(at)}`;
  }

  const format = new Date(at).getFullYear() === new Date(now).getFullYear() ? thisYear : otherYear;

  return format.format(at);
};
