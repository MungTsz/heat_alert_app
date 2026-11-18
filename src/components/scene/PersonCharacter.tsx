// src/components/scene/PersonCharacter.tsx
import React from 'react';
import { Circle, Group, Oval, Path, RoundedRect, vec } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { SCENE_LIMITS, SCENE_PALETTE, SCENE_TIMING } from '../../config/sceneConfig';
import { PersonMood } from '../../utils/sceneMood';
import { useSceneLoop } from './useSceneLoop';

type Props = {
  x: number;
  groundY: number;
  scale: number;
  mood: PersonMood;
};

const C = SCENE_PALETTE.person;

// Drawn around (0, 0) = the ground between the feet, y up is negative.
// The feet never leave the ground: only the upper body rises and falls
// with each breath, so the person stands rather than floats.
const B = {
  legX: 6.5,
  legTop: -21,
  legBottom: -5,
  legWidth: 7,
  shoeW: 12,
  shoeH: 6,
  shortsTop: -33,
  shortsBottom: -18,
  torsoW: 30,
  torsoTop: -66,
  torsoBottom: -27,
  shoulderY: -59,
  headR: 21,
  headCy: -84,
};
const HY = B.headCy;

// Where each sweat drop starts (on the forehead / temples) and how far it
// runs down the face before it's gone.
const SWEAT_START: [number, number][] = [
  [-17, HY - 3],
  [16, HY - 6],
  [-11, HY - 10],
  [18, HY + 2],
];
const SWEAT_RUN = 15;
const TEARDROP = 'M 0 -3.6 Q 2.6 0.6 0 2.7 Q -2.6 0.6 0 -3.6 Z';

const MOUTH: Record<PersonMood['mouth'], string | null> = {
  flat: `M -5 ${HY + 10} L 5 ${HY + 10}`,
  smile: `M -6.5 ${HY + 8} Q 0 ${HY + 14.5} 6.5 ${HY + 8}`,
  neutral: `M -5 ${HY + 10.5} Q 0 ${HY + 12} 5 ${HY + 10.5}`,
  pant: null, // an open mouth, drawn as a shape below
  frown: `M -6 ${HY + 12.5} Q 0 ${HY + 7} 6 ${HY + 12.5}`,
};

const Eyes: React.FC<{ eyes: PersonMood['eyes'] }> = ({ eyes }) => {
  const ey = HY - 2;
  if (eyes === 'squint') {
    // Screwed-up "> <" eyes: overwhelmed.
    return (
      <>
        <Path path={`M -10.5 ${ey - 2.6} L -5.5 ${ey} L -10.5 ${ey + 2.6}`} color={C.ink} style="stroke" strokeWidth={1.8} strokeCap="round" strokeJoin="round" />
        <Path path={`M 10.5 ${ey - 2.6} L 5.5 ${ey} L 10.5 ${ey + 2.6}`} color={C.ink} style="stroke" strokeWidth={1.8} strokeCap="round" strokeJoin="round" />
      </>
    );
  }
  if (eyes === 'tired') {
    // Heavy lids: only the lower half of each eye shows.
    return (
      <>
        {[-7.5, 7.5].map(ex => (
          <Group key={`eye-${ex}`}>
            <Path path={`M ${ex - 2.8} ${ey} Q ${ex} ${ey + 3.6} ${ex + 2.8} ${ey} Z`} color={C.ink} />
            <Path path={`M ${ex - 3.4} ${ey - 0.2} L ${ex + 3.4} ${ey + 0.4}`} color={C.ink} style="stroke" strokeWidth={1.4} strokeCap="round" />
          </Group>
        ))}
      </>
    );
  }
  return (
    <>
      <Circle cx={-7.5} cy={ey} r={2.3} color={C.ink} />
      <Circle cx={7.5} cy={ey} r={2.3} color={C.ink} />
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
    return [{ translateX: sx }, { translateY: sy + run }, { scale: 0.75 + Math.min(p * 2, 1) * 0.35 }];
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

// A folding fan held up by the right hand, flapping.
const FAN_PIVOT = { x: 29, y: -76 };
const FAN_R = 15;
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

const PersonCharacter: React.FC<Props> = ({ x, groundY, scale, mood }) => {
  const breath = useSceneLoop(SCENE_TIMING.breathMs, { reverse: true });
  const fan = useSceneLoop(mood.fanning ? SCENE_TIMING.fanMs : null, { reverse: true });
  const sweat = useSceneLoop(mood.sweatDrops > 0 ? SCENE_TIMING.sweatMs : null);
  const cough = useSceneLoop(mood.cough ? SCENE_TIMING.coughMs : null);

  const placement = [{ translateX: x }, { translateY: groundY }, { scale }];
  const upperBody = useDerivedValue(() => [{ translateY: -breath.value * 1.6 }]);
  const fanSwing = useDerivedValue(() => [{ rotate: (fan.value - 0.5) * 0.7 }]);
  const coughTransform = useDerivedValue(() => [
    { translateX: cough.value * 12 },
    { translateY: cough.value * -6 },
    { scale: 0.6 + cough.value * 0.8 },
  ]);
  const coughOpacity = useDerivedValue(() => {
    const t = cough.value;
    if (t < 0.15) return t / 0.15;
    if (t < 0.7) return 1 - (t - 0.15) / 0.55;
    return 0;
  });

  const shoulderL = { x: -B.torsoW / 2 + 1, y: B.shoulderY };
  const shoulderR = { x: B.torsoW / 2 - 1, y: B.shoulderY };
  // Arm out of the way of the face when fanning: elbow out, hand up by the
  // cheek holding the fan.
  const rightArm = mood.fanning
    ? `M ${shoulderR.x} ${shoulderR.y} L 25 -62 L ${FAN_PIVOT.x - 1} ${FAN_PIVOT.y + 2}`
    : `M ${shoulderR.x} ${shoulderR.y} L 21 -38`;

  return (
    <Group transform={placement}>
      <Oval rect={{ x: -22, y: -3, width: 44, height: 8 }} color={SCENE_PALETTE.shadow} />

      {/* Legs and shoes: fixed to the ground. */}
      <Path path={`M ${-B.legX} ${B.legTop} L ${-B.legX} ${B.legBottom}`} color={C.skin} style="stroke" strokeWidth={B.legWidth} strokeCap="round" />
      <Path path={`M ${B.legX} ${B.legTop} L ${B.legX} ${B.legBottom}`} color={C.skin} style="stroke" strokeWidth={B.legWidth} strokeCap="round" />
      <RoundedRect x={-B.legX - 7} y={-B.shoeH} width={B.shoeW} height={B.shoeH} r={3} color={C.shoes} />
      <RoundedRect x={B.legX - 5} y={-B.shoeH} width={B.shoeW} height={B.shoeH} r={3} color={C.shoes} />
      <RoundedRect x={-B.torsoW / 2} y={B.shortsTop} width={B.torsoW} height={B.shortsBottom - B.shortsTop} r={5} color={C.shorts} />

      <Group transform={upperBody}>
        <Path path={`M ${shoulderL.x} ${shoulderL.y} L -21 -38`} color={C.skin} style="stroke" strokeWidth={7} strokeCap="round" strokeJoin="round" />
        <RoundedRect x={-B.torsoW / 2} y={B.torsoTop} width={B.torsoW} height={B.torsoBottom - B.torsoTop} r={12} color={C.shirt} />

        <Circle cx={0} cy={HY} r={B.headR} color={C.skin} />
        <Path
          path={`M ${-B.headR} ${HY - 4} Q ${-B.headR - 2} ${HY - B.headR - 4} ${-B.headR * 0.4} ${HY - B.headR - 6} Q 0 ${HY - B.headR - 10} ${B.headR * 0.4} ${HY - B.headR - 6} Q ${B.headR + 2} ${HY - B.headR - 4} ${B.headR} ${HY - 4} Q 0 ${HY - B.headR - 2} ${-B.headR} ${HY - 4} Z`}
          color={C.hair}
        />

        {mood.sadBrows && (
          <>
            {/* Worried brows: inner ends raised. */}
            <Path path={`M -11.5 ${HY - 7.5} L -4 ${HY - 10.5}`} color={C.ink} style="stroke" strokeWidth={1.9} strokeCap="round" />
            <Path path={`M 11.5 ${HY - 7.5} L 4 ${HY - 10.5}`} color={C.ink} style="stroke" strokeWidth={1.9} strokeCap="round" />
          </>
        )}

        <Eyes eyes={mood.eyes} />

        {mood.flush > 0 && (
          <>
            <Oval rect={{ x: -15, y: HY + 3, width: 8, height: 4.5 }} color={C.blush} opacity={mood.flush} />
            <Oval rect={{ x: 7, y: HY + 3, width: 8, height: 4.5 }} color={C.blush} opacity={mood.flush} />
          </>
        )}

        {!mood.mask &&
          (mood.mouth === 'pant' ? (
            <Oval rect={{ x: -3.5, y: HY + 7.5, width: 7, height: 6 }} color={C.ink} />
          ) : (
            <Path path={MOUTH[mood.mouth]!} color={C.ink} style="stroke" strokeWidth={2.2} strokeCap="round" />
          ))}

        {Array.from({ length: SCENE_LIMITS.maxSweatDrops }).map((_, i) =>
          i < mood.sweatDrops ? <SweatDrop key={`sweat-${i}`} index={i} loop={sweat} /> : null,
        )}

        {mood.mask && (
          <Group>
            <RoundedRect x={-B.headR * 0.75} y={HY + 1} width={B.headR * 1.5} height={B.headR * 0.85} r={B.headR * 0.35} color={C.mask} />
            <Path path={`M ${-B.headR * 0.55} ${HY + 7} Q 0 ${HY + 10} ${B.headR * 0.55} ${HY + 7}`} color={C.maskLine} style="stroke" strokeWidth={1.2} />
            <Path path={`M ${-B.headR * 0.75} ${HY + 4} L ${-B.headR + 0.5} ${HY - 4}`} color={C.maskLine} style="stroke" strokeWidth={1.5} />
            <Path path={`M ${B.headR * 0.75} ${HY + 4} L ${B.headR - 0.5} ${HY - 4}`} color={C.maskLine} style="stroke" strokeWidth={1.5} />
          </Group>
        )}

        {mood.cough && (
          <Group transform={coughTransform} opacity={coughOpacity} origin={vec(10, HY + 9)}>
            <Circle cx={12} cy={HY + 9} r={3.5} color={C.cough} />
            <Circle cx={17} cy={HY + 6} r={2.4} color={C.cough} />
            <Circle cx={15} cy={HY + 12} r={2} color={C.cough} />
          </Group>
        )}

        <Path path={rightArm} color={C.skin} style="stroke" strokeWidth={7} strokeCap="round" strokeJoin="round" />
        {mood.fanning && (
          <Group origin={vec(FAN_PIVOT.x, FAN_PIVOT.y)} transform={fanSwing}>
            <Path path={fanPath} color={C.fan} />
            {fanRibs.map((d, i) => (
              <Path key={`rib-${i}`} path={d} color={C.fanRibs} style="stroke" strokeWidth={0.9} />
            ))}
            <Circle cx={FAN_PIVOT.x} cy={FAN_PIVOT.y} r={3.6} color={C.skin} />
          </Group>
        )}
      </Group>
    </Group>
  );
};

export default PersonCharacter;
