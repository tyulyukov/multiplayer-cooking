import { colors } from "@multiplayer-cooking/theme";
import * as WebBrowser from "expo-web-browser";
import { useWindowDimensions } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import type { MarkdownStyle } from "react-native-enriched-markdown";

import { fonts } from "@/shared/fonts";
import { maxFontScale } from "@/shared/lib/type-scale";

const imagePattern = /!\[[^\]]*\]\([^)]*\)/g;

const heading = (fontSize: number, lineHeight: number) => ({
  fontFamily: fonts.sign,
  fontSize,
  lineHeight,
  color: colors.foreground,
  marginTop: 12,
  marginBottom: 6,
});

const markdownStyle = {
  paragraph: {
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 24,
    color: colors.foreground,
    marginBottom: 10,
  },
  h1: heading(22, 26),
  h2: heading(20, 24),
  h3: heading(18, 22),
  h4: heading(17, 22),
  h5: heading(17, 22),
  h6: heading(17, 22),
  strong: { fontFamily: fonts.sansBold },
  em: { fontFamily: fonts.sans, fontStyle: "italic" },
  list: {
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 24,
    color: colors.foreground,
    marginLeft: 8,
    gapWidth: 8,
    itemSpacing: 4,
    marginBottom: 10,
    bulletColor: colors.tealDeep,
    markerColor: colors.tealDeep,
  },
  link: { fontFamily: fonts.sansMedium, color: colors.tealDeep, underline: true },
  code: {
    fontFamily: "Menlo",
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.muted,
    borderColor: colors.border,
  },
  blockquote: {
    borderColor: colors.border,
    borderWidth: 3,
    gapWidth: 10,
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 24,
  },
  thematicBreak: { color: colors.border, height: 2, marginTop: 12, marginBottom: 12 },
  table: {
    fontFamily: fonts.sans,
    fontSize: 15,
    headerFontFamily: fonts.sansSemiBold,
    borderColor: colors.border,
    headerBackgroundColor: colors.muted,
    color: colors.foreground,
  },
  image: { borderRadius: 14 },
} satisfies MarkdownStyle;

type MarkdownProps = { text: string; noImages?: boolean; selectable?: boolean };

export function Markdown({ text, noImages = false, selectable = true }: MarkdownProps) {
  const { fontScale } = useWindowDimensions();

  return (
    <EnrichedMarkdownText
      key={fontScale}
      flavor="github"
      markdown={noImages ? text.replace(imagePattern, "") : text}
      markdownStyle={markdownStyle}
      selectable={selectable}
      selectionColor={colors.teal}
      maxFontSizeMultiplier={maxFontScale.body}
      onLinkPress={({ url }) => {
        void WebBrowser.openBrowserAsync(url);
      }}
    />
  );
}
