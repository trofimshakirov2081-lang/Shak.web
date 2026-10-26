const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:360,height:780},locale:'ru-RU'});
const res={};
for(const s of JSON.parse(fs.readFileSync(process.argv[2]))){const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));
 await p.goto('file:///home/user/Shak.web/demos/'+s+'/index.html');await p.waitForTimeout(2600);
 const r=await p.evaluate(()=>{const out=[];const W=document.documentElement.clientWidth;
  document.querySelectorAll('body *').forEach(el=>{if(el.closest('.c-drawer,.c-shade,.c-toast,.c-splash'))return;
   let a=el.parentElement,scr=false;while(a){const o=getComputedStyle(a).overflowX;if(o!=='visible'){scr=true;break}a=a.parentElement}
   if(scr)return;const rc=el.getBoundingClientRect();if(rc.width&&(rc.right>W+1||rc.left<-1))out.push(el.tagName+'.'+el.className);
   const cs=getComputedStyle(el);if(el.scrollWidth>el.clientWidth+2&&cs.overflowX==='visible'&&el.children.length===0&&el.clientWidth>0)out.push('TEXT '+el.tagName+'.'+el.className+':'+el.textContent.slice(0,30));});
  const imgs=[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length;
  return {sw:document.documentElement.scrollWidth,bad:out.slice(0,6),broken:imgs}});
 await p.screenshot({path:process.argv[3]+'/'+s+'.png'});res[s]={...r,errs};await p.close();}
fs.writeFileSync(process.argv[3]+'/qa.json',JSON.stringify(res,null,0));await b.close();})();
