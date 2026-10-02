import { useEffect, useState } from "react";

// Relative labels ("5 хвилин тому") go stale while the panel is open; tick once a minute.
export const useHistoryNow = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);

    return () => window.clearInterval(id);
  }, []);

  return now;
};
