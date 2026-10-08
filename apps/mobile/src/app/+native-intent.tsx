// Expo Router drops URL fragments, so the web invite link `/cook/<id>#invite=<token>` becomes a search param.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const roomId = /\/cook\/([^/?#]+)/.exec(path)?.[1];

  if (!roomId) return /^multiplayer-cooking:\/\/silpo\b/.test(path) ? "/" : path;
  const invite = /[#&?]invite=([^&#]+)/.exec(path)?.[1];

  return invite ? `/cook/${roomId}?invite=${invite}` : `/cook/${roomId}`;
}
