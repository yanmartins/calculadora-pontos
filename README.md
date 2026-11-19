# Calculadora de Pontos

O código fica separado em `src/`. O build junta tudo em **um único arquivo**, `dist/calculadora-pontos.html`,
que abre com dois cliques em qualquer sistema com navegador.

## Comandos

```bash
npm install        # uma vez
npm run dev        # desenvolvimento, com recarga automática (http://localhost:5173)
npm run build      # gera dist/calculadora-pontos.html (+ extras abrir-app.*)
```

## Estrutura

```
src/
  index.html        estrutura da página; <!-- @include html/x.html --> puxa os pedaços
  html/             marcação de cada tela (hoje, banco, calendário, espelho, conta...)
  styles/           CSS, carregado em ordem pelo prefixo numérico
  js/               JS do app, concatenado em ordem pelo prefixo numérico
  main.js           entrada do Vite (só importa o CSS)
  icon.svg
extras/             abrir-app.* (opcionais; o build copia para dist/)
vite.config.js      includes de HTML, concatenação + minificação do JS, arquivo único
```

Os arquivos de `src/js` **dividem um único escopo**: o build os concatena dentro de uma função,
como era no `index.html` original. Uma função declarada num arquivo pode ser usada em outro, e
a ordem dos prefixos (`00-`, `01-`...) é a ordem de execução.

## Entrega

Envie só o `calculadora-pontos.html`. Os dados ficam no navegador (`localStorage`). Faça backup
pelo exportar/importar.

Sem servidor (`file://`) não há notificações de saída. Quem quiser notificações e janela de app
coloca o `abrir-app` do seu sistema na mesma pasta do HTML e abre por ele (porta 8000, a mesma das
versões anteriores, então os dados salvos continuam lá).
