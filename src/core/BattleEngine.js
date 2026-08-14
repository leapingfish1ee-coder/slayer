import { TurnManager } from "./TurnManager.js";

export const BattlePhase = Object.freeze({
  INIT: "INIT",
  TURN_START: "TURN_START",
  WAIT_ACTION: "WAIT_ACTION",
  RESOLVE_ACTION: "RESOLVE_ACTION",
  TURN_END: "TURN_END",
  CHECK_RESULT: "CHECK_RESULT"
});

export class BattleEngine {
  constructor({ actors, rng }) {
    this.rng = rng;
    this.state = {
      seed: rng.seed,
      actors,
      phase: BattlePhase.INIT,
      round: 0,
      activeActorId: null,
      winnerTeam: null,
      events: []
    };
    this.turnManager = new TurnManager(actors);
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start() {
    if (this.state.phase !== BattlePhase.INIT) return;
    this.emit({ type: "battle_start", seed: this.state.seed });
    this.advanceToNextTurn();
  }

  getActor(actorId) {
    return this.state.actors.find((actor) => actor.id === actorId) ?? null;
  }

  get activeActor() {
    return this.getActor(this.state.activeActorId);
  }

  getAvailableSkills(actorId) {
    return this.getActor(actorId)?.skills ?? [];
  }

  getValidTargets(actorId, skillId) {
    const actor = this.getActor(actorId);
    const skill = actor?.skills.find((item) => item.id === skillId);
    if (!actor || !skill) return [];

    const allies = this.state.actors.filter((item) => item.alive && item.team === actor.team);
    const enemies = this.state.actors.filter((item) => item.alive && item.team !== actor.team);

    switch (skill.target) {
      case "self": return actor.alive ? [actor] : [];
      case "ally": return allies;
      case "enemy": return enemies;
      case "all_enemies": return enemies;
      case "all_allies": return allies;
      default: return this.state.actors.filter((item) => item.alive);
    }
  }

  executeCommand({ actorId, skillId, targetIds }) {
    if (this.state.phase !== BattlePhase.WAIT_ACTION) return false;
    if (actorId !== this.state.activeActorId) return false;

    const actor = this.getActor(actorId);
    const skill = actor?.skills.find((item) => item.id === skillId);
    if (!actor?.alive || !skill) return false;

    const validTargets = this.getValidTargets(actorId, skillId);
    const validIds = new Set(validTargets.map((target) => target.id));
    const requestedTargets = [...new Set(targetIds ?? [])];
    if (requestedTargets.length === 0 || requestedTargets.some((id) => !validIds.has(id))) return false;

    const targets = requestedTargets.map((id) => this.getActor(id)).filter(Boolean);
    this.state.phase = BattlePhase.RESOLVE_ACTION;
    this.emit({ type: "action_start", actorId, actorName: actor.name, skillId, skillName: skill.name, targetIds: requestedTargets });

    for (const target of targets) {
      for (const effect of skill.effects) {
        const result = effect.resolve(actor, target, this.rng);
        this.emit({
          type: result.type,
          sourceId: actor.id,
          sourceName: actor.name,
          targetId: target.id,
          targetName: target.name,
          amount: result.amount,
          critical: result.critical,
          skillId: skill.id,
          skillName: skill.name
        });
      }
      if (!target.alive) this.emit({ type: "defeated", actorId: target.id, actorName: target.name });
    }

    if (this.checkResult()) return true;

    this.state.phase = BattlePhase.TURN_END;
    this.emit({ type: "turn_end", actorId: actor.id, actorName: actor.name });
    this.advanceToNextTurn();
    return true;
  }

  advanceToNextTurn() {
    if (this.checkResult()) return;

    let actor = this.turnManager.nextActor();
    if (!actor) {
      this.state.round = this.turnManager.beginRound();
      this.emit({ type: "round_start", round: this.state.round });
      actor = this.turnManager.nextActor();
    }

    if (!actor) return;
    this.state.activeActorId = actor.id;
    this.state.phase = BattlePhase.TURN_START;
    this.emit({ type: "turn_start", actorId: actor.id, actorName: actor.name, round: this.state.round });
    this.state.phase = BattlePhase.WAIT_ACTION;
    this.notify({ type: "turn_ready", actorId: actor.id });
  }

  checkResult() {
    const livingTeams = new Set(this.state.actors.filter((actor) => actor.alive).map((actor) => actor.team));
    if (livingTeams.size > 1) return false;
    if (livingTeams.size === 0 && this.state.phase === BattlePhase.INIT) return false;

    this.state.winnerTeam = livingTeams.values().next().value ?? "draw";
    this.state.activeActorId = null;
    this.state.phase = BattlePhase.CHECK_RESULT;

    if (!this.state.events.some((event) => event.type === "battle_end")) {
      this.emit({ type: "battle_end", winnerTeam: this.state.winnerTeam });
    }
    return true;
  }

  emit(event) {
    const enriched = { index: this.state.events.length + 1, ...event };
    this.state.events.push(enriched);
    this.notify(enriched);
  }

  notify(event) {
    for (const listener of this.listeners) listener(this.state, event);
  }
}
