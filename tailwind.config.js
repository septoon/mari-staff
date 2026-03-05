/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: '#eef0f4',
        screen: '#f3f4f6',
        ink: '#2a3138',
        muted: '#8a919d',
        line: '#dfe3ea',
        accent: '#f4c900',
        accentSoft: '#efe0a0',
        slatePanel: '#222b33',
        notice: '#dde4f0',
        successCard: '#a6ddb9',
      },
      boxShadow: {
        shell: '0 14px 40px rgba(25, 36, 52, 0.12)',
      },
    },
  },
  plugins: [],
}
