import {
  cookingCredentialKey,
  createCookingCredential as createCredential,
  inviteFromFragment,
  parseCookingCredential,
  type CookingCredential,
} from "@multiplayer-cooking/core/cooking/cooking-session";

export const createCookingCredential = (inviteToken?: string) => {
  return createCredential(() => crypto.randomUUID(), inviteToken);
};

export const readCookingCredential = (roomId: string) => {
  try {
    return parseCookingCredential(localStorage.getItem(cookingCredentialKey(roomId)));
  } catch {
    return null;
  }
};

export const saveCookingCredential = (roomId: string, credential: CookingCredential) => {
  localStorage.setItem(cookingCredentialKey(roomId), JSON.stringify(credential));
};

export const clearCookingCredential = (roomId: string) => {
  localStorage.removeItem(cookingCredentialKey(roomId));
};

export const inviteFromHash = () => {
  return inviteFromFragment(window.location.hash);
};
