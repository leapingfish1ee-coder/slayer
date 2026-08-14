import { BattlePhase } from "../core/BattleEngine.js";

export class BattleUI {
  constructor(engine) {
    this.engine = engine;
    this.pendingSkillId = null;
    this.enemyTimer = null;
    this.enemyLine = document.querySelector("#enemy-line");
    this.partyStatus = document.querySelector("#party-status");
    this.meta = document.querySelector("#battle-meta");
    this.commandTitle = document.querySelector("#command-title");
    this.skillList = document.querySelector("#skill-list");
    this.targetList = document.querySelector("#target-list");
    this.log = document.querySelector("#battle-log");
    this.restartButton = document.querySelector("#restart-button");

    this.skillList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-skill-id]");
      if (button) this.chooseSkill(button.dataset.skillId);
    });

    this.targetList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-target-id]");
      if (button && this.pendingSkillId) this.commitPlayerAction(this.pendingSkillId, [button.dataset.targetId]);
    });
  }

  attachRestart(handler) {
    this.restartButton.addEventListener("click", handler);
  }

  render() {
    const { state } = this.engine;
    const active = this.engine.activeActor;
    const enemies = state.actors.filter((actor) => actor.team === "enemy");
    const party = state.actors.filter((actor) => actor.team === "player");

    this.meta.textContent = state.winnerTeam
      ? `战斗结束 · seed ${state.seed}`
      : `ROUND ${Math.max(1, state.round)} · ${enemies.filter((actor) => actor.alive).length} ENEMIES`;

    this.enemyLine.innerHTML = enemies.map((actor, index) => this.enemyFigure(actor, active?.id === actor.id, index)).join("");
    this.partyStatus.innerHTML = party.map((actor, index) => this.partyCard(actor, active?.id === actor.id, index)).join("");
    this.renderCommands();
    this.renderLog();
    this.scheduleEnemyTurn();
  }

  enemyFigure(actor, active, index) {
    const hpPercent = Math.max(0, Math.round((actor.hp / actor.maxHp) * 100));
    return `
      <article class="enemy-figure enemy-shape-${(index % 4) + 1} ${active ? "active" : ""} ${actor.alive ? "" : "defeated"}" data-actor-id="${actor.id}">
        <div class="enemy-silhouette" aria-hidden="true"><span class="eye eye-left"></span><span class="eye eye-right"></span></div>
        <div class="enemy-plate">
          <strong>${actor.name}</strong>
          <div class="enemy-hp-track"><div class="enemy-hp-fill" style="width:${hpPercent}%"></div></div>
          <span>${actor.alive ? `${actor.hp} / ${actor.maxHp}` : "DEFEATED"}</span>
        </div>
      </article>`;
  }

  partyCard(actor, active, index) {
    const hpPercent = Math.max(0, Math.round((actor.hp / actor.maxHp) * 100));
    const roles = ["VANGUARD", "RANGER", "MYSTIC"];
    return `
      <article class="party-card ${active ? "active" : ""} ${actor.alive ? "" : "defeated"}" data-actor-id="${actor.id}">
        <div class="party-index">0${index + 1}</div>
        <div class="party-copy">
          <span>${roles[index] ?? "ADVENTURER"}</span>
          <strong>${actor.name}</strong>
        </div>
        <div class="party-vitals">
          <div><span>HP</span><strong>${actor.hp}<small> / ${actor.maxHp}</small></strong></div>
          <div class="party-hp-track"><div class="party-hp-fill" style="width:${hpPercent}%"></div></div>
        </div>
        <div class="party-stats"><span>ATK ${actor.attack}</span><span>DEF ${actor.defense}</span><span>SPD ${actor.speed}</span></div>
      </article>`;
  }

  renderCommands() {
    const { state } = this.engine;
    const actor = this.engine.activeActor;

    if (state.phase === BattlePhase.CHECK_RESULT) {
      this.commandTitle.textContent = state.winnerTeam === "player" ? "队伍胜利" : state.winnerTeam === "enemy" ? "队伍覆灭" : "战斗中止";
      this.skillList.innerHTML = "";
      this.targetList.innerHTML = "";
      return;
    }

    if (!actor) {
      this.commandTitle.textContent = "处理中";
      this.skillList.innerHTML = "";
      return;
    }

    const playerTurn = actor.team === "player" && state.phase === BattlePhase.WAIT_ACTION;
    this.commandTitle.textContent = playerTurn ? `${actor.name} · 选择行动` : `${actor.name} · 行动中`;
    this.skillList.innerHTML = actor.skills.map((skill, index) => `
      <button class="skill-button" type="button" data-skill-id="${skill.id}" ${playerTurn ? "" : "disabled"}>
        <span class="skill-key">0${index + 1}</span>
        <span class="skill-copy"><strong>${skill.name}</strong><small>${skill.description}</small></span>
      </button>`).join("");

    if (!playerTurn) {
      this.pendingSkillId = null;
      this.targetList.innerHTML = "";
    }
  }

  chooseSkill(skillId) {
    const actor = this.engine.activeActor;
    if (!actor || actor.team !== "player" || this.engine.state.phase !== BattlePhase.WAIT_ACTION) return;

    const skill = actor.skills.find((item) => item.id === skillId);
    const targets = this.engine.getValidTargets(actor.id, skillId);
    if (!skill || targets.length === 0) return;

    if (skill.target === "all_enemies" || skill.target === "all_allies") {
      this.commitPlayerAction(skillId, targets.map((target) => target.id));
      return;
    }

    if (targets.length === 1) {
      this.commitPlayerAction(skillId, [targets[0].id]);
      return;
    }

    this.pendingSkillId = skillId;
    this.targetList.innerHTML = targets.map((target) => {
      const side = target.team === "player" ? "ALLY" : "ENEMY";
      return `<button class="target-button" type="button" data-target-id="${target.id}"><span>${side}</span><strong>${target.name}</strong><small>HP ${target.hp}/${target.maxHp}</small></button>`;
    }).join("");
  }

  commitPlayerAction(skillId, targetIds) {
    const actor = this.engine.activeActor;
    if (!actor || actor.team !== "player") return;
    this.pendingSkillId = null;
    this.targetList.innerHTML = "";
    this.engine.executeCommand({ actorId: actor.id, skillId, targetIds });
  }

  scheduleEnemyTurn() {
    const actor = this.engine.activeActor;
    if (!actor || actor.team !== "enemy" || this.engine.state.phase !== BattlePhase.WAIT_ACTION || this.enemyTimer) return;

    this.enemyTimer = window.setTimeout(() => {
      this.enemyTimer = null;
      if (this.engine.activeActor?.id !== actor.id || this.engine.state.phase !== BattlePhase.WAIT_ACTION) return;
      const skill = this.engine.getAvailableSkills(actor.id)[0];
      const targets = this.engine.getValidTargets(actor.id, skill.id);
      const target = [...targets].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (target) this.engine.executeCommand({ actorId: actor.id, skillId: skill.id, targetIds: [target.id] });
    }, 520);
  }

  renderLog() {
    const visible = this.engine.state.events.slice(-16).reverse();
    this.log.innerHTML = visible.map((event) => {
      const formatted = this.formatEvent(event);
      return formatted ? `<li class="${formatted.tone}">${formatted.text}</li>` : "";
    }).join("");
  }

  formatEvent(event) {
    switch (event.type) {
      case "battle_start": return { tone: "important", text: `遭遇开始 · RNG ${event.seed}` };
      case "round_start": return { tone: "round", text: `ROUND ${event.round}` };
      case "turn_start": return { tone: "", text: `${event.actorName} 获得行动权。` };
      case "action_start": return { tone: "important", text: `${event.actorName} 使用「${event.skillName}」。` };
      case "damage": return { tone: event.critical ? "danger" : "", text: `${event.targetName} 受到 ${event.amount} 点伤害${event.critical ? " · CRITICAL" : ""}。` };
      case "heal": return { tone: "heal", text: `${event.targetName} 恢复 ${event.amount} 点生命值。` };
      case "defeated": return { tone: "danger", text: `${event.actorName} 被击败。` };
      case "battle_end": return { tone: "important", text: event.winnerTeam === "player" ? "敌阵崩溃，队伍胜利。" : event.winnerTeam === "enemy" ? "队伍全灭。" : "战斗结束。" };
      default: return null;
    }
  }

  destroy() {
    if (this.enemyTimer) window.clearTimeout(this.enemyTimer);
  }
}
