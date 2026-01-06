/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-sans)'] },
      colors: {
        macrea: {
          bg:    '#0F1419',   // fond
          bg2:   '#111519',   // fond secondaire
          panel: '#111519',   // cartes
          layer: '#1A1F2E',   // surfaces secondaires
          text:  '#E6EDF5',
          mute:  '#94A3B8',
          cyan:  '#00E5FF',   // accent
          neon:  '#00E5FF',   // alias pour cyan
          violet:'#A855F7',   // accent 2
          rose:  '#A855F7',   // alias pour violet
          line:  'rgba(0,229,255,0.12)', // bordure
        },
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0,0,0,0.35)',
        glow: '0 0 20px rgba(0,229,255,0.28)',  // cyan
        glow2:'0 0 20px rgba(168,85,247,0.22)', // violet
      },
      backgroundImage: {
        'mx-gradient': 'linear-gradient(135deg, #00E5FF 0%, #A855F7 100%)',
      },
      borderRadius: { xl2: '1rem' },
      container: { center: true, padding: '1rem' },
      maxWidth: { 'mx-sheet': '1200px' },
    }
  },
  plugins: []
};
