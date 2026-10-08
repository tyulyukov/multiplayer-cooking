import { useEffect, useState } from "react";

import { useOnline } from "@/shared/hooks/use-online";

const offlineDelayMs = 1500;

// The Convex socket is briefly down at launch; report offline only once it stays down.
export const useOffline = () => {
  const online = useOnline();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOffline(!online), online ? 0 : offlineDelayMs);

    return () => clearTimeout(timer);
  }, [online]);

  return offline;
};
