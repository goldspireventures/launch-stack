import type { Config } from 'tailwindcss';
import preset from '@goldspire/ui/tailwind-preset';

const config: Config = {
  presets: [preset as Config],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Tight tracking, modern sans — agency-site default. Falls back to
        // system stack if the variable isn't injected.
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
};

export default config;
