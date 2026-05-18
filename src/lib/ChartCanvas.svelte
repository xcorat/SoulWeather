<script>
  import { onMount } from 'svelte';

  let {
    birthPlanets = [],
    currentPlanets = [],
    birthLabel = '',
    currentLabel = '',
    ascendant = null,
    theme = 'dark',
  } = $props();

  let canvas = $state(null);

  const ZODIAC_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const SIGN_NAMES = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
  const D2R = Math.PI / 180;

  // Theme palettes ─────────────────────────────────────────────────────────
  const PALETTES = {
    dark: {
      bg:        '#080818',
      band:      '#0c0c20',
      bandAlt:   'rgba(30,30,60,0.55)',
      ringOuter: '#4455aa',
      ring:      '#334466',
      ringDash:  '#223355',
      tickMajor: '#334',
      tickMinor: '#222',
      glyph:     '#88aacc',
      signAbbr:  '#778899',
      centerHi:  '#aabbdd',
      centerLo:  '#778899',
      placeholderHi: '#556677',
      placeholderLo: '#445566',
      legend:    '#556677',
      ascLine:   '#ffcc66',
      ascLabel:  '#ffcc66',
    },
    light: {
      bg:        '#f6f6fb',
      band:      '#e9eaf3',
      bandAlt:   'rgba(180,185,210,0.45)',
      ringOuter: '#3c4a8a',
      ring:      '#a0aac0',
      ringDash:  '#b8c0d4',
      tickMajor: '#9aa3b8',
      tickMinor: '#c2c8d6',
      glyph:     '#3c4a8a',
      signAbbr:  '#5a6585',
      centerHi:  '#2d3868',
      centerLo:  '#5a6585',
      placeholderHi: '#5a6585',
      placeholderLo: '#7a8298',
      legend:    '#5a6585',
      ascLine:   '#c87a1e',
      ascLabel:  '#c87a1e',
    },
  };

  /** Convert sidereal longitude to canvas angle.
   *  When an ascendant is supplied, that longitude is placed at the top
   *  (12 o'clock); otherwise 0° Aries goes to the top. Signs increase
   *  counter-clockwise (standard astrological convention). */
  function lonAngle(lon) {
    const asc = (ascendant ?? 0);
    // top of canvas is -π/2; signs increase CCW (i.e. angle decreases)
    return -(lon - asc) * D2R - Math.PI / 2;
  }

  function polarXY(cx, cy, r, angleDeg) {
    const a = lonAngle(angleDeg);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function drawChart(bp = birthPlanets, cp = currentPlanets, bl = birthLabel, cl = currentLabel) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.46;
    const P = PALETTES[theme] || PALETTES.dark;

    ctx.clearRect(0, 0, W, H);

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, W, H);

    // Radii
    const rOut    = R;           // outer edge
    const rSign   = R * 0.82;   // inner edge of zodiac band (slightly thicker for bigger glyphs)
    const rTrans  = R * 0.68;   // transit (current) planet ring
    const rSplit  = R * 0.56;   // separator between outer & inner planet rings
    const rNatal  = R * 0.44;   // natal (birth) planet ring
    const rCenter = R * 0.34;   // inner decorative circle

    // ── Zodiac band fill ─────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
    ctx.arc(cx, cy, rSign, 0, Math.PI * 2, true);
    ctx.fillStyle = P.band;
    ctx.fill();

    // ── Alternate sign background shading ───────────────────────────────────
    for (let i = 0; i < 12; i++) {
      if (i % 2 === 0) continue;
      const startA = lonAngle(i * 30);
      const endA   = lonAngle((i + 1) * 30);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      // signs increase counter-clockwise, which maps to clockwise on the
      // canvas (Y axis is inverted), so we draw the arc with anticlockwise=true.
      ctx.arc(cx, cy, rOut, startA, endA, true);
      ctx.arc(cx, cy, rSign, endA, startA, false);
      ctx.closePath();
      ctx.fillStyle = P.bandAlt;
      ctx.fill();
    }

    // ── Circles ──────────────────────────────────────────────────────────────
    const circles = [rOut, rSign, rSplit, rCenter];
    circles.forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? P.ringOuter : P.ring;
      ctx.lineWidth = i === 0 ? 1.5 : 1;
      ctx.stroke();
    });

    // Extra dashed ring at rTrans and rNatal for planet reference
    [rTrans, rNatal].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = P.ringDash;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── Sign dividers ────────────────────────────────────────────────────────
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = polarXY(cx, cy, rSign, i * 30);
      const [x2, y2] = polarXY(cx, cy, rOut,  i * 30);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = P.ring;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // ── Degree marks ────────────────────────────────────────────────────────
    for (let deg = 0; deg < 360; deg += 5) {
      const isSign = deg % 30 === 0;
      if (isSign) continue; // already drawn as divider
      const tick = (deg % 10 === 0 ? 0.55 : 0.75);
      const r1 = rSign + (rOut - rSign) * tick;
      const [x1, y1] = polarXY(cx, cy, r1, deg);
      const [x2, y2] = polarXY(cx, cy, rOut, deg);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = deg % 10 === 0 ? P.tickMajor : P.tickMinor;
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }

    // ── Zodiac glyphs (always upright / horizontal) ─────────────────────────
    const rGlyphOuter = (rOut + rSign) / 2 + (rOut - rSign) * 0.16;
    const rGlyphInner = (rOut + rSign) / 2 - (rOut - rSign) * 0.18;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const midLon = i * 30 + 15;
      const [gx, gy] = polarXY(cx, cy, rGlyphOuter, midLon);
      ctx.font = `${R * 0.082}px serif`;
      ctx.fillStyle = P.glyph;
      ctx.fillText(ZODIAC_GLYPHS[i], gx, gy);

      // Sign abbreviation below glyph
      const [nx, ny] = polarXY(cx, cy, rGlyphInner, midLon);
      ctx.font = `${R * 0.052}px sans-serif`;
      ctx.fillStyle = P.signAbbr;
      ctx.fillText(SIGN_NAMES[i], nx, ny);
    }

    // ── Ascendant marker ─────────────────────────────────────────────────────
    if (ascendant != null) {
      // ASC is at the top by construction; draw a small arrow + label.
      const [ax1, ay1] = polarXY(cx, cy, rCenter, ascendant);
      const [ax2, ay2] = polarXY(cx, cy, rOut,    ascendant);
      ctx.beginPath();
      ctx.moveTo(ax1, ay1);
      ctx.lineTo(ax2, ay2);
      ctx.strokeStyle = P.ascLine;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = `bold ${R * 0.05}px sans-serif`;
      ctx.fillStyle = P.ascLabel;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('ASC', cx, cy - rOut - 4);
      ctx.textBaseline = 'middle';
    }

    // ── Planet ring drawing helper ───────────────────────────────────────────
    function drawRing(planets, ringR, isOuter) {
      if (!planets || !planets.length) return;

      // Sort by longitude for collision handling
      const sorted = [...planets].sort((a, b) => a.lon - b.lon);

      // Assign angular offsets to avoid label overlap
      const placed = [];
      const MIN_GAP = 11; // minimum degrees between labels (slightly larger fonts → more spacing)

      sorted.forEach(p => {
        let slot = p.lon;
        const near = placed.filter(q => {
          const diff = Math.abs(((slot - q.slot + 540) % 360) - 180);
          return diff < MIN_GAP;
        });
        if (near.length > 0) {
          slot = near[near.length - 1].slot + MIN_GAP;
        }
        placed.push({ ...p, slot });
      });

      placed.forEach(p => {
        const dotA = lonAngle(p.lon);
        const labelA = lonAngle(p.slot);

        const dotR   = ringR;
        const labelR = ringR + (isOuter ? R * 0.10 : -R * 0.10);

        const dotX = cx + dotR * Math.cos(dotA);
        const dotY = cy + dotR * Math.sin(dotA);

        // Dot at exact position
        ctx.beginPath();
        ctx.arc(dotX, dotY, R * 0.014, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Tick line from ring boundary
        const tickR = isOuter ? rSign - 2 : rCenter + 2;
        const tickX = cx + tickR * Math.cos(dotA);
        const tickY = cy + tickR * Math.sin(dotA);
        ctx.beginPath();
        ctx.moveTo(tickX, tickY);
        ctx.lineTo(dotX, dotY);
        ctx.strokeStyle = p.color + '55';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Label (symbol + abbr) — always horizontal for legibility.
        const lx = cx + labelR * Math.cos(labelA);
        const ly = cy + labelR * Math.sin(labelA);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = `bold ${R * 0.072}px serif`;
        ctx.fillStyle = p.color;
        ctx.fillText(p.symbol, lx, ly - R * 0.034);

        ctx.font = `${R * 0.046}px sans-serif`;
        ctx.fillStyle = p.color + 'cc';
        ctx.fillText(p.abbr, lx, ly + R * 0.034);
      });
    }

    // ── Draw natal planets (inner ring) ──────────────────────────────────────
    drawRing(bp, rNatal, false);

    // ── Draw transit planets (outer ring) ────────────────────────────────────
    drawRing(cp, rTrans, true);

    // ── Center info ──────────────────────────────────────────────────────────
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (bl) {
      ctx.font = `bold ${R * 0.085}px serif`;
      ctx.fillStyle = P.centerHi;
      ctx.fillText('☽', cx, cy - R * 0.10);
      ctx.font = `${R * 0.048}px sans-serif`;
      ctx.fillStyle = P.centerLo;
      ctx.fillText(bl, cx, cy + R * 0.01);
    } else {
      ctx.font = `${R * 0.058}px sans-serif`;
      ctx.fillStyle = P.placeholderHi;
      ctx.fillText('Enter birth data', cx, cy - R * 0.04);
      ctx.font = `${R * 0.042}px sans-serif`;
      ctx.fillStyle = P.placeholderLo;
      ctx.fillText('to see natal chart', cx, cy + R * 0.04);
    }

    if (cl) {
      ctx.font = `${R * 0.04}px sans-serif`;
      ctx.fillStyle = P.centerLo;
      ctx.fillText(`Transit: ${cl}`, cx, cy + R * 0.13);
    }

    // ── Legend ────────────────────────────────────────────────────────────────
    const legX = 8, legY = H - 22;
    ctx.font = `${R * 0.038}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = P.legend;
    ctx.fillText('Inner: Natal  ·  Outer: Transit  ·  Vedic / Sidereal (Lahiri)', legX, legY);
  }

  onMount(() => {
    if (!canvas) return;

    const setSize = () => {
      if (!canvas) return;
      const p = canvas.parentElement;
      canvas.width  = p.clientWidth  || 600;
      canvas.height = p.clientHeight || 600;
      drawChart();
    };

    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  });

  $effect(() => {
    // Re-draw whenever planet data, labels, ascendant, or theme change.
    // Reference reactive deps so Svelte tracks them.
    void birthPlanets; void currentPlanets; void birthLabel; void currentLabel;
    void ascendant; void theme;
    drawChart(birthPlanets, currentPlanets, birthLabel, currentLabel);
  });
</script>

<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
