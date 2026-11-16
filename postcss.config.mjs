// Tailwind v4 runs through PostCSS on purpose. The `@tailwindcss/turbopack`
// loader that create-next-app scaffolds kept serving stale CSS from
// Turbopack's persistent cache after globals.css changed.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
