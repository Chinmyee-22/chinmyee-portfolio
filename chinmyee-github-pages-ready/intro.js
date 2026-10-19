
(()=>{
'use strict';
const intro=document.getElementById('intro'), canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d'),status=document.getElementById('status'),progress=document.getElementById('progress');
const colors=['#8050cb','#a77add','#9265d4','#b594ec','#754ab8','#a182d8'];
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)},rand=(a,b)=>a+Math.random()*(b-a);
let W,H,dpr,balls=[],sprites=[],largeSprite,raf=0,start=0,done=false,exiting=false;
const TIMES={impact:2550,split:4030,spreadEnd:5310,formEnd:6970,holdEnd:7870,fadeEnd:9750};
function sprite(color,diameter){const c=document.createElement('canvas');c.width=c.height=diameter;const g=c.getContext('2d');const z=diameter/2;const grad=g.createRadialGradient(z*.67,z*.59,z*.045,z,z,z*.91);grad.addColorStop(0,'#ffffff');grad.addColorStop(.12,'#f1e8ff');grad.addColorStop(.37,color);grad.addColorStop(1,'#56378b');g.fillStyle=grad;g.beginPath();g.arc(z,z,z*.94,0,Math.PI*2);g.fill();return c}
function buildSprites(){sprites=colors.map(c=>sprite(c,24));largeSprite=sprite('#9566db',96)}
function fitTypography(c){const font='system-ui,-apple-system,Segoe UI,sans-serif';let f2=Math.min(130,W*.115,H*.19),f1=f2*.55;
  for(let i=0;i<3;i++){c.font=`800 ${f2}px ${font}`;f2*=Math.min(1,W*.80/c.measureText('Chinmyee.').width);c.font=`720 ${f1}px ${font}`;f1*=Math.min(1,W*.72/c.measureText("Hello, I'm").width)}
  const baseline=H*.50;return {f1,f2,y1:baseline-f2*.68,y2:baseline+f2*.49,font};}
function targets(){const t=document.createElement('canvas');t.width=W;t.height=H;const g=t.getContext('2d',{willReadFrequently:true}),f=fitTypography(g);
  g.fillStyle='#000';g.textBaseline='middle';g.textAlign='center';g.font=`720 ${f.f1}px ${f.font}`;g.fillText("Hello, I'm",W/2,f.y1);g.font=`800 ${f.f2}px ${f.font}`;g.fillText('Chinmyee.',W/2,f.y2);
  const rgba=g.getImageData(0,0,W,H).data;let points=[];const gap=W<520?3.7:4.5;
  for(let y=1;y<H-1;y+=gap){for(let x=1;x<W-1;x+=gap){if(rgba[(Math.round(y)*W+Math.round(x))*4+3]>115)points.push({x,y})}}
  for(let i=points.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[points[i],points[j]]=[points[j],points[i]]}
  const count=Math.min(points.length,W<520?4200:6500);
  balls=points.slice(0,count).map((p,i)=>({tx:p.x,ty:p.y,sx:rand(12,W-12),sy:rand(25,H-25),delay:rand(0,.18),size:rand(3.7,5.8),sprite:sprites[i%colors.length]}));
}
function resize(){const r=intro.getBoundingClientRect();W=Math.max(320,Math.round(r.width));H=Math.max(440,Math.round(r.height));dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);targets()}
function draw(ms){ctx.clearRect(0,0,W,H);
  // A fixed, visible ground plane. The large sphere lands here before splitting.
  const ground=Math.min(H*.79,H-85),R=Math.min(33,Math.max(25,W*.026));
  const dropStart=-R*2.8, center=W/2;
  if(ms<TIMES.split+175){
    // One continuous grounded motion: acceleration -> hard squash -> rebound ->
    // second smaller rebound -> final contact. Multiplication starts only AFTER it settles.
    const flight=TIMES.impact;
    const contact=160, bounce1=645, contact2=110, bounce2=340, settle=225;
    let y=ground-R,scaleX=1,scaleY=1;
    if(ms<flight){
      const t=clamp(ms/flight);
      // Gravity accelerates the ball as it approaches the floor.
      y=dropStart+(ground-R-dropStart)*t*t;
    }else if(ms<flight+contact){
      const t=clamp((ms-flight)/contact);
      const squeeze=Math.sin(Math.PI*t);
      scaleY=1-.39*squeeze;
      scaleX=1+.29*squeeze;
      y=ground-R*scaleY;
    }else if(ms<flight+contact+bounce1){
      const t=clamp((ms-flight-contact)/bounce1);
      // Parabolic arc with ZERO height at takeoff/landing, peak at midpoint.
      const height=Math.min(140,H*.145);
      y=ground-R-4*height*t*(1-t);
      const stretch=Math.sin(Math.PI*t);
      scaleY=1+.07*stretch;
      scaleX=1-.035*stretch;
    }else if(ms<flight+contact+bounce1+contact2){
      const t=clamp((ms-flight-contact-bounce1)/contact2);
      const squeeze=Math.sin(Math.PI*t);
      scaleY=1-.18*squeeze;
      scaleX=1+.13*squeeze;
      y=ground-R*scaleY;
    }else if(ms<flight+contact+bounce1+contact2+bounce2){
      const t=clamp((ms-flight-contact-bounce1-contact2)/bounce2);
      const height=Math.min(32,H*.038);
      y=ground-R-4*height*t*(1-t);
    }else{
      const t=clamp((ms-(flight+contact+bounce1+contact2+bounce2))/settle);
      const squeeze=.065*Math.sin(Math.PI*t);
      scaleY=1-squeeze;scaleX=1+squeeze*.7;
      y=ground-R*scaleY;
    }
    // Soft stationary floor and shadow. The shadow tightens at each contact.
    const altitude=Math.max(0,ground-R-y);
    const contactStrength=1-clamp(altitude/160);
    const shadowW=R*(1.6+contactStrength*.55);
    ctx.save();ctx.translate(center,ground+4);ctx.scale(shadowW,4.5+altitude*.035);
    const sh=ctx.createRadialGradient(0,0,.12,0,0,1);
    sh.addColorStop(0,`rgba(79,49,112,${.08+contactStrength*.26})`);
    sh.addColorStop(1,'rgba(79,49,112,0)');ctx.fillStyle=sh;
    ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
    // Contact baseline is visible while ball is near the floor.
    if(contactStrength>.7){ctx.strokeStyle=`rgba(142,106,188,${(contactStrength-.7)*.25})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(center-R*2.8,ground+1);ctx.lineTo(center+R*2.8,ground+1);ctx.stroke();}
    const visibility=ms>TIMES.split?1-smooth((ms-TIMES.split)/175):1;
    if(visibility>0){ctx.globalAlpha=visibility;
      ctx.drawImage(largeSprite,center-R*scaleX,y-R*scaleY,2*R*scaleX,2*R*scaleY);
      ctx.globalAlpha=1;}
  }
  if(ms>=TIMES.split){
    const appear=smooth((ms-TIMES.split)/260),scatter=smooth((ms-TIMES.split)/1100),gather=smooth((ms-TIMES.spreadEnd)/(TIMES.formEnd-TIMES.spreadEnd));
    ctx.globalAlpha=appear;
    for(const b of balls){
      const part=smooth((scatter-b.delay)/.82);
      // All little balls launch from the precise ground impact point, not midair.
      let x=center+(b.sx-center)*part,y=ground-R+(b.sy-(ground-R))*part;
      const a=smooth((gather-b.delay)/.83);x+=(b.tx-x)*a;y+=(b.ty-y)*a;
      const radius=b.size*(.87+.13*a);ctx.drawImage(b.sprite,x-radius/2,y-radius/2,radius,radius);
    }ctx.globalAlpha=1;
  }
  const pct=Math.round(clamp(ms/TIMES.holdEnd)*100);progress.style.width=pct+'%';
  const message=ms<TIMES.impact?'THE FIRST DATA POINT IS FALLING':ms<TIMES.impact+160?'IMPACT • THE FIRST BOUNCE':ms<TIMES.split?'BOUNCING INTO NEW IDEAS':ms<TIMES.spreadEnd?'DATA EVERYWHERE':ms<TIMES.formEnd?'FORMING THE GREETING':ms<TIMES.holdEnd?'HELLO, I’M CHINMYEE':'WELCOME TO MY WORLD';
  if(status.textContent!==message)status.textContent=message;
}
function loop(now){if(done)return;const ms=Math.min(now-start,TIMES.fadeEnd);draw(ms);
  if(ms>=TIMES.holdEnd&&!exiting){exiting=true;intro.classList.add('exit')}
  if(ms<TIMES.fadeEnd){raf=requestAnimationFrame(loop)}else{done=true;intro.classList.add('exit')}}
function play(){cancelAnimationFrame(raf);intro.classList.remove('exit');done=false;exiting=false;start=performance.now();draw(0);raf=requestAnimationFrame(loop)}
function skip(){cancelAnimationFrame(raf);done=true;exiting=true;intro.classList.add('exit');progress.style.width='100%';status.textContent='WELCOME TO MY WORLD'}
document.getElementById('replay').addEventListener('click',()=>{window.scrollTo({top:0,behavior:'auto'});play()});
document.getElementById('skip').addEventListener('click',skip);
window.addEventListener('resize',()=>{resize();if(done)draw(TIMES.formEnd)});
buildSprites();resize();if(matchMedia('(prefers-reduced-motion: reduce)').matches)skip();else play();
})();
