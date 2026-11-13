"use strict";

const byId = (id) => document.getElementById(id);
const goal = 2500;
const hitCost = 75;
const shifts = {
  day: { name: "Farm shift", icon: "☀", duration: 24, interval: .9, speed: .37, reward: 60 },
  night: { name: "Taxi shift", icon: "☾", duration: 26, interval: .8, speed: .44, reward: 100 }
};
const currency = new Intl.NumberFormat("en-JM");
const money = (amount) => "J$" + currency.format(amount);
const clamp = (x, low, high) => Math.min(high, Math.max(low, x));
let sound = false;
let audioContext;
let pointer;
let state = freshState();
let lastTime = performance.now();
let frameId = null;

function readBest() {
  try { return Math.max(0, Number(localStorage.getItem("transformer-money-best")) || 0); }
  catch { return 0; }
}

function freshState() {
  return {
    mode: "intro", shift: "day", cash: 0, best: readBest(), remaining: shifts.day.duration,
    elapsed: 0, spawnIn: .15, lane: 0, playerX: 0, jump: 0, hit: 0,
    items: [], feedback: null, streak: 0
  };
}

function tone(kind) {
  if (!sound || !audioContext || audioContext.state !== "running") return;
  const notes = { pickup: [520, 730], hit: [155, 90], shift: [350, 440, 590], win: [392, 494, 587, 784] }[kind];
  notes.forEach((note, i) => {
    const now = audioContext.currentTime + i * .085;
    const oscillator = audioContext.createOscillator();
    const level = audioContext.createGain();
    oscillator.type = kind === "hit" ? "triangle" : "sine";
    oscillator.frequency.value = note;
    level.gain.setValueAtTime(.001, now);
    level.gain.exponentialRampToValueAtTime(.12, now + .015);
    level.gain.exponentialRampToValueAtTime(.001, now + .14);
    oscillator.connect(level);
    level.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + .15);
  });
}

function updateCash() {
  byId("cash").textContent = money(state.cash);
  byId("best").textContent = money(state.best);
  byId("progress").value = Math.min(goal, state.cash);
  byId("progress-text").textContent = Math.min(100, Math.floor(state.cash / goal * 100)) + "% to goal";
  const combo = byId("combo");
  combo.hidden = state.streak < 3;
  combo.textContent = state.streak + " in a row";
}

function updateShift() {
  const shift = shifts[state.shift];
  byId("shift-icon").textContent = shift.icon;
  byId("shift-label").textContent = shift.name;
  byId("farm-card").classList.toggle("active", state.shift === "day");
  byId("night-card").classList.toggle("active", state.shift === "night");
  updateClock();
}

function updateClock() {
  const seconds = Math.max(0, Math.ceil(state.remaining)) + "s";
  if (byId("clock").textContent !== seconds) byId("clock").textContent = seconds;
}

function announce(text) {
  byId("announcement").textContent = text;
}

function startGame() {
  state = freshState();
  state.mode = "playing";
  byId("intro").hidden = true;
  byId("hud").hidden = false;
  byId("restart").hidden = false;
  byId("stage-message").hidden = true;
  byId("pause").disabled = false;
  updateCash();
  updateShift();
  announce("Farm shift started.");
  focusTrack();
  requestFrame();
}

function focusTrack() {
  stageCanvas.focus({ preventScroll: true });
}

function message(kicker, title, copy, resumeLabel, driver = false) {
  byId("message-kicker").textContent = kicker;
  byId("message-title").textContent = title;
  byId("message-copy").textContent = copy;
  byId("driver-transition").hidden = !driver;
  byId("resume").hidden = !resumeLabel;
  byId("resume").textContent = resumeLabel ? resumeLabel + " →" : "";
  byId("stage-message").hidden = false;
  if (resumeLabel) byId("resume").focus({ preventScroll: true });
}

function switchShift() {
  state.shift = state.shift === "day" ? "night" : "day";
  const night = state.shift === "night";
  state.remaining = shifts[state.shift].duration;
  state.spawnIn = .24;
  state.items = [];
  state.lane = state.playerX = state.jump = state.hit = 0;
  state.feedback = null;
  state.mode = "between";
  byId("pause").disabled = true;
  updateShift();
  drawTrack(state);
  tone("shift");
  const title = night ? "Probox time." : "Back to the farm.";
  message(night ? "SUNSET · TAXI SHIFT" : "SUNRISE · FARM SHIFT", title,
    night ? "Shrink into driver mode, buckle up, and pick up fares." : "Clock in and gather the next harvest.",
    night ? "Start taxi shift" : "Start farm shift", night);
  announce(title);
}

function resumeGame() {
  if (state.mode !== "paused" && state.mode !== "between") return;
  state.mode = "playing";
  byId("stage-message").hidden = true;
  byId("pause").disabled = false;
  focusTrack();
  requestFrame();
}

function pauseGame() {
  if (state.mode === "paused") {
    resumeGame();
    return;
  }
  if (state.mode !== "playing") return;
  state.mode = "paused";
  message("SHIFT ON HOLD", "Paused", "Your cash and time are right where you left them.", "Resume");
}

function win() {
  state.mode = "won";
  byId("pause").disabled = true;
  byId("win-total").textContent = money(state.cash) + " earned across both shifts.";
  byId("victory").showModal();
  tone("win");
  announce("Cash goal reached. You won.");
}

function changeCash(delta) {
  state.cash = Math.max(0, state.cash + delta);
  if (state.cash > state.best) {
    state.best = state.cash;
    try { localStorage.setItem("transformer-money-best", String(state.best)); } catch {}
  }
  state.feedback = { text: (delta < 0 ? "−" : "+") + money(Math.abs(delta)), positive: delta >= 0, life: 1 };
  updateCash();
  if (state.cash >= goal) win();
}

function move(action) {
  if (state.mode !== "playing") return;
  if (action === "jump") {
    if (state.shift === "day" && state.jump === 0) state.jump = .70;
    return;
  }
  state.lane = clamp(state.lane + Number(action), -1, 1);
}

function spawnRow() {
  const lanes = [-1, 0, 1];
  const rewardLane = lanes[Math.floor(Math.random() * lanes.length)];
  const free = lanes.filter((lane) => lane !== rewardLane);
  state.items.push({ lane: rewardLane, z: 0, kind: "reward" });
  if (Math.random() < .82) {
    const hazardLane = free.splice(Math.floor(Math.random() * free.length), 1)[0];
    state.items.push({ lane: hazardLane, z: 0, kind: "hazard" });
  }
  if (state.shift === "night" && Math.random() < .19 && free.length) {
    state.items.push({ lane: free[0], z: 0, kind: "hazard" });
  }
}

function update(dt) {
  const shift = shifts[state.shift];
  state.elapsed += dt;
  state.remaining -= dt;
  state.spawnIn -= dt;
  state.playerX += (state.lane - state.playerX) * Math.min(1, dt * 13);
  state.jump = Math.max(0, state.jump - dt);
  state.hit = Math.max(0, state.hit - dt);
  if (state.feedback) {
    state.feedback.life -= dt * 1.35;
    if (state.feedback.life <= 0) state.feedback = null;
  }
  if (state.spawnIn <= 0 && state.remaining > 2.7) {
    spawnRow();
    state.spawnIn += shift.interval;
  }

  for (const item of state.items) {
    item.z += shift.speed * dt;
    if (item.checked || item.z < .89) continue;
    item.checked = true;
    if (Math.abs(item.lane - state.playerX) > .44) {
      if (item.kind === "reward" && state.streak) {
        state.streak = 0;
        updateCash();
      }
      continue;
    }
    if (item.kind === "reward") {
      item.collected = true;
      state.streak++;
      tone("pickup");
      changeCash(shift.reward);
      if (state.mode === "won") break;
    } else if (state.jump <= .10 || state.jump >= .60) {
      state.hit = .65;
      state.streak = 0;
      tone("hit");
      if (state.cash > 0) changeCash(-Math.min(hitCost, state.cash));
      else {
        state.feedback = { text: "Hit!", positive: false, life: 1 };
        updateCash();
      }
    }
  }
  state.items = state.items.filter((item) => !item.collected && item.z < 1.14);
  updateClock();
  if (state.mode === "playing" && state.remaining <= 0) switchShift();
}

function frame(time) {
  frameId = null;
  if (state.mode !== "playing") return;
  const dt = Math.min(.035, (time - lastTime) / 1000);
  lastTime = time;
  update(dt);
  drawTrack(state);
  if (state.mode === "playing") frameId = requestAnimationFrame(frame);
}

function requestFrame() {
  if (frameId !== null) cancelAnimationFrame(frameId);
  lastTime = performance.now();
  frameId = requestAnimationFrame(frame);
}

byId("start").addEventListener("click", startGame);
byId("restart").addEventListener("click", startGame);
byId("resume").addEventListener("click", resumeGame);
byId("pause").addEventListener("click", pauseGame);
byId("play-again").addEventListener("click", () => {
  byId("victory").close();
  startGame();
});
byId("victory").addEventListener("cancel", (event) => event.preventDefault());
byId("help-button").addEventListener("click", () => {
  if (state.mode === "playing") pauseGame();
  byId("help").showModal();
});
byId("close-help").addEventListener("click", () => byId("help").close());
byId("help").querySelector(".close").addEventListener("click", () => byId("help").close());
byId("sound").addEventListener("click", () => {
  if (!window.AudioContext) return;
  sound = !sound;
  if (sound) {
    audioContext ??= new AudioContext();
    audioContext.resume().catch(() => {});
  }
  byId("sound").setAttribute("aria-pressed", String(sound));
  byId("sound").querySelector("span").textContent = sound ? "Sound on" : "Sound off";
});

document.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => move(button.dataset.move)));
document.addEventListener("keydown", (event) => {
  if (byId("help").open || byId("victory").open) return;
  const actions = { ArrowLeft: -1, a: -1, ArrowRight: 1, d: 1, ArrowUp: "jump", w: "jump", " ": "jump" };
  if (event.key === "Escape" && (state.mode === "playing" || state.mode === "paused")) {
    event.preventDefault();
    pauseGame();
  } else if (state.mode === "playing" && Object.hasOwn(actions, event.key) && !(event.key === " " && event.target.closest("button"))) {
    event.preventDefault();
    if (!event.repeat) move(actions[event.key]);
  }
});
stageCanvas.addEventListener("pointerdown", (event) => {
  if (state.mode !== "playing" || !event.isPrimary) return;
  pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
  stageCanvas.setPointerCapture(event.pointerId);
});
stageCanvas.addEventListener("pointerup", (event) => {
  if (pointer?.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if (Math.abs(dx) > 23 && Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx));
  else if (dy < -23) move("jump");
  pointer = null;
});
stageCanvas.addEventListener("lostpointercapture", () => { pointer = null; });
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.mode === "playing") pauseGame();
});
new ResizeObserver(() => {
  if (state.mode !== "playing" && state.mode !== "intro") drawTrack(state);
}).observe(stageCanvas);
updateCash();
