/**
 * Type declarations for the plain-JS showcase generator, so `conformance/showcase.test.ts` can
 * import `renderShowcase` / `esc` with real types even though `scripts/` sits outside the tsconfig
 * program. Keep in sync with the exports of `build-showcase.mjs`.
 */
export interface ShowcaseAssets {
  /** diagram type → its committed golden SVG markup */
  svgs: Record<string, string>;
  /** diagram type → the model's own `meta.title` */
  titles: Record<string, string>;
}

/** Escape text for safe interpolation into HTML element/attribute content. */
export function esc(s: unknown): string;

/** Render the whole standalone showcase page from the manifest + the per-type assets. */
export function renderShowcase(manifest: unknown, assets: ShowcaseAssets): string;

/** Read the manifest, the goldens, and each model's title; write the page into public/. */
export function main(): void;
