// src/components/scene/DogCharacter.tsx
import React from 'react';
import { Circle, Group, Oval, Path, RoundedRect, vec } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { SCENE_LIMITS, SCENE_PALETTE, SCENE_TIMING } from '../../config/sceneConfig';
import { DogMood } from '../../utils/sceneMood';
import { mixHex } from '../../utils/sceneColors';
import { useSceneLoop } from './useSceneLoop';

type Props = {
  x: number;
  groundY: number;
  scale: number;
  mood: DogMood;
};

const C = SCENE_PALETTE.dog;
const FUR_SHADE = mixHex(C.fur, C.furDark, 0.45);

// Side view, facing the person (right). Drawn around (0, 0) = the ground
// under the dog; every paw and the body rest on y = 0, so it sits on the
// lawn rather than hovering above its shadow.
//
// Dogs don't sweat. Heat shows as hard panting — jaw working, tongue
// hanging out, big huffs — drool that grows from a drip to a puddle, a tail
// too tired to wag and, from Danger up, lying flat. Dirty air shows as red,
// watery eyes, a runny nose, fast breathing at rest and, at its worst,
// lying down listlessly.

const TEARDROP = 'M 0 -4 Q 2.4 0.5 0 2.4 Q -2.4 0.5 0 -4 Z';
const TONGUE_LENGTH: Record<DogMood['tongue'], number> = { none: 0, short: 5, long: 9 };
const POSE_SHIFT_X: Record<DogMood['pose'], number> = { sit: 0, lie: -10 };

// The head is drawn once, in sitting position; lying, it is moved down onto
// the front paws.
const HEAD_OFFSET: Record<DogMood['pose'], { x: number; y: number }> = {
  sit: { x: 0, y: 0 },
  lie: { x: 18, y: 27 },
};
// Lying, the tongue can only hang as far as the grass.
const TONGUE_MAX: Record<DogMood['pose'], number> = { sit: 99, lie: 3.5 };

// Head geometry (sitting position).
const H = {
  cx: 6, cy: -41, r: 11,
  eye: { x: 8.5, y: -45 },
  nose: { x: 25.5, y: -41.5 },
  hinge: { x: 12, y: -35.5 }, // where the lower jaw pivots
  tongueX: 19.25,
};
// How far the jaw drops while panting: shut → open (radians).
const JAW_OPEN = { rest: 0.16, extra: 0.34 };

const rotateAround = (px: number, py: number, angle: number) => {
  const dx = px - H.hinge.x;
  const dy = py - H.hinge.y;
  return {
    x: H.hinge.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: H.hinge.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
};

// A drop that swells at `from`, stretches, falls `fall` px and fades.
const FallingDrop: React.FC<{
  index: number;
  count: number;
  from: { x: number; y: number };
  fall: number;
  loop: SharedValue<number>;
  fill: string;
  edge: string;
  size?: number;
}> = ({ index, count, from, fall, loop, fill, edge, size = 1 }) => {
  const phase = index / count;
  const transform = useDerivedValue(() => {
    const p = (loop.value + phase) % 1;
    if (p < 0.45) {
      const k = p / 0.45;
      return [
        { translateX: from.x }, { translateY: from.y + 1 + k * 2 },
        { scaleX: size * (0.5 + k * 0.5) }, { scaleY: size * (0.6 + k * 0.9) },
      ];
    }
    const k = Math.min(1, (p - 0.45) / 0.4);
    return [
      { translateX: from.x }, { translateY: from.y + 3 + k * k * Math.max(0, fall - 4) },
      { scaleX: size }, { scaleY: size * 1.1 },
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
      <Path path={TEARDROP} color={fill} />
      <Path path={TEARDROP} color={edge} style="stroke" strokeWidth={0.7} />
    </Group>
  );
};

// A tear running from the eye down the cheek.
const Tear: React.FC<{ loop: SharedValue<number> }> = ({ loop }) => {
  const transform = useDerivedValue(() => [
    { translateX: H.eye.x + 0.5 },
    { translateY: H.eye.y + 3 + loop.value * 8 },
    { scale: 0.55 },
  ]);
  const opacity = useDerivedValue(() => {
    const p = loop.value;
    if (p < 0.15) return p / 0.15;
    if (p > 0.8) return (1 - p) / 0.2;
    return 1;
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={TEARDROP} color={C.tear} />
    </Group>
  );
};

const Eye: React.FC<{ mood: DogMood }> = ({ mood }) => {
  const { x, y } = H.eye;
  if (mood.eyes === 'closed') {
    return <Path path={`M ${x - 3} ${y} Q ${x} ${y + 2.4} ${x + 3} ${y}`} color={C.ink} style="stroke" strokeWidth={1.4} strokeCap="round" />;
  }
  return (
    <>
      {/* Sore eyes: inflamed red rim. */}
      {mood.redEyes && <Circle cx={x} cy={y} r={3.9} color={C.redEye} />}
      <Circle cx={x} cy={y} r={2.5} color={C.eyeWhite} />
      <Circle cx={x + 0.5} cy={y} r={1.8} color={C.ink} />
      <Circle cx={x + 1} cy={y - 0.7} r={0.55} color={C.eyeWhite} />
      {mood.eyes === 'tired' && (
        // A heavy lid of fur over the top half.
        <Path path={`M ${x - 3.6} ${y + 0.2} A 3.6 3.6 0 0 1 ${x + 3.6} ${y + 0.2} Z`} color={C.fur} />
      )}
    </>
  );
};

// Curved "huff" marks puffing out of the mouth on every breath out.
const HUFFS = ['M 30 -37 Q 33.5 -33.5 30 -30', 'M 34.5 -39.5 Q 39.5 -33.5 34.5 -27.5'];
const Huffs: React.FC<{ pant: SharedValue<number> }> = ({ pant }) => {
  const transform = useDerivedValue(() => [{ translateX: pant.value * 3.5 }]);
  const opacity = useDerivedValue(() => Math.max(0, (pant.value - 0.25) / 0.75));
  return (
    <Group transform={transform} opacity={opacity}>
      {HUFFS.map((d, i) => (
        <Group key={`huff-${i}`}>
          <Path path={d} color={C.breathEdge} style="stroke" strokeWidth={3.2} strokeCap="round" />
          <Path path={d} color={C.breath} style="stroke" strokeWidth={1.8} strokeCap="round" />
        </Group>
      ))}
    </Group>
  );
};

const DogHead: React.FC<{
  mood: DogMood;
  pant: SharedValue<number>;
  tears: SharedValue<number>;
  drip: SharedValue<number>;
  tongueLength: number;
}> = ({ mood, pant, tears, drip, tongueLength }) => {
  const panting = mood.mouth === 'pant';
  const jaw = useDerivedValue(() => [
    { rotate: panting ? JAW_OPEN.rest + pant.value * JAW_OPEN.extra : 0 },
  ]);
  // The tongue flops longer on every breath.
  const tongueFlop = useDerivedValue(() => [{ scaleY: 1 + pant.value * 0.15 }]);
  const tongueTop = -34;
  const tw = 6;

  return (
    <>
      <Path path="M 2 -50 Q -8 -46 -4 -32 Q 4 -38 2 -50 Z" color={C.furDark} />
      <Circle cx={H.cx} cy={H.cy} r={H.r} color={C.fur} />

      {/* Open mouth, seen when the jaw drops. */}
      {panting && (
        <Path path={`M ${H.hinge.x} ${H.hinge.y} L 25.5 -36.5 L 23 -26 L 13 -31 Z`} color={C.mouthInside} />
      )}

      {/* Lower jaw (and the tongue on it), swinging open with each pant. */}
      <Group origin={vec(H.hinge.x, H.hinge.y)} transform={jaw}>
        {tongueLength > 0 && panting && (
          <Group origin={vec(H.tongueX, tongueTop)} transform={tongueFlop}>
            <Path
              path={`M ${H.tongueX - tw / 2} ${tongueTop} L ${H.tongueX + tw / 2} ${tongueTop} L ${H.tongueX + tw / 2} ${tongueTop + tongueLength} Q ${H.tongueX} ${tongueTop + tongueLength + 4.5} ${H.tongueX - tw / 2} ${tongueTop + tongueLength} Z`}
              color={C.tongue}
            />
            <Path path={`M ${H.tongueX} ${tongueTop + 1.5} L ${H.tongueX} ${tongueTop + tongueLength}`} color="rgba(150,40,60,0.45)" style="stroke" strokeWidth={0.9} />
          </Group>
        )}
        <RoundedRect x={11} y={-36.5} width={13.5} height={4} r={2} color={C.muzzle} />
      </Group>

      {/* Upper muzzle and nose. */}
      <RoundedRect x={10} y={-44} width={16.5} height={9} r={4.5} color={C.muzzle} />
      <Circle cx={H.nose.x} cy={H.nose.y} r={2.7} color={C.ink} />
      <Circle cx={H.nose.x - 0.8} cy={H.nose.y - 0.9} r={0.7} color="rgba(255,255,255,0.6)" />

      {mood.mouth === 'smile' && (
        <Path path="M 14 -35.3 Q 19 -33 24.5 -35.8" color={C.ink} style="stroke" strokeWidth={1.2} strokeCap="round" />
      )}
      {mood.mouth === 'closed' && (
        <Path path="M 14 -35.4 L 24.5 -35.6" color={C.ink} style="stroke" strokeWidth={1.1} strokeCap="round" />
      )}

      <Eye mood={mood} />
      {mood.teary && mood.eyes !== 'closed' && <Tear loop={tears} />}

      {/* A clear runny nose: a drip swelling under the nostril. */}
      {mood.runnyNose && (
        <FallingDrop
          index={0}
          count={1}
          from={{ x: H.nose.x + 0.5, y: H.nose.y + 2 }}
          fall={7}
          loop={drip}
          fill={C.snot}
          edge={C.droolEdge}
          size={0.7}
        />
      )}

      {mood.heavyBreath && panting && <Huffs pant={pant} />}
    </>
  );
};

const SittingBody: React.FC<{ tail: SharedValue<number>; pant: SharedValue<number> }> = ({ tail, pant }) => {
  const tailTransform = useDerivedValue(() => [{ rotate: (tail.value - 0.5) * 0.8 }]);
  // The chest swells with every breath in.
  const chest = useDerivedValue(() => [{ scale: 1 + pant.value * 0.07 }]);
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
  // Flank heaving with each breath — the clearest sign of a dog struggling.
  const breathe = useDerivedValue(() => [{ scaleY: 1 + pant.value * 0.14 }]);
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

const DogCharacter: React.FC<Props> = ({ x, groundY, scale, mood }) => {
  const tail = useSceneLoop(mood.tailWagMs, { reverse: true });
  const pant = useSceneLoop(mood.pantMs, { reverse: true });
  const drool = useSceneLoop(mood.droolDrops > 0 ? SCENE_TIMING.droolMs : null);
  const tears = useSceneLoop(mood.teary ? SCENE_TIMING.tearMs : null);
  const drip = useSceneLoop(mood.runnyNose ? SCENE_TIMING.noseDripMs : null);

  const head = HEAD_OFFSET[mood.pose];
  const bobAmount = mood.pose === 'sit' ? 1.8 : 0.7;
  const headBob = useDerivedValue(() => [
    { translateX: head.x },
    { translateY: head.y + pant.value * bobAmount },
  ]);

  // Drool runs off the tongue tip (or the jaw without a tongue out), at the
  // jaw's average opening, and falls to the grass.
  const tongueLength = Math.min(TONGUE_LENGTH[mood.tongue], TONGUE_MAX[mood.pose]);
  const tip = rotateAround(
    H.tongueX,
    -34 + tongueLength + 3,
    mood.mouth === 'pant' ? JAW_OPEN.rest + JAW_OPEN.extra / 2 : 0,
  );
  const from = { x: tip.x + head.x, y: Math.min(tip.y + head.y, -1) };
  const puddleW = 6 + mood.puddle * 18;
  const puddleH = 2.5 + mood.puddle * 2;

  return (
    <Group
      transform={[
        { translateX: x },
        { translateY: groundY },
        { scale },
        // Lying, the dog is longer: shift it back so it never touches the person.
        { translateX: POSE_SHIFT_X[mood.pose] },
      ]}
    >
      {mood.pose === 'sit' ? <SittingBody tail={tail} pant={pant} /> : <LyingBody pant={pant} />}
      <Group transform={headBob}>
        <DogHead mood={mood} pant={pant} tears={tears} drip={drip} tongueLength={tongueLength} />
      </Group>
      {mood.puddle > 0 && (
        <Oval rect={{ x: from.x - puddleW / 2, y: -puddleH / 2 + 0.5, width: puddleW, height: puddleH }} color={C.puddle} />
      )}
      {Array.from({ length: SCENE_LIMITS.maxDroolDrops }).map((_, i) =>
        i < mood.droolDrops ? (
          <FallingDrop
            key={`drool-${i}`}
            index={i}
            count={SCENE_LIMITS.maxDroolDrops}
            from={from}
            fall={-from.y}
            loop={drool}
            fill={C.drool}
            edge={C.droolEdge}
          />
        ) : null,
      )}
    </Group>
  );
};

export default DogCharacter;
