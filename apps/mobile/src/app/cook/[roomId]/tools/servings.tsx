import { useCookingRoom } from "@/features/cooking/model/room-context";
import { ToolsServings } from "@/features/cooking/ui/tools-servings";

export default function ServingsRoute() {
  const { read } = useCookingRoom();

  return read ? <ToolsServings /> : null;
}
