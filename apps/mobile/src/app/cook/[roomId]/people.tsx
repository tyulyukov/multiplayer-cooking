import { useCookingRoom } from "@/features/cooking/model/room-context";
import { PeopleSheet } from "@/features/cooking/ui/people-sheet";

export default function PeopleRoute() {
  const { read } = useCookingRoom();

  return read ? <PeopleSheet /> : null;
}
