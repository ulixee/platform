export default {
  disableChromeAlive:
    process.env.NODE_ENV === 'test' ||
    Boolean(JSON.parse(process.env.DISABLE_CHROMEALIVE ?? 'false')),
};
