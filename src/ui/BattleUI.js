import { BattlePhase } from "../core/BattleEngine.js";

export class BattleUI {
  constructor(engine) {
    this.engine = engine;
    this.pendingSkillId = null;
    this.enemyTimer = null;
    this.battlefield = document.querySelector("#battlefield");
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
      if (button && this.pendingSkillId) this.commitPlayerAction(this.pendingSkillId, button.dataset.targetId);
    });
  }

  attachRestart(handler) {
    this.restartButton.addEventListener("click", handler);
  }

  render() {
    const { state } = this.engine;
    const active = this.engine.activeActor;
    this.meta.textContent = state.winnerTeam
      ? `战斗结束 · seed ${state.seed}`
      : `第 ${Math.max(1, state.round)} 回合 · seed ${state.seed}`;

    this.battlefield.innerHTML = state.actors.map((actor) => this.actorCard(actor, active?.id === actor.id)).join("");
    this.renderCommands();
    this.renderLog();
    this.scheduleEnemyTurn();
  }

  actorCard(actor, active) {
    const hpPercent = Math.max(0, Math.round((actor.hp / actor.maxHp) * 100));
    return `
      <article class="actor-card ${active ? "active" : ""} ${actor.alive ? "" : "defeated"}" data-actor-id="${actor.id}">
        <p class="actor-team">${actor.team === "player" ? "PLAYER" : "ENEMY"}</p>
        <div class="actor-name">${actor.name}</div>
        <div class="hp-row"><span>HP</span><strong>${actor.hp} / ${actor.maxHp}</strong></div>
        <div class="hp-track"><div class="hp-fill" style="width:${hpPercent}%"></div></div>
        <div class="stat-row"><span>ATK ${actor.attack}</span><span>DEF ${actor.defense}</span><span>SPD ${actor.speed}</span></div>
      </article>`;
  }

  renderCommands() {
    const { state } = this.engine;
    const actor = this.engine.activeActor;

    if (state.phase === BattlePhase.CHECK_RESULT) {
      this.commandTitle.textContent = state.winnerTeam === "player" ? "战斗胜利" : state.winnerTeam === "enemy" ? "战斗失败" : "平局";
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
    this.skillList.innerHTML = actor.skills.map((skill) => `
      <button class="skill-button" type="button" data-skill-id="${skill.id}" ${playerTurn ? "" : "disabled"}>
        <strong>${skill.name}</strong><span>${skill.description}</span>
      </button>`).join("");

    if (!playerTurn) {
      this.pendingSkillId = null;
      this.targetList.innerHTML = "";
    }
  }

  chooseSkill(skillId) {
    const actor = this.engine.activeActor;
    if (!actor || actor.team !== "player" || this.engine.state.phase !== BattlePhase.WAIT_ACTION) return;
    const targets = this.engine.getValidTargets(actor.id, skillId);
    if (targets.length === 1) {
      this.commitPlayerAction(skillId, targets[0].id);
      return;
    }

    this.pendingSkillId = skillId;
    this.targetList.innerHTML = targets.map((target) => `<button class="target-button" type="button" data-target-id="${target.id}">目标：${target.name}</button>`).join("");
  }

  commitPlayerAction(skillId, targetId) {
    this.pendingSkillId = null;
    this.targetList.innerHTML = "";
    this.engine.executeCommand({ actorId: "player", skillId, targetIds: [targetId] });
  }

  scheduleEnemyTurn() {
    const actor = this.engine.activeActor;
    if (!actor || actor.team !== "enemy" || this.engine.state.phase !== BattlePhase.WAIT_ACTION || this.enemyTimer) return;

    this.enemyTimer = window.setTimeout(() => {
      this.enemyTimer = null;
      if (this.engine.activeActor?.id !== actor.id || this.engine.state.phase !== BattlePhase.WAIT_ACTION) return;
      const skill = this.engine.getAvailableSkills(actor.id)[0];
      const targets = this.engine.getValidTargets(actor.id, skill.id);
      const target = targets.sort((a, b) => a.hp - b.hp)[0];
      if (target) this.engine.executeCommand({ actorId: actor.id, skillId: skill.id, targetIds: [target.id] });
    }, 480);
  }

  renderLog() {
    const visible = this.engine.state.events.slice(-18).reverse();
    this.log.innerHTML = visible.map((event) => {
      const formatted = this.formatEvent(event);
      return formatted ? `<li class="${formatted.tone}">${formatted.text}</li>` : "";
    }).join("");
  }

  formatEvent(event) {
    switch (event.type) {
      case "battle_start": return { tone: "important", text: `战斗开始 · RNG seed ${event.seed}` };
      case "round_start": return { tone: "", text: `第 ${event.round} 回合开始。` };
      case "turn_start": return { tone: "", text: `${event.actorName} 获得行动权。` };
      case "action_start": return { tone: "important", text: `${event.actorName} 使用「${event.skillName}」。` };
      case "damage": return { tone: event.critical ? "danger" : "", text: `${event.targetName} 受到 ${event.amount} 点伤害${event.critical ? "（暴击）" : ""}。` };
      case "heal": return { tone: "", text: `${event.targetName} 恢复 ${event.amount} 点生命值。` };
      case "defeated": return { tone: "danger", text: `${event.actorName} 被击败。` };
      case "battle_end": return { tone: "important", text: event.winnerTeam === "player" ? "战斗结束：玩家胜利。" : event.winnerTeam === "enemy" ? "战斗结束：敌方胜利。" : "战斗结束：平局。" };
      default: return null;
    }
  }

  destroy() {
    if (this.enemyTimer) window.clearTimeout(this.enemyTimer);
  }
}
