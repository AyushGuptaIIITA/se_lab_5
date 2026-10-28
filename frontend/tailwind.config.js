/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#ff6f61', // 1mg Signature Coral / Red-Orange
          hover: '#e2584a',
          light: '#fff4f2',
          50: '#fff5f3',
          100: '#ffe8e4',
          500: '#ff6f61',
          600: '#e5594b',
          700: '#cc4537',
        },
        secondary: {
          DEFAULT: '#10847e', // 1mg Signature Deep Teal / Medical Green
          hover: '#0c6b66',
          light: '#e8f6f5',
          50: '#f0f9f8',
          100: '#d9f1ee',
          500: '#10847e',
          600: '#0d706a',
          700: '#0a5b56',
        },
        accent: {
          amber: '#fe8d00',
        },
        app: {
          bg: '#f8f9fa',
          card: '#ffffff',
          dark: '#1e2428',
          text: '#212121',
          muted: '#666666',
          border: '#e0e0e0',
        },
        brand: {
          50: '#fff5f3',
          100: '#ffe8e4',
          200: '#ffd0c7',
          300: '#ffb2a3',
          400: '#ff8a73',
          500: '#ff6f61',
          600: '#e5594b',
          700: '#cc4537',
          800: '#b23428',
          900: '#8c241b',
          950: '#4c110b',
        },
      },
    },
  },
  plugins: [],
};
