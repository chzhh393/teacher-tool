/** @type {import('tailwindcss').Config} */
export default {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#f97316", // orange-500
        accent: "#fb923c", // orange-400
        secondary: "#fdba74", // orange-300
        success: "#10b981", // green-500
        warning: "#f59e0b", // orange-500
        danger: "#ef4444", // red-500
        background: "#f4f5fb",
        surface: "#ffffff",
        panel: "#f7f8ff",
        outline: "#e8e9f2",
        text: {
          primary: "#1f2937", // gray-800
          secondary: "#6b7280", // gray-500
          tertiary: "#9aa1b4",
        },
      },
      fontFamily: {
        sans: [
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "WenQuanYi Micro Hei",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "WenQuanYi Micro Hei",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
}
