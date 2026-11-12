import { StyleSheet } from "react-native";

import { fonts } from "@/shared/fonts";

export const textVariants = StyleSheet.create({
  plate: { fontFamily: fonts.signBold, fontSize: 28, lineHeight: 30, letterSpacing: 0.2 },
  sheetTitle: { fontFamily: fonts.sign, fontSize: 22, lineHeight: 26, letterSpacing: 0.2 },
  title: { fontFamily: fonts.sign, fontSize: 24, lineHeight: 26, letterSpacing: 0.2 },
  ideaPlate: { fontFamily: fonts.signBold, fontSize: 20, lineHeight: 22, letterSpacing: 0.2 },
  numeral: {
    fontFamily: fonts.signBold,
    fontSize: 44,
    lineHeight: 44,
    fontVariant: ["tabular-nums"],
  },
  numeralSmall: {
    fontFamily: fonts.signBold,
    fontSize: 20,
    lineHeight: 22,
    fontVariant: ["tabular-nums"],
  },
  step: { fontFamily: fonts.signBold, fontSize: 20, lineHeight: 22 },
  label: { fontFamily: fonts.sign, fontSize: 13, lineHeight: 16, letterSpacing: 0.26 },
  body: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 24 },
  button: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 20 },
  secondary: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 20 },
  tag: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 18 },
  meta: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
});

export type TextVariant = keyof typeof textVariants;

export const maxFontScale = {
  plate: 1.2,
  sheetTitle: 1.3,
  title: 1.3,
  ideaPlate: 1.2,
  numeral: 1,
  numeralSmall: 1.2,
  step: 1.3,
  label: 1.6,
  body: 2,
  button: 1.6,
  secondary: 1.6,
  tag: 1.6,
  meta: 1.6,
} as const satisfies Record<TextVariant, number>;
