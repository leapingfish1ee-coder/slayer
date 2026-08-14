export class TurnManager {
  constructor(actors) {
    this.actors = actors;
    this.round = 0;
    this.queue = [];
  }

  beginRound() {
    this.round += 1;
    this.queue = this.actors
      .filter((actor) => actor.alive)
      .sort((a, b) => b.speed - a.speed || a.id.localeCompare(b.id))
      .map((actor) => actor.id);
    return this.round;
  }

  nextActor() {
    while (this.queue.length > 0) {
      const actorId = this.queue.shift();
      const actor = this.actors.find((item) => item.id === actorId);
      if (actor?.alive) return actor;
    }
    return null;
  }

  hasPendingActors() {
    return this.queue.some((actorId) => this.actors.find((actor) => actor.id === actorId)?.alive);
  }
}
