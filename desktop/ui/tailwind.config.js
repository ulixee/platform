module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx,html}'],
  darkMode: 'media', // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {},
      fontSize: {
        tiny: ['.915rem', '1.45rem'],
      },
      colors: {
        chrome: '#F1F3F4',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'), // eslint-disable-line import/no-extraneous-dependencies
  ],
};
