module.exports = {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: { accent:"#00fefb", plum:"#aa65b3", bg:"#0b0f14" },
      boxShadow: { soft:"0 8px 32px rgba(0,0,0,.30)" },
      borderRadius: { '2xl': '1rem' }
    },
  },
  plugins: [],
}
