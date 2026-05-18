import { useRef, useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import hapticTap from '../../utils/haptic';

const W = 360, H = 560;

function drawShip(ctx, x, y, blink) {
  if (blink) return;
  ctx.save();
  ctx.shadowColor = '#00F5FF'; ctx.shadowBlur = 16;
  // Body hexagon
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 18 : 14;
    i === 0 ? ctx.moveTo(x + Math.cos(a)*r, y + Math.sin(a)*r) : ctx.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(x-18, y-20, x+18, y+20);
  g.addColorStop(0, '#00F5FF'); g.addColorStop(1, '#0080AA');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#00F5FF'; ctx.lineWidth = 1.5; ctx.stroke();
  // Wings
  ctx.beginPath();
  ctx.moveTo(x-18, y+2); ctx.lineTo(x-32, y+16); ctx.lineTo(x-12, y+12); ctx.closePath();
  ctx.fillStyle = '#0080AA'; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x+18, y+2); ctx.lineTo(x+32, y+16); ctx.lineTo(x+12, y+12); ctx.closePath();
  ctx.fill();
  // Cockpit
  ctx.beginPath(); ctx.arc(x, y-4, 6, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,20,40,0.9)'; ctx.fill();
  ctx.strokeStyle = '#00F5FF'; ctx.lineWidth = 1; ctx.stroke();
  // Engine glow
  ctx.shadowColor = '#8B5CF6'; ctx.shadowBlur = 20;
  ctx.fillStyle = `rgba(139,92,246,0.8)`;
  ctx.beginPath(); ctx.ellipse(x, y+20, 6, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.shadowBlur = 8;
  switch(e.type) {
    case 'A':
      ctx.shadowColor='#FF006E'; ctx.fillStyle='#FF006E';
      ctx.beginPath(); ctx.moveTo(e.x,e.y-12); ctx.lineTo(e.x+10,e.y+8); ctx.lineTo(e.x-10,e.y+8); ctx.closePath(); ctx.fill();
      break;
    case 'B':
      ctx.shadowColor='#FFB703'; ctx.fillStyle='#FFB703';
      ctx.beginPath(); ctx.moveTo(e.x-14,e.y-6); ctx.lineTo(e.x+14,e.y-6); ctx.lineTo(e.x+10,e.y+10); ctx.lineTo(e.x-10,e.y+10); ctx.closePath(); ctx.fill();
      break;
    case 'C':
      ctx.shadowColor='#FF4444'; ctx.fillStyle='#CC2222';
      for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2-Math.PI/2;const r=i%2===0?16:10;i===0?ctx.moveTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r):ctx.lineTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r);}
      ctx.closePath(); ctx.fill(); ctx.strokeStyle='#FF4444'; ctx.lineWidth=2; ctx.stroke();
      break;
    case 'D':
      ctx.shadowColor='#8B5CF6'; ctx.fillStyle='#8B5CF6';
      ctx.beginPath(); ctx.moveTo(e.x,e.y+14); ctx.lineTo(e.x+10,e.y-8); ctx.lineTo(e.x-10,e.y-8); ctx.closePath(); ctx.fill();
      break;
    case 'E':
      ctx.shadowColor='#333'; ctx.fillStyle='#1A1A2E';
      ctx.beginPath(); ctx.arc(e.x,e.y,14,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#FF4444'; ctx.lineWidth=2; ctx.stroke();
      break;
  }
  ctx.restore();
  // HP bar
  if(e.maxHp>1){
    ctx.fillStyle='#333'; ctx.fillRect(e.x-14,e.y-20,28,3);
    ctx.fillStyle='#FF4444'; ctx.fillRect(e.x-14,e.y-20,28*(e.hp/e.maxHp),3);
  }
}

function drawBoss(ctx, boss, W) {
  ctx.save();
  ctx.shadowColor='#8B5CF6'; ctx.shadowBlur=20;
  ctx.fillStyle='#1A0030';
  ctx.fillRect(boss.x-W*0.4, boss.y-28, W*0.8, 56);
  ctx.strokeStyle='#8B5CF6'; ctx.lineWidth=2;
  ctx.strokeRect(boss.x-W*0.4, boss.y-28, W*0.8, 56);
  // Weak points
  const phases = boss.hp/boss.maxHp;
  [-1,1].forEach(side=>{
    const glowColor = phases>0.5?'#00F5FF':phases>0.2?'#FFB703':'#FF006E';
    ctx.shadowColor=glowColor; ctx.shadowBlur=16;
    ctx.fillStyle=glowColor;
    ctx.beginPath(); ctx.arc(boss.x+side*W*0.25, boss.y, 10, 0, Math.PI*2); ctx.fill();
  });
  // HP bar
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(20,8,W-40,10);
  const hpColor = boss.hp/boss.maxHp>0.5?'#06D6A0':boss.hp/boss.maxHp>0.2?'#FFB703':'#FF006E';
  ctx.fillStyle=hpColor; ctx.fillRect(20,8,(W-40)*(boss.hp/boss.maxHp),10);
  ctx.font='bold 10px monospace'; ctx.fillStyle='#fff'; ctx.textAlign='center';
  ctx.fillText(`BOSS ${boss.hp}/${boss.maxHp}`, W/2, 16);
  ctx.restore();
}

const WAVES = [
  [{type:'A',count:5}],
  [{type:'A',count:5},{type:'B',count:3}],
  [{type:'B',count:3},{type:'C',count:2}],
  [{type:'A',count:5},{type:'D',count:3}],
  [{type:'E',count:3},{type:'C',count:2},{type:'B',count:3}],
];

function spawnWave(waveNum) {
  const pattern = WAVES[(waveNum-1) % WAVES.length];
  const enemies = [];
  let offset = 0;
  pattern.forEach(({type,count})=>{
    const hp = {A:1,B:2,C:4,D:1,E:3}[type]||1;
    for(let i=0;i<count;i++){
      enemies.push({
        id: Math.random(), type, x: 40+Math.random()*(W-80), y: -30-offset*35-i*35,
        hp, maxHp:hp, phase: Math.random()*Math.PI*2, fireCd: 60+Math.random()*60,
      });
      offset++;
    }
  });
  return enemies;
}

export default function SpaceShooter({ onExit, onScoreSaved }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [ui, setUi] = useState({ score:0, wave:1, lives:3, over:false, high:0 });
  const highRef = useRef(0);
  const [boot, setBoot] = useState(0);

  const loadHigh = useCallback(async()=>{
    try{ const{data}=await api.get('/games/stats'); highRef.current=data.stats?.spaceShooterHighScore||0; setUi(u=>({...u,high:highRef.current})); }catch{}
  },[]);
  useEffect(()=>{ loadHigh(); },[loadHigh]);

  useEffect(()=>{
    const c = canvasRef.current; if(!c) return;
    const ctx = c.getContext('2d');
    const stars = Array.from({length:150},(_,i)=>({
      x:Math.random()*W, y:Math.random()*H,
      speed: i<50?0.3:i<110?0.7:1.3,
      size: i<50?1:i<110?1.5:2,
      twinkle: Math.random()*Math.PI*2,
    }));

    const s = {
      px: W/2, py: H-70, bullets:[], enemyBullets:[], enemies:[], particles:[],
      wave:1, score:0, lives:3, over:false, overSent:false,
      fireCd:0, rapidT:0, shieldT:0, shieldHp:3, bombCount:1,
      tripleT:0, boss:null, waveClear:true, waveMsg:0, frame:0,
      invincibleT:0, dragging:false,
    };

    const fire = ()=>{
      if(s.fireCd>0) return;
      s.fireCd = s.rapidT>0?4:12;
      if(s.tripleT>0){
        s.bullets.push({x:s.px,y:s.py-20,vx:-1.5,vy:-10});
        s.bullets.push({x:s.px,y:s.py-20,vx:0,vy:-10});
        s.bullets.push({x:s.px,y:s.py-20,vx:1.5,vy:-10});
      } else {
        s.bullets.push({x:s.px,y:s.py-20,vx:0,vy:-10});
      }
    };

    const spawnBoss = ()=>{
      s.boss={x:W/2,y:60,hp:20+(s.wave/5|0)*10,maxHp:20+(s.wave/5|0)*10,vx:1.5,cd:50,phase:1};
    };

    const endGame = async()=>{
      if(s.overSent) return; s.overSent=true;
      try{
        const{data}=await api.post('/games/space-shooter/score',{score:Math.floor(s.score)});
        highRef.current=data.highScore??highRef.current; onScoreSaved?.();
      }catch{}
      setUi({score:Math.floor(s.score),wave:s.wave,lives:0,over:true,high:highRef.current});
    };

    const loop=()=>{
      if(s.over) return;
      s.frame++;
      if(s.fireCd>0) s.fireCd--;
      if(s.rapidT>0) s.rapidT--;
      if(s.shieldT>0) s.shieldT--;
      if(s.tripleT>0) s.tripleT--;
      if(s.invincibleT>0) s.invincibleT--;
      if(s.waveMsg>0) s.waveMsg--;

      // BG
      ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
      stars.forEach(st=>{
        st.y=(st.y+st.speed)%H;
        st.twinkle+=0.05;
        ctx.globalAlpha=0.4+Math.sin(st.twinkle)*0.3;
        ctx.fillStyle='#fff';
        ctx.fillRect(st.x,st.y,st.size,st.size);
      });
      ctx.globalAlpha=1;

      // Spawn wave
      if(s.waveClear && !s.boss){
        if(s.wave%5===0){ spawnBoss(); }
        else{ s.enemies=spawnWave(s.wave); }
        s.waveClear=false; s.waveMsg=100;
      }

      // Wave msg
      if(s.waveMsg>0){
        ctx.fillStyle='#00F5FF'; ctx.font='bold 22px Rajdhani,sans-serif'; ctx.textAlign='center';
        ctx.shadowColor='#00F5FF'; ctx.shadowBlur=10;
        ctx.fillText(s.boss?`BOSS WAVE ${s.wave}`:`WAVE ${s.wave}`,W/2,H/2-30);
        ctx.shadowBlur=0;
      }

      // Move bullets
      s.bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;});
      s.bullets=s.bullets.filter(b=>b.y>-10&&b.x>-10&&b.x<W+10);
      s.enemyBullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;});
      s.enemyBullets=s.enemyBullets.filter(b=>b.y<H+10);

      // Move enemies
      s.enemies.forEach(e=>{
        e.y+=1+s.wave*0.06;
        if(e.type==='B') e.x+=Math.sin(s.frame*0.04+e.phase)*2;
        if(e.type==='D'){const dx=s.px-e.x,dy=s.py-e.y,d=Math.sqrt(dx*dx+dy*dy)||1;e.x+=dx/d*2.5;e.y+=dy/d*1.5;}
        e.fireCd--;
        if(e.fireCd<=0){
          e.fireCd=120-s.wave*5;
          if(e.type==='C'){[-1,0,1].forEach(ox=>s.enemyBullets.push({x:e.x+ox*8,y:e.y+12,vx:ox*1.5,vy:3}));}
          else if(e.type==='E'){s.enemyBullets.push({x:e.x,y:e.y+14,vx:0,vy:4});}
          else if(e.type!=='D'){s.enemyBullets.push({x:e.x,y:e.y+12,vx:0,vy:3});}
        }
      });

      // Boss
      if(s.boss){
        s.boss.x+=s.boss.vx;
        if(s.boss.x>W-40||s.boss.x<40) s.boss.vx*=-1;
        s.boss.cd--;
        const hp=s.boss.hp/s.boss.maxHp;
        s.boss.phase=hp>0.5?1:hp>0.2?2:3;
        if(s.boss.cd<=0){
          s.boss.cd=40;
          if(s.boss.phase>=1)[...Array(3)].forEach((_,i)=>s.enemyBullets.push({x:s.boss.x+(i-1)*20,y:s.boss.y+30,vx:(i-1)*1.5,vy:3.5}));
          if(s.boss.phase>=2){const a=s.frame*0.15;s.enemyBullets.push({x:s.boss.x,y:s.boss.y+28,vx:Math.cos(a)*3,vy:Math.sin(a)*3});}
          if(s.boss.phase===3)[...Array(6)].forEach((_,i)=>{const a=(i/6)*Math.PI*2;s.enemyBullets.push({x:s.boss.x,y:s.boss.y+28,vx:Math.cos(a)*2.5,vy:Math.sin(a)*2.5});});
        }
      }

      // Draw enemies
      s.enemies.forEach(e=>drawEnemy(ctx,e));
      if(s.boss) drawBoss(ctx,s.boss,W);

      // Draw bullets
      ctx.fillStyle='#00F5FF'; ctx.shadowColor='#00F5FF'; ctx.shadowBlur=6;
      s.bullets.forEach(b=>{ctx.fillRect(b.x-2,b.y,4,12);});
      ctx.shadowBlur=0;
      ctx.fillStyle='#FF4444'; ctx.shadowColor='#FF4444'; ctx.shadowBlur=4;
      s.enemyBullets.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill();});
      ctx.shadowBlur=0;

      // Draw particles
      s.particles=s.particles.filter(p=>p.life>0);
      s.particles.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.life--;
        ctx.globalAlpha=p.life/p.maxLife;
        ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=6;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      });
      ctx.globalAlpha=1;

      // Draw player
      drawShip(ctx,s.px,s.py,s.invincibleT>0&&Math.floor(s.frame/4)%2===0);

      // Shield
      if(s.shieldT>0){
        ctx.strokeStyle=`rgba(0,245,255,${0.3+s.shieldHp/3*0.5})`;ctx.lineWidth=3;
        ctx.shadowColor='#00F5FF';ctx.shadowBlur=14;
        ctx.beginPath();ctx.arc(s.px,s.py,32,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
        if(s.shieldHp<3){
          ctx.strokeStyle='rgba(0,245,255,0.3)';ctx.lineWidth=1;
          ctx.beginPath();ctx.arc(s.px,s.py,32,0,Math.PI*2*(s.shieldHp/3));ctx.stroke();
        }
      }

      // HUD
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,36);
      for(let i=0;i<s.lives;i++){
        ctx.fillStyle='#00F5FF';ctx.shadowColor='#00F5FF';ctx.shadowBlur=6;
        ctx.beginPath();ctx.moveTo(18+i*22,26);ctx.lineTo(26+i*22,36);ctx.lineTo(10+i*22,36);ctx.closePath();ctx.fill();
        ctx.shadowBlur=0;
      }
      ctx.textAlign='center';ctx.fillStyle='#00F5FF';ctx.font='bold 14px Rajdhani,sans-serif';
      ctx.shadowColor='#00F5FF';ctx.shadowBlur=6;ctx.fillText(`WAVE ${s.wave}`,W/2,24);ctx.shadowBlur=0;
      ctx.textAlign='right';ctx.fillStyle='#E8E8FF';ctx.font='bold 16px Rajdhani,sans-serif';
      ctx.fillText(Math.floor(s.score),W-8,24);

      // Bullet-enemy collision
      s.bullets.forEach(b=>{
        if(s.boss){
          [-1,1].forEach(side=>{
            const wx=s.boss.x+side*W*0.25, wy=s.boss.y;
            if(Math.abs(b.x-wx)<14&&Math.abs(b.y-wy)<14){
              b.y=-999; s.boss.hp--;
              if(s.boss.hp<=0){
                s.score+=500;
                for(let p=0;p<25;p++){const a=Math.random()*Math.PI*2,sp=2+Math.random()*6;s.particles.push({x:s.boss.x,y:s.boss.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:4+Math.random()*6,color:['#FF006E','#FFD700','#00F5FF','#8B5CF6'][Math.floor(Math.random()*4)],life:50,maxLife:50});}
                s.boss=null; s.wave++; s.waveClear=true; s.waveMsg=80; hapticTap(20);
              }
            }
          });
        }
        s.enemies.forEach(e=>{
          if(e.hp<=0) return;
          if(Math.abs(b.x-e.x)<18&&Math.abs(b.y-e.y)<18){
            e.hp--; b.y=-999;
            if(e.hp<=0){
              const pts={A:10,B:20,C:50,D:15,E:30}[e.type]||10;
              s.score+=pts; e.y=9999;
              for(let p=0;p<8;p++){const a=Math.random()*Math.PI*2,sp=1+Math.random()*4;s.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:3+Math.random()*4,color:'#FF006E',life:25,maxLife:25});}
              hapticTap(6);
            }
          }
        });
      });

      // Check wave clear
      if(!s.boss&&s.enemies.every(e=>e.hp<=0||e.y>H+50)&&!s.waveClear&&s.waveMsg<=0){
        s.wave++; s.waveClear=true; s.waveMsg=80; hapticTap([10,5,15]);
      }

      // Enemy bullet hits player
      s.enemyBullets.forEach(b=>{
        if(Math.abs(b.x-s.px)<20&&Math.abs(b.y-s.py)<20){
          b.y=-999;
          if(s.invincibleT>0) return;
          if(s.shieldT>0){s.shieldHp--;if(s.shieldHp<=0){s.shieldT=0;s.shieldHp=3;}hapticTap(10);return;}
          s.lives--;s.invincibleT=120;hapticTap([30,50,30]);
          if(s.lives<=0){s.over=true;endGame();}
        }
      });

      // Enemy ship collision
      s.enemies.forEach(e=>{
        if(e.hp<=0||e.y<s.py-30||e.y>s.py+30||Math.abs(e.x-s.px)>30) return;
        if(s.invincibleT>0) return;
        if(s.shieldT>0){s.shieldHp--;if(s.shieldHp<=0){s.shieldT=0;s.shieldHp=3;}e.y=9999;hapticTap(10);return;}
        e.y=9999;s.lives--;s.invincibleT=120;hapticTap([30,50,30]);
        if(s.lives<=0){s.over=true;endGame();}
      });

      // Extra life milestones
      if(!s._gotLife500&&s.score>=500){s._gotLife500=true;s.lives=Math.min(s.lives+1,5);}
      if(!s._gotLife1500&&s.score>=1500){s._gotLife1500=true;s.lives=Math.min(s.lives+1,5);}
      if(!s._gotLife3000&&s.score>=3000){s._gotLife3000=true;s.lives=Math.min(s.lives+1,5);}

      if(s.dragging) fire();
      setUi({score:Math.floor(s.score),wave:s.wave,lives:s.lives,over:false,high:highRef.current});
      if(!s.over) rafRef.current=requestAnimationFrame(loop);
    };

    const onDown=()=>{ s.dragging=true; fire(); };
    const onUp=()=>{ s.dragging=false; };
    const onMove=(e)=>{
      const r=c.getBoundingClientRect();
      const cx=(e.touches?e.touches[0].clientX:e.clientX)-r.left;
      s.px=Math.max(22,Math.min(W-22,(cx/r.width)*W));
    };
    const interval=setInterval(()=>{ if(s.dragging) fire(); },120);

    c.addEventListener('mousedown',onDown); c.addEventListener('mouseup',onUp); c.addEventListener('mousemove',onMove);
    c.addEventListener('touchstart',onDown,{passive:true}); c.addEventListener('touchend',onUp); c.addEventListener('touchmove',onMove,{passive:true});
    rafRef.current=requestAnimationFrame(loop);

    return()=>{
      clearInterval(interval); cancelAnimationFrame(rafRef.current);
      c.removeEventListener('mousedown',onDown); c.removeEventListener('mouseup',onUp); c.removeEventListener('mousemove',onMove);
      c.removeEventListener('touchstart',onDown); c.removeEventListener('touchend',onUp); c.removeEventListener('touchmove',onMove);
    };
  },[boot,onScoreSaved]);

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <canvas ref={canvasRef} width={W} height={H} className="rounded-xl touch-none" style={{maxWidth:'100%',background:'#000',border:'1px solid #252535'}} />
      {ui.over&&(
        <div className="w-full max-w-[360px] rounded-xl p-5 text-center" style={{background:'rgba(139,92,246,0.08)',border:'2px solid rgba(139,92,246,0.3)'}}>
          <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:900,fontSize:26,color:'#8B5CF6',letterSpacing:4,textShadow:'0 0 20px rgba(139,92,246,0.5)'}}>MISSION FAILED</div>
          <div className="grid grid-cols-3 gap-2 mt-4 mb-5">
            {[{label:'SCORE',value:ui.score,color:'#00F5FF'},{label:'WAVE',value:ui.wave,color:'#8B5CF6'},{label:'BEST',value:ui.high,color:'#06D6A0'}].map(({label,value,color})=>(
              <div key={label} className="p-2 rounded-lg" style={{background:'#12121A',border:'1px solid #252535'}}>
                <div style={{fontFamily:'monospace',fontSize:9,color:'#6B6B8A',letterSpacing:1}}>{label}</div>
                <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:20,color}}>{value}</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={()=>{setUi(u=>({...u,over:false}));setBoot(b=>b+1);}} style={{width:'100%',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:3,color:'#0A0A0F',background:'#8B5CF6',borderRadius:10,padding:'14px 0',boxShadow:'0 0 20px rgba(139,92,246,0.4)'}}>
            RESTART
          </button>
        </div>
      )}
      {onExit&&<button type="button" onClick={onExit} style={{fontFamily:'monospace',fontSize:10,color:'#6B6B8A',letterSpacing:2}}>EXIT</button>}
    </div>
  );
}
