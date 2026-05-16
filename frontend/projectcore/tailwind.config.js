/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#ffffff',
        background: '#f8fafc',
        border: '#e2e8f0',
        primary: '#1e293b',
        muted: '#64748b',
        subtle: '#94a3b8',
        accent: '#334155',
      },
    },
  },
  plugins: [],
}
