import { useCookingRoom } from "@/features/cooking/model/room-context";
import { CompletionTicket } from "@/features/cooking/ui/completion-ticket";

export default function CookingDoneRoute() {
  const { read } = useCookingRoom();

  return read ? <CompletionTicket /> : null;
}
