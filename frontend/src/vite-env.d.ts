/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// SVG 파일 모듈 선언
declare module '*.svg' {
  const content: string;
  export default content;
}
