/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          base: "#101010",
          subtle: "#161616",
        },
        surface: {
          DEFAULT: "#1E1E1E",
          panel: "#242424",
          elevated: "#2D2D2D",
          input: "#181818",
          terminal: "#0C0C0C",
        },
        dropbox: {
          blue: "#0061FE",
          hover: "#0050D8",
          indigo: "#1E40AF",
          light: "#E5EDFF",
        },
        status: {
          mint: "#00F5B4",
          verified: "#059669",
          warning: "#F59E0B",
          error: "#EF4444",
        },
        border: {
          subtle: "#2E2E2E",
          crisp: "#3E3E3E",
          active: "#0061FE",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'dropbox-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.5)',
        'dropbox-md': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
        'dropbox-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.6)',
        'dropbox-blue': '0 4px 14px 0 rgba(0, 97, 254, 0.39)',
      }
    },
  },
  plugins: [],
}
