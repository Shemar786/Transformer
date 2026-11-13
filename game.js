"use strict";

const byId = (id) => document.getElementById(id);
const items = {
  tag: ["Baggage tag","Baggage tags","Tags"],
  fuel: ["Fuel cell","Fuel cells","Fuel"],
  parcel: ["Express parcel","Express parcels","Parcels"],
  kit: ["Flight kit","Flight kits","Kits"],
  ticket: ["Golden Ticket","Golden Tickets","Ticket"]
};
const offers = [
  { id:"parcel", cost:{tag:3}, result:2 },
  { id:"kit", cost:{parcel:2,fuel:1}, result:1 },
  { id:"ticket", cost:{kit:2,fuel:2}, result:1 }
];
const plural = (key, n) => items[key][n === 1 ? 0 : 1];
const describe = (goods) => Object.entries(goods).map(([key, n]) => n + " " + plural(key, n)).join(" + ");
const exchange = byId("exchange");
const help = byId("help");
const victory = byId("victory");
let flight = newFlight();
let pendingTrade = null;
let frameId = null;
let lastTime = 0;
let pointer = null;

function newFlight() {
  return {
    status:"intro", elapsed:0, travel:0, lane:0, position:0, climb:0, hit:0, nextRow:.2,
    items:[], feedback:null, cargo:{tag:0,fuel:0,parcel:0,kit:0,ticket:0}
  };
}

function updateTradeBoard() {
  Object.keys(flight.cargo).filter(key => key !== "ticket").forEach((key) => {
    byId("cargo-" + key).textContent = flight.cargo[key];
  });
  offers.forEach((offer) => { byId("trade-" + offer.id).disabled = !canTrade(offer); });
}

function canTrade(offer) {
  return Object.entries(offer.cost).every(([key, quantity]) => flight.cargo[key] >= quantity);
}

function announce(text) {
  byId("announcement").textContent = text;
}

function showFeedback(text, color = "#ffdb76") {
  flight.feedback = {text,color,life:1};
}

function updateDistance() {
  const distance = Math.floor(flight.travel) + " m";
  if (byId("distance").textContent !== distance) byId("distance").textContent = distance;
}

function startFlight() {
  flight = newFlight();
  pointer = null;
  byId("intro").hidden = true;
  byId("hud").hidden = false;
  byId("restart").hidden = false;
  updateTradeBoard();
  updateDistance();
  resumeFlight();
  announce("Flight started.");
}

function resumeFlight() {
  flight.status = "flying";
  byId("pause-panel").hidden = true;
  canvas.focus({preventScroll:true});
  if (frameId !== null) cancelAnimationFrame(frameId);
  lastTime = performance.now();
  frameId = requestAnimationFrame(frame);
}

function pauseFlight() {
  if (flight.status !== "flying") return;
  flight.status = "paused";
  pointer = null;
  byId("pause-panel").hidden = false;
  byId("resume").focus({preventScroll:true});
}

function openTrade(offer) {
  if (!canTrade(offer) || !["flying","paused"].includes(flight.status)) return;
  pendingTrade = {offer, resume:flight.status === "flying"};
  flight.status = "trading";
  pointer = null;
  byId("exchange-title").textContent = plural(offer.id, offer.result);
  byId("exchange-copy").textContent = "Give " + describe(offer.cost) + " in exchange for " +
    offer.result + " " + plural(offer.id, offer.result) + ".";
  exchange.showModal();
}

function completeTrade() {
  const offer = pendingTrade?.offer;
  if (!offer || !canTrade(offer)) return;
  for (const [key, amount] of Object.entries(offer.cost)) flight.cargo[key] -= amount;
  flight.cargo[offer.id] += offer.result;
  updateTradeBoard();
  if (offer.id === "ticket") {
    pendingTrade = null;
    flight.status = "won";
    exchange.close();
    victory.showModal();
    announce("Golden Ticket acquired. You won.");
  } else {
    showFeedback("+" + offer.result + " " + plural(offer.id, offer.result));
    announce("Trade complete. Received " + offer.result + " " + plural(offer.id, offer.result) + ".");
    exchange.close();
  }
}

function move(action) {
  if (flight.status !== "flying") return;
  if (action === "climb") {
    if (!flight.climb) flight.climb = .72;
  } else {
    flight.lane = Math.max(-1,Math.min(1,flight.lane+Number(action)));
  }
}

function spawnRow() {
  const lanes = [-1,0,1];
  const lane = lanes.splice(Math.floor(Math.random()*lanes.length),1)[0];
  flight.items.push({lane,z:0,kind:Math.random()<.64?"tag":"fuel"});
  if (Math.random()<.81) {
    const other=lanes[Math.floor(Math.random()*lanes.length)];
    flight.items.push({lane:other,z:0,kind:"barrier"});
  }
}

function encounter(item) {
  if (Math.abs(item.lane-flight.position)>.46) return;
  if (item.kind === "barrier") {
    if (flight.climb>.11 && flight.climb<.62) return;
    const hadTag = flight.cargo.tag > 0;
    flight.cargo.tag = Math.max(0,flight.cargo.tag-1);
    flight.hit = .65;
    showFeedback(hadTag?"−1 Tag":"Barrier hit","#ffa78e");
  } else {
    flight.cargo[item.kind]++;
    item.collected = true;
    showFeedback("+1 "+plural(item.kind,1),item.kind==="fuel"?"#a1edda":"#ffdb76");
  }
  updateTradeBoard();
}

function advance(dt) {
  flight.elapsed += dt;
  const speed = .38 + Math.min(.15,flight.elapsed*.0015);
  flight.travel += dt*speed*54;
  flight.position += (flight.lane-flight.position)*Math.min(1,dt*14);
  flight.climb = Math.max(0,flight.climb-dt);
  flight.hit = Math.max(0,flight.hit-dt);
  if (flight.feedback) {
    flight.feedback.life -= dt*1.25;
    if (flight.feedback.life <= 0) flight.feedback = null;
  }
  flight.nextRow -= dt;
  if (flight.nextRow <= 0) {
    spawnRow();
    flight.nextRow += .88;
  }
  for (const item of flight.items) {
    item.z += dt*speed;
    if (!item.checked && item.z>=flightDepth) {
      item.checked=true;
      encounter(item);
    }
  }
  flight.items = flight.items.filter(item=>!item.collected&&item.z<1.14);
  updateDistance();
}

function frame(now) {
  frameId = null;
  if (flight.status!=="flying") return;
  const dt=Math.max(0,Math.min(.035,(now-lastTime)/1000));
  lastTime=now;
  advance(dt);
  drawTrack(flight);
  frameId=requestAnimationFrame(frame);
}

byId("inventory").innerHTML = Object.keys(items).filter(key=>key!=="ticket").map((key)=>
  `<div class="inv-item"><strong id="cargo-${key}">0</strong><span>${items[key][2]}</span></div>`
).join("");
byId("recipes").innerHTML = offers.map((offer)=>
  `<div class="recipe"><div><h3>${offer.result>1?offer.result+" ":""}${plural(offer.id,offer.result)}</h3><p>${describe(offer.cost)}</p></div>
  <button id="trade-${offer.id}" type="button" aria-label="Trade for ${plural(offer.id,offer.result)}" disabled>Trade</button></div>`
).join("");

offers.forEach((offer)=>byId("trade-"+offer.id).addEventListener("click",()=>openTrade(offer)));
byId("start").addEventListener("click",startFlight);
byId("restart").addEventListener("click",startFlight);
byId("resume").addEventListener("click",resumeFlight);
byId("pause").addEventListener("click",pauseFlight);
byId("help-button").addEventListener("click",()=>{
  pauseFlight();
  help.showModal();
});
help.querySelectorAll("button").forEach((button)=>button.addEventListener("click",()=>help.close()));
exchange.querySelector(".close").addEventListener("click",()=>exchange.close());
byId("confirm-trade").addEventListener("click",completeTrade);
exchange.addEventListener("close",()=>{
  if (!pendingTrade) return;
  const {resume}=pendingTrade;
  pendingTrade=null;
  if(resume) resumeFlight();
  else flight.status="paused";
});
byId("again").addEventListener("click",()=>{
  victory.close();
  startFlight();
});
victory.addEventListener("cancel",event=>event.preventDefault());

document.querySelectorAll("[data-move]").forEach((button)=>button.addEventListener("click",()=>move(button.dataset.move)));
document.addEventListener("keydown",event=>{
  if(help.open||exchange.open||victory.open) return;
  const actions={ArrowLeft:-1,a:-1,ArrowRight:1,d:1,ArrowUp:"climb",w:"climb"," ":"climb"};
  if(event.key==="Escape"&&flight.status==="flying") {
    event.preventDefault();
    pauseFlight();
  } else if(event.key==="Escape"&&flight.status==="paused") {
    event.preventDefault();
    resumeFlight();
  } else if(flight.status==="flying"&&Object.hasOwn(actions,event.key)&&!(event.key===" "&&event.target.closest("button"))) {
    event.preventDefault();
    if(!event.repeat) move(actions[event.key]);
  }
});
canvas.addEventListener("pointerdown",event=>{
  if(flight.status!=="flying"||!event.isPrimary||event.button!==0) return;
  pointer={x:event.clientX,y:event.clientY,id:event.pointerId};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointerup",event=>{
  if(pointer?.id!==event.pointerId) return;
  const dx=event.clientX-pointer.x;
  const dy=event.clientY-pointer.y;
  pointer=null;
  if(flight.status!=="flying") return;
  if(Math.hypot(dx,dy)<=18) {
    const bounds=canvas.getBoundingClientRect();
    const x=(event.clientX-bounds.left)/bounds.width;
    const y=(event.clientY-bounds.top)/bounds.height;
    if(x>=0&&x<=1&&y>=0&&y<=1) flight.lane=laneAtScreenPoint(x,y);
  } else if(Math.abs(dx)>23&&Math.abs(dx)>Math.abs(dy)) {
    move(Math.sign(dx));
  } else if(dy<-23&&Math.abs(dy)>=Math.abs(dx)) {
    move("climb");
  }
});
for(const event of ["pointercancel","lostpointercapture"]) {
  canvas.addEventListener(event,({pointerId})=>{if(pointer?.id===pointerId)pointer=null;});
}
document.addEventListener("visibilitychange",()=>{if(document.hidden)pauseFlight();});
new ResizeObserver(()=>{
  if(flight.status!=="intro"&&flight.status!=="flying") drawTrack(flight);
}).observe(canvas);
updateTradeBoard();
