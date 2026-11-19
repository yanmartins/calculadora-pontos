// Entrada do Vite: só carrega o CSS, na ordem dos arquivos.
// O JS do app (src/js/*.js) entra como <script> clássico via plugin em vite.config.js.
import.meta.glob('./styles/*.css', { eager: true });
