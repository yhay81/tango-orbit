export const PRODUCT = {
  name: "Tango Orbit",
  origin: "https://tango-orbit.yhay81.com",
  description: "英和・和英をすばやく引いて、関連語と単語帳を行き来する辞書。",
  repository: "https://github.com/yhay81/tango-orbit",
  dataRetentionDays: 35,
} as const;

export const EVENT_NAMES = ["visited", "searched", "word_saved", "reviewed", "returned"] as const;

export type EventName = (typeof EVENT_NAMES)[number];
