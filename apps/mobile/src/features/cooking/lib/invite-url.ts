const webOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "https://cooking.tyulyukov.com";

// Same link the web app shares, so one invite opens either client.
export const inviteUrl = (roomId: string, inviteToken: string) =>
  `${webOrigin}/cook/${roomId}#invite=${inviteToken}`;

export const roomUrl = (roomId: string) => `${webOrigin}/cook/${roomId}`;
