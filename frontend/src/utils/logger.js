export const logError = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(...args);
  }
};

export const logWarn = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(...args);
  }
};
