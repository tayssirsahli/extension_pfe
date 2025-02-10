import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    outDir: 'dist', // Dossier de sortie
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.html', // Point d'entrée du popup
        background: 'src/background/background.js', // Point d'entrée du script de fond
        content: 'src/content/content.js', 
        // Point d'entrée du script de contenu
      },
      output: {
        entryFileNames: '[name].js', // Nom des fichiers de sortie
        assetFileNames: 'assets/[name].[ext]', // Nom des assets
      },
    },
  },
})
