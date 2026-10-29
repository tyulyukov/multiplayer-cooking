import { useCookingRoom } from "@/features/cooking/model/room-context";
import { ToolsTimer } from "@/features/cooking/ui/tools-timer";

export default function TimerRoute() {
  const { read } = useCookingRoom();

  return read ? <ToolsTimer /> : null;
}
