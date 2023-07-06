module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ulixee-darker': '#8D0094',
        'ulixee-purple': '#B700C0',
        'ulixee-lighter': '#D973DF',
        'ulixee-verylight': '#F6EDF7',
        'ulixee-lightest': '#FCF6FD',
      }
    }
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
