  // ===== DATE HELPERS =====
  function toStr(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function fromStr(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); }
  function addDays(d, n) { var r = new Date(d); r.setDate(r.getDate()+n); return r; }
  function isWeekend(d) { var day = d.getDay(); return day === 0 || day === 6; }
  function fmtDateBr(s) { var p = s.split('-'); return p[2]+'/'+p[1]; }

  // ===== PERIOD =====
  function getCurrentPeriod() {
    var t = new Date(), y = t.getFullYear(), m = t.getMonth(), d = t.getDate();
    if (d >= 26) return { inicio: new Date(y,m,26), fim: new Date(y,m+1,25) };
    return { inicio: new Date(y,m-1,26), fim: new Date(y,m,25) };
  }
  // período deslocado n ciclos do atual (n negativo = passado); início dia 26, fim dia 25
  function periodByOffset(n) {
    var c = getCurrentPeriod(), i = c.inicio, f = c.fim;
    return { inicio: new Date(i.getFullYear(), i.getMonth()+n, 26), fim: new Date(f.getFullYear(), f.getMonth()+n, 25) };
  }

  // ===== EASTER =====
  function easter(year) {
    var a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4;
    var f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
    var h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4;
    var l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    var month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
    return new Date(year,month-1,day);
  }
  function getNationalHolidays(year) {
    var e = easter(year);
    return [
      {date:toStr(new Date(year,0,1)),name:'Confraternização Universal'},
      {date:toStr(addDays(e,-48)),name:'Carnaval'},
      {date:toStr(new Date(year,2,23)),name:'Aniversário de Florianópolis'},
      {date:toStr(addDays(e,-2)),name:'Paixão de Cristo'},
      {date:toStr(new Date(year,3,21)),name:'Tiradentes'},
      {date:toStr(new Date(year,4,1)),name:'Dia do Trabalhador'},
      {date:toStr(addDays(e,60)),name:'Corpus Christi'},
      {date:toStr(new Date(year,8,7)),name:'Independência do Brasil'},
      {date:toStr(new Date(year,9,12)),name:'Nossa Senhora Aparecida'},
      {date:toStr(new Date(year,10,2)),name:'Finados'},
      {date:toStr(new Date(year,10,15)),name:'Proclamação da República'},
      {date:toStr(new Date(year,10,20)),name:'Dia da Consciência Negra'},
      {date:toStr(new Date(year,11,25)),name:'Natal'},
      {date:toStr(new Date(year,11,26)),name:'Abono de Natal'},
      {date:toStr(new Date(year,11,31)),name:'Abono de Ano Novo'}
    ];
  }

