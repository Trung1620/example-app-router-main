// tailwind.config.js
const lineClamp = require('@tailwindcss/line-clamp');

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}', // nếu bạn dùng `src/`
    './app/**/*.{js,ts,jsx,tsx}', // nếu bạn dùng App Router đặt ngoài `src/`
  ],
  theme: {
    extend: {},
  },
  plugins: [lineClamp],
};
