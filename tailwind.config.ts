import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pulled from the live subourbon.bar stylesheet.
        gold: {
          DEFAULT: '#BBAF52',
          bright: '#d6c86f',
          pale: '#e5de9e',
          deep: '#B89B52',
          dark: '#9a7f3e',
        },
        cream: {
          DEFAULT: '#f5f1e7',
          warm: '#faf7ee',
          dim: '#c9c3b4',
          muted: '#8f8a7d',
        },
        ink: {
          DEFAULT: '#0d0d10',
          raised: '#121218',
          card: '#15151c',
          line: '#26262f',
        },
        vault: '#1c1b16',
      },
      fontFamily: {
        // Adobe Typekit kit tia6vzj, loaded in app/layout.tsx
        display: ['guyot-headline', 'Gastromond', 'Times New Roman', 'serif'],
        serif: ['guyot-text', 'Georgia', 'serif'],
        script: ['gastromond', 'Times New Roman', 'serif'],
        sans: ['Inter Tight', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        vault: '0 24px 70px -20px rgba(0,0,0,0.85)',
        gold: '0 0 0 1px rgba(187,175,82,0.35), 0 12px 40px -12px rgba(187,175,82,0.25)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(92deg,#d4b87a,#c2a35a 40%,#9a7f3e)',
        'gold-soft': 'linear-gradient(90deg,rgba(194,163,90,0.15),rgba(194,163,90,0.35))',
      },
      transitionDuration: {
        base: '250ms',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 400ms cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}

export default config
