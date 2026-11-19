  var $ = function (id) { return document.getElementById(id); };

  // ===== THEME =====
  window.setTheme = function (t) {
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme-val') === t);
    });
    try { localStorage.setItem('calc-theme', t); } catch (e) {}
    syncThemeColor();
  };
  // cor-tema (paleta); alto contraste ignora e mantém a própria paleta
  var ACCENTS = ['teal', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'rainbow'];
  window.setAccent = function (a) {
    if (ACCENTS.indexOf(a) < 0) a = 'teal';
    document.documentElement.setAttribute('data-accent', a);
    document.querySelectorAll('.accent-btn').forEach(function (btn) {
      var on = btn.getAttribute('data-accent-val') === a;
      btn.classList.toggle('active', on); btn.setAttribute('aria-pressed', on);
    });
    try { localStorage.setItem('calc-accent', a); } catch (e) {}
    syncThemeColor();
  };
  // barra do navegador/PWA acompanha o fundo atual
  function syncThemeColor() {
    var m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
    var c = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim();
    if (c) m.setAttribute('content', c);
  }
  (function () {
    var VALID = ['light', 'dark', 'contrast'], s;
    try { s = localStorage.getItem('calc-theme'); } catch (e) {}
    setTheme(VALID.indexOf(s) >= 0 ? s : 'dark'); // temas easter egg antigos caem no dark
    var a; try { a = localStorage.getItem('calc-accent'); } catch (e) {}
    setAccent(a);
  })();

