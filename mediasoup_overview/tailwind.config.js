/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'bounce-right': 'bounceRight 1s infinite',
        'bounce-left': 'bounceLeft 1s infinite',
        'move-right': 'moveRight 1.5s linear infinite',
        'move-left': 'moveLeft 1.5s linear infinite',
      },
      keyframes: {
        bounceRight: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(5px)' },
        },
        bounceLeft: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-5px)' },
        },
      },
    },
  },
  plugins: [],
}
