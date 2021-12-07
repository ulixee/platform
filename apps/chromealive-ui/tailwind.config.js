module.exports = {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {},
      fontSize: {
        'tiny': ['.915rem', '1.45rem'],
      },
      colors: {
        ammoGray: '#454E57',
        ammoWhite: '#FBFDFF',
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
