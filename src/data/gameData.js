import { Actor } from "../models/Actor.js";
import { Skill } from "../models/Skill.js";
import { Effect } from "../models/Effect.js";

export function createBattleActors() {
  const cleave = new Skill({
    id: "cleave",
    name: "断钢斩",
    description: "对单个敌人造成高额物理伤害。",
    target: "enemy",
    effects: [new Effect({ type: "damage", base: 11, power: 1.12, defenseFactor: 0.48, critChance: 0.12, critMultiplier: 1.55 })]
  });

  const guardRush = new Skill({
    id: "guardRush",
    name: "盾突",
    description: "以防御姿态突进并稳定压制前排目标。",
    target: "enemy",
    effects: [new Effect({ type: "damage", base: 8, power: 0.9, defenseFactor: 0.32, critChance: 0.08, critMultiplier: 1.4 })]
  });

  const pierce = new Skill({
    id: "pierce",
    name: "穿心矢",
    description: "集中火力狙击一名敌人。",
    target: "enemy",
    effects: [new Effect({ type: "damage", base: 9, power: 1.05, defenseFactor: 0.3, critChance: 0.18, critMultiplier: 1.68 })]
  });

  const volley = new Skill({
    id: "volley",
    name: "箭雨",
    description: "对全部敌人发起面伤压制。",
    target: "all_enemies",
    effects: [new Effect({ type: "damage", base: 5, power: 0.72, defenseFactor: 0.18, critChance: 0.06, critMultiplier: 1.35 })]
  });

  const arcaneBolt = new Skill({
    id: "arcaneBolt",
    name: "奥术矛",
    description: "以法术轰击单个敌人。",
    target: "enemy",
    effects: [new Effect({ type: "damage", base: 10, power: 1.18, defenseFactor: 0.1, critChance: 0.14, critMultiplier: 1.5 })]
  });

  const mend = new Skill({
    id: "mend",
    name: "治疗术",
    description: "恢复一名队友生命值。",
    target: "ally",
    effects: [new Effect({ type: "heal", base: 18, power: 0.62 })]
  });

  const claw = new Skill({
    id: "claw",
    name: "撕咬",
    description: "敌方基础近战攻击。",
    target: "enemy",
    effects: [new Effect({ type: "damage", base: 7, power: 0.92, defenseFactor: 0.38, critChance: 0.08, critMultiplier: 1.42 })]
  });

  const venomSpit = new Skill({
    id: "venomSpit",
    name: "毒棘",
    description: "敌方远程穿刺攻击。",
    target: "enemy",
    effects: [new Effect({ type: "damage", base: 8, power: 0.88, defenseFactor: 0.22, critChance: 0.12, critMultiplier: 1.5 })]
  });

  return [
    new Actor({ id: "hector", name: "赫克托", team: "player", maxHp: 168, hp: 168, attack: 21, defense: 13, speed: 10, skills: [cleave, guardRush] }),
    new Actor({ id: "elena", name: "伊莱娜", team: "player", maxHp: 118, hp: 118, attack: 18, defense: 8, speed: 15, skills: [pierce, volley] }),
    new Actor({ id: "orphel", name: "奥菲尔", team: "player", maxHp: 102, hp: 102, attack: 19, defense: 7, speed: 12, skills: [arcaneBolt, mend] }),
    new Actor({ id: "goblin_a", name: "掠夺哥布林", team: "enemy", maxHp: 74, hp: 74, attack: 13, defense: 5, speed: 13, skills: [claw] }),
    new Actor({ id: "goblin_b", name: "狂热哥布林", team: "enemy", maxHp: 68, hp: 68, attack: 14, defense: 4, speed: 14, skills: [claw] }),
    new Actor({ id: "fang_wolf", name: "獠牙狼", team: "enemy", maxHp: 92, hp: 92, attack: 16, defense: 6, speed: 11, skills: [claw] }),
    new Actor({ id: "cultist", name: "瘴术信徒", team: "enemy", maxHp: 80, hp: 80, attack: 15, defense: 5, speed: 9, skills: [venomSpit] })
  ];
}
