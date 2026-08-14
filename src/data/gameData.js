import { Actor } from "../models/Actor.js";
import { Skill } from "../models/Skill.js";
import { Effect } from "../models/Effect.js";

export function createBattleActors() {
  const slash = new Skill({
    id: "slash",
    name: "斩击",
    description: "对敌方造成稳定物理伤害。",
    target: "enemy",
    effects: [new Effect({ type: "damage", base: 5, power: 1, defenseFactor: 0.55, critChance: 0.12 })]
  });

  const mend = new Skill({
    id: "mend",
    name: "整备",
    description: "恢复自身生命值。",
    target: "self",
    effects: [new Effect({ type: "heal", base: 16, power: 0.45 })]
  });

  const claw = new Skill({
    id: "claw",
    name: "撕裂",
    description: "敌方基础攻击。",
    target: "enemy",
    effects: [new Effect({ type: "damage", base: 5, power: 0.95, defenseFactor: 0.5, critChance: 0.08 })]
  });

  return [
    new Actor({ id: "player", name: "执行者", team: "player", maxHp: 120, attack: 18, defense: 8, speed: 12, skills: [slash, mend] }),
    new Actor({ id: "enemy", name: "荒原兽", team: "enemy", maxHp: 110, attack: 16, defense: 6, speed: 10, skills: [claw] })
  ];
}
