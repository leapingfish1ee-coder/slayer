export class Actor {
  constructor({ id, name, team, maxHp, attack, defense, speed, skills = [], statuses = [] }) {
    this.id = id;
    this.name = name;
    this.team = team;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.attack = attack;
    this.defense = defense;
    this.speed = speed;
    this.skills = skills;
    this.statuses = statuses;
  }

  get alive() {
    return this.hp > 0;
  }
}
