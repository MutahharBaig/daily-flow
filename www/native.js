// Native layer: real alarms, notifications and step counter
const LN=Capacitor.Plugins.LocalNotifications,ST=Capacitor.Plugins.Steps;
const CH='dayflow';let stTimer=null,nativeReady=false,rq=Promise.resolve();
const wrap=(n,f)=>{const o=window[n];window[n]=function(...a){const r=o.apply(this,a);f();return r}};
function resched(){rq=rq.then(doResched).catch(()=>{})}
async function doResched(){
  const p=await LN.getPending();if(p.notifications.length)await LN.cancel({notifications:p.notifications});
  const now=Date.now(),L=[];
  D.tasks.forEach(t=>{if(t.done)return;if(!t.nid)t.nid=(D.seq=(D.seq||1)+1)*100;
    const d=due(t).getTime(),ex={tid:t.id};
    if(t.alarm&&d>now)L.push({id:t.nid,title:'⏰ '+t.title,body:'It’s time: '+t.time,schedule:{at:new Date(d),allowWhileIdle:true},channelId:CH,extra:ex});
    if(t.alertBefore&&!t.viewed){const s=d-(t.mins||15)*60000;
      for(let k=0;k<24;k++){const at=s+k*10000;if(at>now&&at<=d)L.push({id:t.nid+1+k,title:'🔔 '+t.title,body:'Due at '+t.time+' — tap to acknowledge',schedule:{at:new Date(at),allowWhileIdle:true},channelId:CH,extra:ex})}}});
  const open=D.tasks.filter(t=>!t.done).length;
  if(open)for(let i=0;i<7;i++){const at=new Date();at.setDate(at.getDate()+i);at.setHours(22,30,0,0);
    if(at.getTime()>now)L.push({id:1+i,title:'🌙 Pending tasks',body:open+' task(s) still pending. Open Dayflow → Reports.',schedule:{at,allowWhileIdle:true},channelId:CH,extra:{}})}
  save();if(L.length)await LN.schedule({notifications:L.slice(0,400)});
}
['addTask','tog','del','openTask'].forEach(n=>wrap(n,resched));
// in-app banner only; the system notification already makes the sound
window.alertUser=function(t,text){const b=$('#ban');b.style.display='block';b.innerHTML=`<b>⏰ ${esc(t.title)}</b><div>${text}</div><button class="btn g" style="margin-top:8px" onclick="openTask('${t.id}')">View task</button>`};
// steps from the hardware step counter
async function readSteps(){const r=await ST.read(),c=r.counter,t0=today(),b=D.steps[t0]||0;
  if(!D.sb)D.sb={last:c};else{const d=c>=D.sb.last?c-D.sb.last:c;if(d>0)D.steps[t0]=b+Math.round(d);D.sb.last=c}
  save();if(view==='steps'&&(D.steps[t0]||0)!==b)render()}
window.stepOn=async function(){try{await readSteps();D.stepsOn=true;sOn=true;sMsg='';
  if(!stTimer)stTimer=setInterval(()=>readSteps().catch(()=>{}),10000)}
  catch(e){sOn=false;sMsg='Allow “Physical activity” for Dayflow in phone Settings → Apps → Dayflow → Permissions, then try again.'}
  save();render()};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&D.stepsOn)readSteps().catch(()=>{})});
async function setupNative(){if(nativeReady)return;nativeReady=true;
  try{await LN.requestPermissions();
    await LN.createChannel({id:CH,name:'Dayflow alerts',importance:5,visibility:1,vibration:true,lights:true});
    const e=await LN.checkExactNotificationSetting();
    if(e.exact_alarm==='denied'&&!D.exAsked){D.exAsked=1;save();await LN.changeExactNotificationSetting()}
    LN.addListener('localNotificationActionPerformed',e=>{const x=e.notification.extra;if(x&&x.tid)openTask(x.tid)})}catch(e){}
  resched()}
const _start=window.start;
window.start=function(){_start();setupNative();if(D.stepsOn)window.stepOn()};
