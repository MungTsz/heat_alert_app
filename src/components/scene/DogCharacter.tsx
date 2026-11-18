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
// Dogs don't sweat: the heat shows as panting, a lolling tongue, drool that
// grows from a drip to a puddle, a tail too tired to wag and — from Danger
// up — lying flat on the ground.

const TONGUE_LENGTH: Record<DogMood['tongue'], number> = { none: 0, short: 5, long: 10 };

// Where drool leaves the dog, per pose (the tongue tip when sitting, the
// front of the jaw when lying), and the puddle under it.
const DROOL_FROM = {
  sit: (tongue: number) => ({ x: 19.5, y: -32 + tongue }),
  lie: () => ({ x: 41, y: -7 }),
};
const TEARDROP = 'M 0 -4 Q 2.4 0.5 0 2.4 Q -2.4 0.5 0 -4 Z';
const POSE_SHIFT_X: Record<DogMood['pose'], number> = { sit: 0, lie: -10 };

const DroolDrop: React.FC<{
  index: number;
  from: { x: number; y: number };
  loop: SharedValue<number>;
}> = ({ index, from, loop }) => {
  const phase = index / SCENE_LIMITS.maxDroolDrops;
  const fall = -from.y; // down to the ground (y = 0)
  const transform = useDerivedValue(() => {
    const p = (loop.value + phase) % 1;
    // 0-45%: a blob swells and stretches at the mouth; 45-85%: it drops;
    // then it has landed (and fades into the puddle).
    if (p < 0.45) {
      const k = p / 0.45;
      return [{ translateX: from.x }, { translateY: from.y + 1 + k * 2 }, { scaleX: 0.5 + k * 0.5 }, { scaleY: 0.6 + k * 0.9 }];
    }
    const k = Math.min(1, (p - 0.45) / 0.4);
    return [{ translateX: from.x }, { translateY: from.y + 3 + k * k * (fall - 4) }, { scaleX: 1 }, { scaleY: 1.1 }];
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

const Tongue: React.FC<{ x: number; y: number; length: number; pant: SharedValue<number> }> = ({
  x,
  y,
  length,
  pant,
}) => {
  // The tongue flicks a little longer on every pant.
  const transform = useDerivedValue(() => [{ scaleY: 1 + pant.value * 0.22 }]);
  const w = 5.5;
  return (
    <Group origin={vec(x, y)} transform={transform}>
      <Path
        path={`M ${x - w / 2} ${y} L ${x + w / 2} ${y} L ${x + w / 2} ${y + length - 2.5} Q ${x} ${y + length + 1.5} ${x - w / 2} ${y + length - 2.5} Z`}
        color={C.tongue}
      />
      <Path path={`M ${x} ${y + 1} L ${x} ${y + length - 2}`} color="rgba(150,40,60,0.45)" style="stroke" strokeWidth={0.8} />
    </Group>
  );
};

const SittingDog: React.FC<{ mood: DogMood; tail: SharedValue<number>; pant: SharedValue<number> }> = ({
  mood,
  tail,
  pant,
}) => {
  const tailTransform = useDerivedValue(() => [{ rotate: (tail.value - 0.5) * 0.8 }]);
  const headBob = useDerivedValue(() => [{ translateY: pant.value * 0.9 }]);
  const tongue = TONGUE_LENGTH[mood.tongue];

  return (
    <>
      <Oval rect={{ x: -25, y: -3, width: 52, height: 7 }} color={SCENE_PALETTE.shadow} />
      <Group origin={vec(-15, -9)} transform={tailTransform}>
        <Path path="M -15 -9 Q -24 -12 -25 -25" color={C.furDark} style="stroke" strokeWidth={4.5} strokeCap="round" />
      </Group>
      {/* Haunch and back paw */}
      <Oval rect={{ x: -21, y: -26, width: 25, height: 26 }} color={C.fur} />
      <Oval rect={{ x: -18, y: -5, width: 13, height: 5 }} color={FUR_SHADE} />
      {/* Chest and front legs */}
      <RoundedRect x={-6} y={-33} width={19} height={31} r={8} color={C.fur} />
      <Oval rect={{ x: 1, y: -29, width: 10, height: 16 }} color={C.muzzle} />
      <RoundedRect x={2.5} y={-15} width={5} height={15} r={2.5} color={FUR_SHADE} />
      <RoundedRect x={8.5} y={-15} width={5} height={15} r={2.5} color={C.fur} />
      <Oval rect={{ x: 1.5, y: -3, width: 7, height: 3.5 }} color={C.furDark} />
      <Oval rect={{ x: 7.5, y: -3, width: 7.5, height: 3.5 }} color={C.furDark} />

      <Group transform={headBob}>
        <RoundedRect x={-2} y={-34.5} width={16} height={4} r={2} color={C.collar} />
        <Circle cx={6} cy={-41} r={11} color={C.fur} />
        <RoundedRect x={10} y={-42} width={16} height={10} r={5} color={C.muzzle} />
        <Circle cx={25.5} cy={-40.5} r={2.6} color={C.ink} />
        <Circle cx={8.5} cy={-45} r={1.8} color={C.ink} />
        <Path path="M 2 -50 Q -8 -46 -4 -32 Q 4 -38 2 -50 Z" color={C.furDark} />
        {tongue === 0 ? (
          // Mouth closed in a little smile.
          <Path path="M 15 -34 Q 19.5 -31.5 24 -34.5" color={C.ink} style="stroke" strokeWidth={1.2} strokeCap="round" />
        ) : (
          <>
            <Path path="M 14 -33.5 L 25 -33.5 Q 20 -28.5 14 -33.5 Z" color="#5A2E2E" />
            <Tongue x={19.5} y={-32.5} length={tongue} pant={pant} />
          </>
        )}
      </Group>
    </>
  );
};

const LyingDog: React.FC<{ mood: DogMood; pant: SharedValue<number> }> = ({ mood, pant }) => {
  // Shallow, quick breaths: the flank rises and falls.
  const breathe = useDerivedValue(() => [{ scaleY: 1 + pant.value * 0.07 }]);
  const tongue = TONGUE_LENGTH[mood.tongue];

  return (
    <>
      <Oval rect={{ x: -36, y: -3, width: 80, height: 7 }} color={SCENE_PALETTE.shadow} />
      {/* Tail flat on the grass */}
      <Path path="M -25 -4 Q -33 -3 -39 -1" color={C.furDark} style="stroke" strokeWidth={4.5} strokeCap="round" />
      <Group origin={vec(0, 0)} transform={breathe}>
        <Oval rect={{ x: -29, y: -17, width: 48, height: 17 }} color={C.fur} />
        <Oval rect={{ x: -27, y: -10, width: 19, height: 10 }} color={FUR_SHADE} />
      </Group>
      {/* Front paws stretched out, chin resting on them */}
      <RoundedRect x={12} y={-6} width={22} height={5} r={2.5} color={FUR_SHADE} />
      <RoundedRect x={14} y={-5} width={22} height={5} r={2.5} color={C.fur} />
      <RoundedRect x={13.5} y={-20} width={4} height={12} r={2} color={C.collar} />
      <Circle cx={24} cy={-14} r={10.5} color={C.fur} />
      <RoundedRect x={28} y={-15} width={15} height={9} r={4.5} color={C.muzzle} />
      <Circle cx={42} cy={-13} r={2.5} color={C.ink} />
      {/* Eyes closed: worn out by the heat */}
      <Path path="M 22 -17.5 Q 25 -15.5 28 -17.5" color={C.ink} style="stroke" strokeWidth={1.3} strokeCap="round" />
      <Path path="M 19 -22 Q 9 -21 8 -10 Q 16 -13 19 -22 Z" color={C.furDark} />
      {tongue > 0 && (
        <>
          <Path path="M 31 -6.5 L 41 -6.5 Q 36 -3.5 31 -6.5 Z" color="#5A2E2E" />
          {/* Lolling out sideways, down onto the paws. */}
          <Tongue x={34} y={-6} length={tongue * 0.6} pant={pant} />
        </>
      )}
    </>
  );
};

const DogCharacter: React.FC<Props> = ({ x, groundY, scale, mood }) => {
  const tail = useSceneLoop(mood.tailWagMs, { reverse: true });
  const pant = useSceneLoop(mood.pantMs, { reverse: true });
  const drool = useSceneLoop(mood.droolDrops > 0 ? SCENE_TIMING.droolMs : null);

  const from =
    mood.pose === 'sit' ? DROOL_FROM.sit(TONGUE_LENGTH[mood.tongue]) : DROOL_FROM.lie();
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
      {mood.pose === 'sit' ? (
        <SittingDog mood={mood} tail={tail} pant={pant} />
      ) : (
        <LyingDog mood={mood} pant={pant} />
      )}
      {mood.puddle > 0 && (
        <Oval rect={{ x: from.x - puddleW / 2, y: -puddleH / 2 + 0.5, width: puddleW, height: puddleH }} color={C.puddle} />
      )}
      {Array.from({ length: SCENE_LIMITS.maxDroolDrops }).map((_, i) =>
        i < mood.droolDrops ? <DroolDrop key={`drool-${i}`} index={i} from={from} loop={drool} /> : null,
      )}
    </Group>
  );
};

export default DogCharacter;
