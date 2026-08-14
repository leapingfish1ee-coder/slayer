export class Effect {
  constructor({ type, base = 0, power = 0, defenseFactor = 0, critChance = 0.1, critMultiplier = 1.5 }) {
    this.type = type;
    this.base = base;
    this.power = power;
    this.defenseFactor = defenseFactor;
    this.critChance = critChance;
    this.critMultiplier = critMultiplier;
  }

  resolve(source, target, rng) {
    if (this.type === "damage") {
      const raw = Math.max(1, this.base + source.attack * this.power - target.defense * this.defenseFactor);
      const critical = rng.next() < this.critChance;
      const variance = rng.range(0.92, 1.08);
      const amount = Math.max(1, Math.round(raw * variance * (critical ? this.critMultiplier : 1)));
      target.hp = Math.max(0, target.hp - amount);
      return { type: "damage", amount, critical };
    }

    if (this.type === "heal") {
      const amount = Math.max(0, Math.round(this.base + source.attack * this.power));
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + amount);
      return { type: "heal", amount: target.hp - before, critical: false };
    }

    throw new Error(`Unsupported effect type: ${this.type}`);
  }
}
