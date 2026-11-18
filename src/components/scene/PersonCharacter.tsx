// src/components/scene/PersonCharacter.tsx
import React from 'react';
import { Circle, Group, Oval, Path, RoundedRect, vec } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import {
  SCENE_ENTRANCE,
  SCENE_LIMITS,
  SCENE_PALETTE,
  SCENE_TIMING,
} from '../../config/sceneConfig';
import { PersonMood } from '../../utils/sceneMood';
import { walkProgress, walking } from '../../utils/sceneEntrance';
import { useSceneLoop } from './useSceneLoop';

type Props = {
  x: number;
  groundY: number;
  scale: number;
  mood: PersonMood;
  entrance: SharedValue<number>; // ms since the scene appeared
  walkDistance: number; // px they walk in from
};

const C = SCENE_PALETTE.person;

// A young adult in a T-shirt, shorts and trainers, front view. Drawn around
// (0, 0) = the ground between the feet, y up is negative. Everyday
// proportions (head about a sixth of the height, a neck, ears, hands), so
// it reads as a person rather than a mascot. The feet never leave the
// ground: only the upper body rises and falls with each breath.
const HX = 13.5; // head half-width
const HYR = 15; // head half-height
const HY = -103; // head centre
const LEG_X = 5.5;

// Where each sweat drop starts (temples / forehead, below the hairline) and
// how far it runs down the face.
const SWEAT_START: [number, number][] = [
  [-11.5, HY - 3],
  [11, HY - 6],
  [-6.5, HY - 8],
  [12.5, HY + 2],
];
const SWEAT_RUN = 12;
const TEARDROP = 'M 0 -3.6 Q 2.6 0.6 0 2.7 Q -2.6 0.6 0 -3.6 Z';

// Short hair with a side part and a fringe swept to the left: the uneven
// hairline is what makes it read as hair rather than a cap.
const HAIR =
  `M -14 ${HY - 1} Q -16.5 ${HY - 9} -14 ${HY - 14} Q -9 ${HY - 19.5} -1 ${HY - 18.5} ` +
  `Q 9 ${HY - 19} 13.5 ${HY - 13} Q 16 ${HY - 8} 14 ${HY - 1} ` +
  `Q 13.6 ${HY - 6} 11 ${HY - 8.5} L 8.5 ${HY - 9.5} Q 5 ${HY - 7} 2 ${HY - 9.6} ` +
  `Q -2 ${HY - 5.5} -7.5 ${HY - 5.8} Q -11.5 ${HY - 5.5} -13 ${HY - 3} Z`;
const HAIR_SHINE = `M -6 ${HY - 15.5} Q 1 ${HY - 17.5} 7 ${HY - 14.5}`;

const MOUTH: Record<PersonMood['mouth'], string | null> = {
  flat: `M -3.5 ${HY + 8.5} L 3.5 ${HY + 8.5}`,
  smile: `M -4.5 ${HY + 7} Q 0 ${HY + 11} 4.5 ${HY + 7}`,
  neutral: `M -3.5 ${HY + 8.5} Q 0 ${HY + 9.4} 3.5 ${HY + 8.5}`,
  pant: null, // an open mouth, drawn as a shape below
  frown: `M -4.5 ${HY + 10} Q 0 ${HY + 6.2} 4.5 ${HY + 10}`,
};

const Brows: React.FC<{ worried: boolean }> = ({ worried }) => {
  const y = HY - 6.5;
  // Worried: inner ends raised. Otherwise a relaxed arch.
  const left = worried ? `M -8.5 ${y + 0.6} L -2.8 ${y - 2}` : `M -8.3 ${y + 0.4} Q -5.6 ${y - 1.4} -2.8 ${y - 0.2}`;
  const right = worried ? `M 8.5 ${y + 0.6} L 2.8 ${y - 2}` : `M 8.3 ${y + 0.4} Q 5.6 ${y - 1.4} 2.8 ${y - 0.2}`;
  return (
    <>
      <Path path={left} color={C.hair} style="stroke" strokeWidth={1.6} strokeCap="round" />
      <Path path={right} color={C.hair} style="stroke" strokeWidth={1.6} strokeCap="round" />
    </>
  );
};

const Eyes: React.FC<{ eyes: PersonMood['eyes'] }> = ({ eyes }) => {
  const ey = HY - 1.5;
  if (eyes === 'squint') {
    // Screwed-up "> <" eyes: overwhelmed.
    return (
      <>
        <Path path={`M -7.5 ${ey - 2} L -3.5 ${ey} L -7.5 ${ey + 2}`} color={C.ink} style="stroke" strokeWidth={1.5} strokeCap="round" strokeJoin="round" />
        <Path path={`M 7.5 ${ey - 2} L 3.5 ${ey} L 7.5 ${ey + 2}`} color={C.ink} style="stroke" strokeWidth={1.5} strokeCap="round" strokeJoin="round" />
      </>
    );
  }
  return (
    <>
      {[-5, 5].map(ex => (
        <Group key={`eye-${ex}`}>
          {eyes === 'tired' ? (
            // Heavy lids: only the lower half of each eye shows.
            <>
              <Path path={`M ${ex - 1.9} ${ey} Q ${ex} ${ey + 2.8} ${ex + 1.9} ${ey} Z`} color={C.ink} />
              <Path path={`M ${ex - 2.4} ${ey - 0.1} L ${ex + 2.4} ${ey + 0.3}`} color={C.ink} style="stroke" strokeWidth={1.2} strokeCap="round" />
            </>
          ) : (
            <>
              <Oval rect={{ x: ex - 1.6, y: ey - 2, width: 3.2, height: 4 }} color={C.ink} />
              <Circle cx={ex + 0.5} cy={ey - 0.8} r={0.6} color="rgba(255,255,255,0.9)" />
            </>
          )}
        </Group>
      ))}
    </>
  );
};

const SweatDrop: React.FC<{ index: number; loop: SharedValue<number> }> = ({ index, loop }) => {
  const [sx, sy] = SWEAT_START[index];
  const phase = index / SCENE_LIMITS.maxSweatDrops;
  const transform = useDerivedValue(() => {
    const p = (loop.value + phase) % 1;
    // Clings for a moment, then runs down faster and faster.
    const run = p < 0.25 ? 0 : ((p - 0.25) / 0.75) ** 1.6 * SWEAT_RUN;
    return [{ translateX: sx }, { translateY: sy + run }, { scale: 0.6 + Math.min(p * 2, 1) * 0.3 }];
  });
  const opacity = useDerivedValue(() => {
    const p = (loop.value + phase) % 1;
    if (p < 0.12) return p / 0.12;
    if (p > 0.85) return (1 - p) / 0.15;
    return 1;
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={TEARDROP} color={C.sweat} />
      <Circle cx={-0.7} cy={0.4} r={0.8} color="rgba(255,255,255,0.85)" />
    </Group>
  );
};

// A folding fan held up beside the face by the right hand, flapping.
const FAN_PIVOT = { x: 23.5, y: -91 };
const FAN_R = 12.5;
const fanPath = (() => {
  const a0 = (-125 * Math.PI) / 180;
  const a1 = (-35 * Math.PI) / 180;
  const p = (a: number) => `${FAN_PIVOT.x + Math.cos(a) * FAN_R} ${FAN_PIVOT.y + Math.sin(a) * FAN_R}`;
  return `M ${FAN_PIVOT.x} ${FAN_PIVOT.y} L ${p(a0)} A ${FAN_R} ${FAN_R} 0 0 1 ${p(a1)} Z`;
})();
const fanRibs = [-110, -95, -80, -65, -50].map(deg => {
  const a = (deg * Math.PI) / 180;
  return `M ${FAN_PIVOT.x} ${FAN_PIVOT.y} L ${FAN_PIVOT.x + Math.cos(a) * FAN_R} ${FAN_PIVOT.y + Math.sin(a) * FAN_R}`;
});

// T-shirt body, and a short sleeve for each side (mirrored).
const TORSO = 'M -9 -84 Q -15.5 -83.5 -16 -77 L -14 -46 Q 0 -44 14 -46 L 16 -77 Q 15.5 -83.5 9 -84 Z';
const sleeve = (s: 1 | -1) =>
  `M ${s * 11} -84 Q ${s * 19} -83 ${s * 21.5} -71 L ${s * 15.5} -68 L ${s * 14.5} -76 Z`;
const SHORTS = 'M -14 -50 L 14 -50 L 14.5 -33 L 1.5 -33 L 0 -39 L -1.5 -33 L -14.5 -33 Z';

const Face: React.FC<{ face: Pick<PersonMood, 'mouth' | 'eyes' | 'sadBrows'>; mask: boolean }> = ({
  face,
  mask,
}) => (
  <>
    <Brows worried={face.sadBrows} />
    <Eyes eyes={face.eyes} />
    {!mask &&
      (face.mouth === 'pant' ? (
        <Oval rect={{ x: -2.4, y: HY + 6, width: 4.8, height: 4.6 }} color={C.ink} />
      ) : (
        <Path path={MOUTH[face.mouth]!} color={C.ink} style="stroke" strokeWidth={1.6} strokeCap="round" />
      ))}
  </>
);

// The stride at a moment of the entrance: -1 … 1 while walking in, 0 after.
const strideAt = (ms: number): number => {
  'worklet';
  return Math.sin((ms / SCENE_ENTRANCE.personStepMs) * Math.PI * 2) * walking(ms);
};

// One leg and trainer. While walking in, each foot lifts in turn (the left
// on the positive half of the stride, the right on the negative).
const StepLeg: React.FC<{ legX: number; side: 1 | -1; entrance: SharedValue<number> }> = ({
  legX,
  side,
  entrance,
}) => {
  const transform = useDerivedValue(() => [
    { translateY: -Math.max(0, side * strideAt(entrance.value)) * SCENE_ENTRANCE.personLegLiftPx },
  ]);
  return (
    <Group transform={transform}>
      <Path path={`M ${legX} -36 L ${legX} -6`} color={C.skin} style="stroke" strokeWidth={6.5} strokeCap="round" />
      <RoundedRect x={legX - 5.5} y={-7} width={11} height={7} r={3} color={C.shoes} />
      <RoundedRect x={legX - 5.5} y={-2.2} width={11} height={2.2} r={1} color={C.soles} />
    </Group>
  );
};

const PersonCharacter: React.FC<Props> = ({ x, groundY, scale, mood, entrance, walkDistance }) => {
  const breath = useSceneLoop(SCENE_TIMING.breathMs, { reverse: true });
  const fan = useSceneLoop(mood.fanning ? SCENE_TIMING.fanMs : null, { reverse: true });
  const sweat = useSceneLoop(mood.sweatDrops > 0 ? SCENE_TIMING.sweatMs : null);
  const cough = useSceneLoop(mood.cough ? SCENE_TIMING.coughMs : null);

  const placement = useDerivedValue(() => [
    { translateX: x - walkDistance * (1 - walkProgress(entrance.value)) },
    { translateY: groundY },
    { scale },
  ]);
  const upperBody = useDerivedValue(() => [
    { translateY: -breath.value * 1.4 - Math.abs(strideAt(entrance.value)) * 1.5 },
  ]);
  // Arms swing opposite to the legs (the fanning arm stays up).
  const leftArmSwing = useDerivedValue(() => [
    { rotate: -strideAt(entrance.value) * SCENE_ENTRANCE.personArmSwing },
  ]);
  const rightArmSwing = useDerivedValue(() => [
    { rotate: strideAt(entrance.value) * SCENE_ENTRANCE.personArmSwing },
  ]);
  const fanSwing = useDerivedValue(() => [{ rotate: (fan.value - 0.5) * 0.7 }]);
  const coughTransform = useDerivedValue(() => [
    { translateX: cough.value * 10 },
    { translateY: cough.value * -5 },
    { scale: 0.6 + cough.value * 0.8 },
  ]);
  const coughOpacity = useDerivedValue(() => {
    const t = cough.value;
    if (t < 0.15) return t / 0.15;
    if (t < 0.7) return 1 - (t - 0.15) / 0.55;
    return 0;
  });

  // Hanging arms come out of the sleeves; fanning, the right arm bends up to
  // hold the fan beside the face (never across it).
  const hangingArm = (s: 1 | -1) => `M ${s * 18.5} -69 L ${s * 20} -50`;
  const fanningArm = `M 18.5 -69 L 27 -73 L ${FAN_PIVOT.x} ${FAN_PIVOT.y + 2}`;
  const shoulder = (s: 1 | -1) => vec(s * 17.5, -76);

  return (
    <Group transform={placement}>
      <Oval rect={{ x: -20, y: -3, width: 40, height: 7 }} color={SCENE_PALETTE.shadow} />

      {/* Legs: planted once they've arrived; only the upper body breathes. */}
      <StepLeg legX={-LEG_X} side={1} entrance={entrance} />
      <StepLeg legX={LEG_X} side={-1} entrance={entrance} />
      <Path path={SHORTS} color={C.shorts} />

      <Group transform={upperBody}>
        <Path path={sleeve(-1)} color={C.shirtShade} />
        <Path path={sleeve(1)} color={C.shirtShade} />
        <Group origin={shoulder(-1)} transform={leftArmSwing}>
          <Path path={hangingArm(-1)} color={C.skin} style="stroke" strokeWidth={6} strokeCap="round" />
          <Circle cx={-20} cy={-48.5} r={3.3} color={C.skin} />
        </Group>
        <Path path={TORSO} color={C.shirt} />

        {/* Neck, with the chin's shadow, and the crew-neck collar. */}
        <RoundedRect x={-3.6} y={-92} width={7.2} height={10} r={2} color={C.skin} />
        <RoundedRect x={-3.6} y={-89} width={7.2} height={2.2} r={1} color={C.skinShade} />
        <Path path="M -5.5 -84 Q 0 -79.5 5.5 -84" color={C.shirtShade} style="stroke" strokeWidth={2} strokeCap="round" />

        {/* Head: ears, face, hair. */}
        {[-1, 1].map(s => (
          <Group key={`ear-${s}`}>
            <Oval rect={{ x: s * 14.5 - 2.6, y: HY - 4.5, width: 5.2, height: 8 }} color={C.skin} />
            <Oval rect={{ x: s * 14.5 - 1.2, y: HY - 2.5, width: 2.4, height: 4 }} color={C.skinShade} />
          </Group>
        ))}
        <Oval rect={{ x: -HX, y: HY - HYR, width: HX * 2, height: HYR * 2 }} color={C.skin} />
        <Path path={HAIR} color={C.hair} />
        <Path path={HAIR_SHINE} color={C.hairShine} style="stroke" strokeWidth={1.6} strokeCap="round" />

        <Path path={`M -0.4 ${HY + 1} Q 1.9 ${HY + 3.6} -0.6 ${HY + 4.4}`} color={C.skinShade} style="stroke" strokeWidth={1.3} strokeCap="round" />
        {/* How they look is how they feel, from the first step: no
            stand-in face that changes on arrival. */}
        <Group>
          <Face face={mood} mask={mood.mask} />

          {mood.flush > 0 && (
            <>
              <Oval rect={{ x: -10.8, y: HY + 2.6, width: 5.6, height: 3 }} color={C.blush} opacity={mood.flush} />
              <Oval rect={{ x: 5.2, y: HY + 2.6, width: 5.6, height: 3 }} color={C.blush} opacity={mood.flush} />
            </>
          )}

          {Array.from({ length: SCENE_LIMITS.maxSweatDrops }).map((_, i) =>
            i < mood.sweatDrops ? <SweatDrop key={`sweat-${i}`} index={i} loop={sweat} /> : null,
          )}

          {mood.mask && (
          <Group>
            <Path path={`M -9.5 ${HY + 3} L -14 ${HY - 2}`} color={C.maskLine} style="stroke" strokeWidth={1.2} />
            <Path path={`M 9.5 ${HY + 3} L 14 ${HY - 2}`} color={C.maskLine} style="stroke" strokeWidth={1.2} />
            <RoundedRect x={-9.5} y={HY + 1.5} width={19} height={11.5} r={4} color={C.mask} />
            <Path path={`M -7 ${HY + 5.5} L 7 ${HY + 5.5} M -7 ${HY + 8.5} L 7 ${HY + 8.5}`} color={C.maskLine} style="stroke" strokeWidth={0.9} />
          </Group>
        )}

        {mood.cough && (
          <Group transform={coughTransform} opacity={coughOpacity} origin={vec(7, HY + 8)}>
            <Circle cx={9} cy={HY + 8} r={2.8} color={C.cough} />
            <Circle cx={13} cy={HY + 5.5} r={2} color={C.cough} />
            <Circle cx={11.5} cy={HY + 10.5} r={1.6} color={C.cough} />
          </Group>
        )}
        </Group>

        {/* Right arm: raised with the fan (walking in too), or hanging and
            swinging. */}
        {!mood.fanning && (
          <Group origin={shoulder(1)} transform={rightArmSwing}>
            <Path path={hangingArm(1)} color={C.skin} style="stroke" strokeWidth={6} strokeCap="round" />
            <Circle cx={20} cy={-48.5} r={3.3} color={C.skin} />
          </Group>
        )}
        {mood.fanning && (
          <Group>
            <Path path={fanningArm} color={C.skin} style="stroke" strokeWidth={6} strokeCap="round" strokeJoin="round" />
            <Group origin={vec(FAN_PIVOT.x, FAN_PIVOT.y)} transform={fanSwing}>
              <Path path={fanPath} color={C.fan} />
              {fanRibs.map((d, i) => (
                <Path key={`rib-${i}`} path={d} color={C.fanRibs} style="stroke" strokeWidth={0.9} />
              ))}
              <Circle cx={FAN_PIVOT.x} cy={FAN_PIVOT.y} r={3.3} color={C.skin} />
            </Group>
          </Group>
        )}
      </Group>
    </Group>
  );
};

export default PersonCharacter;
