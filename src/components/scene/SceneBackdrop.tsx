// src/components/scene/SceneBackdrop.tsx
import React from 'react';
import { Circle, Group, LinearGradient, Path, Rect, vec } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { SCENE_LAYOUT, SCENE_PALETTE, SCENE_TIMING } from '../../config/sceneConfig';
import { EnvironmentMood } from '../../utils/sceneMood';
import { SceneLayout } from '../../utils/sceneLayout';
import { mixHex, withAlpha } from '../../utils/sceneColors';
import { useSceneLoop } from './useSceneLoop';

type Props = {
  width: number;
  height: number;
  layout: SceneLayout;
  mood: EnvironmentMood;
};

// The view across the harbour: hills, two rows of towers, the water and the
// lawn the characters stand on. Air quality shows as distance fading into
// smog — the hills go first, then the far towers, then the near ones — the
// way a hazy day actually looks from the waterfront.

// Ridge line as (x share of width, height share of HILL_MAX_PX).
const HILL_RIDGE: [number, number][] = [
  [0, 0.5], [0.1, 0.78], [0.24, 0.58], [0.4, 0.92], [0.55, 0.66],
  [0.72, 1], [0.86, 0.7], [1, 0.84],
];
const HILL_MAX_PX = 96;

// Towers as (x share of width, width px, height px). Two rows for depth.
const FAR_TOWERS: [number, number, number][] = [
  [0.0, 26, 46], [0.07, 20, 62], [0.2, 30, 54], [0.33, 22, 74], [0.46, 28, 50],
  [0.6, 24, 66], [0.74, 30, 58], [0.88, 22, 70], [0.95, 26, 44],
];
const NEAR_TOWERS: [number, number, number][] = [
  [0.03, 30, 58], [0.13, 24, 84], [0.27, 34, 64], [0.39, 20, 100], [0.5, 30, 70],
  [0.64, 26, 92], [0.8, 34, 76], [0.91, 26, 108],
];
const WINDOW = { w: 3, h: 4, colGap: 7, rowGap: 9, inset: 5 };

// Deterministic "random" 0-1 so windows don't change between renders.
const noise = (a: number, b: number) => {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
// Share of windows left out: day shows most of the grid, night lights
// a bit under half the flats.
const WINDOW_SKIP = { day: 0.2, night: 0.55 };

const ridgePath = (width: number, baseY: number) => {
  const pts = HILL_RIDGE.map(([fx, fh]) => [fx * width, baseY - fh * HILL_MAX_PX]);
  let d = `M 0 ${baseY} L ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    // Curve through the midpoints, so the ridge is rounded, not jagged.
    const [px, py] = pts[i - 1];
    const [x, y] = pts[i];
    d += ` Q ${px} ${py} ${(px + x) / 2} ${(py + y) / 2}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]} L ${width} ${baseY} Z`;
  return d;
};

const SceneBackdrop: React.FC<Props> = ({ width, height, layout, mood }) => {
  const { horizonY } = layout;
  const { isNight, haze, skyWarmth, sunGlow, lawnLevel } = mood;
  const skyBase = isNight ? SCENE_PALETTE.skyNight : SCENE_PALETTE.skyDay;
  const tod = isNight ? 'night' : 'day';
  const hazeColor = SCENE_PALETTE.haze[tod];
  const waterTop = horizonY - SCENE_LAYOUT.waterHeight;

  // Aerial perspective: the further away, the more the smog swallows it.
  const skyTop = mixHex(skyBase.top, hazeColor, haze * 0.35);
  const skyBottom = mixHex(mixHex(skyBase.bottom, skyBase.hot, skyWarmth), hazeColor, haze * 0.75);
  const hills = mixHex(SCENE_PALETTE.hills[tod], skyBottom, 0.15 + haze * 0.8);
  const farTowers = mixHex(SCENE_PALETTE.farTowers[tod], skyBottom, 0.1 + haze * 0.7);
  const nearTowers = mixHex(SCENE_PALETTE.nearTowers[tod], hazeColor, haze * 0.5);
  const water = mixHex(SCENE_PALETTE.water[tod], hazeColor, haze * 0.5);
  const lawnDay = SCENE_PALETTE.lawn[lawnLevel ?? 'none'];
  const lawn = isNight
    ? mixHex(lawnDay, SCENE_PALETTE.lawnNightMix.color, SCENE_PALETTE.lawnNightMix.amount)
    : lawnDay;
  const lawnDeep = mixHex(lawn, SCENE_PALETTE.lawnDeep, 0.6);

  // The sun: brighter, wider glow and turning rays as it gets hotter; dimmer
  // and orange through smog. At night a moon instead.
  const sunCx = width * SCENE_LAYOUT.sunXFraction;
  const sunCy = horizonY - SCENE_LAYOUT.sunAboveHorizon;
  const sunR = SCENE_LAYOUT.sunRadius;
  const sunCore = mixHex(SCENE_PALETTE.sun.core, SCENE_PALETTE.sun.hazy, haze);
  const sunVisibility = 1 - haze * 0.55;
  const showRays = !isNight && sunGlow >= 0.6;
  const rayCount = 10;

  const sunLoop = useSceneLoop(SCENE_TIMING.sunPulseMs * 4);
  const pulse = useSceneLoop(SCENE_TIMING.sunPulseMs, { reverse: true });
  // One ray spacing per loop, so the turning never visibly restarts.
  const rayTransform = useDerivedValue(() => [
    { rotate: (sunLoop.value * 2 * Math.PI) / rayCount },
  ]);
  const glowTransform = useDerivedValue(() => [{ scale: 1 + pulse.value * 0.06 * sunGlow }]);

  const rays = Array.from({ length: rayCount }).map((_, i) => {
    const a = (i / rayCount) * Math.PI * 2;
    const r0 = sunR * 1.35;
    const r1 = sunR * (1.75 + sunGlow * 0.25);
    return `M ${sunCx + Math.cos(a) * r0} ${sunCy + Math.sin(a) * r0} L ${
      sunCx + Math.cos(a) * r1
    } ${sunCy + Math.sin(a) * r1}`;
  });

  const towerWindows = (towers: [number, number, number][]) =>
    towers.flatMap(([fx, w, h], ti) => {
      const x0 = fx * width;
      const out: { x: number; y: number }[] = [];
      for (let c = 0; x0 + WINDOW.inset + c * WINDOW.colGap + WINDOW.w <= x0 + w - WINDOW.inset; c++) {
        for (let r = 0; waterTop - h + WINDOW.inset + r * WINDOW.rowGap + WINDOW.h <= waterTop - 4; r++) {
          if (noise(ti * 31 + c, r) < WINDOW_SKIP[tod]) continue;
          out.push({
            x: x0 + WINDOW.inset + c * WINDOW.colGap,
            y: waterTop - h + WINDOW.inset + r * WINDOW.rowGap,
          });
        }
      }
      return out;
    });
  const windows = towerWindows(NEAR_TOWERS);
  const windowColor = isNight
    ? mixHex(SCENE_PALETTE.windows.night, hazeColor, haze * 0.6)
    : SCENE_PALETTE.windows.day;

  return (
    <Group>
      <Rect x={0} y={0} width={width} height={horizonY}>
        <LinearGradient start={vec(0, 0)} end={vec(0, horizonY)} colors={[skyTop, skyBottom]} />
      </Rect>

      {isNight ? (
        <Group opacity={sunVisibility}>
          <Circle cx={sunCx} cy={sunCy} r={sunR * 1.9} color={withAlpha(SCENE_PALETTE.moon, 0.12)} />
          <Circle cx={sunCx} cy={sunCy} r={sunR * 0.8} color={SCENE_PALETTE.moon} />
          {/* The crescent: the sky's own colour bites into the disc. */}
          <Circle cx={sunCx + sunR * 0.35} cy={sunCy - sunR * 0.2} r={sunR * 0.68} color={skyTop} />
        </Group>
      ) : (
        <Group opacity={sunVisibility}>
          <Group origin={vec(sunCx, sunCy)} transform={glowTransform}>
            <Circle cx={sunCx} cy={sunCy} r={sunR * 3.4} color={withAlpha(SCENE_PALETTE.sun.glow, 0.08 + sunGlow * 0.14)} />
            <Circle cx={sunCx} cy={sunCy} r={sunR * 2.4} color={withAlpha(SCENE_PALETTE.sun.glow, 0.12 + sunGlow * 0.2)} />
            <Circle cx={sunCx} cy={sunCy} r={sunR * 1.6} color={withAlpha(SCENE_PALETTE.sun.core, 0.3 + sunGlow * 0.3)} />
          </Group>
          {showRays && (
            <Group origin={vec(sunCx, sunCy)} transform={rayTransform}>
              {rays.map((d, i) => (
                <Path
                  key={`ray-${i}`}
                  path={d}
                  color={withAlpha(sunCore, 0.4 + sunGlow * 0.4)}
                  style="stroke"
                  strokeWidth={3}
                  strokeCap="round"
                />
              ))}
            </Group>
          )}
          <Circle cx={sunCx} cy={sunCy} r={sunR} color={sunCore} />
        </Group>
      )}

      <Path path={ridgePath(width, waterTop)} color={hills} />

      {FAR_TOWERS.map(([fx, w, h], i) => (
        <Rect key={`far-${i}`} x={fx * width} y={waterTop - h} width={w} height={h} color={farTowers} />
      ))}
      {NEAR_TOWERS.map(([fx, w, h], i) => (
        <Group key={`near-${i}`}>
          <Rect x={fx * width} y={waterTop - h} width={w} height={h} color={nearTowers} />
          {/* A slim roof block on the taller towers, so the skyline isn't all flat tops. */}
          {h > 80 && (
            <Rect x={fx * width + w * 0.3} y={waterTop - h - 8} width={w * 0.4} height={8} color={nearTowers} />
          )}
        </Group>
      ))}
      {windows.map((wnd, i) => (
        <Rect key={`win-${i}`} x={wnd.x} y={wnd.y} width={WINDOW.w} height={WINDOW.h} color={windowColor} />
      ))}

      <Rect x={0} y={waterTop} width={width} height={SCENE_LAYOUT.waterHeight} color={water} />
      {[0.08, 0.3, 0.57, 0.83].map((fx, i) => (
        <Rect
          key={`glint-${i}`}
          x={fx * width}
          y={waterTop + 4 + (i % 2) * 4}
          width={18 + (i % 3) * 8}
          height={1.5}
          color={withAlpha('#FFFFFF', (isNight ? 0.25 : 0.45) * (1 - haze * 0.6))}
        />
      ))}

      <Rect x={0} y={horizonY} width={width} height={height - horizonY}>
        <LinearGradient
          start={vec(0, horizonY)}
          end={vec(0, horizonY + height * 0.35)}
          colors={[lawn, lawnDeep]}
        />
      </Rect>
      {/* The lawn's lit front edge. */}
      <Rect x={0} y={horizonY} width={width} height={3} color={mixHex(lawn, '#FFFFFF', 0.25)} />
    </Group>
  );
};

export default SceneBackdrop;
