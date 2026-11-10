import gsap from 'gsap';
import { store, EventBus, GlobalEvents, BaseComponent, attr, qs, qsa } from './SmoothScroll';

// Verbatim SplitText 3.0.0 from theme.pretty.js L2418–2767
const emojiExp =
  /([\uD800-\uDBFF][\uDC00-\uDFFF](?:[\u200D\uFE0F][\uD800-\uDBFF][\uDC00-\uDFFF]){2,}|\uD83D\uDC69(?:\u200D(?:(?:\uD83D\uDC69\u200D)?\uD83D\uDC67|(?:\uD83D\uDC69\u200D)?\uD83D\uDC66)|\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D(?:\uD83D\uDC69\u200D)?\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D(?:\uD83D\uDC69\u200D)?\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]\uFE0F|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC6F\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3C-\uDD3E\uDDD6-\uDDDF])\u200D[\u2640\u2642]\uFE0F|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F\u200D[\u2640\u2642]|(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642])\uFE0F|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2695\u2696\u2708]|\uD83D\uDC69\u200D[\u2695\u2696\u2708]|\uD83D\uDC68(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708]))\uFE0F|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83D\uDC69\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|[#\*0-9]\uFE0F\u20E3|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|\uD83D\uDC68(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:(?:\uD83D[\uDC68\uDC69])\u200D)?\uD83D\uDC66\u200D\uD83D\uDC66|(?:(?:\uD83D[\uDC68\uDC69])\u200D)?\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92])|(?:\uD83C[\uDFFB-\uDFFF])\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]))|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC70\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD36\uDDD1-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\u200D(?:(?:(?:\uD83D[\uDC68\uDC69])\u200D)?\uD83D\uDC67|(?:(?:\uD83D[\uDC68\uDC69])\u200D)?\uD83D\uDC66)|\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC69\uDC6E\uDC70-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD18-\uDD1C\uDD1E\uDD1F\uDD26\uDD30-\uDD39\uDD3D\uDD3E\uDDD1-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])?|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDEEB\uDEEC\uDEF4-\uDEF8]|\uD83E[\uDD10-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD4C\uDD50-\uDD6B\uDD80-\uDD97\uDDC0\uDDD0-\uDDE6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267B\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEF8]|\uD83E[\uDD10-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD4C\uDD50-\uDD6B\uDD80-\uDD97\uDDC0\uDDD0-\uDDE6])\uFE0F)/;

function getText(e: any): string {
  const t = e.nodeType;
  let n = '';
  if (t === 1 || t === 9 || t === 11) {
    if (typeof e.textContent === 'string') return e.textContent;
    for (e = e.firstChild; e; e = e.nextSibling) n += getText(e);
  } else if (t === 3 || t === 4) {
    return e.nodeValue;
  }
  return n;
}

let doc: Document;
let win: Window;
let splitInitialized = 0;
const stripExp = /(?:\r|\n|\t\t)/g;
const multiSpaceExp = /(?:\s\s+)/g;
const getStyle = (e: Element) => win.getComputedStyle(e);
const isArray = Array.isArray;
const slice = [].slice;

const toArray = (e: any, t?: boolean): any[] => {
  let n: string;
  return isArray(e)
    ? e
    : (n = typeof e) === 'string' && !t && e
    ? slice.call(doc.querySelectorAll(e), 0)
    : e && n === 'object' && 'length' in e
    ? slice.call(e, 0)
    : e
    ? [e]
    : [];
};

const isAbsolute = (e: any) => e.position === 'absolute' || e.absolute === true;

const findSpecialChar = (e: string, t: string[]) => {
  let n: string;
  let i = t.length;
  while (--i > -1) {
    n = t[i];
    if (e.substr(0, n.length) === n) return n.length;
  }
};

const buildWrapperGetter = (e = '', t = 'div') => {
  const n = ~e.indexOf('++');
  let i = 1;
  if (n) e = e.split('++').join('');
  return () => `<${t} style='position:relative;display:inline-block;'${e ? ` class='${e}${n ? i++ : ''}'>` : '>'}`;
};

const replaceText = function recurse(t: any, n: string, i: string) {
  const r = t.nodeType;
  if (r === 1 || r === 9 || r === 11) {
    for (t = t.firstChild; t; t = t.nextSibling) recurse(t, n, i);
  } else if (r === 3 || r === 4) {
    t.nodeValue = t.nodeValue.split(n).join(i);
  }
};

const pushReversed = (e: any[], t: any[]) => {
  let n = t.length;
  while (--n > -1) e.push(t[n]);
};

const isBeforeWordDelimiter = (e: any, t: any, n: string) => {
  let i: any;
  while (e && e !== t) {
    i = e._next || e.nextSibling;
    if (i) return i.textContent.charAt(0) === n;
    e = e.parentNode || e._parent;
  }
};

const deSplit = function recurse(t: any) {
  const r = toArray(t.childNodes);
  const o = r.length;
  for (let n = 0; n < o; n++) {
    const i = r[n];
    if (i._isSplit) {
      recurse(i);
    } else {
      if (n && i.previousSibling.nodeType === 3) {
        i.previousSibling.nodeValue += i.nodeType === 3 ? i.nodeValue : i.firstChild.nodeValue;
      } else if (i.nodeType !== 3) {
        t.insertBefore(i.firstChild, i);
      }
      t.removeChild(i);
    }
  }
};

const getStyleFloat = (prop: string, style: any) => parseFloat(style[prop]) || 0;

const setPositionsAfterSplit = (e: any, t: any, n: any[], i: any[], r: any[], o: number, s: number) => {
  let a: number,
    l: any,
    u: number,
    c: any,
    h: any[],
    d: boolean,
    f: any[],
    m: boolean,
    p: any,
    v: any,
    g: string,
    x: any;
  const y = getStyle(e);
  const D = getStyleFloat('paddingLeft', y);
  let b = -999;
  const _ = getStyleFloat('borderBottomWidth', y) + getStyleFloat('borderTopWidth', y);
  const w = getStyleFloat('borderLeftWidth', y) + getStyleFloat('borderRightWidth', y);
  const S = getStyleFloat('paddingTop', y) + getStyleFloat('paddingBottom', y);
  const E = getStyleFloat('paddingLeft', y) + getStyleFloat('paddingRight', y);
  const P = 0.2 * getStyleFloat('fontSize', y);
  const C = y.textAlign;
  const T: any[] = [];
  const F: any[] = [];
  const A: any[] = [];
  const M = t.wordDelimiter || ' ';
  const O = t.tag ? t.tag : t.span ? 'span' : 'div';
  const L = t.type || t.split || 'chars,words,lines';
  const I = r && ~L.indexOf('lines') ? ([] as any[]) : null;
  const R = ~L.indexOf('words');
  const k = ~L.indexOf('chars');
  const z = isAbsolute(t);
  let U = t.linesClass;
  const j = ~(U || '').indexOf('++');
  const B: any[] = [];

  if (j) U = U.split('++').join('');
  l = e.getElementsByTagName('*');
  u = l.length;
  h = [];
  for (a = 0; a < u; a++) h[a] = l[a];

  if (I || z) {
    for (a = 0; a < u; a++) {
      c = h[a];
      d = c.parentNode === e;
      if (d || z || (k && !R)) {
        x = c.offsetTop;
        if (I && d && Math.abs(x - b) > P && (c.nodeName !== 'BR' || a === 0)) {
          f = [];
          I.push(f);
          b = x;
        }
        if (z) {
          c._x = c.offsetLeft;
          c._y = x;
          c._w = c.offsetWidth;
          c._h = c.offsetHeight;
        }
        if (I) {
          if (
            (c._isSplit && d) ||
            (!k && d) ||
            (R && d) ||
            (!R && c.parentNode.parentNode === e && !c.parentNode._isSplit)
          ) {
            f!.push(c);
            c._x -= D;
            if (isBeforeWordDelimiter(c, e, M)) c._wordEnd = true;
          }
          if (c.nodeName === 'BR' && ((c.nextSibling && c.nextSibling.nodeName === 'BR') || a === 0)) {
            I.push([]);
          }
        }
      }
    }
  }

  for (a = 0; a < u; a++) {
    c = h[a];
    d = c.parentNode === e;
    if (c.nodeName !== 'BR') {
      if (z) {
        p = c.style;
        if (!R && !d) {
          c._x += c.parentNode._x;
          c._y += c.parentNode._y;
        }
        p.left = c._x + 'px';
        p.top = c._y + 'px';
        p.position = 'absolute';
        p.display = 'block';
        p.width = c._w + 1 + 'px';
        p.height = c._h + 'px';
      }
      if (!R && k) {
        if (c._isSplit) {
          c._next = c.nextSibling;
          c.parentNode.appendChild(c);
        } else if (c.parentNode._isSplit) {
          c._parent = c.parentNode;
          if (!c.previousSibling && c.firstChild) c.firstChild._isFirst = true;
          if (c.nextSibling && c.nextSibling.textContent === ' ' && !c.nextSibling.nextSibling) {
            B.push(c.nextSibling);
          }
          c._next = c.nextSibling && c.nextSibling._isFirst ? null : c.nextSibling;
          c.parentNode.removeChild(c);
          h.splice(a--, 1);
          u--;
        } else if (!d) {
          x = !c.nextSibling && isBeforeWordDelimiter(c.parentNode, e, M);
          if (c.parentNode._parent) c.parentNode._parent.appendChild(c);
          if (x) c.parentNode.appendChild(doc.createTextNode(' '));
          if (O === 'span') c.style.display = 'inline';
          T.push(c);
        }
      } else if (c.parentNode._isSplit && !c._isSplit && c.innerHTML !== '') {
        F.push(c);
      } else if (k && !c._isSplit) {
        if (O === 'span') c.style.display = 'inline';
        T.push(c);
      }
    } else if (I || z) {
      if (c.parentNode) c.parentNode.removeChild(c);
      h.splice(a--, 1);
      u--;
    } else if (!R) {
      e.appendChild(c);
    }
  }

  for (a = B.length; --a > -1; ) B[a].parentNode.removeChild(B[a]);

  if (I) {
    if (z) {
      v = doc.createElement(O);
      e.appendChild(v);
      g = v.offsetWidth + 'px';
      x = v.offsetParent === e ? 0 : e.offsetLeft;
      e.removeChild(v);
    }
    p = e.style.cssText;
    e.style.cssText = 'display:none;';
    while (e.firstChild) e.removeChild(e.firstChild);
    m = M === ' ' && (!z || (!R && !k));
    for (a = 0; a < I.length; a++) {
      f = I[a];
      v = doc.createElement(O);
      v.style.cssText = `display:block;text-align:${C};position:${z ? 'absolute;' : 'relative;'}`;
      if (U) v.className = U + (j ? a + 1 : '');
      A.push(v);
      u = f.length;
      for (l = 0; l < u; l++) {
        if (f[l].nodeName !== 'BR') {
          c = f[l];
          v.appendChild(c);
          if (m && c._wordEnd) v.appendChild(doc.createTextNode(' '));
          if (z) {
            if (l === 0) {
              v.style.top = c._y + 'px';
              v.style.left = D + x + 'px';
            }
            c.style.top = '0px';
            if (x) c.style.left = c._x - x + 'px';
          }
        }
      }
      if (u === 0) {
        v.innerHTML = '&nbsp;';
      } else if (!R && !k) {
        deSplit(v);
        replaceText(v, String.fromCharCode(160), ' ');
      }
      if (z) {
        v.style.width = g!;
        v.style.height = c._h + 'px';
      }
      e.appendChild(v);
    }
    e.style.cssText = p;
  }

  if (z) {
    if (s > e.clientHeight) {
      e.style.height = s - S + 'px';
      if (e.clientHeight < s) e.style.height = s + _ + 'px';
    }
    if (o > e.clientWidth) {
      e.style.width = o - E + 'px';
      if (e.clientWidth < o) e.style.width = o + w + 'px';
    }
  }
  pushReversed(n, T);
  if (R) pushReversed(i, F);
  pushReversed(r, A);
};

const splitInnerText = (e: any, t: any, n: () => string, i: () => string) => {
  let r: string, o: string, s: number, a: number, l: number, u: string, c: boolean, h: any;
  const d = t.tag ? t.tag : t.span ? 'span' : 'div';
  const f = ~(t.type || t.split || 'chars,words,lines').indexOf('chars');
  const m = isAbsolute(t);
  const p = t.wordDelimiter || ' ';
  const v = p !== ' ' ? '' : m ? '&#173; ' : ' ';
  const g = `</${d}>`;
  let x = 1;
  const y = t.specialChars ? (typeof t.specialChars === 'function' ? t.specialChars : findSpecialChar) : null;
  const D = doc.createElement('div');
  const b = e.parentNode;

  b.insertBefore(D, e);
  D.textContent = e.nodeValue;
  b.removeChild(e);
  e = D;
  r = getText(e);
  c = r.indexOf('<') !== -1;
  if (t.reduceWhiteSpace !== false) r = r.replace(multiSpaceExp, ' ').replace(stripExp, '');
  if (c) r = r.split('<').join('{{LT}}');
  l = r.length;
  o = (r.charAt(0) === ' ' ? v : '') + n();
  for (s = 0; s < l; s++) {
    u = r.charAt(s);
    if (y && (h = y(r.substr(s), t.specialChars))) {
      u = r.substr(s, h || 1);
      o += f && u !== ' ' ? i() + u + `</${d}>` : u;
      s += h - 1;
    } else if (u === p && r.charAt(s - 1) !== p && s) {
      o += x ? g : '';
      x = 0;
      while (r.charAt(s + 1) === p) {
        o += v;
        s++;
      }
      if (s === l - 1) {
        o += v;
      } else if (r.charAt(s + 1) !== ')') {
        o += v + n();
        x = 1;
      }
    } else if (u === '{' && r.substr(s, 6) === '{{LT}}') {
      o += f ? i() + `{{LT}}</${d}>` : '{{LT}}';
      s += 5;
    } else if (
      (u.charCodeAt(0) >= 55296 && u.charCodeAt(0) <= 56319) ||
      (r.charCodeAt(s + 1) >= 65024 && r.charCodeAt(s + 1) <= 65039)
    ) {
      a = ((r.substr(s, 12).split(emojiExp) || [])[1] || '').length || 2;
      o += f && u !== ' ' ? i() + r.substr(s, a) + `</${d}>` : r.substr(s, a);
      s += a - 1;
    } else {
      o += f && u !== ' ' ? i() + u + `</${d}>` : u;
    }
  }
  e.outerHTML = o + (x ? g : '');
  if (c) replaceText(b, '{{LT}}', '<');
};

const splitNode = function recurse(t: any, n: any, i: () => string, r: () => string) {
  const a = toArray(t.childNodes);
  const l = a.length;
  const u = isAbsolute(n);
  if (t.nodeType !== 3 || l > 1) {
    n.absolute = false;
    for (let o = 0; o < l; o++) {
      const s = a[o];
      if (s.nodeType !== 3 || /\S+/.test(s.nodeValue)) {
        if (u && s.nodeType !== 3 && getStyle(s).display === 'inline') {
          s.style.display = 'inline-block';
          s.style.position = 'relative';
        }
        s._isSplit = true;
        recurse(s, n, i, r);
      }
    }
    n.absolute = u;
    t._isSplit = true;
    return;
  }
  splitInnerText(t, n, i, r);
};

export class SplitText {
  static version = '3.0.0';
  elements: any[];
  chars: any[] = [];
  words: any[] = [];
  lines: any[] = [];
  _originals: string[] = [];
  vars: any;
  isSplit = false;

  constructor(elements: any, vars?: any) {
    if (!splitInitialized) {
      doc = document;
      win = window;
      splitInitialized = 1;
    }
    this.elements = toArray(elements);
    this.vars = vars || {};
    this.split(vars);
  }

  split(vars?: any) {
    if (this.isSplit) this.revert();
    this.vars = vars = vars || this.vars;
    this._originals.length = this.chars.length = this.words.length = this.lines.length = 0;
    let r = this.elements.length;
    const tag = vars.tag ? vars.tag : vars.span ? 'span' : 'div';
    const wordWrap = buildWrapperGetter(vars.wordsClass, tag);
    const charWrap = buildWrapperGetter(vars.charsClass, tag);
    while (--r > -1) {
      const el = this.elements[r];
      this._originals[r] = el.innerHTML;
      const h = el.clientHeight;
      const w = el.clientWidth;
      splitNode(el, vars, wordWrap, charWrap);
      setPositionsAfterSplit(el, vars, this.chars, this.words, this.lines, w, h);
    }
    this.chars.reverse();
    this.words.reverse();
    this.lines.reverse();
    this.isSplit = true;
    return this;
  }

  revert() {
    const originals = this._originals;
    if (!originals) throw "revert() call wasn't scoped properly.";
    this.elements.forEach((el, idx) => {
      el.innerHTML = originals[idx];
    });
    this.chars = [];
    this.words = [];
    this.lines = [];
    this.isSplit = false;
    return this;
  }

  static create(elements: any, vars?: any) {
    return new SplitText(elements, vars);
  }
}

// Verbatim GSAP effects from theme.pretty.js pe (L2827–2953)
export const gsapEffects: Record<string, any> = {
  splitCharsWipeUpIn: {
    name: 'splitCharsWipeUpIn',
    extendTimeline: true,
    effect: (targets: any[], config: any) => {
      const splits: SplitText[] = [];
      const lineArrays: any[][] = [];
      if (config.children) {
        for (let i = 0; i < targets.length; i++) {
          const sp = new SplitText(targets[i].querySelectorAll(config.children), {
            type: 'lines',
            linesClass: 'split-line js-split-line',
          });
          splits.push(sp);
          lineArrays.push(sp.lines);
        }
        delete config.children;
      } else {
        const sp = new SplitText(targets, { type: 'lines', linesClass: 'split-line js-split-line' });
        splits.push(sp);
        lineArrays.push(sp.lines);
      }

      const innerWrappers: HTMLElement[] = [];
      for (let i = 0; i < lineArrays.length; i++) {
        for (let j = 0; j < lineArrays[i].length; j++) {
          const html = lineArrays[i][j].innerHTML;
          const div = document.createElement('div');
          div.innerHTML = html;
          lineArrays[i][j].style.overflow = 'hidden';
          lineArrays[i][j].innerHTML = '';
          lineArrays[i][j].appendChild(div);
          innerWrappers.push(div);
        }
      }

      const charArrays: any[][] = [];
      const cumulativeCounts: number[] = [];
      const delays: number[] = [];
      for (let i = 0; i < lineArrays[0].length; i++) {
        const sp = new SplitText(lineArrays[i], { type: 'chars', charsClass: 'js-chars' });
        splits.push(sp);
        charArrays.push(sp.chars);
        const lineChars = qsa('.js-chars', lineArrays[0][i]);
        const count = i > 0 ? lineChars.length + cumulativeCounts[i - 1] : lineChars.length;
        cumulativeCounts.push(count);
      }

      config.duration = config.duration || 1.5;
      config.delay = config.delay || 0;
      for (let i = 0; i < charArrays[0].length; i++) {
        const idx = i + 1;
        const bucket = cumulativeCounts.reduce((acc, cur) => (acc >= idx ? acc : cur));
        const d = 0.035 * cumulativeCounts.indexOf(bucket) + 0.025 * i + config.delay;
        delays.push(d);
      }

      return gsap.from(
        charArrays[0],
        Object.assign({}, config, {
          stagger: (idx: number) => delays[idx],
        })
      );
    },
    defaults: { y: '100%', ease: 'expo.out' },
  },
  splitTextRotateIn: {
    name: 'splitTextRotateIn',
    extendTimeline: true,
    effect: (targets: any[], config: any) => {
      const splits: SplitText[] = [];
      const lineArrays: any[][] = [];
      if (config.children) {
        for (let i = 0; i < targets.length; i++) {
          const sp = new SplitText(targets[i].querySelectorAll(config.children), { type: 'lines' });
          splits.push(sp);
          lineArrays.push(sp.lines);
        }
        delete config.children;
      } else {
        const sp = new SplitText(targets, { type: 'lines' });
        splits.push(sp);
        lineArrays.push(sp.lines);
      }

      const innerWrappers: HTMLElement[] = [];
      for (let i = 0; i < lineArrays.length; i++) {
        for (let j = 0; j < lineArrays[i].length; j++) {
          const html = lineArrays[i][j].innerHTML;
          const div = document.createElement('div');
          div.innerHTML = html;
          lineArrays[i][j].style.overflow = 'hidden';
          lineArrays[i][j].innerHTML = '';
          lineArrays[i][j].appendChild(div);
          innerWrappers.push(div);
        }
      }

      const tween = gsap.from(innerWrappers, Object.assign({ rotate: config.rotation }, config));
      (tween as any)._onResize = () => {
        for (let i = 0; i < splits.length; i++) splits[i].revert();
      };
      return tween;
    },
    defaults: {
      duration: 1.5,
      y: '120%',
      transformOrigin: '0 0',
      stagger: { each: 0.1, ease: 'power1.in' },
      ease: 'power3.out',
    },
    resize: true,
  },
};

// Verbatim from theme.pretty.js pt (L4036–4096)
export class FocusManager {
  static init() {
    if (document.location.hash) {
      FocusManager.focus(document.getElementById(window.location.hash.replace('#', '')), true);
    }
    EventBus.on('hashchange', window, () => {
      FocusManager.focus(document.getElementById(window.location.hash.replace('#', '')), true);
    });
  }

  static isFocusable(el: Element) {
    return el.matches('input:not([disabled]), a, button, textarea, select, iframe, object, [tabindex]');
  }

  static focus(el: HTMLElement | null, forceTabIndex = false) {
    if (el == null) return false;
    if (forceTabIndex === true && FocusManager.isFocusable(el) === false) {
      el.setAttribute('tabindex', '-1');
      EventBus.on('blur', el, FocusManager.removeTabIndex);
      EventBus.on('focusout', el, FocusManager.removeTabIndex);
    }
    try {
      el.focus();
    } catch (_e) {}
    return document.activeElement === el;
  }

  static removeTabIndex(this: HTMLElement) {
    this.removeAttribute('tabindex');
    EventBus.off('blur', this, FocusManager.removeTabIndex);
    EventBus.off('focusout', this, FocusManager.removeTabIndex);
  }
}

// Verbatim from theme.pretty.js _t (L4112–4129)
export class ExampleComponent extends BaseComponent {
  static selector = '.js-example-selector';
  constructor(el: HTMLElement) {
    super(el);
  }
}

// Verbatim from theme.pretty.js St (L4130–4264)
export class Header extends BaseComponent {
  static selector = '.js-header';
  static isCompact = false;
  dom: {
    el: HTMLElement;
    inner: HTMLElement | null;
    background: HTMLElement | null;
    logo: HTMLElement | null;
    logoText: HTMLElement[];
    logoTextGroup: HTMLElement | null;
  };
  logoTextTranslateValue: number;
  isCompact = false;
  isRevealing = false;
  isHiding = false;
  isAnimating = false;
  logoAnimating = false;
  logoHidden = false;
  shrinkTl?: gsap.core.Timeline;
  growTl?: gsap.core.Timeline;

  constructor(el: HTMLElement) {
    super(el);
    this.dom = {
      el: this.el,
      inner: qs('.js-header-inner', this.el),
      background: qs('.js-header-bg', this.el),
      logo: qs('.js-header-logo', this.el),
      logoText: qsa('.js-header-logo-text', this.el),
      logoTextGroup: qs('.js-header-logo-text-group', this.el),
    };
    this.logoTextTranslateValue = Math.ceil(this.dom.logoTextGroup!.getBoundingClientRect().height) + 10;
    this.addEvents();
  }

  onScroll = (pos: number) => {
    if (pos > 1) {
      this.isCompact = true;
      this.shrink();
      return;
    }
    this.isCompact = false;
    this.grow();
  };

  revealLogoText = () => {
    if (!this.isCompact || this.isHiding) return;
    gsap
      .timeline({
        onStart: () => {
          this.isAnimating = true;
        },
        onComplete: () => {
          this.isAnimating = false;
        },
      })
      .fromTo(
        this.dom.logoText,
        { y: this.logoTextTranslateValue },
        { y: 0, duration: 1, ease: 'expo.out', stagger: 0.05 },
        0
      );
  };

  hideLogoText = () => {
    if (!this.isCompact || this.isRevealing) return;
    gsap
      .timeline({
        onStart: () => {
          this.isAnimating = true;
        },
        onComplete: () => {
          this.isAnimating = false;
        },
      })
      .to(
        this.dom.logoText,
        { y: -this.logoTextTranslateValue, duration: 1, ease: 'expo.out', stagger: 0.05 },
        0
      )
      .set(this.dom.logoText, { y: this.logoTextTranslateValue }, '>');
  };

  onResize = () => {
    this.logoTextTranslateValue = Math.ceil(this.dom.logoTextGroup!.getBoundingClientRect().height) + 5;
    this.removeEvents();
    this.addEvents();
    if (store.mq.sm.matches) {
      this.shrink();
      this.isCompact = true;
    } else {
      this.grow();
      this.isCompact = false;
    }
  };

  addEvents() {
    EventBus.on(GlobalEvents.RESIZE, this.onResize);
    store.ASS.on('scroll', this.onScroll);
    EventBus.on('mouseenter', this.dom.logo, this.revealLogoText);
    EventBus.on('mouseleave', this.dom.logo, this.hideLogoText);
  }

  removeEvents() {
    EventBus.off(GlobalEvents.RESIZE, this.onResize);
    store.ASS.off('scroll', this.onScroll);
    EventBus.off('mouseenter', this.dom.logo, this.revealLogoText);
    EventBus.off('mouseleave', this.dom.logo, this.hideLogoText);
  }

  shrink() {
    if (this.logoAnimating || this.logoHidden) return;
    this.logoAnimating = true;
    this.logoHidden = true;
    this.growTl?.kill();
    this.shrinkTl = gsap
      .timeline()
      .to(this.dom.background, { scaleY: 1, duration: 1, ease: 'expo.out' }, 0)
      .to(this.dom.inner, { y: 0, duration: 1, ease: 'expo.out' }, 0)
      .to(
        this.dom.logoText,
        {
          y: -this.logoTextTranslateValue,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.05,
          onComplete: () => {
            this.logoAnimating = false;
          },
        },
        0
      )
      .set(this.dom.logoText, { y: this.logoTextTranslateValue + 10 }, '>');
  }

  grow() {
    if (!this.logoHidden) return;
    this.logoAnimating = true;
    this.logoHidden = false;
    this.shrinkTl?.kill();
    this.growTl = gsap
      .timeline({})
      .to(this.dom.inner, { y: store.mq.sm.matches ? '1rem' : 0, duration: 1, ease: 'expo.out' }, 0)
      .to(this.dom.background, { scaleY: 0, duration: 1, ease: 'expo.out' }, 0)
      .to(
        this.dom.logoText,
        {
          y: 0,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.05,
          onComplete: () => {
            this.logoAnimating = false;
          },
        },
        0
      );
  }

  destroy() {
    this.removeEvents();
  }
}

// Verbatim from theme.pretty.js Pt (L4265–4448)
export class Navigation extends BaseComponent {
  static selector = '.js-nav';
  static isMobileOpen = false;
  dom: {
    el: HTMLElement;
    toggle: HTMLElement | null;
    crossIcon: HTMLElement | null;
    burgerIcon: HTMLElement | null;
    background: HTMLElement | null;
    list: HTMLElement | null;
    items: HTMLElement[];
    headerItems: HTMLElement[];
    links: HTMLElement[];
    mask: HTMLElement | null;
    maskBg: HTMLElement | null;
    anchorLinks: HTMLElement[];
    spinner?: HTMLElement | null;
    spinnerSVG?: HTMLElement | null;
  };
  activeSection: string | null = null;
  items: { el: HTMLElement; name: string }[] = [];
  itemHoverTimelines: gsap.core.Timeline[] = [];
  itemClickTimelines: gsap.core.Timeline[] = [];
  targetLink: HTMLElement | null = null;
  targetLinkChars: HTMLElement[] | null = null;
  hoverItemIndex = 0;
  clickItemIndex = 0;
  hoverTl: gsap.core.Timeline | null = null;
  clickTl: gsap.core.Timeline | null = null;
  isMobileOpen = false;
  split?: SplitText;
  showTl?: gsap.core.Timeline;
  closeTl?: gsap.core.Timeline;

  constructor(el: HTMLElement) {
    super(el);
    const toggle = qs('.js-nav-toggle')!;
    this.dom = {
      el: this.el,
      toggle,
      crossIcon: qs('.js-nav-toggle-cross', toggle),
      burgerIcon: qs('.js-nav-toggle-burger', toggle),
      background: qs('.js-nav-bg', this.el),
      list: qs('.js-nav-list', this.el),
      items: qsa('.js-nav-item'),
      headerItems: qsa('.js-nav-item', this.el),
      links: qsa('.js-nav-link'),
      mask: qs('.js-nav-transition-mask'),
      maskBg: qs('.js-nav-transition-mask-bg'),
      anchorLinks: qsa('[anchor-link]'),
    };
    this.dom.spinner = qs('.js-nav-transition-mask-spinner', this.dom.mask!);
    this.dom.spinnerSVG = qs('.js-nav-transition-mask-spinner-svg', this.dom.mask!);
    this.dom.items.forEach((item) => {
      this.items.push({ el: item, name: attr(item, 'section-name') });
    });
    this.addEvents();
    this.splitNavItemChars();
    this.buildHoverTimelines();
    this.buildClickTimelines();
  }

  onMousenterNavLink = (e: any) => {
    if (store.isTouch) return;
    if (e.currentTarget.classList.contains('js-nav-link')) {
      this.targetLink = e.currentTarget;
    }
    if (attr(this.targetLink!, 'anchor-link') && attr(this.targetLink!, 'anchor-link') === this.activeSection) {
      return;
    }
    this.targetLinkChars = qsa('.js-nav-link-chars', this.targetLink!);
    this.hoverItemIndex = this.dom.links.indexOf(this.targetLink!);
    this.hoverTl = this.itemHoverTimelines[this.hoverItemIndex];
    if (!this.hoverTl.isActive()) this.hoverTl.restart();
  };

  onMouseleaveNavLink = () => {
    this.targetLink = null;
    this.hoverTl = null;
    this.clickTl = null;
    this.targetLinkChars = null;
  };

  onPointerDown = (e: any) => {
    if (store.isTouch && e.currentTarget.classList.contains('js-nav-link')) {
      this.targetLink = e.currentTarget;
    }
    const targetName = attr(this.targetLink!, 'anchor-link');
    if (targetName !== this.activeSection && qs(`[anchor-target="${targetName}"]`) !== null) {
      this.clickItemIndex = this.dom.links.indexOf(this.targetLink!);
      this.clickTl = this.itemClickTimelines[this.clickItemIndex];
      if (!this.clickTl.isActive()) this.clickTl.restart();
    }
  };

  navigateTo = (e: any) => {
    e.preventDefault();
    const targetName = attr(e.currentTarget, 'anchor-link');
    const targetEl = qs(`[anchor-target="${targetName}"]`);
    if (!targetEl) {
      if (targetName) window.location.href = e.currentTarget.href || e.target.href || '/';
      return;
    }
    const prevEase = store.ASS.controller.ease;
    store.ASS.controller.ease = 1;
    if (!store.mq.sm.matches) this.close();
    gsap
      .timeline()
      .set(this.dom.spinnerSVG!, { scale: 0, rotation: 0 })
      .set(this.dom.mask!, { pointerEvents: 'auto' })
      .to(this.dom.mask!, { duration: 0.5, ease: 'expo.in' }, 0)
      .to(this.dom.maskBg!, { autoAlpha: 1, duration: 0.5, ease: 'expo.in' }, 0)
      .to(this.dom.spinnerSVG!, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.in' }, 0.2)
      .to(this.dom.spinnerSVG!, { rotate: 90, repeat: 2, duration: 1, ease: 'quad.inOut' }, 0.2)
      .call(
        () => {
          store.ASS.scrollTo(targetEl.getBoundingClientRect().top + store.ASS.currentPos);
        },
        undefined,
        1
      )
      .to(this.dom.spinnerSVG!, { autoAlpha: 0, scale: 0, duration: 0.5, ease: 'expo.in' }, 2)
      .to(this.dom.mask!, { duration: 0.5, ease: 'expo.out' }, 2.3)
      .to(this.dom.maskBg!, { autoAlpha: 0, duration: 0.5, ease: 'expo.out' }, 2.3)
      .set(this.dom.mask!, { pointerEvents: 'none' })
      .call(() => {
        store.ASS.controller.ease = prevEase;
      });
  };

  updateActiveItem = () => {
    if (this.activeSection !== store.sectionName) {
      this.activeSection = store.sectionName;
      this.items.forEach((item) => {
        item.el.classList[item.name === store.sectionName ? 'add' : 'remove']('isActive');
      });
    }
  };

  toggle = () => {
    if (this.isMobileOpen) this.close();
    else this.open();
  };

  splitNavItemChars = () => {
    this.dom.items.forEach((item) => {
      this.split = new SplitText(qs('.js-nav-link', item), {
        type: 'chars',
        charsClass: 'nav__link__chars js-nav-link-chars pointer-events-none',
      });
    });
  };

  onResize = () => {
    this.removeEvents();
    this.addEvents();
    if (store.mq.sm.matches || this.isMobileOpen) {
      gsap.set(this.dom.headerItems, { autoAlpha: 1 });
      this.dom.list!.style.pointerEvents = 'auto';
    } else {
      gsap.set(this.dom.headerItems, { autoAlpha: 0 });
      this.dom.list!.style.pointerEvents = 'none';
    }
  };

  addEvents() {
    EventBus.on(GlobalEvents.RESIZE, this.onResize);
    EventBus.on('click', this.dom.toggle, this.toggle);
    EventBus.on('section:enter', this.updateActiveItem);
    EventBus.on('click', this.dom.anchorLinks, this.navigateTo);
    EventBus.on('mouseenter', this.dom.links, this.onMousenterNavLink);
    EventBus.on('mouseleave', this.dom.links, this.onMouseleaveNavLink);
    EventBus.on('mousedown touchstart', this.dom.links, this.onPointerDown);
  }

  buildHoverTimelines() {
    this.dom.links.forEach((link) => {
      const chars = qsa('.js-nav-link-chars', link);
      const tl = gsap.timeline({ paused: true }).fromTo(
        chars,
        { yPercent: 0, ease: 'power1.out' },
        { yPercent: -15, duration: 0.25, ease: 'power1.out', stagger: { each: 0.035, yoyo: true, repeat: 1 } },
        0
      );
      this.itemHoverTimelines.push(tl);
    });
  }

  buildClickTimelines() {
    this.dom.links.forEach((link) => {
      const chars = qsa('.js-nav-link-chars', link);
      const tl = gsap
        .timeline({ paused: true })
        .set(chars, { textShadow: '0 1.68rem', ease: 'none' }, 0)
        .to(chars, { yPercent: -100, duration: 0.5, ease: 'power1.out', stagger: 0.035 }, 0)
        .set(chars, { yPercent: 0, textShadow: 'none', ease: 'none' });
      this.itemClickTimelines.push(tl);
    });
  }

  removeEvents() {
    EventBus.off(GlobalEvents.RESIZE, this.onResize);
    EventBus.off('click', this.dom.toggle, this.toggle);
    EventBus.off('section:enter', this.updateActiveItem);
    EventBus.off('click', this.dom.anchorLinks, this.navigateTo);
    EventBus.off('mouseenter', this.dom.links, this.onMousenterNavLink);
    EventBus.off('mouseleave', this.dom.links, this.onMouseleaveNavLink);
    EventBus.off('mousedown touchstart', this.dom.links, this.onPointerDown);
  }

  open() {
    this.isMobileOpen = true;
    this.dom.crossIcon!.style.display = 'block';
    this.dom.burgerIcon!.style.display = 'none';
    this.dom.list!.style.pointerEvents = 'auto';
    this.closeTl?.kill();
    this.showTl = gsap
      .timeline()
      .to(this.dom.background, { scaleY: 1, duration: 1, ease: 'expo.out' }, 0)
      .to(
        this.dom.headerItems,
        { autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: { amount: 0.17, from: 'start' } },
        0.2
      );
  }

  close() {
    this.isMobileOpen = false;
    this.dom.crossIcon!.style.display = 'none';
    this.dom.burgerIcon!.style.display = 'block';
    this.dom.list!.style.pointerEvents = 'none';
    this.showTl?.kill();
    this.closeTl = gsap
      .timeline()
      .to(
        this.dom.headerItems,
        { autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: { amount: 0.17, from: 'end' } },
        0
      )
      .to(this.dom.background, { scaleY: 0, duration: 1, ease: 'expo.out' }, 0.2);
  }

  destroy() {
    this.removeEvents();
  }
}

// Verbatim from theme.pretty.js An (L6325–6356)
export class CookieNotice extends BaseComponent {
  static selector = '.js-cookie-notice';
  hostname: string | null = null;
  includeSubDomains = false;
  toggleBtn: HTMLElement | null = null;

  constructor(el: HTMLElement) {
    super(el);
    if (this.hostname === null) this.hostname = window.location.hostname;
    this.toggleBtn = qs('.js-cookie-notice-toggle', this.el);
    this.updateStore();
    if (store.cookieNoticeAccepted === false) {
      EventBus.on('click', this.toggleBtn, this.onClick);
      this.show();
    } else {
      this.hide();
    }
  }

  onClick = () => {
    const exp = new Date();
    exp.setMonth(exp.getMonth() + 1);
    let cookie = `cookie_notice_accepted=true;expires=${exp.toUTCString()};path=/`;
    if (this.includeSubDomains === true) cookie += `;domain=${this.hostname}`;
    document.cookie = cookie;
    this.updateStore();
    this.hide();
  };

  hide() {
    this.el.classList.remove('is-open');
    this.el.style.display = 'none';
  }

  show() {
    this.el.classList.add('is-open');
    this.el.classList.remove('d-none');
  }

  updateStore() {
    store.cookieNoticeAccepted = document.cookie
      .split(';')
      .some((c) => c.includes('cookie_notice_accepted=true'));
    if (store.cookieNoticeAccepted === true) {
      EventBus.emit('cookienotice:accepted');
    }
  }
}
