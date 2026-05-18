<script>
  import { onMount } from 'svelte';

  let {
    birthPlanets = [],
    currentPlanets = [],
    ascendant = null,
    theme = 'dark',
    showPlanetNames = true,
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

  function drawChart(bp = birthPlanets, cp = currentPlanets, showNames = showPlanetNames) {
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

    // Radii — 4 concentric boundaries create 4 sections (inside out):
    //   inner empty  |  natal (1-2)  |  transit (2-3)  |  sign names (3-4)
    const rOut    = R;           // circle 4: outer frame
    const rSignI  = R * 0.78;   // circle 3: inner edge of sign names band
    const rDots   = R * 0.58;   // circle 2: dot ring (natal + transit markers)
    const rNatalI = R * 0.34;   // circle 1: inner edge of natal band
    // center → rNatalI: inner empty

    const signBandW  = rOut   - rSignI;   // width of sign names band

    // ── Zodiac band fill (sign names section: circle 3 → circle 4) ──────────
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
    ctx.arc(cx, cy, rSignI, 0, Math.PI * 2, true);
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
      ctx.arc(cx, cy, rSignI, endA, startA, false);
      ctx.closePath();
      ctx.fillStyle = P.bandAlt;
      ctx.fill();
    }

    // ── 4 boundary circles ───────────────────────────────────────────────────
    [rOut, rSignI, rDots, rNatalI].forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? P.ringOuter : P.ring;
      ctx.lineWidth = i === 0 ? 1.5 : 1;
      ctx.stroke();
    });

    // ── Sign dividers ────────────────────────────────────────────────────────
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = polarXY(cx, cy, rSignI, i * 30);
      const [x2, y2] = polarXY(cx, cy, rOut,   i * 30);
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
      const r1 = rSignI + signBandW * tick;
      const [x1, y1] = polarXY(cx, cy, r1, deg);
      const [x2, y2] = polarXY(cx, cy, rOut, deg);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = deg % 10 === 0 ? P.tickMajor : P.tickMinor;
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }

    // ── Zodiac glyphs (upright) and sign names (rotated along outer arc) ────
    const rGlyph   = rSignI + signBandW * 0.38;  // inner portion of sign band
    const rNameArc = rSignI + signBandW * 0.80;  // near outer edge of sign band
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const midLon = i * 30 + 15;
      const [gx, gy] = polarXY(cx, cy, rGlyph, midLon);
      ctx.font = `${signBandW * 0.55}px serif`;
      ctx.fillStyle = P.glyph;
      ctx.fillText(ZODIAC_GLYPHS[i], gx, gy);

      // Sign abbreviation rotated tangentially along the outer arc
      const a = lonAngle(midLon);
      const tx = cx + rNameArc * Math.cos(a);
      const ty = cy + rNameArc * Math.sin(a);
      ctx.save();
      ctx.translate(tx, ty);
      let rot = a + Math.PI / 2;
      if (Math.sin(a) > 0) rot += Math.PI; // flip lower-half text to stay readable
      ctx.rotate(rot);
      ctx.font = `${signBandW * 0.28}px sans-serif`;
      ctx.fillStyle = P.signAbbr;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SIGN_NAMES[i], 0, 0);
      ctx.restore();
    }

    // ── Ascendant marker ─────────────────────────────────────────────────────
    if (ascendant != null) {
      // ASC is at the top by construction; draw a line from center + label.
      const [ax2, ay2] = polarXY(cx, cy, rOut, ascendant);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
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
    // Draws planet glyphs centred in the band between rInner and rOuter.
    // `iconSize` is the symbol font size in px — shared across rings so natal
    // and transit glyphs are visually identical in size.
    function drawRing(planets, rInner, rOuter, iconSize) {
      if (!planets || !planets.length) return;
      const centerR = (rInner + rOuter) / 2;

      // Sort by longitude for collision handling
      const sorted = [...planets].sort((a, b) => a.lon - b.lon);

      // Minimum angular gap (degrees) so adjacent icons don't visually overlap.
      // Arc length at centerR for angle θ° is centerR · θ · π/180. We need this
      // to exceed the icon width (≈ iconSize) plus a small padding. When
      // abbreviations are shown they sit under the symbol at 0.6× size so the
      // symbol still dominates the horizontal footprint.
      const iconWidth = iconSize * 1.05;
      const MIN_GAP   = (iconWidth / centerR) * (180 / Math.PI) + 0.5;

      // Assign angular slots avoiding overlap. Each new planet is pushed
      // forward from its true longitude only as far as needed to clear the
      // previously placed neighbour.
      const placed = [];
      sorted.forEach(p => {
        let slot = p.lon;
        if (placed.length > 0) {
          const prev = placed[placed.length - 1];
          const minSlot = prev.slot + MIN_GAP;
          if (slot < minSlot) slot = minSlot;
        }
        placed.push({ ...p, slot });
      });

      placed.forEach(p => {
        const labelA = lonAngle(p.slot);
        const lx = cx + centerR * Math.cos(labelA);
        const ly = cy + centerR * Math.sin(labelA);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (showNames) {
          // Symbol in upper portion, abbreviation in lower portion of band
          ctx.font = `bold ${iconSize}px serif`;
          ctx.fillStyle = p.color;
          ctx.fillText(p.symbol, lx, ly - iconSize * 0.35);

          ctx.font = `${iconSize * 0.6}px sans-serif`;
          ctx.fillStyle = p.color + 'cc';
          ctx.fillText(p.abbr, lx, ly + iconSize * 0.55);
        } else {
          ctx.font = `bold ${iconSize}px serif`;
          ctx.fillStyle = p.color;
          ctx.fillText(p.symbol, lx, ly);
        }
      });
    }

    // ── Dot ring helper (circle 2 — exact planetary positions) ──────────────
    // Draws small coloured dots at the exact longitude on the rDots circle.
    // Natal dots are slightly more opaque; transit dots slightly more transparent.
    // Overlapping dots are fine — the alpha makes them distinguishable.
    function drawDots(planets, alpha) {
      if (!planets || !planets.length) return;
      planets.forEach(p => {
        const a  = lonAngle(p.lon);
        const dx = cx + rDots * Math.cos(a);
        const dy = cy + rDots * Math.sin(a);
        ctx.beginPath();
        ctx.arc(dx, dy, R * 0.018, 0, Math.PI * 2);
        ctx.fillStyle = p.color + alpha;
        ctx.fill();
      });
    }

    // ── Draw planet rings — shared icon size = 75% of the smaller band, so
    //    natal and transit glyphs are visually identical. ─────────────────────
    const natalBandW = rDots  - rNatalI;
    const transBandW = rSignI - rDots;
    const iconSize   = Math.min(natalBandW, transBandW) * 0.75;

    // Natal planets (section 1-2)
    drawRing(bp, rNatalI, rDots, iconSize);

    // Transit planets (section 2-3)
    drawRing(cp, rDots, rSignI, iconSize);

    // ── Draw dot ring (circle 2 — natal + transit markers with alpha) ────────
    drawDots(bp, 'cc');   // natal: more opaque
    drawDots(cp, '88');   // transit: more transparent
    // ── Center decorative dot ─────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.012, 0, Math.PI * 2);
    ctx.fillStyle = P.ring;
    ctx.fill();

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
    // Re-draw whenever planet data, ascendant, theme, or showPlanetNames change.
    ascendant; theme; showPlanetNames;
    drawChart(birthPlanets, currentPlanets, showPlanetNames);
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
