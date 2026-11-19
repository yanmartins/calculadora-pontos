import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { minify as minifyJs } from 'terser';
import { minify as minifyHtml } from 'html-minifier-terser';
import { readFileSync, readdirSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(import.meta.dirname, 'src');
const OUT_NAME = 'calculadora-pontos.html';
const EXTRAS = resolve(import.meta.dirname, 'extras');

// O app nasceu como um único <script> com todas as funções num mesmo escopo.
// Os arquivos de src/js são fatias desse escopo: aqui eles voltam a ser concatenados,
// em ordem alfabética (por isso o prefixo numérico), dentro de uma IIFE — mesmo
// comportamento de antes, sem "use strict" de módulo ES.
function appScript() {
  const dir = resolve(SRC, 'js');
  const parts = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  const body = parts.map((f) => `// ---- ${f} ----\n` + readFileSync(resolve(dir, f), 'utf8')).join('');
  return `(function () {\n${body}})();\n`;
}

// <!-- @include html/x.html --> → conteúdo do arquivo
function expandIncludes(html) {
  return html.replace(/<!-- @include (\S+) -->\n?/g, (_, p) => readFileSync(resolve(SRC, p), 'utf8'));
}

function pontosApp() {
  let isBuild = false;
  return {
    name: 'pontos-app',
    configResolved(c) { isBuild = c.command === 'build'; },
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        let js = appScript();
        if (isBuild) js = (await minifyJs(js, { compress: true, mangle: true })).code;
        // ícone embutido como data URI (o Vite não inlina o href de <link rel=icon>)
        const icon = 'data:image/svg+xml;base64,' + readFileSync(resolve(SRC, 'icon.svg')).toString('base64');
        return expandIncludes(html)
          .replaceAll('href="./icon.svg"', `href="${icon}"`)
          .replace('<!-- @app-script -->', () => `<script>${js}</script>`);
      },
    },
    // em dev, qualquer mudança em src/js ou src/html recarrega a página
    configureServer(server) {
      server.watcher.add([resolve(SRC, 'js'), resolve(SRC, 'html')]);
      server.watcher.on('change', (f) => {
        if (/[\\/]src[\\/](js|html)[\\/]/.test(f)) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

// build: renomeia a página para o nome de entrega e copia os extras; o acabamento (minificar o
// HTML) roda em closeBundle, sobre o arquivo já gravado, porque o singlefile embute JS/CSS depois daqui
function finalPage() {
  let outDir;
  return {
    name: 'pontos-final-page',
    enforce: 'post',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    generateBundle(_, bundle) {
      const page = bundle['index.html'];
      if (!page) return;
      delete bundle['index.html'];
      this.emitFile({ type: 'asset', fileName: OUT_NAME, source: page.source });
      // extras opcionais, para quem quiser abrir via servidor local (notificações + janela de app)
      for (const f of readdirSync(EXTRAS)) {
        this.emitFile({ type: 'asset', fileName: f, source: readFileSync(resolve(EXTRAS, f)) });
      }
    },
    async closeBundle() {
      const file = resolve(outDir, OUT_NAME);
      let html = await minifyHtml(readFileSync(file, 'utf8'), {
        collapseWhitespace: true, conservativeCollapse: true, removeComments: true,
        minifyCSS: false, minifyJS: false,
      });
      // o main.js só importa CSS: sobra um <script type="module"> vazio
      html = html.replace(/<script type="module"[^>]*>\s*<\/script>/g, '');
      writeFileSync(file, html);
      for (const f of readdirSync(EXTRAS)) if (/\.(sh|command)$/.test(f)) chmodSync(resolve(outDir, f), 0o755);
    },
  };
}

export default defineConfig({
  root: SRC,
  base: './',
  plugins: [pontosApp(), viteSingleFile({ removeViteModuleLoader: true }), finalPage()],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    assetsInlineLimit: Infinity,
  },
});
