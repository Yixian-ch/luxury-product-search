/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Playfair Display', 'ui-serif', 'Georgia', 'serif'],
        luxury: ['Cormorant Garamond', 'Georgia', 'ui-serif', 'serif'],
      },
      colors: {
        ink: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        gold: {
          300: '#E6D5B8',
          400: '#C8A96A',
          500: '#B9934A',
          600: '#9A7B3C',
        },
        luxury: {
          white: '#FFFFFF',
          cream: '#FAF9F8',
          sand: '#E8E6E1',
          charcoal: '#1A1A1A',
          muted: '#808080',
        },
      },
      boxShadow: {
        'luxury': '0 12px 30px rgba(0,0,0,0.08)',
        'luxury-sm': '0 4px 12px rgba(0,0,0,0.04)',
        'luxury-lg': '0 20px 40px rgba(0,0,0,0.12)',
        'card': '0 2px 8px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.08)',
      },
      letterSpacing: {
        'luxury': '0.15em',
        'luxury-wide': '0.25em',
        'luxury-wider': '0.35em',
      },
      fontSize: {
        'display': ['4.5rem', { lineHeight: '1.1', letterSpacing: '0.02em' }],
        'headline': ['3rem', { lineHeight: '1.2', letterSpacing: '0.02em' }],
        'title': ['2rem', { lineHeight: '1.3', letterSpacing: '0.01em' }],
      },
    },
  },
  plugins: [],
}