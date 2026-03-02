// Required for adapter-static: pre-render all pages at build time.
// ssr = false because this is a pure client-side app (uses onMount, browser APIs).
export const prerender = true;
export const ssr = false;
