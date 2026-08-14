import { RNG } from "./core/RNG.js";
import { BattleEngine } from "./core/BattleEngine.js";
import { createBattleActors } from "./data/gameData.js";
import { BattleUI } from "./ui/BattleUI.js";

let ui = null;
let unsubscribe = null;

function bootBattle() {
  ui?.destroy();
  unsubscribe?.();

  const seed = Date.now() >>> 0;
  const engine = new BattleEngine({ actors: createBattleActors(), rng: new RNG(seed) });
  ui = new BattleUI(engine);
  unsubscribe = engine.subscribe(() => ui.render());
  ui.attachRestart(bootBattle);
  ui.render();
  engine.start();
}

bootBattle();
