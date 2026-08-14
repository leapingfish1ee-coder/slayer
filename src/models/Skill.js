export class Skill {
  constructor({ id, name, description, target = "enemy", effects = [] }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.target = target;
    this.effects = effects;
  }
}
