/**
 * NPAT design tokens — mirrors HANDOFF.md / NPAT.html for consistent theming.
 */

export const npat_colors = {
  bg: "#1A1714",
  card: "#252219",
  card_hover: "#2d2922",
  border: "rgba(255,255,255,0.07)",
  yellow: "#FFD600",
  coral: "#FF5C39",
  teal: "#00C4A7",
  white: "#F5F2EA",
  muted: "#8C8678",
  dark: "#3D3930",
  dark_mid: "#2e2b23",
} as const;

export type NpatCategoryKey = "name" | "place" | "animal" | "thing";

export const npat_category_color: Record<NpatCategoryKey, string> = {
  name: npat_colors.yellow,
  place: npat_colors.coral,
  animal: npat_colors.teal,
  thing: npat_colors.white,
};

/** Unsplash photo ids + rotation (deg) for the home collage — HANDOFF §8 */
export const npat_collage_photos: ReadonlyArray<{ id: string; rot: number }> = [
  { id: "1546182990-dffeafbe841d", rot: -3 },
  { id: "1587300003388-59208cc962cb", rot: 2.5 },
  { id: "1564760055775-d63b17a55c44", rot: -4 },
  { id: "1547721064-da6cfb341d50", rot: 3.5 },
  { id: "1502602898657-3e91760cbb34", rot: -2 },
  { id: "1524492412937-b28074a5d7da", rot: 2 },
  { id: "1552832230-c0197dd311b5", rot: -3.5 },
  { id: "1485738422979-f5c462d49f74", rot: 1.5 },
  { id: "1534567153574-2b12153a87f0", rot: -1.5 },
  { id: "1551986782-d0169b3f8fa7", rot: 4 },
  { id: "1474511320723-9a56873867b5", rot: -3 },
  { id: "1501594907352-04cda38ebc29", rot: 2 },
  { id: "1472214103451-9374bd1c798e", rot: -4 },
  { id: "1507003211169-0a1dd7228f2d", rot: 3 },
  { id: "1447752875215-b2761acb3c5d", rot: -2.5 },
  { id: "1416879595882-3373a0480b5b", rot: 1 },
  { id: "1524661135-423995f22d0b", rot: -3 },
  { id: "1441974231531-c6227db76b6e", rot: 2.5 },
];
