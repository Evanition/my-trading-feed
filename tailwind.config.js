/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}', 
    './pages/**/*.{js,ts,jsx,tsx,mdx}', 
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'highlight-fade': {
          '0%': { 'background-color': 'rgba(0, 188, 212, 0.15)' },
          '100%': { 'background-color': 'transparent' },
        },
        'fade-in-up': {
            'from': { opacity: '0', transform: 'translate(-50%, 20px)' },
            'to': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        'fade-out-down': {
            'from': { opacity: '1', transform: 'translate(-50%, 0)' },
            'to': { opacity: '0', transform: 'translate(-50%, 20px)' },
        },
      },
      animation: {
        'highlight-row': 'highlight-fade 1.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'fade-out-down': 'fade-out-down 0.3s ease-in forwards',
      },
    },
  },
  plugins: [],
};