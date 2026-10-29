import { useCookingRoom } from "@/features/cooking/model/room-context";
import { ToolsConvert } from "@/features/cooking/ui/tools-convert";

export default function ConvertRoute() {
  const { read } = useCookingRoom();

  return read ? <ToolsConvert /> : null;
}
