// src/components/scene/DogCharacter.tsx
import React from 'react';
import { Circle, Group, Oval, Path, RoundedRect, vec } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import {
  SCENE_ENTRANCE,
  SCENE_LIMITS,
  SCENE_PALETTE,
  SCENE_TIMING,
} from '../../config/sceneConfig';
import { DogMood } from '../../utils/sceneMood';
import { mixHex } from '../../utils/sceneColors';
import { reactProgress, walkProgress, walking } from '../../utils/sceneEntrance';
import { useSceneLoop } from './useSceneLoop';

type Props = {
  x: number;
  groundY: number;
  scale: number;
  mood: DogMood;
  entrance: SharedValue<number>; // ms since the scene appeared
  walkDistance: number; // px it walks in from
};

const C = SCENE_PALETTE.dog;
const FUR_SHADE = mixHex(C.fur, C.furDark, 0.45);

// A floppy-eared dog in side view, facing the person (right). Drawn around
// (0, 0) = the ground under it; paws and body rest on y = 0.
//
// It trots in on four legs, already reacting, then sits (or, when it's too
// hot or the air is too bad, lies down). Dogs don't sweat: heat shows as panting —
// the jaw working with each breath, the tongue out over the lower lip,
// huffs at the hardest — drool from a drip to a puddle, a tail too tired to
// wag. Dirty air makes it listless: no grin, no wagging, then lying down,
// breathing fast.

const TEARDROP = 'M 0 -4 Q 2.4 0.5 0 2.4 Q -2.4 0.5 0 -4 Z';

// How far the tongue hangs past the lower lip, per pose (lying, the chin is
// on the paws, so it can only rest on them).
const TONGUE_DROOP: Record<DogMood['tongue'], number> = { none: 0, short: 2, long: 5 };
const TONGUE_DROOP_MAX: Record<DogMood['pose'], number> = { sit: 99, lie: 2.5 };
// Lying, the dog is longer: shift it back so it never touches the person.
const POSE_SHIFT_X: Record<DogMood['pose'], number> = { sit: 0, lie: -10 };

// The head is drawn once, in sitting position, and moved for the other
// poses: onto the front paws when lying, forward and down when trotting.
const HEAD_OFFSET = {
  sit: { x: 0, y: 0 },
  lie: { x: 18, y: 27 },
  walk: { x: 18, y: 6 },
};

// Head geometry (sitting position).
const H = {
  cx: 6, cy: -41, r: 11,
  eye: { x: 10, y: -45.5 },
  corner: { x: 15, y: -37.5 }, // mouth corner: the lower jaw pivots here
  jawFront: 25.5,
  tongueTipX: 25.2,
};
// How far the jaw drops while panting (radians): never fully shut, wider on
// each breath out.
const JAW_OPEN = { rest: 0.2, extra: 0.2 };

const rotateAroundCorner = (px: number, py: number, angle: number) => {
  const dx = px - H.corner.x;
  const dy = py - H.corner.y;
  return {
    x: H.corner.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: H.corner.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
};

// The tongue seen from the side: lying on the lower jaw, its front curling
// out over the lip and hanging `droop` px below it, with a rounded tip.
const tonguePath = (droop: number) => {
  const yT = -33.8 + droop;
  return (
    `M 16.5 -37.9 L 23.5 -37.9 Q 27.3 -37.9 27.3 ${yT - 2.2} ` +
    `Q 27.3 ${yT} ${H.tongueTipX} ${yT} Q 23.1 ${yT} 23.1 ${yT - 2.4} ` +
    'L 23.1 -35.6 L 16.5 -35.6 Z'
  );
};
const tongueTipY = (droop: number) => -33.8 + droop;

// A drop of drool that swells at the tongue tip, stretches, falls and fades.
const DroolDrop: React.FC<{
  index: number;
  from: { x: number; y: number };
  loop: SharedValue<number>;
}> = ({ index, from, loop }) => {
  const phase = index / SCENE_LIMITS.maxDroolDrops;
  const fall = -from.y;
  const transform = useDerivedValue(() => {
    const p = (loop.value + phase) % 1;
    if (p < 0.45) {
      const k = p / 0.45;
      return [
        { translateX: from.x }, { translateY: from.y + 1 + k * 2 },
        { scaleX: 0.5 + k * 0.5 }, { scaleY: 0.6 + k * 0.9 },
      ];
    }
    const k = Math.min(1, (p - 0.45) / 0.4);
    return [
      { translateX: from.x }, { translateY: from.y + 3 + k * k * Math.max(0, fall - 4) },
      { scaleX: 1 }, { scaleY: 1.1 },
    ];
  });
  const opacity = useDerivedValue(() => {
    const p = (loop.value + phase) % 1;
    if (p < 0.08) return p / 0.08;
    if (p > 0.85) return Math.max(0, (1 - p) / 0.15);
    return 1;
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={TEARDROP} color={C.drool} />
      <Path path={TEARDROP} color={C.droolEdge} style="stroke" strokeWidth={0.7} />
    </Group>
  );
};

// Curved "huff" marks puffing out of the mouth on every breath out.
const HUFFS = ['M 31 -40 Q 34 -37 31 -34', 'M 35 -42.5 Q 39.5 -37 35 -31.5'];
const Huffs: React.FC<{ pant: SharedValue<number> }> = ({ pant }) => {
  const transform = useDerivedValue(() => [{ translateX: pant.value * 3 }]);
  const opacity = useDerivedValue(() => Math.max(0, (pant.value - 0.3) / 0.7));
  return (
    <Group transform={transform} opacity={opacity}>
      {HUFFS.map((d, i) => (
        <Group key={`huff-${i}`}>
          <Path path={d} color={C.breathEdge} style="stroke" strokeWidth={3} strokeCap="round" />
          <Path path={d} color={C.breath} style="stroke" strokeWidth={1.7} strokeCap="round" />
        </Group>
      ))}
    </Group>
  );
};

type HeadLook = Pick<DogMood, 'mouth' | 'eyes' | 'heavyBreath'> & { droop: number };

const DogHead: React.FC<{ look: HeadLook; pant: SharedValue<number> }> = ({ look, pant }) => {
  const panting = look.mouth === 'pant';
  const jaw = useDerivedValue(() => [
    { rotate: panting ? JAW_OPEN.rest + pant.value * JAW_OPEN.extra : 0 },
  ]);
  // The tongue bobs a little with each breath.
  const tongueBob = useDerivedValue(() => [{ translateY: pant.value * 0.6 }]);
  const { x: ex, y: ey } = H.eye;

  return (
    <>
      <Circle cx={H.cx} cy={H.cy} r={H.r} color={C.fur} />

      {panting && (
        // Inside of the open mouth, showing between the jaws.
        <Path path="M 15 -37.5 L 26.5 -37 L 26 -31 L 15 -36 Z" color={C.mouthInside} />
      )}

      {/* Lower jaw, pivoting at the mouth corner; the tongue rests on it. */}
      <Group origin={vec(H.corner.x, H.corner.y)} transform={jaw}>
        <RoundedRect x={13} y={-37.8} width={H.jawFront - 13} height={3.5} r={1.8} color={C.muzzle} />
        {panting && look.droop > 0 && (
          <Group transform={tongueBob}>
            <Path path={tonguePath(look.droop)} color={C.tongue} />
            <Path
              path={`M ${H.tongueTipX} -36.8 L ${H.tongueTipX} ${tongueTipY(look.droop) - 1.2}`}
              color={C.tongueCrease}
              style="stroke"
              strokeWidth={0.8}
              strokeCap="round"
            />
          </Group>
        )}
      </Group>

      {/* Upper muzzle and nose. */}
      <RoundedRect x={11} y={-45.5} width={16.5} height={9} r={4.5} color={C.muzzle} />
      <Oval rect={{ x: 24.4, y: -46.6, width: 5.2, height: 4.4 }} color={C.ink} />
      <Circle cx={25.6} cy={-45.6} r={0.7} color={C.highlight} />

      {!panting && (
        <>
          {/* Closed mouth: the short line under the nose, then the mouth
              line back to the corner — curling up for a grin. */}
          <Path path="M 26.5 -42.3 L 26.5 -39.5" color={C.ink} style="stroke" strokeWidth={1.1} strokeCap="round" />
          <Path
            path={look.mouth === 'smile' ? 'M 26.5 -39.5 Q 21.5 -36.2 16 -38.4' : 'M 26.5 -39.5 Q 21.5 -37.6 16.5 -38.2'}
            color={C.ink}
            style="stroke"
            strokeWidth={1.1}
            strokeCap="round"
          />
        </>
      )}

      {look.eyes === 'closed' ? (
        <Path path={`M ${ex - 2.4} ${ey} Q ${ex} ${ey + 2} ${ex + 2.4} ${ey}`} color={C.ink} style="stroke" strokeWidth={1.3} strokeCap="round" />
      ) : (
        <>
          <Oval rect={{ x: ex - 1.6, y: ey - 2, width: 3.2, height: 4 }} color={C.ink} />
          <Circle cx={ex + 0.5} cy={ey - 0.9} r={0.65} color={C.highlight} />
          {look.eyes === 'tired' && (
            // A heavy lid of fur over the top half.
            <Path path={`M ${ex - 2.3} ${ey} A 2.3 2.3 0 0 1 ${ex + 2.3} ${ey} Z`} color={C.fur} />
          )}
        </>
      )}

      {/* The floppy ear hangs from the top of the head, over its side. */}
      <Path path="M 1 -51.5 Q -7 -48 -4.5 -34 Q -1.5 -31.5 1.5 -35 Q 4.5 -43 7.5 -50 Z" color={C.furDark} />

      {look.heavyBreath && panting && <Huffs pant={pant} />}
    </>
  );
};

const SittingBody: React.FC<{ tail: SharedValue<number>; pant: SharedValue<number> }> = ({ tail, pant }) => {
  const tailTransform = useDerivedValue(() => [{ rotate: (tail.value - 0.5) * 0.8 }]);
  // The chest swells with every breath in.
  const chest = useDerivedValue(() => [{ scale: 1 + pant.value * 0.06 }]);
  return (
    <>
      <Oval rect={{ x: -25, y: -3, width: 52, height: 7 }} color={SCENE_PALETTE.shadow} />
      <Group origin={vec(-15, -9)} transform={tailTransform}>
        <Path path="M -15 -9 Q -24 -12 -25 -25" color={C.furDark} style="stroke" strokeWidth={4.5} strokeCap="round" />
      </Group>
      <Oval rect={{ x: -21, y: -26, width: 25, height: 26 }} color={C.fur} />
      <Oval rect={{ x: -18, y: -5, width: 13, height: 5 }} color={FUR_SHADE} />
      <Group origin={vec(3, -4)} transform={chest}>
        <RoundedRect x={-6} y={-33} width={19} height={31} r={8} color={C.fur} />
        <Oval rect={{ x: 1, y: -29, width: 10, height: 16 }} color={C.muzzle} />
      </Group>
      <RoundedRect x={2.5} y={-15} width={5} height={15} r={2.5} color={FUR_SHADE} />
      <RoundedRect x={8.5} y={-15} width={5} height={15} r={2.5} color={C.fur} />
      <Oval rect={{ x: 1.5, y: -3, width: 7, height: 3.5 }} color={C.furDark} />
      <Oval rect={{ x: 7.5, y: -3, width: 7.5, height: 3.5 }} color={C.furDark} />
      <RoundedRect x={-2} y={-34.5} width={16} height={4} r={2} color={C.collar} />
    </>
  );
};

const LyingBody: React.FC<{ pant: SharedValue<number> }> = ({ pant }) => {
  // The flank heaving with each breath.
  const breathe = useDerivedValue(() => [{ scaleY: 1 + pant.value * 0.12 }]);
  return (
    <>
      <Oval rect={{ x: -36, y: -3, width: 82, height: 7 }} color={SCENE_PALETTE.shadow} />
      <Path path="M -25 -4 Q -33 -3 -39 -1" color={C.furDark} style="stroke" strokeWidth={4.5} strokeCap="round" />
      <Group origin={vec(0, 0)} transform={breathe}>
        <Oval rect={{ x: -29, y: -17, width: 48, height: 17 }} color={C.fur} />
        <Oval rect={{ x: -27, y: -10, width: 19, height: 10 }} color={FUR_SHADE} />
      </Group>
      <RoundedRect x={12} y={-6} width={24} height={5} r={2.5} color={FUR_SHADE} />
      <RoundedRect x={14} y={-5} width={25} height={5} r={2.5} color={C.fur} />
      <RoundedRect x={13.5} y={-20} width={4} height={12} r={2} color={C.collar} />
    </>
  );
};

// The trot at a moment of the entrance: leg swing in radians, 0 once arrived.
const swingAt = (ms: number): number => {
  'worklet';
  return (
    Math.sin((ms / SCENE_ENTRANCE.dogStepMs) * Math.PI * 2) * SCENE_ENTRANCE.dogLegSwing * walking(ms)
  );
};

// One leg of the trotting dog, swinging from the hip.
const Leg: React.FC<{
  hipX: number;
  color: string;
  entrance: SharedValue<number>;
  sign: 1 | -1;
}> = ({ hipX, color, entrance, sign }) => {
  const transform = useDerivedValue(() => [{ rotate: swingAt(entrance.value) * sign }]);
  return (
    <Group origin={vec(hipX, -14)} transform={transform}>
      <RoundedRect x={hipX - 2.5} y={-15} width={5} height={14} r={2.5} color={color} />
      <Oval rect={{ x: hipX - 3, y: -3, width: 7, height: 3.5 }} color={C.furDark} />
    </Group>
  );
};

// Four legs at a trot: diagonal pairs move together. Its face, breathing
// and tail are already its real reaction (panting in the heat, no wagging
// when listless), so nothing but the pose changes on arrival.
const WalkingDog: React.FC<{
  entrance: SharedValue<number>;
  look: HeadLook;
  pant: SharedValue<number>;
  wag: SharedValue<number>;
  wagging: boolean;
}> = ({ entrance, look, pant, wag, wagging }) => {
  const bob = useDerivedValue(() => [{ translateY: -Math.abs(swingAt(entrance.value)) * 2.4 }]);
  // A wagging tail wags; a tired one just sways with the steps, held lower.
  const tail = useDerivedValue(() => [
    { rotate: wagging ? (wag.value - 0.5) * 0.8 : -1.1 + swingAt(entrance.value) * 0.2 },
  ]);
  const headBob = useDerivedValue(() => [
    { translateX: HEAD_OFFSET.walk.x },
    { translateY: HEAD_OFFSET.walk.y + pant.value * 1.2 },
  ]);

  return (
    <>
      <Oval rect={{ x: -27, y: -3, width: 58, height: 7 }} color={SCENE_PALETTE.shadow} />
      <Leg hipX={-13} color={FUR_SHADE} entrance={entrance} sign={-1} />
      <Leg hipX={11} color={FUR_SHADE} entrance={entrance} sign={1} />
      <Group transform={bob}>
        <Group origin={vec(-19, -23)} transform={tail}>
          <Path path="M -19 -23 Q -27 -26 -27 -35" color={C.furDark} style="stroke" strokeWidth={4.5} strokeCap="round" />
        </Group>
        <RoundedRect x={-21} y={-28} width={40} height={17} r={8.5} color={C.fur} />
        <Oval rect={{ x: 4, y: -20, width: 14, height: 8 }} color={C.muzzle} />
        <RoundedRect x={13} y={-34} width={4} height={12} r={2} color={C.collar} />
        <Group transform={headBob}>
          <DogHead look={look} pant={pant} />
        </Group>
      </Group>
      <Leg hipX={-9} color={C.fur} entrance={entrance} sign={1} />
      <Leg hipX={15} color={C.fur} entrance={entrance} sign={-1} />
    </>
  );
};

const DogCharacter: React.FC<Props> = ({ x, groundY, scale, mood, entrance, walkDistance }) => {
  const tail = useSceneLoop(mood.tailWagMs, { reverse: true });
  const pant = useSceneLoop(mood.pantMs, { reverse: true });
  const drool = useSceneLoop(mood.droolDrops > 0 ? SCENE_TIMING.droolMs : null);

  const placement = useDerivedValue(() => [
    { translateX: x - walkDistance * (1 - walkProgress(entrance.value)) },
    { translateY: groundY },
    { scale },
  ]);
  const walkOpacity = useDerivedValue(() => walking(entrance.value));
  const settledOpacity = useDerivedValue(() => 1 - walking(entrance.value));
  // Settling into the pose: a quick squash that springs back.
  const settle = useDerivedValue(() => [
    { translateX: POSE_SHIFT_X[mood.pose] },
    { scaleY: 1 - 0.12 * (1 - reactProgress(entrance.value)) },
  ]);
  const reactOpacity = useDerivedValue(() => reactProgress(entrance.value));

  const head = HEAD_OFFSET[mood.pose];
  const bobAmount = mood.pose === 'sit' ? 1.4 : 0.6;
  const headBob = useDerivedValue(() => [
    { translateX: head.x },
    { translateY: head.y + pant.value * bobAmount },
  ]);

  const droop =
    mood.tongue === 'none' ? 0 : Math.min(TONGUE_DROOP[mood.tongue], TONGUE_DROOP_MAX[mood.pose]);
  const look: HeadLook = { mouth: mood.mouth, eyes: mood.eyes, heavyBreath: mood.heavyBreath, droop };
  // Trotting, the head is up, so the tongue hangs freely.
  const walkLook: HeadLook = {
    ...look,
    droop: mood.tongue === 'none' ? 0 : TONGUE_DROOP[mood.tongue],
  };
  // Drool runs off the tongue tip at the jaw's average opening.
  const tip = rotateAroundCorner(
    H.tongueTipX,
    tongueTipY(droop),
    mood.mouth === 'pant' ? JAW_OPEN.rest + JAW_OPEN.extra / 2 : 0,
  );
  const from = { x: tip.x + head.x, y: Math.min(tip.y + head.y, -1) };
  const puddleW = 6 + mood.puddle * 18;
  const puddleH = 2.5 + mood.puddle * 2;

  return (
    <Group transform={placement}>
      <Group opacity={walkOpacity}>
        <WalkingDog
          entrance={entrance}
          look={walkLook}
          pant={pant}
          wag={tail}
          wagging={mood.tailWagMs !== null}
        />
      </Group>

      <Group opacity={settledOpacity} origin={vec(0, 0)} transform={settle}>
        {mood.pose === 'sit' ? <SittingBody tail={tail} pant={pant} /> : <LyingBody pant={pant} />}
        <Group transform={headBob}>
          <DogHead look={look} pant={pant} />
        </Group>
        <Group opacity={reactOpacity}>
          {mood.puddle > 0 && (
            <Oval rect={{ x: from.x - puddleW / 2, y: -puddleH / 2 + 0.5, width: puddleW, height: puddleH }} color={C.puddle} />
          )}
          {Array.from({ length: SCENE_LIMITS.maxDroolDrops }).map((_, i) =>
            i < mood.droolDrops ? <DroolDrop key={`drool-${i}`} index={i} from={from} loop={drool} /> : null,
          )}
        </Group>
      </Group>
    </Group>
  );
};

export default DogCharacter;
