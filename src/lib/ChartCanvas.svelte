<script>
  import { onMount } from 'svelte';

  let { birthPlanets = [], currentPlanets = [], birthLabel = '', currentLabel = '' } = $props();

  let canvas = $state(null);

  const ZODIAC_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const SIGN_NAMES = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
  const R2D = 180 / Math.PI;
  const D2R = Math.PI / 180;

  /** Convert sidereal longitude to canvas angle.
   *  0° Aries → 3 o'clock (right); signs increase counter-clockwise. */
  function lonAngle(lon) {
    return -lon * D2R;
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

    ctx.clearRect(0, 0, W, H);

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#080818';
    ctx.fillRect(0, 0, W, H);

    // Radii
    const rOut    = R;           // outer edge
    const rSign   = R * 0.84;   // inner edge of zodiac band
    const rTrans  = R * 0.70;   // transit (current) planet ring
    const rSplit  = R * 0.58;   // separator between outer & inner planet rings
    const rNatal  = R * 0.46;   // natal (birth) planet ring
    const rCenter = R * 0.36;   // inner decorative circle

    // ── Zodiac band fill ─────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
    ctx.arc(cx, cy, rSign, 0, Math.PI * 2, true);
    ctx.fillStyle = '#0c0c20';
    ctx.fill();

    // ── Alternate sign background shading ───────────────────────────────────
    for (let i = 0; i < 12; i++) {
      if (i % 2 === 0) continue;
      const startA = lonAngle(i * 30);
      const endA   = lonAngle((i + 1) * 30);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      // arc from startA to endA going clockwise (counter-clockwise in lon)
      ctx.arc(cx, cy, rOut, startA, endA, true);
      ctx.arc(cx, cy, rSign, endA, startA, false);
      ctx.closePath();
      ctx.fillStyle = 'rgba(30,30,60,0.55)';
      ctx.fill();
    }

    // ── Circles ──────────────────────────────────────────────────────────────
    const circles = [rOut, rSign, rSplit, rCenter];
    circles.forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? '#4455aa' : '#334466';
      ctx.lineWidth = i === 0 ? 1.5 : 1;
      ctx.stroke();
    });

    // Extra dashed ring at rTrans and rNatal for planet reference
    [rTrans, rNatal].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = '#223355';
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
      ctx.strokeStyle = '#334466';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // ── Degree marks ────────────────────────────────────────────────────────
    for (let deg = 0; deg < 360; deg += 5) {
      const isSign = deg % 30 === 0;
      const tick = isSign ? 0 : (deg % 10 === 0 ? 0.55 : 0.75);
      const r1 = rSign + (rOut - rSign) * tick;
      const [x1, y1] = polarXY(cx, cy, r1, deg);
      const [x2, y2] = polarXY(cx, cy, rOut, deg);
      if (isSign) continue; // already drawn as divider
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = deg % 10 === 0 ? '#334' : '#222';
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }

    // ── Zodiac glyphs ────────────────────────────────────────────────────────
    const rGlyphOuter = (rOut + rSign) / 2 + (rOut - rSign) * 0.18;
    const rGlyphInner = (rOut + rSign) / 2 - (rOut - rSign) * 0.1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const midLon = i * 30 + 15;
      const [gx, gy] = polarXY(cx, cy, rGlyphOuter, midLon);
      ctx.font = `${R * 0.06}px serif`;
      ctx.fillStyle = '#88aacc';
      ctx.fillText(ZODIAC_GLYPHS[i], gx, gy);

      // Sign abbreviation below glyph
      const [nx, ny] = polarXY(cx, cy, rGlyphInner, midLon);
      ctx.font = `${R * 0.038}px sans-serif`;
      ctx.fillStyle = '#445566';
      ctx.fillText(SIGN_NAMES[i], nx, ny);
    }

    // ── Planet ring drawing helper ───────────────────────────────────────────
    function drawRing(planets, ringR, isOuter) {
      if (!planets || !planets.length) return;

      // Sort by longitude for collision handling
      const sorted = [...planets].sort((a, b) => a.lon - b.lon);

      // Assign angular offsets to avoid label overlap
      const placed = [];
      const MIN_GAP = 9; // minimum degrees between labels

      sorted.forEach(p => {
        // find best slot near actual longitude
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
        const labelR = ringR + (isOuter ? R * 0.085 : -R * 0.085);

        const dotX = cx + dotR * Math.cos(dotA);
        const dotY = cy + dotR * Math.sin(dotA);

        // Dot at exact position
        ctx.beginPath();
        ctx.arc(dotX, dotY, R * 0.012, 0, Math.PI * 2);
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

        // Label (symbol + abbr)
        const lx = cx + labelR * Math.cos(labelA);
        const ly = cy + labelR * Math.sin(labelA);

        ctx.save();
        ctx.translate(lx, ly);

        // Rotate label to be radially readable
        let rot = labelA;
        if (rot > Math.PI / 2 && rot < Math.PI * 1.5) rot += Math.PI;
        ctx.rotate(rot + Math.PI / 2);

        ctx.font = `bold ${R * 0.055}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = p.color;
        ctx.fillText(p.symbol, 0, -R * 0.028);

        ctx.font = `${R * 0.035}px sans-serif`;
        ctx.fillStyle = p.color + 'cc';
        ctx.fillText(p.abbr, 0, R * 0.028);

        ctx.restore();
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
      ctx.font = `bold ${R * 0.07}px serif`;
      ctx.fillStyle = '#aabbdd';
      ctx.fillText('☽', cx, cy - R * 0.08);
      ctx.font = `${R * 0.04}px sans-serif`;
      ctx.fillStyle = '#778899';
      ctx.fillText(bl, cx, cy + R * 0.01);
    } else {
      ctx.font = `${R * 0.05}px sans-serif`;
      ctx.fillStyle = '#445566';
      ctx.fillText('Enter birth data', cx, cy - R * 0.04);
      ctx.font = `${R * 0.035}px sans-serif`;
      ctx.fillText('to see natal chart', cx, cy + R * 0.04);
    }

    if (cl) {
      ctx.font = `${R * 0.033}px sans-serif`;
      ctx.fillStyle = '#556677';
      ctx.fillText(`Transit: ${cl}`, cx, cy + R * 0.12);
    }

    // ── Legend ────────────────────────────────────────────────────────────────
    const legX = 8, legY = H - 22;
    ctx.font = `${R * 0.032}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#445566';
    ctx.fillText('Inner ring: Natal  ·  Outer ring: Transit  ·  Vedic / Sidereal (Lahiri)', legX, legY);
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
    // Re-draw whenever planet data or labels change
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
