"use strict";

const stageCanvas = document.getElementById("track");
const paint = stageCanvas.getContext("2d");
const horizonRatio = .29;
const roadDepthHeight = (1 - horizonRatio) * .85;
const roadHalfWidth = (depth) => .037 + depth * .51;
const laneWidth = .62;

function laneAtScreenPoint(x, y) {
  const depth = Math.max(0, (y - horizonRatio) / roadDepthHeight);
  const boundary = roadHalfWidth(depth) * laneWidth / 2;
  if (x < .5 - boundary) return -1;
  if (x > .5 + boundary) return 1;
  return 0;
}
const artwork = Object.fromEntries(["farmer", "probox"].map((name) => {
  const image = new Image();
  image.src = "assets/" + name + ".webp";
  return [name, image];
}));

function path(points, fill) {
  paint.fillStyle = fill;
  paint.beginPath();
  points.forEach(([x, y], index) => index ? paint.lineTo(x, y) : paint.moveTo(x, y));
  paint.closePath();
  paint.fill();
}

function disc(x, y, radius, fill) {
  paint.fillStyle = fill;
  paint.beginPath();
  paint.arc(x, y, radius, 0, Math.PI * 2);
  paint.fill();
}

function block(x, y, w, h, fill, radius = 0) {
  paint.fillStyle = fill;
  paint.beginPath();
  paint.roundRect(x, y, w, h, radius);
  paint.fill();
}

function fitCanvas() {
  const rect = stageCanvas.getBoundingClientRect();
  const resolution = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * resolution));
  const height = Math.max(1, Math.round(rect.height * resolution));
  if (stageCanvas.width !== width || stageCanvas.height !== height) {
    stageCanvas.width = width;
    stageCanvas.height = height;
  }
  paint.setTransform(resolution, 0, 0, resolution, 0, 0);
  return { width: rect.width, height: rect.height };
}

function palm(x, y, s, night, seed) {
  const green = night ? "#183c39" : "#206744";
  path([[x-3*s,y],[x+4*s,y],[x+10*s,y-49*s],[x+6*s,y-51*s]], night ? "#364140" : "#8e6940");
  const cy = y - 49*s;
  for (let leaf = 0; leaf < 6; leaf++) {
    const side = leaf < 3 ? -1 : 1;
    const curve = leaf % 3;
    path([[x+8*s,cy],[x+8*s+side*(10+curve*3)*s,cy-(10-curve*7)*s],
      [x+8*s+side*(19+curve*5)*s,cy+(-6+curve*8+seed)*s],
      [x+8*s+side*8*s,cy+(1+curve*2)*s]], green);
  }
}

function backdrop(width, height, horizon, night) {
  const sky = paint.createLinearGradient(0, 0, 0, horizon * 1.3);
  sky.addColorStop(0, night ? "#151932" : "#69bfd0");
  sky.addColorStop(1, night ? "#425873" : "#fbe3a0");
  block(0,0,width,height,sky);
  disc(width*.76, horizon*.45, height*(night?.045:.075), night ? "#f7edd0" : "#fff0b1");
  if (night) {
    for (let i = 1; i <= 30; i++) {
      disc(((i * 181) % 997) / 997 * width, ((i * 41) % 90) / 100 * horizon, i % 7 === 0 ? 1.4 : .7, "#fff4caab");
    }
  }
  for (let layer=0; layer<3; layer++) {
    const base=horizon+height*(.03+layer*.038);
    const ridges = [[0,height],[0,base]];
    for (let i=0;i<=22;i++) {
      const t=i/22;
      const lift=(Math.sin(i*1.2+layer*2)*.18+Math.sin(i*.54+layer*1.9)*.43+.62)*height*(.20-layer*.04);
      ridges.push([t*width,base-lift]);
    }
    ridges.push([width,height]);
    path(ridges, (night ? ["#293e58","#244054","#254b4e"] : ["#83a89b","#559177","#387957"])[layer]);
  }
  block(0,horizon+height*.025,width,height,night?"#243f3a":"#529746");
}

function drawVehicle(night, x, y, size, bounce, hit, elapsed) {
  paint.save();
  paint.translate(x, y);
  if (hit > 0 && Math.floor(elapsed * 17) % 2) paint.globalAlpha = .42;
  paint.fillStyle = "#08131570";
  paint.beginPath();
  paint.ellipse(0, 3, size*.42, size*.11, 0, 0, Math.PI*2);
  paint.fill();
  paint.translate(0, -bounce);
  const image = artwork[night ? "probox" : "farmer"];
  if (image.complete && image.naturalWidth) {
    const aspect = image.naturalWidth / image.naturalHeight;
    const drawWidth = Math.min(size, size * aspect);
    const drawHeight = drawWidth / aspect;
    paint.drawImage(image, -drawWidth/2, -drawHeight, drawWidth, drawHeight);
  } else if (night) {
    drawCar(0, 0, size, "#e9eee9", true);
  } else {
    const u = size / 120;
    block(-19*u,-91*u,38*u,20*u,"#ca3d30",4*u);
    block(-12*u,-111*u,24*u,24*u,"#2359aa",5*u);
    block(-32*u,-87*u,14*u,48*u,"#b74235",4*u);
    block(18*u,-87*u,14*u,48*u,"#b74235",4*u);
    block(-17*u,-71*u,34*u,32*u,"#9aa9b1",3*u);
    block(-21*u,-44*u,17*u,44*u,"#275f9f",3*u);
    block(4*u,-44*u,17*u,41*u,"#275f9f",3*u);
  }
  paint.restore();
}

function drawCar(x, y, s, color, taxi = false) {
  path([[x-s*.49,y-s*.46],[x-s*.37,y-s*.70],[x+s*.35,y-s*.70],[x+s*.49,y-s*.46]],color);
  block(x-s*.41,y-s*.63,s*.82,s*.21,"#152a3d",s*.05);
  block(x-s*.52,y-s*.46,s*1.04,s*.44,color,s*.06);
  block(x-s*.52,y-s*.11,s*1.04,s*.11,"#242a32",s*.02);
  block(x-s*.47,y-s*.35,s*.14,s*.16,"#ec5050",s*.025);
  block(x+s*.33,y-s*.35,s*.14,s*.16,"#ec5050",s*.025);
  if (taxi) block(x-s*.17,y-s*.80,s*.34,s*.13,"#ffcf35",s*.02);
  block(x-s*.11,y-s*.25,s*.22,s*.09,taxi?"#a52525":"#eeeecc",s*.01);
}

function drawItem(item, x, y, size, night) {
  paint.save();
  paint.translate(x,y);
  if (item.kind === "hazard") {
    if (night) {
      drawCar(0,0,size,item.lane===0?"#e27854":"#8790cb");
    } else {
      block(-size*.48,-size*.57,size*.96,size*.57,"#875531",size*.06);
      block(-size*.41,-size*.51,size*.82,size*.44,"#bb8149",size*.025);
      path([[-size*.41,-size*.13],[size*.29,-size*.51],[size*.41,-size*.47],[-size*.31,-size*.08]],"#805435");
      block(-size*.46,-size*.63,size*.92,size*.14,"#e1a96d",size*.03);
    }
  } else if (night) {
    disc(0,-size*.58,size*.37,"#103e30");
    disc(0,-size*.58,size*.30,"#f8cd41");
    paint.fillStyle="#173823";
    paint.font="900 "+Math.max(5,size*.33)+"px system-ui";
    paint.textAlign="center";
    paint.textBaseline="middle";
    paint.fillText("$",0,-size*.56);
    path([[-size*.10,-size*.25],[size*.10,-size*.25],[0,-size*.03]],"#ffdb58");
  } else {
    block(-size*.32,-size*.36,size*.64,size*.36,"#bd782c",size*.05);
    path([[-size*.32,-size*.31],[-size*.22,-size*.59],[-size*.06,-size*.43],[0,-size*.71],[size*.16,-size*.44],[size*.32,-size*.59],[size*.32,-size*.30]],"#32784a");
    [-.21,0,.21].forEach((offset)=>disc(offset*size,-size*.39,size*.115,"#ffe06a"));
    block(-size*.37,-size*.32,size*.74,size*.09,"#ffcc5a",size*.02);
  }
  paint.restore();
}

function drawTrack(state) {
  const {width,height}=fitCanvas();
  if (!width || !height) return;
  const night=state.shift === "night";
  const horizon=height*horizonRatio;
  const depth=(z)=>Math.pow(Math.max(0,z),1.53);
  const half=(z)=>width*roadHalfWidth(depth(z));
  const yAt=(z)=>horizon+depth(z)*height*roadDepthHeight;
  const center=width*.5;
  const laneAt=(lane,z)=>center+lane*half(z)*laneWidth;
  const motion=state.elapsed*(night?.84:.71);
  backdrop(width,height,horizon,night);
  path([[center-half(0)-5,horizon],[center+half(0)+5,horizon],[width,height],[0,height]],night?"#705f51":"#a1673c");
  path([[center-half(0),horizon],[center+half(0),horizon],[center+half(1.19),height],[center-half(1.19),height]],night?"#323f4a":"#c18853");

  for (let i=0; i<15; i++) {
    const z=(i/14 + motion%1) % 1.12;
    const y=yAt(z);
    const s=.10+depth(z);
    for (const side of [-1,1]) {
      const x=center+side*(half(z)+width*(.034+.14*depth(z)));
      if (night) {
        block(x-s*3,y-s*74,s*6,s*73,"#687779");
        block(x-s*9,y-s*75,s*18,s*6,"#ffd866",s*2);
        disc(x,y-s*72,s*10,"#e4c96730");
      } else {
        palm(x,y,s,night,i%3);
      }
    }
    const end=Math.min(1.13,z+.035);
    for (const line of [-1,1]) {
      const offset=(t)=>center+line*half(t)*laneWidth/2;
      const thickness=(t)=>Math.max(1,half(t)*.014);
      path([[offset(z)-thickness(z),y],[offset(z)+thickness(z),y],
        [offset(end)+thickness(end),yAt(end)],[offset(end)-thickness(end),yAt(end)]],night?"#e4d4a8":"#ffe1a580");
    }
  }

  const playerZ=.89;
  const rows=state.items.filter((item)=>item.z>=0 && item.z<1.16).map((item)=>({z:item.z,item}));
  rows.push({z:playerZ,player:true});
  rows.sort((a,b)=>a.z-b.z);
  for (const entry of rows) {
    const y=yAt(entry.z);
    if (entry.player) {
      const bounce=state.jump > 0 ? Math.sin(state.jump/.70*Math.PI)*height*.15 :
        (night ? 0 : Math.sin(state.elapsed*20)*height*.006);
      drawVehicle(night,laneAt(state.playerX,entry.z),y,Math.min(height*.27,width*.20),bounce,state.hit,state.elapsed);
    } else {
      const size=(.13+depth(entry.z)*.87)*Math.min(height*.20,width*.16);
      drawItem(entry.item,laneAt(entry.item.lane,entry.z),y,size,night);
    }
  }

  if (state.feedback) {
    const {text,life,positive}=state.feedback;
    paint.save();
    paint.globalAlpha=Math.min(1,life*4);
    paint.font="900 "+Math.round(height*.053)+"px system-ui";
    paint.textAlign="center";
    paint.lineWidth=4;
    const y=yAt(playerZ)-height*(.24+(1-life)*.10);
    paint.strokeStyle="#1b281c";
    paint.strokeText(text,laneAt(state.playerX,playerZ),y);
    paint.fillStyle=positive?"#ffde5e":"#ffada0";
    paint.fillText(text,laneAt(state.playerX,playerZ),y);
    paint.restore();
  }
}
