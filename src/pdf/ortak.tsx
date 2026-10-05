import path from "node:path";
import { Font, StyleSheet } from "@react-pdf/renderer";

const klasor = path.join(process.cwd(), "src/assets/fonts");

let kayitli = false;
export function fontlariKaydet() {
  if (kayitli) return;
  Font.register({
    family: "Plex",
    fonts: [
      { src: path.join(klasor, "IBMPlexSans-Regular.woff"), fontWeight: 400 },
      { src: path.join(klasor, "IBMPlexSans-SemiBold.woff"), fontWeight: 600 },
      { src: path.join(klasor, "IBMPlexSans-Bold.woff"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "PlexMono",
    fonts: [
      { src: path.join(klasor, "IBMPlexMono-Regular.woff"), fontWeight: 400 },
      { src: path.join(klasor, "IBMPlexMono-SemiBold.woff"), fontWeight: 600 },
    ],
  });
  // Türkçe kelimeler yanlış yerden bölünmesin
  Font.registerHyphenationCallback((kelime) => [kelime]);
  kayitli = true;
}

export const RENK = {
  mavi: "#2b59e0",
  lacivert: "#0f1f44",
  zemin: "#f6f7f9",
  cizgi: "#e9ebef",
  gri: "#64748b",
  metin: "#1b2333",
  kirmizi: "#b91c1c",
};

export const ortakStil = StyleSheet.create({
  sayfa: { fontFamily: "Plex", fontSize: 9, color: RENK.metin, padding: 36, paddingBottom: 56 },
  rakam: { fontFamily: "PlexMono" },
  kalin: { fontWeight: 600 },
  gri: { color: RENK.gri },
  altBilgi: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 7.5,
    color: RENK.gri,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: RENK.cizgi,
    paddingTop: 6,
  },
});
