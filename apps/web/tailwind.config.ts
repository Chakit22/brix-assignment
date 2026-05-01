import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          canvas: '#0a0a0f',
          surface: '#15131c',
          elevated: '#1f1c2a',
        },
        accent: {
          purple: {
            50: '#f5f1ff',
            100: '#ebe2ff',
            200: '#d4c1ff',
            300: '#b89aff',
            400: '#9b73ff',
            500: '#7c4dff',
            600: '#6a2eff',
            700: '#5b1ee0',
            800: '#4b1bb3',
            900: '#321079',
          },
        },
        ink: {
          DEFAULT: '#f5f3ff',
          muted: '#a39db5',
          subtle: '#6b6479',
        },
        border: {
          subtle: '#2a2636',
          strong: '#3d3650',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.6875rem' }],
        xl: ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.5rem', { lineHeight: '2.875rem' }],
      },
      borderRadius: {
        xs: '0.25rem',
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124, 77, 255, 0.4), 0 8px 32px -8px rgba(124, 77, 255, 0.45)',
        soft: '0 1px 2px rgba(0, 0, 0, 0.6), 0 8px 24px -12px rgba(0, 0, 0, 0.7)',
      },
    },
  },
  plugins: [],
};

export default config;
