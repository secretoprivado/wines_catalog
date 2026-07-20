/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_GOOGLE_SHEET_ID: string;
  readonly PUBLIC_GOOGLE_SHEET_SPIRITS_GID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
