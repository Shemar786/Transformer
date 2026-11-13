"use strict";

const canvas = document.getElementById("track");
const ctx = canvas.getContext("2d");
const faxImage = new Image();
faxImage.src = "assets/fax.webp";

const horizonRatio = .34;
const roadDepthHeight = .55;
const roadHalf = (depth) => .035 + .49 * depth;
const laneSpacing = .64;
const flightDepth = .88;

function laneAtScreenPoint(x, y) {
  const depth = Math.max(0, (y - horizonRatio) / roadDepthHeight);
  const boundary = roadHalf(depth) * laneSpacing / 2;
  return x < .5 - boundary ? -1 : x > .5 + boundary ? 1 : 0;
}

function polygon(points, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath();
  ctx.fill();
}

function rect(x,y,w,h,fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x,y,w,h);
}

function circle(x,y,r,color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();
}

function backdrop(w,h,horizon) {
  const sky = ctx.createLinearGradient(0,0,0,horizon*1.15);
  sky.addColorStop(0,"#488a9d");
  sky.addColorStop(1,"#f6d49b");
  rect(0,0,w,h,sky);
  circle(w*.8,horizon*.47,h*.038,"#fff0b6");
  for(let row=0;row<3;row++) {
    const ridge=[[0,horizon+9]];
    for(let i=0;i<=24;i++) {
      const rise=.45+.24*Math.sin(i*.49+row*1.2)+.19*Math.sin(i*1.21+row*.6);
      ridge.push([i/24*w,horizon-h*rise*(.23-row*.047)+row*4]);
    }
    ridge.push([w,horizon+9]);
    polygon(ridge,["#7baca7","#68928c","#497d77"][row]);
  }
  rect(0,horizon,w,h-horizon,"#58715a");
  rect(0,horizon,w,h*.05,"#65756f");
  const terminalWidth=w*.33;
  const terminalHeight=h*.08;
  const top=horizon-terminalHeight;
  rect(w*.03,top,terminalWidth,terminalHeight,"#344c51");
  polygon([[w*.018,top],[w*.08,top-h*.021],[w*.35,top-h*.019],[w*.375,top]],"#dbd4bb");
  for(let i=0;i<11;i++) {
    rect(w*(.045+i*.028),top+h*.016,w*.022,terminalHeight*.46,i%3?"#92b6ad":"#6d9b9a");
  }
  rect(w*.2,horizon,w*.21,h*.036,"#7b8780");
  const tx=w*.81;
  rect(tx,horizon-h*.17,w*.025,h*.17,"#b6b6a0");
  polygon([[tx-w*.018,horizon-h*.163],[tx+w*.043,horizon-h*.163],[tx+w*.035,horizon-h*.208],[tx-w*.011,horizon-h*.208]],"#2d5a62");
  rect(tx-w*.016,horizon-h*.216,w*.059,h*.01,"#d3d2b1");
  circle(tx+w*.014,horizon-h*.224,h*.005,"#f4ab58");
  plane(w*.88,horizon+h*.026,w*.14);
  plane(w*.72,horizon+h*.016,w*.105);
}

function plane(x,y,s) {
  polygon([[x-s*.5,y-s*.05],[x-s*.37,y-s*.13],[x+s*.29,y-s*.13],[x+s*.45,y-s*.24],[x+s*.48,y-s*.24],[x+s*.48,y-s*.02],[x+s*.35,y+s*.04],[x-s*.4,y+s*.03]],"#e3e6db");
  polygon([[x+s*.06,y-s*.06],[x-s*.07,y+s*.14],[x+s*.08,y+s*.14],[x+s*.29,y-s*.06]],"#b4c2ba");
  for(let i=0;i<5;i++) rect(x+s*(-.31+i*.082),y-s*.09,s*.039,s*.025,"#486877");
}

function cargo(item,x,y,size) {
  ctx.save();
  ctx.translate(x,y);
  if(item.kind==="barrier") {
    rect(-size*.47,-size*.43,size*.94,size*.35,"#ed8b50");
    for(let i=0;i<3;i++) {
      const a=(-.43+i*.28)*size;
      polygon([[a,-size*.08],[a+size*.12,-size*.08],[a+size*.26,-size*.43],[a+size*.14,-size*.43]],"#fff3cc");
    }
    rect(-size*.42,-size*.085,size*.13,size*.085,"#323536");
    rect(size*.29,-size*.085,size*.13,size*.085,"#323536");
    circle(-size*.36,-size*.44,size*.035,"#ffe398");
    circle(size*.36,-size*.44,size*.035,"#ffe398");
  } else {
    const tag=item.kind==="tag";
    const glow=tag?"#ffd662":"#83e6cb";
    circle(0,-size*.53,size*.47,tag?"#efbe5840":"#81e6c03d");
    polygon([[-size*.29,-size*.34],[-size*.29,-size*.68],[0,-size*.87],[size*.29,-size*.68],[size*.29,-size*.34],[0,-size*.19]],glow);
    if(tag) {
      circle(0,-size*.65,size*.047,"#574b28");
      rect(-size*.15,-size*.51,size*.3,size*.044,"#574b28");
    } else {
      rect(-size*.13,-size*.67,size*.26,size*.3,"#296855");
      rect(-size*.067,-size*.72,size*.134,size*.055,"#296855");
      rect(-size*.07,-size*.56,size*.14,size*.043,glow);
    }
  }
  ctx.restore();
}

function bird(x,y,size,state) {
  const climb = state.climb > 0 ? Math.sin(state.climb/.72*Math.PI) * size*.85 : 0;
  const float = Math.sin(state.elapsed*6)*size*.048;
  ctx.save();
  ctx.translate(x,y);
  ctx.fillStyle="#0f181969";
  ctx.beginPath();
  ctx.ellipse(0,1,size*.34,size*.075,0,0,Math.PI*2);
  ctx.fill();
  ctx.translate(0,-climb-float-size*.28);
  ctx.rotate((state.lane-state.position)*.18);
  if(state.hit > 0 && Math.floor(state.elapsed*18)%2) ctx.globalAlpha=.45;
  if(faxImage.complete && faxImage.naturalWidth) {
    const h=size*faxImage.naturalHeight/faxImage.naturalWidth;
    ctx.drawImage(faxImage,-size/2,-h/2,size,h);
  } else {
    polygon([[-size*.5,-size*.13],[-size*.18,-size*.11],[0,-size*.04],[size*.18,-size*.11],[size*.5,-size*.13],[size*.33,size*.05],[size*.07,size*.035],[size*.1,size*.19],[-size*.1,size*.19],[-size*.07,size*.035],[-size*.33,size*.05]],"#b2c4c6");
    circle(0,-size*.045,size*.068,"#4e8176");
    circle(0,-size*.028,size*.022,"#ffd662");
  }
  ctx.restore();
}

function drawTrack(state) {
  const {width:w,height:h}=canvas.getBoundingClientRect();
  if(!w||!h) return;
  const ratio=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)) {
    canvas.width=Math.round(w*ratio);
    canvas.height=Math.round(h*ratio);
  }
  ctx.setTransform(ratio,0,0,ratio,0,0);
  const center=w*.5;
  const horizon=h*horizonRatio;
  const depth=(z)=>Math.pow(Math.max(0,z),1.55);
  const edge=(z)=>w*roadHalf(depth(z));
  const screenY=(z)=>horizon+h*roadDepthHeight*depth(z);
  const screenX=(lane,z)=>center+lane*edge(z)*laneSpacing;
  backdrop(w,h,horizon);
  const asphalt=ctx.createLinearGradient(0,horizon,0,h);
  asphalt.addColorStop(0,"#566366");
  asphalt.addColorStop(.55,"#444d53");
  asphalt.addColorStop(1,"#313a40");
  polygon([[center-edge(0),horizon],[center+edge(0),horizon],[w*1.12,h],[-w*.12,h]],asphalt);
  for(let i=0;i<7;i++) {
    const z=(i/5+state.travel*.008)%1.27;
    const end=Math.min(1.28,z+.003);
    polygon([[center-edge(z),screenY(z)],[center+edge(z),screenY(z)],
      [center+edge(end),screenY(end)],[center-edge(end),screenY(end)]],"#0c171626");
  }
  const marker=(state.travel*.008+.96)%1.29;
  if(marker>.12) {
    const end=marker+.047;
    for(const side of [-1,1]) {
      for(const stripe of [.83,.72]) {
        const position=(t)=>center+side*edge(t)*stripe;
        polygon([[position(marker)-edge(marker)*.018,screenY(marker)],
          [position(marker)+edge(marker)*.018,screenY(marker)],
          [position(end)+edge(end)*.018,screenY(end)],
          [position(end)-edge(end)*.018,screenY(end)]],"#d3dcd3b8");
      }
    }
  }
  for(const side of [-1,1]) {
    polygon([[center+side*edge(0)*.92,horizon],[center+side*edge(0),horizon],
      [center+side*w*.605,h],[center+side*w*.572,h]],"#deded0");
  }
  for(let i=0;i<17;i++) {
    const z=(i/15+state.travel*.008)%1.16;
    const end=Math.min(1.18,z+.035);
    const y=screenY(z);
    const y2=screenY(end);
    for(const line of [-1,1]) {
      const a=center+line*edge(z)*laneSpacing/2;
      const b=center+line*edge(end)*laneSpacing/2;
      polygon([[a-edge(z)*.012,y],[a+edge(z)*.012,y],[b+edge(end)*.012,y2],[b-edge(end)*.012,y2]],"#e3e5d5");
      circle(center+line*edge(z)*.95,y,1+depth(z)*2.5,"#a4e5e5");
    }
  }
  const rows=state.items.map(item=>({z:item.z,item}));
  rows.push({z:flightDepth});
  rows.sort((a,b)=>a.z-b.z);
  for(const {z,item} of rows) {
    if(item) cargo(item,screenX(item.lane,z),screenY(z),(.14+depth(z)*.86)*Math.min(w*.155,h*.20));
    else bird(screenX(state.position,z),screenY(z),Math.min(w*.30,h*.41),state);
  }
  if(state.feedback) {
    ctx.save();
    ctx.globalAlpha=Math.min(1,state.feedback.life*3);
    ctx.font="800 "+Math.round(h*.046)+"px system-ui";
    ctx.textAlign="center";
    const y=screenY(flightDepth)-h*(.24+(1-state.feedback.life)*.1);
    const x=screenX(state.position,flightDepth);
    ctx.lineWidth=4;
    ctx.strokeStyle="#223236";
    ctx.strokeText(state.feedback.text,x,y);
    ctx.fillStyle=state.feedback.color;
    ctx.fillText(state.feedback.text,x,y);
    ctx.restore();
  }
}
