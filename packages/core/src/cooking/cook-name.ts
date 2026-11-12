export const cookNameStorageKey = "multiplayer-cooking.cook-name";

const maxCookNameLength = 80;

export const normalizeCookName = (value: string) => {
  const name = value.trim();

  return name.length > 0 && name.length <= maxCookNameLength ? name : "";
};

export const resolveCookName = (initialName: string, savedName: string, suggestedName: string) => {
  return (
    normalizeCookName(savedName) ||
    normalizeCookName(initialName) ||
    normalizeCookName(suggestedName)
  );
};
