import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary — warm coral
        coral: {
          50: '#fff4f2',
          100: '#ffe4de',
          200: '#ffccc3',
          300: '#ffa899',
          400: '#ff7a66',
          500: '#f95738', // main brand
          600: '#e63e1f',
          700: '#c12e14',
          800: '#9e2813',
          900: '#822516',
        },
        // Accent — warm peach/orange
        peach: {
          50: '#fff8f1',
          100: '#ffeddd',
          200: '#ffd9b8',
          300: '#ffbe86',
          400: '#ff9a4d',
          500: '#ff7c27',
          600: '#f06010',
          700: '#c74c0b',
          800: '#9e3e10',
          900: '#7e3410',
        },
        // Secondary — mint green
        mint: {
          50: '#f0fdf8',
          100: '#ccfbee',
          200: '#9af5da',
          300: '#5ee8c2',
          400: '#2cd2a5',
          500: '#14b88b',
          600: '#0d9471',
          700: '#0e755c',
          800: '#105d4b',
          900: '#114d3f',
        },
        // Neutral — warm stone (already in Tailwind)
        // Using stone directly
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08)',
        sidebar: '2px 0 8px 0 rgb(0 0 0 / 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideIn: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
