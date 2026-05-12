/** @type {import('tailwindcss').Config} */
// `colors.primary` must match `theme.primaryHex` in src/app.config.ts (NativeWind preset).
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#E15A82',
      },
    },
  },
  plugins: [],
};
