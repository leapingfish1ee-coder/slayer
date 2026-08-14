import { Actor } from "../models/Actor.js";
import { Skill } from "../models/Skill.js";
import { Effect } from "../models/Effect.js";

const damage = (base, power, defenseFactor = 0.5, critChance = 0.1) =>
  new Effect({ type: "damage", base, power, defenseFactor, critChance });

export function createBattleActors() {
  const vanguardStrike = new Skill({
    id: "vanguard-strike",
    name: "破阵斩",
    description: "可靠的前卫单体攻击。",
    target: "enemy",
    effects: [damage(6, 1.0, 0.55, 0.12)]
  });
  const crushingBlow = new Skill({
    id: "crushing-blow",
    name: "重压",
    description: "低速但高伤害的单体打击。",
    target: "enemy",
    effects: [damage(10, 1.18, 0.62, 0.08)]
  });

  const quickShot = new Skill({
    id: "quick-shot",
    name: "速射",
    description: "游侠的高速精准攻击。",
    target: "enemy",
    effects: [damage(4, 0.95, 0.42, 0.2)]
  });
  const volley = new Skill({
    id: "volley",
    name: "箭雨",
    description: "对当前全部敌人造成较低伤害。",
    target: "all_enemies",
    effects: [damage(2, 0.58, 0.28, 0.08)]
  });

  const arcBolt = new Skill({
    id: "arc-bolt",
    name: "秘术矢",
    description: "无视部分防御的秘术攻击。",
    target: "enemy",
    effects: [damage(7, 1.05, 0.24, 0.11)]
  });
  const mend = new Skill({
    id: "mend",
    name: "治愈术",
    description: "为任意存活队员恢复生命。",
    target: "ally",
    effects: [new Effect({ type: "heal", base: 18, power: 0.72 })]
  });

  const bite = new Skill({
    id: "bite",
    name: "噬咬",
    description: "野兽的迅捷攻击。",
    target: "enemy",
    effects: [damage(4, 0.85, 0.45, 0.08)]
  });
  const rustedBlade = new Skill({
    id: "rusted-blade",
    name: "锈刃",
    description: "骸骨卫兵的沉重挥砍。",
    target: "enemy",
    effects: [damage(6, 0.95, 0.5, 0.08)]
  });
  const hex = new Skill({
    id: "hex",
    name: "蚀魂咒",
    description: "邪术师的远程术式。",
    target: "enemy",
    effects: [damage(7, 1.0, 0.3, 0.12)]
  });
  const pounce = new Skill({
    id: "pounce",
    name: "扑杀",
    description: "高速扑击脆弱目标。",
    target: "enemy",
    effects: [damage(5, 0.9, 0.42, 0.14)]
  });

  return [
    new Actor({ id: "vanguard", name: "赫克托", team: "player", maxHp: 138, attack: 19, defense: 11, speed: 9, skills: [vanguardStrike, crushingBlow] }),
    new Actor({ id: "ranger", name: "伊莱娜", team: "player", maxHp: 102, attack: 17, defense: 7, speed: 15, skills: [quickShot, volley] }),
    new Actor({ id: "mystic", name: "奥菲尔", team: "player", maxHp: 94, attack: 18, defense: 6, speed: 11, skills: [arcBolt, mend] }),
    new Actor({ id: "enemy-rat", name: "墓穴噬鼠", team: "enemy", maxHp: 48, attack: 12, defense: 3, speed: 14, skills: [bite] }),
    new Actor({ id: "enemy-guard", name: "骸骨卫兵", team: "enemy", maxHp: 78, attack: 15, defense: 7, speed: 8, skills: [rustedBlade] }),
    new Actor({ id: "enemy-hexer", name: "灰烬邪术师", team: "enemy", maxHp: 62, attack: 16, defense: 4, speed: 12, skills: [hex] }),
    new Actor({ id: "enemy-hound", name: "裂颚猎犬", team: "enemy", maxHp: 56, attack: 13, defense: 4, speed: 13, skills: [pounce] })
  ];
}
