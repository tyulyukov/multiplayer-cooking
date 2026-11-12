import { useCookingRoom } from "@/features/cooking/model/room-context";
import { InviteSheet } from "@/features/cooking/ui/invite-sheet";

export default function InviteRoute() {
  const { read } = useCookingRoom();

  return read ? <InviteSheet /> : null;
}
