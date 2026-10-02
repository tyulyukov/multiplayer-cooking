import type { SessionId } from "convex-helpers/server/sessions";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import type { useSilpoConnection } from "@/features/silpo/api/use-silpo-connection";
import type { useIdeas } from "@/features/ideas/api/use-ideas";
import type { useCreateCookingRoom } from "@/features/cooking/api/use-create-cooking-room";
import type { CookingSetup } from "@/features/cooking/model/types";

type Props = {
  sessionId: SessionId | undefined;
  silpo: Pick<ReturnType<typeof useSilpoConnection>, "saveAddress">;
  ideaState: Pick<ReturnType<typeof useIdeas>, "idea" | "addToCart">;
  createCookingRoom: ReturnType<typeof useCreateCookingRoom>;
  setError: Dispatch<SetStateAction<string | null>>;
};

export const useHomeIdeaActions = ({
  sessionId,
  silpo,
  ideaState,
  createCookingRoom,
  setError,
}: Props) => {
  const { idea } = ideaState;
  const [addressError, setAddressError] = useState<string | null>(null);

  const submitAddress = async (address: string) => {
    if (!sessionId) return;
    setAddressError(null);

    try {
      const result = await silpo.saveAddress(address);

      if (result && !result.ok) setAddressError(result.message);
    } catch {
      setAddressError("Не вдалося зберегти адресу. Спробуй ще раз.");
    }
  };

  const cookCount = async (setup: CookingSetup) => {
    if (sessionId && idea) await createCookingRoom(idea._id, setup);
  };

  const submitCart = async () => {
    if (!sessionId || !idea) return;
    setError(null);

    try {
      const result = await ideaState.addToCart();

      if (result && !result.ok) setError(result.message);
    } catch {
      setError("Не вдалося додати в кошик. Спробуй ще раз.");
    }
  };

  return { addressError, submitAddress, submitCart, cookCount };
};
