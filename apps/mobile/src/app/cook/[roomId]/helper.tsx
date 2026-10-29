import { useLocalSearchParams } from "expo-router";

import { useCookingRoom } from "@/features/cooking/model/room-context";
import { HelperSheet } from "@/features/cooking/ui/helper-sheet";

export default function HelperRoute() {
  const { prompt, stepKey } = useLocalSearchParams<{ prompt?: string; stepKey?: string }>();
  const { read } = useCookingRoom();

  return read ? <HelperSheet prompt={prompt} stepKey={stepKey} /> : null;
}
