export const colors = {
  background: "#f3eee4",
  foreground: "#16191d",
  card: "#ffffff",
  cardForeground: "#16191d",
  popover: "#ffffff",
  popoverForeground: "#16191d",
  primary: "#c8e63c",
  primaryForeground: "#1f2a00",
  secondary: "#e9e3d7",
  secondaryForeground: "#16191d",
  muted: "#e9e3d7",
  mutedForeground: "#666d74",
  accent: "#e5127f",
  accentForeground: "#ffffff",
  accentDeep: "#b40d63",
  accentHighlight: "#ff8fcb",
  teal: "#3ec1be",
  tealDeep: "#147d7b",
  neonBlue: "#3f7dff",
  destructive: "#b5223b",
  destructiveForeground: "#8e1218",
  destructiveSoft: "#fbe9ea",
  border: "#ddd6c9",
  input: "#ddd6c9",
} as const;

export const radii = {
  base: 12,
  button: 12,
  card: 14,
  sign: 18,
  composer: 22,
  full: 9999,
} as const;

export const typography = {
  sans: "Golos Text Variable",
  sign: "Oswald Variable",
} as const;

export const motion = {
  duration: {
    micro: 80,
    quick: 150,
    medium: 350,
    slow: 400,
  },
  easing: {
    smoothOut: [0.22, 1, 0.36, 1],
  },
} as const;
