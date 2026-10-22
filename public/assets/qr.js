/* Pembuat kode QR (ISO/IEC 18004) tanpa dependensi: mode byte (UTF-8), versi 1-10, koreksi galat L atau M.
   Dipakai untuk kunci pengaturan 2FA. Pemakaian: QR.svg(teks) -> string <svg> atau null bila teks terlalu panjang. */
(function () {
  'use strict';

  // --- Aritmetika GF(256) dan Reed-Solomon (polinomial 0x11D)
  var EXP = new Array(512);
  var LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 256) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gmul(a, b) {
    return a && b ? EXP[LOG[a] + LOG[b]] : 0;
  }

  function rsGenerator(degree) {
    var poly = [1];
    for (var i = 0; i < degree; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gmul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function rsRemainder(data, degree) {
    var gen = rsGenerator(degree);
    var result = new Array(degree).fill(0);
    data.forEach(function (b) {
      var factor = b ^ result.shift();
      result.push(0);
      for (var i = 0; i < degree; i++) result[i] ^= gmul(gen[i + 1], factor);
    });
    return result;
  }

  // --- Tabel: per versi [kodeword koreksi per blok, [[jumlah blok, kodeword data per blok], ...]]
  var BLOCKS = {
    L: {
      1: [7, [[1, 19]]],
      2: [10, [[1, 34]]],
      3: [15, [[1, 55]]],
      4: [20, [[1, 80]]],
      5: [26, [[1, 108]]],
      6: [18, [[2, 68]]],
      7: [20, [[2, 78]]],
      8: [24, [[2, 97]]],
      9: [30, [[2, 116]]],
      10: [
        18,
        [
          [2, 68],
          [2, 69],
        ],
      ],
    },
    M: {
      1: [10, [[1, 16]]],
      2: [16, [[1, 28]]],
      3: [26, [[1, 44]]],
      4: [18, [[2, 32]]],
      5: [24, [[2, 43]]],
      6: [16, [[4, 27]]],
      7: [18, [[4, 31]]],
      8: [
        22,
        [
          [2, 38],
          [2, 39],
        ],
      ],
      9: [
        22,
        [
          [3, 36],
          [2, 37],
        ],
      ],
      10: [
        26,
        [
          [4, 43],
          [1, 44],
        ],
      ],
    },
  };
  var ALIGN = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
    10: [6, 28, 50],
  };
  var FORMAT_ECC = { L: 1, M: 0 };
  var MAX_VERSION = 10;

  function dataCodewords(version, ecl) {
    var info = BLOCKS[ecl][version];
    return info[1].reduce(function (sum, g) {
      return sum + g[0] * g[1];
    }, 0);
  }

  function utf8(text) {
    var bytes = [];
    var encoded = unescape(encodeURIComponent(text));
    for (var i = 0; i < encoded.length; i++) bytes.push(encoded.charCodeAt(i));
    return bytes;
  }

  function pushBits(bits, value, length) {
    for (var i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  }

  // --- Data -> kodeword akhir (data + koreksi, sudah di-interleave)
  function buildCodewords(bytes, version, ecl) {
    var total = dataCodewords(version, ecl);
    var bits = [];
    pushBits(bits, 0x4, 4); // mode byte
    pushBits(bits, bytes.length, version <= 9 ? 8 : 16);
    bytes.forEach(function (b) {
      pushBits(bits, b, 8);
    });
    pushBits(bits, 0, Math.min(4, total * 8 - bits.length)); // terminator
    while (bits.length % 8) bits.push(0);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (var pad = 0xec; data.length < total; pad ^= 0xec ^ 0x11) data.push(pad);

    var eccLen = BLOCKS[ecl][version][0];
    var blocks = [];
    var offset = 0;
    BLOCKS[ecl][version][1].forEach(function (group) {
      for (var n = 0; n < group[0]; n++) {
        var chunk = data.slice(offset, offset + group[1]);
        offset += group[1];
        blocks.push({ data: chunk, ecc: rsRemainder(chunk, eccLen) });
      }
    });
    var result = [];
    var longest = Math.max.apply(
      null,
      blocks.map(function (b) {
        return b.data.length;
      })
    );
    for (var d = 0; d < longest; d++)
      blocks.forEach(function (b) {
        if (d < b.data.length) result.push(b.data[d]);
      });
    for (var e = 0; e < eccLen; e++)
      blocks.forEach(function (b) {
        result.push(b.ecc[e]);
      });
    return result;
  }

  // --- Matriks
  function makeMatrix(version, ecl, codewords) {
    var size = 17 + 4 * version;
    var modules = [];
    var isFn = [];
    for (var y = 0; y < size; y++) {
      modules.push(new Array(size).fill(false));
      isFn.push(new Array(size).fill(false));
    }
    function setFn(x, yy, dark) {
      modules[yy][x] = dark;
      isFn[yy][x] = true;
    }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++)
        for (var dx = -4; dx <= 4; dx++) {
          var dist = Math.max(Math.abs(dx), Math.abs(dy));
          var xx = cx + dx;
          var yy = cy + dy;
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) setFn(xx, yy, dist !== 2 && dist !== 4);
        }
    }
    function align(cx, cy) {
      for (var dy = -2; dy <= 2; dy++)
        for (var dx = -2; dx <= 2; dx++) setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    function formatBits(mask) {
      var data = (FORMAT_ECC[ecl] << 3) | mask;
      var rem = data;
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var bits = ((data << 10) | rem) ^ 0x5412;
      var bit = function (i) {
        return ((bits >>> i) & 1) !== 0;
      };
      for (var a = 0; a <= 5; a++) setFn(8, a, bit(a));
      setFn(8, 7, bit(6));
      setFn(8, 8, bit(7));
      setFn(7, 8, bit(8));
      for (var b = 9; b < 15; b++) setFn(14 - b, 8, bit(b));
      for (var c = 0; c < 8; c++) setFn(size - 1 - c, 8, bit(c));
      for (var d = 8; d < 15; d++) setFn(8, size - 15 + d, bit(d));
      setFn(8, size - 8, true); // modul gelap
    }

    for (var i = 0; i < size; i++) {
      setFn(6, i, i % 2 === 0);
      setFn(i, 6, i % 2 === 0);
    }
    finder(3, 3);
    finder(size - 4, 3);
    finder(3, size - 4);
    var pos = ALIGN[version];
    pos.forEach(function (px, i1) {
      pos.forEach(function (py, i2) {
        var onFinder =
          (i1 === 0 && i2 === 0) || (i1 === 0 && i2 === pos.length - 1) || (i1 === pos.length - 1 && i2 === 0);
        if (!onFinder) align(px, py);
      });
    });
    formatBits(0); // menandai area format
    if (version >= 7) {
      var rem = version;
      for (var v = 0; v < 12; v++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      var vbits = (version << 12) | rem;
      for (var k = 0; k < 18; k++) {
        var dark = ((vbits >>> k) & 1) !== 0;
        var a2 = size - 11 + (k % 3);
        var b2 = Math.floor(k / 3);
        setFn(a2, b2, dark);
        setFn(b2, a2, dark);
      }
    }

    // Penempatan data (zig-zag dua kolom)
    var idx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++)
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var yy = upward ? size - 1 - vert : vert;
          if (!isFn[yy][x] && idx < codewords.length * 8) {
            modules[yy][x] = ((codewords[idx >>> 3] >>> (7 - (idx & 7))) & 1) !== 0;
            idx++;
          }
        }
    }

    function applyMask(mask) {
      for (var yy2 = 0; yy2 < size; yy2++)
        for (var xx = 0; xx < size; xx++) {
          var invert;
          switch (mask) {
            case 0:
              invert = (xx + yy2) % 2 === 0;
              break;
            case 1:
              invert = yy2 % 2 === 0;
              break;
            case 2:
              invert = xx % 3 === 0;
              break;
            case 3:
              invert = (xx + yy2) % 3 === 0;
              break;
            case 4:
              invert = (Math.floor(xx / 3) + Math.floor(yy2 / 2)) % 2 === 0;
              break;
            case 5:
              invert = ((xx * yy2) % 2) + ((xx * yy2) % 3) === 0;
              break;
            case 6:
              invert = (((xx * yy2) % 2) + ((xx * yy2) % 3)) % 2 === 0;
              break;
            default:
              invert = (((xx + yy2) % 2) + ((xx * yy2) % 3)) % 2 === 0;
          }
          if (!isFn[yy2][xx] && invert) modules[yy2][xx] = !modules[yy2][xx];
        }
    }

    function penalty() {
      var score = 0;
      var dark = 0;
      var line;
      var run;
      var pat = [true, false, true, true, true, false, true, false, false, false, false];
      var patRev = pat.slice().reverse();
      var matches = function (arr, at, p) {
        for (var q = 0; q < p.length; q++) if (arr[at + q] !== p[q]) return false;
        return true;
      };
      for (var r = 0; r < size; r++) {
        for (var dir = 0; dir < 2; dir++) {
          line = [];
          for (var c = 0; c < size; c++) line.push(dir === 0 ? modules[r][c] : modules[c][r]);
          run = 1;
          for (var m = 1; m < size; m++) {
            if (line[m] === line[m - 1]) {
              run++;
              if (run === 5) score += 3;
              else if (run > 5) score++;
            } else run = 1;
          }
          for (var n = 0; n + 11 <= size; n++) if (matches(line, n, pat) || matches(line, n, patRev)) score += 40;
        }
      }
      for (var y2 = 0; y2 < size; y2++)
        for (var x2 = 0; x2 < size; x2++) {
          if (modules[y2][x2]) dark++;
          if (x2 < size - 1 && y2 < size - 1) {
            var s = modules[y2][x2];
            if (s === modules[y2][x2 + 1] && s === modules[y2 + 1][x2] && s === modules[y2 + 1][x2 + 1]) score += 3;
          }
        }
      var total = size * size;
      score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return score;
    }

    var best = 0;
    var bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      applyMask(mask);
      formatBits(mask);
      var s2 = penalty();
      if (s2 < bestScore) {
        bestScore = s2;
        best = mask;
      }
      applyMask(mask); // batalkan
    }
    applyMask(best);
    formatBits(best);
    return modules;
  }

  function encode(text, ecl) {
    var bytes = utf8(text);
    for (var version = 1; version <= MAX_VERSION; version++) {
      var headerBits = 4 + (version <= 9 ? 8 : 16);
      if (headerBits + bytes.length * 8 <= dataCodewords(version, ecl) * 8)
        return makeMatrix(version, ecl, buildCodewords(bytes, version, ecl));
    }
    return null;
  }

  /** Mengembalikan string <svg> (latar putih, zona tenang 4 modul) atau null bila teks tidak muat. */
  function svg(text, options) {
    var opts = options || {};
    var matrix = encode(String(text), opts.ecc === 'L' ? 'L' : 'M');
    if (!matrix) return null;
    var quiet = 4;
    var n = matrix.length + quiet * 2;
    var path = '';
    matrix.forEach(function (row, y) {
      row.forEach(function (dark, x) {
        if (dark) path += 'M' + (x + quiet) + ',' + (y + quiet) + 'h1v1h-1z';
      });
    });
    var px = opts.size || 200;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      n +
      ' ' +
      n +
      '" width="' +
      px +
      '" height="' +
      px +
      '" shape-rendering="crispEdges" role="img" aria-label="' +
      (opts.label || 'QR code') +
      '">' +
      '<rect width="' +
      n +
      '" height="' +
      n +
      '" fill="#fff"/><path d="' +
      path +
      '" fill="#000"/></svg>'
    );
  }

  window.QR = { svg: svg, matrix: encode };
})();
