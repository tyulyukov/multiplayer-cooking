import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export const durations = {
  fadeIn: 140,
  fadeOut: 120,
  disclosure: 180,
  morph: 220,
  float: 240,
  shake: 300,
  skeleton: 900,
  shimmerSweep: 1350,
  shimmerPause: 1450,
  reveal: 400,
  confetti: 2000,
} as const;

export const easings = {
  fadeIn: Easing.out(Easing.cubic),
  fadeOut: Easing.in(Easing.cubic),
  disclosure: Easing.inOut(Easing.cubic),
  morph: Easing.out(Easing.cubic),
  float: Easing.out(Easing.cubic),
} as const;

export const timing = (kind: keyof typeof easings) => ({
  duration: durations[kind],
  easing: easings[kind],
  reduceMotion: ReduceMotion.System,
});

export const pressSpring = { damping: 18, stiffness: 220, reduceMotion: ReduceMotion.System };

export const pressedScale = 0.97;

export const pressTo = (pressed: boolean) => {
  "worklet";

  return withSpring(pressed ? pressedScale : 1, pressSpring);
};

export const timeTo = (value: number, kind: keyof typeof easings) => {
  "worklet";

  return withTiming(value, timing(kind));
};

export const entering = {
  fadeIn: FadeIn.duration(durations.fadeIn)
    .easing(easings.fadeIn)
    .reduceMotion(ReduceMotion.System),
  disclosure: FadeIn.duration(durations.disclosure)
    .easing(easings.disclosure)
    .reduceMotion(ReduceMotion.System),
  morph: FadeIn.duration(durations.morph).easing(easings.morph).reduceMotion(ReduceMotion.System),
  float: FadeInDown.duration(durations.float)
    .easing(easings.float)
    .withInitialValues({ transform: [{ translateY: 8 }] })
    .reduceMotion(ReduceMotion.System),
  reveal: FadeIn.duration(durations.reveal).reduceMotion(ReduceMotion.System),
};

export const exiting = {
  fadeOut: FadeOut.duration(durations.fadeOut)
    .easing(easings.fadeOut)
    .reduceMotion(ReduceMotion.System),
};

export const layout = {
  morph: LinearTransition.duration(durations.morph)
    .easing(easings.morph)
    .reduceMotion(ReduceMotion.System),
  disclosure: LinearTransition.duration(durations.disclosure)
    .easing(easings.disclosure)
    .reduceMotion(ReduceMotion.System),
};
