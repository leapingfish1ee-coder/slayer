import { BattlePhase } from "../core/BattleEngine.js";

const PARTY_ROLES = {
  hector: { code: "VG", title: "先锋", color: "#7fffc5" },
  elena: { code: "RN", title: "游侠", color: "#96f0ff" },
  orphel: { code: "MG", title: "术士", color: "#fddc8b" }
};

const DEPTH_CLASS = ["enemy-depth-far", "enemy-depth-mid", "enemy-depth-mid", "enemy-depth-front"];

export class BattleUI {
  constructor(engine) {
    this.engine = engine;
    this.pendingSkillId = null;
    this.enemyTimer = null;
    this.status = document.querySelector("#battle-status");
    this.meta = document.querySelector("#battle-meta");
    this.actingUnit = document.querySelector("#acting-unit");
    this.enemyFormation = document.querySelector("#enemy-formation");
    this.partyRoster = document.querySelector("#party-roster");
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

    this.status.textContent = state.winnerTeam
      ? state.winnerTeam === "player" ? "队伍制压完成" : state.winnerTeam === "enemy" ? "队伍遭遇全灭" : "遭遇结束"
      : "前方敌影逼近";

    this.actingUnit.textContent = active ? `行动者 · ${active.name}` : "行动者 · -";
    this.renderEnemies(active);
    this.renderParty(active);
    this.renderCommands();
    this.renderLog();
    this.scheduleEnemyTurn();
  }

  renderEnemies(active) {
    const enemies = this.engine.state.actors.filter((actor) => actor.team === "enemy");
    this.enemyFormation.innerHTML = enemies.map((actor, index) => {
      const hpPercent = Math.max(0, Math.round((actor.hp / actor.maxHp) * 100));
      const depthClass = DEPTH_CLASS[index] ?? "enemy-depth-front";
      return `
        <article class="enemy-card ${depthClass} ${active?.id === actor.id ? "active" : ""} ${actor.alive ? "" : "defeated"}">
          ${this.renderEnemyVisual(actor)}
          <div class="enemy-meta">
            <div class="name-row"><strong>${actor.name}</strong><span>${actor.alive ? "HOSTILE" : "DOWN"}</span></div>
            ${this.renderMeter(actor.hp, actor.maxHp, hpPercent, "#ff6f83", "#fddc8b")}
            <div class="stats-row"><span>HP ${actor.hp}/${actor.maxHp}</span><span>ATK ${actor.attack}</span><span>SPD ${actor.speed}</span></div>
          </div>
        </article>`;
    }).join("");
  }

  renderParty(active) {
    const players = this.engine.state.actors.filter((actor) => actor.team === "player");
    this.partyRoster.innerHTML = players.map((actor) => {
      const role = PARTY_ROLES[actor.id] ?? { code: "UN", title: "队员", color: "#96f0ff" };
      const hpPercent = Math.max(0, Math.round((actor.hp / actor.maxHp) * 100));
      return `
        <article class="party-card ${active?.id === actor.id ? "active" : ""} ${actor.alive ? "" : "defeated"}">
          ${this.renderPartyAvatar(actor, role)}
          <div class="party-meta">
            <div class="role-row">
              <strong>${actor.name}</strong>
              <span class="badge"><span>${role.code}</span><span>${role.title}</span></span>
            </div>
            ${this.renderMeter(actor.hp, actor.maxHp, hpPercent, role.color, "#ffffff")}
            <div class="stats-row"><span>HP ${actor.hp}/${actor.maxHp}</span><span>ATK ${actor.attack}</span><span>DEF ${actor.defense}</span><span>SPD ${actor.speed}</span></div>
          </div>
        </article>`;
    }).join("");
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
      this.targetList.innerHTML = "";
      return;
    }

    const playerTurn = actor.team === "player" && state.phase === BattlePhase.WAIT_ACTION;
    this.commandTitle.textContent = playerTurn ? `${actor.name} · 选择行动` : `${actor.name} · 行动中`;
    this.skillList.innerHTML = actor.skills.map((skill) => `
      <button class="skill-button" type="button" data-skill-id="${skill.id}" ${playerTurn ? "" : "disabled"}>
        ${this.renderSkillIcon(skill.id)}
        <span class="skill-copy"><strong>${skill.name}</strong><span>${skill.description}</span></span>
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
    const skill = this.engine.getAvailableSkills(actor.id).find((item) => item.id === skillId);
    if (!skill || targets.length === 0) return;

    if (skill.target === "self") {
      this.commitPlayerAction(skillId, actor.id);
      return;
    }

    if (skill.target === "all_enemies" || skill.target === "all_allies") {
      this.commitPlayerAction(skillId, ...targets.map((target) => target.id));
      return;
    }

    if (targets.length === 1) {
      this.commitPlayerAction(skillId, targets[0].id);
      return;
    }

    this.pendingSkillId = skillId;
    this.targetList.innerHTML = targets.map((target) => `
      <button class="target-button" type="button" data-target-id="${target.id}">
        ${target.team === "enemy" ? this.renderTargetEnemyIcon(target) : this.renderTargetPartyIcon(target)}
        <span class="target-copy"><strong>${target.name}</strong><span>${target.team === "enemy" ? `敌方目标 · HP ${target.hp}/${target.maxHp}` : `队友目标 · HP ${target.hp}/${target.maxHp}`}</span></span>
      </button>`).join("");
  }

  commitPlayerAction(skillId, ...targetIds) {
    const actor = this.engine.activeActor;
    if (!actor) return;
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
      const skills = this.engine.getAvailableSkills(actor.id);
      const skill = skills[0];
      const targets = this.engine.getValidTargets(actor.id, skill.id);
      const target = targets.filter((item) => item.alive).sort((a, b) => a.hp - b.hp)[0];
      if (target) this.engine.executeCommand({ actorId: actor.id, skillId: skill.id, targetIds: [target.id] });
    }, 520);
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
      case "battle_end": return { tone: "important", text: event.winnerTeam === "player" ? "战斗结束：队伍胜利。" : event.winnerTeam === "enemy" ? "战斗结束：敌方胜利。" : "战斗结束：平局。" };
      default: return null;
    }
  }

  renderMeter(value, max, percent, start, end) {
    const startId = start.replace("#", "");
    const endId = end.replace("#", "");
    const width = Math.max(0, Math.round((236 * value) / max));
    return `
      <svg class="meter" viewBox="0 0 240 14" aria-label="HP ${value} / ${max}" role="img">
        <defs>
          <linearGradient id="meter-${startId}-${endId}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${start}" />
            <stop offset="100%" stop-color="${end}" />
          </linearGradient>
        </defs>
        <rect x="0.5" y="0.5" width="239" height="13" rx="6.5" fill="#101722" stroke="#2b3548" />
        <rect x="2" y="2" width="${width}" height="10" rx="5" fill="url(#meter-${startId}-${endId})" />
        <rect x="2" y="2" width="236" height="10" rx="5" fill="none" stroke="rgba(255,255,255,0.12)" />
      </svg>`;
  }

  renderSkillIcon(skillId) {
    const icons = {
      cleave: ["#7fffc5", `<path d="M12 42 L28 18 L34 24 L24 42 Z" fill="currentColor" opacity="0.24"/><path d="M24 42 L42 14 L49 21 L33 42 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`],
      guardRush: ["#7fffc5", `<path d="M28 10 L45 16 L45 31 C45 41 37 47 28 52 C19 47 11 41 11 31 L11 16 Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M20 30 H36" stroke="currentColor" stroke-width="3"/><path d="M28 20 V40" stroke="currentColor" stroke-width="3"/>`],
      pierce: ["#96f0ff", `<path d="M10 46 L49 14" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M35 14 H49 V28" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M13 43 L20 50" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>`],
      volley: ["#96f0ff", `<path d="M15 46 C19 28 27 16 40 10" fill="none" stroke="currentColor" stroke-width="3"/><path d="M20 48 L20 30 M30 48 L30 24 M40 48 L40 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M17 28 L23 34 M27 22 L33 28 M37 16 L43 22" stroke="currentColor" stroke-width="3"/>`],
      arcaneBolt: ["#fddc8b", `<path d="M31 10 L18 31 H28 L23 46 L42 24 H32 L37 10 Z" fill="currentColor" opacity="0.24"/><path d="M31 10 L18 31 H28 L23 46 L42 24 H32 L37 10 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>`],
      mend: ["#fddc8b", `<circle cx="30" cy="30" r="17" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 20 V40 M20 30 H40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`],
      claw: ["#ff6f83", `<path d="M18 47 L24 17 M28 47 L34 13 M38 47 L44 19" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>`],
      venomSpit: ["#ff6f83", `<path d="M13 30 C19 18 32 15 43 20 C40 31 30 42 17 44 Z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="36" cy="23" r="3" fill="currentColor"/><path d="M38 39 L45 47" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`]
    };
    const [color, body] = icons[skillId] ?? ["#96f0ff", `<circle cx="30" cy="30" r="16" fill="none" stroke="currentColor" stroke-width="3"/>`];
    return `<svg class="skill-icon" viewBox="0 0 60 60" style="color:${color}" aria-hidden="true"><rect x="1" y="1" width="58" height="58" rx="14" fill="#101722" stroke="#314059"/>${body}</svg>`;
  }

  renderEnemyVisual(actor) {
    const palette = actor.id.includes("cultist")
      ? ["#ff6f83", "#fddc8b"]
      : actor.id.includes("wolf")
        ? ["#c8d3e6", "#96f0ff"]
        : ["#b5ff9f", "#96f0ff"];

    if (actor.id.includes("cultist")) {
      return `<svg class="enemy-visual" viewBox="0 0 170 180" style="color:${palette[0]}" aria-hidden="true">
        <ellipse cx="84" cy="160" rx="50" ry="12" fill="rgba(0,0,0,0.35)"/>
        <path d="M84 16 L118 34 L118 70 C118 92 104 115 84 138 C64 115 50 92 50 70 L50 34 Z" fill="rgba(255,255,255,0.05)" stroke="currentColor" stroke-width="3"/>
        <circle cx="84" cy="62" r="19" fill="#101722" stroke="currentColor" stroke-width="3"/>
        <path d="M66 109 C73 92 95 92 102 109" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M58 74 L34 116 M110 74 L136 116" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <path d="M64 50 H104" stroke="${palette[1]}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
      </svg>`;
    }

    if (actor.id.includes("wolf")) {
      return `<svg class="enemy-visual" viewBox="0 0 170 180" style="color:${palette[1]}" aria-hidden="true">
        <ellipse cx="84" cy="160" rx="52" ry="12" fill="rgba(0,0,0,0.35)"/>
        <path d="M36 118 L56 86 L84 76 L120 87 L134 119 L107 132 L66 132 Z" fill="rgba(255,255,255,0.04)" stroke="currentColor" stroke-width="3"/>
        <path d="M74 76 L61 50 L77 40 L90 56 L105 42 L120 55 L106 85" fill="#101722" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
        <path d="M56 132 L49 151 M75 132 L72 152 M104 132 L106 152 M123 128 L129 149" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <path d="M91 91 L117 102 L97 111" fill="none" stroke="${palette[0]}" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="82" cy="65" r="3" fill="${palette[0]}"/><circle cx="99" cy="65" r="3" fill="${palette[0]}"/>
      </svg>`;
    }

    return `<svg class="enemy-visual" viewBox="0 0 170 180" style="color:${palette[0]}" aria-hidden="true">
      <ellipse cx="84" cy="160" rx="44" ry="12" fill="rgba(0,0,0,0.35)"/>
      <path d="M84 20 L106 31 L114 58 L102 98 L66 98 L54 58 L62 31 Z" fill="rgba(255,255,255,0.04)" stroke="currentColor" stroke-width="3"/>
      <path d="M62 31 L50 16 M106 31 L118 16" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
      <path d="M66 98 L54 136 M102 98 L114 136" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
      <path d="M46 70 L30 97 M122 70 L138 97" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
      <circle cx="74" cy="54" r="4" fill="${palette[1]}"/><circle cx="94" cy="54" r="4" fill="${palette[1]}"/>
      <path d="M72 74 Q84 84 96 74" fill="none" stroke="${palette[1]}" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  }

  renderPartyAvatar(actor, role) {
    const body = actor.id === "hector"
      ? `<path d="M38 10 L58 18 L58 36 C58 49 49 59 38 66 C27 59 18 49 18 36 L18 18 Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M28 38 L38 22 L48 38" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M38 22 V50" stroke="currentColor" stroke-width="3"/>`
      : actor.id === "elena"
        ? `<path d="M18 48 C26 27 35 17 51 11" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15 48 L51 12" stroke="currentColor" stroke-width="3"/><path d="M39 14 H51 V26" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>`
        : `<circle cx="38" cy="38" r="18" fill="none" stroke="currentColor" stroke-width="3"/><path d="M38 18 V58 M18 38 H58" stroke="currentColor" stroke-width="2.6" opacity="0.5"/><path d="M38 20 L29 38 L38 38 L33 56 L47 34 L38 34 Z" fill="currentColor" opacity="0.28"/><path d="M38 20 L29 38 L38 38 L33 56 L47 34 L38 34 Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>`;

    return `<svg class="party-avatar" viewBox="0 0 76 76" style="color:${role.color}" aria-hidden="true"><rect x="1" y="1" width="74" height="74" rx="18" fill="#101722" stroke="#314059"/>${body}</svg>`;
  }

  renderTargetEnemyIcon(actor) {
    return `<svg class="target-icon" viewBox="0 0 60 60" aria-hidden="true"><rect x="1" y="1" width="58" height="58" rx="14" fill="#101722" stroke="#314059"/>${this.targetSkull(actor)}</svg>`;
  }

  renderTargetPartyIcon(actor) {
    const role = PARTY_ROLES[actor.id] ?? { color: "#96f0ff" };
    return `<svg class="target-icon" viewBox="0 0 60 60" style="color:${role.color}" aria-hidden="true"><rect x="1" y="1" width="58" height="58" rx="14" fill="#101722" stroke="#314059"/><circle cx="30" cy="23" r="9" fill="none" stroke="currentColor" stroke-width="3"/><path d="M16 48 C18 38 24 33 30 33 C36 33 42 38 44 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
  }

  targetSkull(actor) {
    const color = actor.id.includes("cultist") ? "#ff6f83" : actor.id.includes("wolf") ? "#96f0ff" : "#b5ff9f";
    return `<g style="color:${color}"><circle cx="30" cy="24" r="10" fill="none" stroke="currentColor" stroke-width="3"/><path d="M23 34 H37 V42 C37 46 34 49 30 49 C26 49 23 46 23 42 Z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="26" cy="24" r="2" fill="currentColor"/><circle cx="34" cy="24" r="2" fill="currentColor"/></g>`;
  }

  destroy() {
    if (this.enemyTimer) window.clearTimeout(this.enemyTimer);
  }
}
