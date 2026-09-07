export function productRegistryKey(ingredient: string) {
  return ingredient.trim().replace(/\s+/g, " ").normalize("NFKC").toLocaleLowerCase("uk-UA");
}
