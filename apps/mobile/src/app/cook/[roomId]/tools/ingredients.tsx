import { useCookingRoom } from "@/features/cooking/model/room-context";
import { ToolsIngredients } from "@/features/cooking/ui/tools-ingredients";

export default function IngredientsRoute() {
  const { read } = useCookingRoom();

  return read ? <ToolsIngredients /> : null;
}
