(()=>{var Zs=["OFF","VDC","VAC","OHM","A"],Jc=["A","mA","COM","V"],Ys=["AUTO",2,20,200],Mi={2:{max:1.999,dec:3,res:.001},20:{max:19.99,dec:2,res:.01},200:{max:199.9,dec:1,res:.1}},gd=["inspect","jacks","func","range","points","guards","bridge"],so={aa:{kind:"dc",ref:"n",el:[{t:"v",a:"p",b:"n",v:1.58}]},b9:{kind:"dc",ref:"n",el:[{t:"v",a:"p",b:"n",v:9.36}]},lamp9:{kind:"dc",ref:"bn",el:[{t:"v",a:"bp",b:"bn",v:9},{t:"w",a:"bp",b:"s1"},{t:"s",a:"s1",b:"s2",sw:"lamp9"},{t:"w",a:"s2",b:"lp"},{t:"r",a:"lp",b:"ln",r:90,lamp:"lamp9",nominal:9},{t:"w",a:"ln",b:"bn"}]},panel24:{kind:"dc",ref:"vn",el:[{t:"v",a:"vp",b:"vn",v:24},{t:"w",a:"vp",b:"s1"},{t:"s",a:"s1",b:"s2",sw:"panel24"},{t:"w",a:"s2",b:"lp",fault:"w2open"},{t:"r",a:"lp",b:"ln",r:1200,lamp:"panel24",nominal:24},{t:"w",a:"ln",b:"vn"}]},ac12:{kind:"ac",ref:"b",freq:60,el:[{t:"v",a:"a",b:"b",v:12}]}},Tt={"aa+":{c:"aa",n:"p",label:"AA +"},"aa-":{c:"aa",n:"n",label:"AA \u2212"},"b9+":{c:"b9",n:"p",label:"9V +"},"b9-":{c:"b9",n:"n",label:"9V \u2212"},b9x:{c:"b9",bridge:["b9+","b9-"]},tp1:{c:"lamp9",n:"bp",label:"TP1"},tp2:{c:"lamp9",n:"s1",label:"TP2"},tp3:{c:"lamp9",n:"s2",label:"TP3"},tp4:{c:"lamp9",n:"lp",label:"TP4"},tp5:{c:"lamp9",n:"ln",label:"TP5"},tp6:{c:"lamp9",n:"bn",label:"TP6"},x1:{c:"panel24",n:"vp",label:"X1 +24V"},x2:{c:"panel24",n:"vn",label:"X2 0V"},x12:{c:"panel24",bridge:["x1","x2"]},x3:{c:"panel24",n:"s1",label:"X3"},x4:{c:"panel24",n:"s2",label:"X4"},x5:{c:"panel24",n:"lp",label:"X5"},x6:{c:"panel24",n:"ln",label:"X6"},ac1:{c:"ac12",n:"a",label:"AC 1"},ac2:{c:"ac12",n:"b",label:"AC 2"}};function yd(n,e){let t=e.length;for(let s=0;s<t;s++){let a=s;for(let r=s+1;r<t;r++)Math.abs(n[r][s])>Math.abs(n[a][s])&&(a=r);if(!(Math.abs(n[a][s])<1e-18)){[n[s],n[a]]=[n[a],n[s]],[e[s],e[a]]=[e[a],e[s]];for(let r=s+1;r<t;r++){let l=n[r][s]/n[s][s];if(l){for(let c=s;c<t;c++)n[r][c]-=l*n[s][c];e[r]-=l*e[s]}}}}let i=new Array(t).fill(0);for(let s=t-1;s>=0;s--){let a=e[s];for(let r=s+1;r<t;r++)a-=n[s][r]*i[r];i[s]=Math.abs(n[s][s])<1e-18?0:a/n[s][s]}return i}function vd(n,e={},t={},i=null){let s=so[n],a={},r=b=>{for((b in a)||(a[b]=b);a[b]!==b;)b=a[b];return b},l=(b,M)=>{a[r(b)]=r(M)};for(let b of s.el)r(b.a),r(b.b),b.t==="w"&&!(b.fault&&t[b.fault])&&l(b.a,b.b),b.t==="s"&&e[b.sw]&&l(b.a,b.b);let c=r(s.ref),h=[...new Set(Object.keys(a).map(r))].filter(b=>b!==c),u=new Map(h.map((b,M)=>[b,M])),d=s.el.filter(b=>b.t==="v"&&r(b.a)!==r(b.b)),f=h.length,g=f+d.length,y=Array.from({length:g},()=>new Array(g).fill(0)),_=new Array(g).fill(0),m=(b,M,z)=>{let C=u.get(r(b)),I=u.get(r(M));C!==I&&(C!==void 0&&(y[C][C]+=z),I!==void 0&&(y[I][I]+=z),C!==void 0&&I!==void 0&&(y[C][I]-=z,y[I][C]-=z))};for(let b=0;b<f;b++)y[b][b]+=1e-12;for(let b of s.el)b.t==="r"&&m(b.a,b.b,1/b.r);i&&m(i[0],i[1],1/1e7),d.forEach((b,M)=>{let z=u.get(r(b.a)),C=u.get(r(b.b));z!==void 0&&(y[f+M][z]=1,y[z][f+M]=1),C!==void 0&&(y[f+M][C]=-1,y[C][f+M]=-1),_[f+M]=b.v});let p=yd(y,_);return{v:b=>{let M=r(b);return M===c?0:p[u.get(M)]},same:(b,M)=>r(b)===r(M)}}var Ua=n=>JSON.parse(JSON.stringify(n));function _d(){return{dial:"OFF",range:"AUTO",hold:!1,plugs:{red:null,black:null},probes:{red:null,black:null},near:{red:null,black:null},switches:{lamp9:!1,panel24:!1},faults:{w2open:!1},faultRevealed:!1,damaged:{red:!1,black:!1},inspected:{meter:!1,red:!1,black:!1},checklist:{jacks:!1,func:!1,range:!1,guards:!1,bridge:!1},intended:[]}}var Na=class{constructor(){this.listeners=[],this.guards=[],this.reset()}on(e){this.listeners.push(e)}emit(e){for(let t of this.listeners)t(e)}reset(e){this.state=_d(),e&&this.merge(e),this.time=0,this.filtered=0,this.settleT=0,this.settled=!1,this.held=null,this.holdSig=null,this.cond={},this.lastSig="",this.refreshT=1,this.live=this.format(0),this.display=this.live,this.emit({type:"reset"})}merge(e){let t=this.state;for(let i of Object.keys(e)){let s=e[i];s&&typeof s=="object"&&!Array.isArray(s)?Object.assign(t[i],s):t[i]=Array.isArray(s)?[...s]:s}t.hold||(this.held=null)}setup(e){this.merge(e),this.settleT=0,this.settled=!1,this.emit({type:"setup"})}snapshot(){return{state:Ua(this.state),held:this.held&&Ua(this.held),holdSig:this.holdSig}}restore(e){this.state=Ua(e.state),this.held=e.held&&Ua(e.held),this.holdSig=e.holdSig,this.settleT=0,this.settled=!1,this.cond={},this.emit({type:"restore"})}fail(e,t={}){return this.emit({type:"error",code:e,...t}),{ok:!1,code:e,...t}}anyContact(){return!!(this.state.probes.red||this.state.probes.black)}isVMode(){return this.state.dial==="VDC"||this.state.dial==="VAC"}jacksOK(){return this.state.plugs.black==="COM"&&this.state.plugs.red==="V"}currentJackUsed(){return["red","black"].some(e=>["A","mA"].includes(this.state.plugs[e]))}inspectDone(){let e=this.state;return e.inspected.meter&&e.inspected.red&&e.inspected.black&&!e.damaged.red&&!e.damaged.black}checkItem(e){let t=this.state;return e==="inspect"?this.inspectDone():e==="points"?t.intended.length>=1:!!t.checklist[e]}missingChecklist(){return gd.filter(e=>!this.checkItem(e))}checklistComplete(){return this.missingChecklist().length===0}newExercise(){let e=this.state;e.inspected={meter:!1,red:!1,black:!1},e.checklist={jacks:!1,func:!1,range:!1,guards:!1,bridge:!1},e.intended=[],this.emit({type:"checklist"})}inspect(e){let t=this.state;t.inspected[e]=!0;let i=e!=="meter"&&t.damaged[e];return this.emit({type:"inspect",item:e,damaged:i}),{ok:!0,damaged:i}}replaceLead(e){return this.anyContact()?this.fail("change_connected",{what:"lead"}):(this.state.damaged[e]=!1,this.state.inspected[e]=!0,this.emit({type:"replace",lead:e}),{ok:!0})}plug(e,t){let i=this.state;if(i.plugs[e]===t)return{ok:!0};if(this.anyContact())return this.fail("change_connected",{what:"jack"});let s=e==="red"?"black":"red";return t&&i.plugs[s]===t?this.fail("jack_taken",{jack:t}):(i.plugs[e]=t,i.checklist.jacks=!1,this.emit({type:"plug",lead:e,jack:t}),(t==="A"||t==="mA")&&this.emit({type:"detect",code:"wrong_jack",lead:e,jack:t}),{ok:!0})}setDial(e){let t=this.state;return t.dial===e?{ok:!0}:this.anyContact()?this.fail("change_connected",{what:"function"}):(t.dial=e,t.hold=!1,this.held=null,t.checklist.func=!1,this.emit({type:"dial",pos:e}),{ok:!0})}setRange(e){let t=this.state;return this.isVMode()?t.range===e?{ok:!0}:(t.range=e,t.checklist.range=!1,this.emit({type:"range",range:e}),{ok:!0}):this.fail("range_na")}cycleRange(){let e=Ys.indexOf(this.state.range);return this.setRange(Ys[(e+1)%Ys.length])}toggleHold(){let e=this.state;return e.dial==="OFF"?this.fail("meter_off_btn"):(e.hold=!e.hold,e.hold?(this.held={...this.live},this.holdSig=this.connSig()):this.held=null,this.emit({type:"hold",on:e.hold}),{ok:!0})}presetHold(e){this.state.hold=!0,this.held={on:!0,neg:!1,unit:"V",mode:"DC",rangeSel:this.state.range,rangeActive:20,ol:!1,hold:!0,...e},this.holdSig="preset"}toggleSwitch(e,t){let i=this.state;return i.switches[e]=t===void 0?!i.switches[e]:!!t,this.emit({type:"switch",id:e,closed:i.switches[e]}),{ok:!0}}identify(e){let t=this.state;return Tt[e].bridge?{ok:!1}:(t.intended.includes(e)?t.intended=t.intended.filter(i=>i!==e):t.intended.length<2?t.intended.push(e):t.intended=[e],this.emit({type:"identify",term:e,intended:[...t.intended]}),{ok:!0})}setIntended(e){this.state.intended=[...e],this.emit({type:"identify",intended:[...e]})}confirm(e){let t=this.state;if(e==="jacks"){if(this.currentJackUsed())return this.fail("unsafe_jack");if(t.plugs.red==="COM"&&t.plugs.black==="V")return this.fail("swapped_jacks");if(!this.jacksOK())return this.fail("lead_unplugged")}return(e==="func"||e==="range")&&!this.isVMode()?this.fail("func_not_voltage"):(t.checklist[e]=!0,this.emit({type:"confirm",item:e}),{ok:!0})}grip(e,t){return t==="tip"?this.fail("tip_grip",{lead:e}):(this.emit({type:"grip",lead:e,part:t}),{ok:t==="handle"})}touch(e,t){let i=this.state;for(let r of this.guards){let l=r("touch",{lead:e,term:t});if(l)return this.fail(l,{lead:e,term:t})}if(this.currentJackUsed())return this.fail("unsafe_jack",{lead:e,term:t});let s=[i.plugs.red,i.plugs.black];if(!s.includes("COM")||!s.includes("V"))return this.fail("lead_unplugged",{lead:e,term:t});if(i.dial==="OFF")return this.fail("meter_off",{lead:e,term:t});if(!this.isVMode())return this.fail("func_block",{lead:e,term:t});let a=this.missingChecklist();return a.length?this.fail("precheck",{lead:e,term:t,missing:a}):Tt[t].bridge?this.fail("bridge",{lead:e,term:t}):i.intended.includes(t)?(i.probes[e]=t,i.near[e]=null,this.emit({type:"contact",lead:e,term:t}),{ok:!0}):this.fail("unplanned_point",{lead:e,term:t})}lift(e){let t=this.state,i=t.probes[e];return t.probes[e]=null,t.near[e]=null,i?this.emit({type:"lift",lead:e,term:i}):this.emit({type:"park",lead:e}),{ok:!0}}nearMiss(e,t){let i=this.state,s=i.probes[e];return i.probes[e]=null,i.near[e]=t,s&&this.emit({type:"lift",lead:e,term:s}),this.emit({type:"detect",code:"no_contact",lead:e,term:t}),{ok:!1,code:"no_contact"}}leadRoles(){let e=this.state.plugs,t=e.red==="V"?"red":e.black==="V"?"black":null,i=e.red==="COM"?"red":e.black==="COM"?"black":null;return{hi:t,lo:i}}meterNodes(e){let t=this.state,{hi:i,lo:s}=this.leadRoles();if(!i||!s)return null;let a=Tt[t.probes[i]],r=Tt[t.probes[s]];return!a||!r||a.c!==e||r.c!==e?null:[a.n,r.n]}solve(e){let t=this.state;return vd(e,t.switches,t.faults,this.meterNodes(e))}lampLevel(e){let t=e,i=so[t].el.find(a=>a.lamp===e),s=this.solve(t);return Math.abs(s.v(i.a)-s.v(i.b))/i.nominal}lampOn(e){return this.lampLevel(e)>.5}reading(){let e=this.state,t={power:e.dial!=="OFF",mode:e.dial,valid:!1,reason:null,value:0};if(!t.power)return t.reason="off",t;if(!this.isVMode())return t.reason="not_voltage",t;let{hi:i,lo:s}=this.leadRoles();if(!i||!s)return t.reason="leads",t;let a=Tt[e.probes[i]],r=Tt[e.probes[s]];if(!a||!r)return t.reason="open",t.openLeads=["red","black"].filter(u=>!e.probes[u]),t;if(a.c!==r.c)return t.reason="separate",t;let l=so[a.c],c=this.solve(a.c),h=c.v(a.n)-c.v(r.n);return t.valid=!0,t.circuit=a.c,t.kind=l.kind,t.diff=h,t.swapped=i==="black",t.sameNode=c.same(a.n,r.n),l.kind==="dc"?(t.mismatch=e.dial==="VAC",t.value=t.mismatch?0:h):(t.mismatch=e.dial==="VDC",t.value=t.mismatch?0:Math.abs(h)),t}drift(){let e=this.time;return this.state.dial==="VAC"?.012+.006*Math.sin(.7*e)+.003*Math.sin(1.9*e+.4):.0035*Math.sin(.9*e)+.002*Math.sin(2.3*e+1.3)+.001*Math.sin(5.1*e)}activeRange(e){let t=this.state.range;if(t!=="AUTO")return t;for(let i of[2,20,200])if(e<=Mi[i].max+Mi[i].res/2)return i;return 200}format(e){let t=this.state,i={on:t.dial!=="OFF",digits:"",neg:!1,unit:"",mode:"",rangeSel:t.range,rangeActive:null,hold:!1,ol:!1};if(!i.on)return i;if(t.dial==="OHM")return i.digits="----",i.unit="\u03A9",i.mode="OHM",i;if(t.dial==="A")return i.digits="----",i.unit="A",i.mode="A",i;i.mode=t.dial==="VDC"?"DC":"AC",i.unit="V";let s=Math.abs(e),a=this.activeRange(s),r=Mi[a];return i.rangeActive=a,s>r.max+r.res/2?(i.ol=!0,i.digits="OL",i):(i.digits=s.toFixed(r.dec),i.neg=e<-r.res/2,i)}connSig(){let e=this.state;return[e.dial,e.plugs.red,e.plugs.black,e.probes.red,e.probes.black,e.switches.lamp9,e.switches.panel24,e.faults.w2open].join("|")}displayText(e=this.display){return e.on?`${e.neg?"\u2212":""}${e.digits} ${e.unit}`.trim():""}holdStale(){return!this.state.hold||!this.held?!1:this.holdSig!==this.connSig()||this.held.digits!==this.live.digits||this.held.neg!==this.live.neg}tick(e){let t=this.state;this.time+=e;let i=this.reading(),s=this.connSig();s!==this.lastSig&&(this.lastSig=s,this.settleT=0,this.settled=!1);let a=0;if(i.valid){a=i.value,this.filtered+=(a-this.filtered)*(1-Math.exp(-e/.18));let h=Mi[this.activeRange(Math.abs(a))].res;Math.abs(a-this.filtered)<h/2?(this.filtered=a,this.settleT+=e):this.settleT=0,this.settled=this.settleT>.3}else this.filtered=this.isVMode()?this.drift():0,this.settleT=0,this.settled=!1;this.refreshT+=e,(this.refreshT>=.2||this.settled)&&(this.refreshT=0,this.live=this.format(this.filtered)),this.display=t.hold&&this.held?{...this.held,hold:!0}:this.live;let r=Mi[this.activeRange(Math.abs(a))],l=this.isVMode()&&!i.valid&&i.reason==="open"&&this.anyContact(),c={mode_mismatch:i.valid&&i.mismatch&&this.settled,range_low:i.valid&&t.range!=="AUTO"&&Math.abs(a)>r.max+r.res/2,reversed:i.valid&&this.settled&&i.kind==="dc"&&t.dial==="VDC"&&!i.swapped&&i.value<-r.res/2,same_node:i.valid&&this.settled&&i.sameNode,hold_stale:this.holdStale(),swapped_jacks:!!i.swapped&&i.valid,floating:l};for(let h of Object.keys(c))c[h]&&!this.cond[h]&&this.emit({type:"detect",code:h});return this.cond=c,i}settle(e=3){for(let t=0;t<e;t+=.05)this.tick(.05);return this.display}};var o=(n,e)=>({en:n,es:e}),Va="en",At=()=>Va,ao=n=>{Va=n==="es"?"es":"en"},xd='<svg class="dcs" viewBox="0 0 14 10" aria-hidden="true"><path d="M1 3h12" /><path d="M1 7h2.6M5.7 7h2.6M10.4 7H13" /></svg>';function L(n,e){if(n==null)return"";let t=typeof n=="string"?n:n[Va]??n.en;return e&&(t=t.replace(/\{(\w+)\}/g,(i,s)=>s in e?e[s]:i)),t}function Je(n,e){return L(n,e).replace(/⎓/g,xd)}var _t=n=>String(n).replace(/[&<>"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[e]);function Dn(n,e){let t=Va==="es";return L(n,e).replace(/<[^>]+>/g," ").replace(/V⎓/g,t?"voltaje de corriente continua":"D C volts").replace(/V~/g,t?"voltaje de corriente alterna":"A C volts").replace(/V\/Ω|VΩ/g,t?"V ohmios":"V ohms").replace(/Ω/g,t?"ohmios":"ohms").replace(/−/g,t?" menos ":" minus ").replace(/→/g,t?", luego ":", then ").replace(/≈/g,t?"aproximadamente ":"about ").replace(/\s+/g," ")}var P={appTitle:o("Voltage Lab","Laboratorio de Voltaje"),appSub:o("From Zero to Confident Measurements","De cero a mediciones con confianza"),simBadge:o("Simulation only","Solo simulaci\xF3n"),mode:o("Mode","Modo"),guided:o("Guided","Guiado"),practice:o("Practice","Pr\xE1ctica"),assessment:o("Assessment","Evaluaci\xF3n"),language:o("Language","Idioma"),narration:o("Narration","Narraci\xF3n"),captions:o("Captions","Subt\xEDtulos"),on:o("on","s\xED"),off:o("off","no"),help:o("Help","Ayuda"),lesson:o("Lesson","Lecci\xF3n"),step:o("Step","Paso"),of:o("of","de"),estTime:o("about {n} min","unos {n} min"),elapsed:o("elapsed","transcurrido"),goal:o("Goal","Objetivo"),why:o("Why","Por qu\xE9"),action:o("Action","Acci\xF3n"),observe:o("Observation","Observaci\xF3n"),meaning:o("Meaning","Significado"),showMe:o("Show me","Mu\xE9strame"),letMeTry:o("Let me try","D\xE9jame intentar"),explainAgain:o("Explain again","Expl\xEDcalo otra vez"),reset:o("Reset","Reiniciar"),back:o("Back","Atr\xE1s"),next:o("Next","Siguiente"),cont:o("Continue","Continuar"),finish:o("Finish lesson","Terminar lecci\xF3n"),nextLesson:o("Next lesson","Siguiente lecci\xF3n"),restartLesson:o("Restart lesson","Reiniciar lecci\xF3n"),hint:o("Hint","Pista"),explain:o("Explain","Explicar"),stepDone:o("Done \u2014 your setup matches this step.","Hecho: tu configuraci\xF3n coincide con este paso."),stepWaiting:o("Waiting for your action\u2026","Esperando tu acci\xF3n\u2026"),demoRunning:o("Demonstration running\u2026","Demostraci\xF3n en curso\u2026"),demoDone:o("Demonstrated. Press \u201CLet me try\u201D to do it yourself, or Next.","Demostrado. Pulsa \xABD\xE9jame intentar\xBB para hacerlo t\xFA, o Siguiente."),inShort:o("In short","En resumen"),youShouldSee:o("You should see","Deber\xEDas ver"),predictFirst:o("Predict first","Primero predice"),yourPrediction:o("Your prediction","Tu predicci\xF3n"),predRight:o("Your prediction matched.","Tu predicci\xF3n coincidi\xF3."),predWrong:o("Not what you predicted \u2014 that is fine. Compare it with the explanation.","No fue lo que predijiste; no pasa nada. Comp\xE1ralo con la explicaci\xF3n."),correct:o("Correct.","Correcto."),notQuite:o("Not quite.","No del todo."),tryAgain:o("Try again","Intenta de nuevo"),submit:o("Submit","Enviar"),check:o("Check","Comprobar"),retry:o("Retry","Reintentar"),dismiss:o("Close","Cerrar"),yourTurn:o("Your turn \u2014 no highlights this time","Tu turno: esta vez sin resaltados"),procedure:o("Procedure","Procedimiento"),results:o("Results so far","Resultados hasta ahora"),measuring:o("Measuring","Midiendo"),wrongPair:o("The probes are on {a} and {b}. This step needs {want}.","Las puntas est\xE1n en {a} y {b}. Este paso necesita {want}."),sequenceTitle:o("Remember the sequence","Recuerda la secuencia"),sequence:o("Inspect \u2192 Connect leads correctly \u2192 Select voltage mode and range \u2192 Identify two points \u2192 Measure \u2192 Interpret \u2192 Disconnect.","Inspeccionar \u2192 Conectar bien los cables \u2192 Elegir modo de voltaje y rango \u2192 Identificar dos puntos \u2192 Medir \u2192 Interpretar \u2192 Desconectar."),takeaways:o("Key points","Puntos clave"),lessonComplete:o("Lesson complete","Lecci\xF3n completada"),meterTitle:o("Meter reading","Lectura del medidor"),meterOff:o("Meter is OFF","Medidor APAGADO"),statusTitle:o("Connection status","Estado de la conexi\xF3n"),rangeAuto:o("AUTO","AUTO"),rangeManual:o("MANUAL","MANUAL"),holdOn:o("HOLD \u2014 frozen, not live","HOLD: congelado, no en vivo"),stOff:o("Meter is off. No measurement.","El medidor est\xE1 apagado. No hay medici\xF3n."),stNotV:o("The dial is not on a voltage function. These lessons only measure voltage.","El selector no est\xE1 en una funci\xF3n de voltaje. Estas lecciones solo miden voltaje."),stLeads:o("Leads are not plugged into COM and V/\u03A9. No measurement.","Los cables no est\xE1n en COM y V/\u03A9. No hay medici\xF3n."),stOpenBoth:o("No valid two-point measurement: neither probe is touching a test point. Any number shown is not a measurement.","No hay medici\xF3n v\xE1lida entre dos puntos: ninguna punta toca un punto de prueba. Cualquier n\xFAmero mostrado no es una medici\xF3n."),stOpenOne:o("No valid two-point measurement: the {lead} probe is not touching a test point. The number shown is stray pickup, not a measurement.","No hay medici\xF3n v\xE1lida entre dos puntos: la punta {lead} no toca un punto de prueba. El n\xFAmero mostrado es ruido captado, no una medici\xF3n."),stSeparate:o("The probes are on two separate, isolated circuits. There is no defined voltage between them.","Las puntas est\xE1n en dos circuitos separados y aislados. No hay un voltaje definido entre ellos."),stValid:o("Two-point contact: RED on {r}, BLACK on {b}.","Contacto en dos puntos: ROJA en {r}, NEGRA en {b}."),stSettling:o("Reading is settling\u2026","La lectura se est\xE1 estabilizando\u2026"),stSettled:o("Reading is steady.","La lectura es estable."),stMismatch:o("Warning: AC/DC setting does not match this source \u2014 the number is misleading.","Aviso: el ajuste CA/CC no corresponde a esta fuente; el n\xFAmero es enga\xF1oso."),stSameNode:o("Both probes are on the same node.","Ambas puntas est\xE1n en el mismo nodo."),stOver:o("Overrange: the selected range is too small.","Sobrerrango: el rango elegido es demasiado peque\xF1o."),stHoldStale:o("HOLD is on: the display is an old value, not the present reading.","HOLD est\xE1 activo: la pantalla muestra un valor antiguo, no la lectura actual."),red:o("red","roja"),black:o("black","negra"),RED:o("RED","ROJA"),BLACK:o("BLACK","NEGRA"),parked:o("parked","en reposo"),unplugged:o("unplugged","desconectado"),checklist:o("Pre-measurement check","Comprobaci\xF3n previa a la medici\xF3n"),checklistNote:o("Probes cannot touch a circuit until every item is done.","Las puntas no pueden tocar un circuito hasta completar cada punto."),ckInspect:o("Inspect meter and leads for damage","Inspeccionar medidor y cables en busca de da\xF1os"),ckJacks:o("Confirm the correct jacks","Confirmar los bornes correctos"),ckFunc:o("Confirm the measurement function","Confirmar la funci\xF3n de medici\xF3n"),ckRange:o("Check the selected range","Revisar el rango elegido"),ckPoints:o("Identify the intended test points","Identificar los puntos de prueba previstos"),ckGuards:o("Fingers stay behind the probe guards","Los dedos quedan detr\xE1s de las guardas"),ckBridge:o("One tip touches one terminal \u2014 no bridging","Una punta toca un solo terminal: sin puentear"),done:o("Done","Hecho"),todo:o("To do","Pendiente"),confirm:o("Confirm","Confirmar"),inspect:o("Inspect","Inspeccionar"),meterBody:o("Meter","Medidor"),redLead:o("Red lead","Cable rojo"),blackLead:o("Black lead","Cable negro"),replaceLead:o("Replace damaged lead","Reemplazar cable da\xF1ado"),inspOK:o("{item}: no cracks, no exposed metal, insulation intact.","{item}: sin grietas, sin metal expuesto, aislamiento intacto."),inspBad:o("{item}: the insulation is nicked and metal shows through. Do not use it \u2014 replace it.","{item}: el aislamiento est\xE1 cortado y se ve el metal. No lo uses; reempl\xE1zalo."),inspReplaced:o("{item} replaced with a good one and inspected.","{item} reemplazado por uno en buen estado e inspeccionado."),none:o("none yet","ninguno a\xFAn"),clear:o("Clear","Borrar"),nowIs:o("Now","Ahora"),controls:o("Equipment controls (alternative to using the 3D view)","Controles del equipo (alternativa a la vista 3D)"),dial:o("Rotary selector","Selector giratorio"),range:o("Range","Rango"),hold:o("HOLD","HOLD"),leadsJacks:o("Lead plugs","Clavijas de los cables"),probes:o("Probes","Puntas de prueba"),pickUp:o("Pick up {c} probe (by the handle)","Tomar la punta {c} (por el mango)"),holding:o("Holding {c} probe \u2014 now choose a test point","Sosteniendo la punta {c}: ahora elige un punto de prueba"),park:o("Park {c} probe","Dejar la punta {c} en reposo"),testPoints:o("Test points","Puntos de prueba"),tpHelp:o("With no probe in hand, choosing a point marks it as an intended test point. With a probe in hand, choosing a point touches it with that probe.","Sin punta en la mano, elegir un punto lo marca como punto de prueba previsto. Con una punta en la mano, elegir un punto lo toca con esa punta."),switches:o("Switches","Interruptores"),swLamp9:o("9 V lamp circuit switch","Interruptor del circuito de l\xE1mpara de 9 V"),swPanel:o("24 V panel switch S1","Interruptor S1 del panel de 24 V"),open:o("OPEN","ABIERTO"),closed:o("CLOSED","CERRADO"),lampOn:o("LAMP ON","L\xC1MPARA ENCENDIDA"),lampOff:o("LAMP OFF","L\xC1MPARA APAGADA"),intended:o("Identified points","Puntos identificados"),diagram:o("Circuit diagram","Diagrama del circuito"),diagramHelp:o("The same test points are marked here and on the bench. You can click them in either place.","Los mismos puntos de prueba est\xE1n marcados aqu\xED y en la mesa. Puedes hacer clic en cualquiera de los dos."),glossary:o("Symbols and terms","S\xEDmbolos y t\xE9rminos"),frontView:o("Front view","Vista frontal"),closeups:o("Close-up","Acercar"),vDisplay:o("Display","Pantalla"),vDial:o("Dial","Selector"),vJacks:o("Jacks","Bornes"),vTips:o("Probe tips","Puntas"),vBench:o("Circuit","Circuito"),zoomIn:o("Zoom in","Acercar"),zoomOut:o("Zoom out","Alejar"),stageHelp:o("Drag to rotate \xB7 scroll or pinch to zoom \xB7 drag a probe handle to a test point, or click a probe then a test point","Arrastra para girar \xB7 rueda o pellizco para zoom \xB7 arrastra el mango de una punta a un punto, o haz clic en la punta y luego en el punto"),selected:o("In hand","En la mano"),stAA:o("AA battery 1.5 V","Pila AA 1,5 V"),stB9:o("9 V battery","Bater\xEDa 9 V"),stLamp9:o("9 V lamp circuit (idealized)","Circuito de l\xE1mpara 9 V (ideal)"),stPanel:o("24 V DC training panel \u2014 simulated, isolated","Panel de pr\xE1ctica 24 V CC: simulado, aislado"),stAC:o("12 V AC training source \u2014 simulated, isolated","Fuente de pr\xE1ctica 12 V CA: simulada, aislada"),swLabel:o("SWITCH","INTERRUPTOR"),faultOpen:o("OPEN WIRE","CABLE ABIERTO"),damagedTag:o("NICK","CORTE"),asTitle:o("Assessment","Evaluaci\xF3n"),asIntro:o("Ten tasks. No hints until you submit each one. Safety blocks stay active. Take your time: correct setup and reasoning count, speed does not.","Diez tareas. Sin pistas hasta que env\xEDes cada una. Los bloqueos de seguridad siguen activos. T\xF3mate tu tiempo: cuentan la preparaci\xF3n y el razonamiento correctos, no la rapidez."),asStart:o("Start assessment","Comenzar evaluaci\xF3n"),asTask:o("Task","Tarea"),asPass:o("Passed","Aprobada"),asFail:o("Not yet","A\xFAn no"),asRetryTask:o("Retry this task","Reintentar esta tarea"),asNextTask:o("Next task","Siguiente tarea"),asReport:o("View report","Ver informe"),asFirstTry:o("Passed on first submission","Aprobada al primer env\xEDo"),asAfterRetry:o("Passed after correction","Aprobada tras corregir"),asNotPassed:o("Not passed yet","A\xFAn no aprobada"),repTitle:o("Your report","Tu informe"),repSkills:o("Completed skills","Habilidades completadas"),repErrors:o("Errors corrected","Errores corregidos"),repNoErrors:o("No coaching events were recorded.","No se registraron eventos de correcci\xF3n."),repRepeat:o("Topics to repeat","Temas para repasar"),repNothing:o("Nothing stands out \u2014 well done.","Nada destaca: buen trabajo."),repNext:o("Recommended next practice session","Siguiente sesi\xF3n de pr\xE1ctica recomendada"),repBlocked:o("Before the report: correct these safety mistakes","Antes del informe: corrige estos errores de seguridad"),repBlockedHelp:o("Each critical safety mistake must be put right on the bench. Do the correction shown and this list clears itself.","Cada error cr\xEDtico de seguridad debe corregirse en la mesa. Haz la correcci\xF3n indicada y esta lista se vaciar\xE1 sola."),repCorrected:o("corrected","corregido"),repOpen:o("needs correction","requiere correcci\xF3n"),repTimes:o("\xD7 {n}","\xD7 {n}"),repDisclaimer:o("Completing this simulation does not qualify you to work on energized electrical equipment. Real work needs training, supervision, authorization and your own meter\u2019s manual.","Completar esta simulaci\xF3n no te habilita para trabajar en equipos el\xE9ctricos energizados. El trabajo real requiere formaci\xF3n, supervisi\xF3n, autorizaci\xF3n y el manual de tu propio medidor."),repAgain:o("Take the assessment again","Repetir la evaluaci\xF3n"),repGoPractice:o("Open this practice session","Abrir esta sesi\xF3n de pr\xE1ctica"),repAllGood:o("Practice mode, Lesson 7 (24 V panel fault-finding) without hints \u2014 then try explaining each reading out loud before you take it.","Modo Pr\xE1ctica, Lecci\xF3n 7 (b\xFAsqueda de fallas en el panel de 24 V) sin pistas; despu\xE9s intenta explicar cada lectura en voz alta antes de tomarla."),repPracticeLesson:o("Practice mode \u2014 {lesson}","Modo Pr\xE1ctica: {lesson}"),helpTitle:o("How to use Voltage Lab","C\xF3mo usar el Laboratorio de Voltaje"),helpBody:o(`<p><b>Everything here is simulated.</b> Nothing in this app is an instruction for wall outlets, breaker panels, mains wiring or industrial equipment, and finishing it does not qualify you to work on energized equipment.</p>
<ul>
<li><b>Look around:</b> drag the bench to rotate, scroll or pinch to zoom, two-finger drag (or right-drag) to pan. \u201CFront view\u201D returns to the starting view; the close-up buttons jump to the display, dial, jacks and probe tips.</li>
<li><b>Meter:</b> click a dial label (or drag the knob) to turn the selector. Click RANGE and HOLD. Click any part to learn what it is.</li>
<li><b>Leads:</b> click a plug, then a jack \u2014 or drag the plug onto the jack.</li>
<li><b>Probes:</b> drag a probe by its insulated handle onto a test point; it snaps when it is close enough. Or click the handle (it is now \u201Cin hand\u201D), then click the test point. Click the handle again to put the probe down.</li>
<li><b>Test points:</b> with no probe in hand, clicking a test point marks it as one of your two intended points. You must do this before a probe may touch it.</li>
<li><b>No mouse?</b> Every action is also available under \u201CEquipment controls\u201D and on the circuit diagram, with keyboard focus.</li>
<li><b>Lessons:</b> a step completes only when your actual setup is right. \u201CShow me\u201D demonstrates, \u201CLet me try\u201D hands the equipment back, \u201CExplain again\u201D rephrases, \u201CReset\u201D restores the start of the step.</li>
</ul>
<p><b>Known limits:</b> narration uses your browser\u2019s built-in voices and may be missing in some browsers or languages (captions always work). Resistance (\u03A9) and current (A) are identified but deliberately not simulated. The meter is a generic teaching model: real meters have different layouts, ranges and overrange displays \u2014 read your own meter\u2019s manual.</p>`,`<p><b>Aqu\xED todo es simulado.</b> Nada en esta aplicaci\xF3n es una instrucci\xF3n para tomacorrientes, tableros, cableado de red ni equipos industriales, y terminarla no te habilita para trabajar en equipos energizados.</p>
<ul>
<li><b>Mirar:</b> arrastra la mesa para girar, usa la rueda o pellizca para zoom, arrastra con dos dedos (o bot\xF3n derecho) para desplazar. \xABVista frontal\xBB vuelve a la vista inicial; los botones de acercamiento van a la pantalla, el selector, los bornes y las puntas.</li>
<li><b>Medidor:</b> haz clic en una etiqueta del selector (o arrastra la perilla) para girarlo. Haz clic en RANGE y HOLD. Haz clic en cualquier parte para saber qu\xE9 es.</li>
<li><b>Cables:</b> haz clic en una clavija y luego en un borne, o arrastra la clavija al borne.</li>
<li><b>Puntas:</b> arrastra una punta por su mango aislado hasta un punto de prueba; se ajusta al acercarse. O haz clic en el mango (queda \xABen la mano\xBB) y luego en el punto. Haz clic otra vez en el mango para soltarla.</li>
<li><b>Puntos de prueba:</b> sin punta en la mano, hacer clic en un punto lo marca como uno de tus dos puntos previstos. Debes hacerlo antes de que una punta pueda tocarlo.</li>
<li><b>\xBFSin rat\xF3n?</b> Todas las acciones est\xE1n tambi\xE9n en \xABControles del equipo\xBB y en el diagrama, con foco de teclado.</li>
<li><b>Lecciones:</b> un paso se completa solo cuando tu configuraci\xF3n real es correcta. \xABMu\xE9strame\xBB demuestra, \xABD\xE9jame intentar\xBB te devuelve el equipo, \xABExpl\xEDcalo otra vez\xBB lo reformula, \xABReiniciar\xBB restaura el inicio del paso.</li>
</ul>
<p><b>L\xEDmites conocidos:</b> la narraci\xF3n usa las voces del navegador y puede faltar en algunos navegadores o idiomas (los subt\xEDtulos siempre funcionan). Resistencia (\u03A9) y corriente (A) se identifican pero no se simulan, a prop\xF3sito. El medidor es un modelo did\xE1ctico gen\xE9rico: los medidores reales tienen otras disposiciones, rangos e indicaciones de sobrerrango; lee el manual de tu medidor.</p>`),helpStart:o("Start","Empezar"),narrationNA:o("Narration is not available in this browser.","La narraci\xF3n no est\xE1 disponible en este navegador.")},Fa={OFF:o("OFF","OFF"),VDC:o("V\u2393 (DC voltage)","V\u2393 (voltaje CC)"),VAC:o("V~ (AC voltage)","V~ (voltaje CA)"),OHM:o("\u03A9 (resistance)","\u03A9 (resistencia)"),A:o("A (current)","A (corriente)")},Js={OFF:"OFF",VDC:"V\u2393",VAC:"V~",OHM:"\u03A9",A:"A"},Qi={A:"A",mA:"mA",COM:"COM",V:"V/\u03A9"},Yt={meter:{name:o("Multimeter","Mult\xEDmetro"),info:o("A multimeter is one instrument with several measuring functions. In these lessons it works as a voltmeter: it measures voltage. This is a generic teaching model \u2014 real meters have different layouts, so always read your own meter\u2019s manual.","Un mult\xEDmetro es un instrumento con varias funciones de medici\xF3n. En estas lecciones funciona como volt\xEDmetro: mide voltaje. Es un modelo did\xE1ctico gen\xE9rico; los medidores reales tienen otras disposiciones, as\xED que lee siempre el manual del tuyo.")},display:{name:o("Display","Pantalla"),info:o("Shows the number, a minus sign for negative polarity, the unit (V), the mode (DC or AC), the range (AUTO or the manual range) and a HOLD flag when the reading is frozen.","Muestra el n\xFAmero, un signo menos para polaridad negativa, la unidad (V), el modo (DC o AC), el rango (AUTO o el rango manual) y el aviso HOLD cuando la lectura est\xE1 congelada.")},dial:{name:o("Rotary selector","Selector giratorio"),info:o("Chooses the function: OFF, V\u2393 (DC voltage), V~ (AC voltage), \u03A9 (resistance) and A (current). These lessons use only V\u2393 and V~. Remove the probes from the circuit before turning it.","Elige la funci\xF3n: OFF, V\u2393 (voltaje CC), V~ (voltaje CA), \u03A9 (resistencia) y A (corriente). Estas lecciones usan solo V\u2393 y V~. Retira las puntas del circuito antes de girarlo.")},"jack:COM":{name:o("COM jack","Borne COM"),info:o("COM means \u201Ccommon\u201D: the meter\u2019s reference connection. The black lead goes here for every measurement. COM does not automatically mean earth ground \u2014 it is simply the point the meter compares against.","COM significa \xABcom\xFAn\xBB: la conexi\xF3n de referencia del medidor. El cable negro va aqu\xED en todas las mediciones. COM no significa autom\xE1ticamente tierra f\xEDsica; es solo el punto con el que el medidor compara.")},"jack:V":{name:o("V/\u03A9 jack","Borne V/\u03A9"),info:o("The red lead goes here to measure voltage (V) and, on real meters, resistance (\u03A9). This is the only correct red-lead jack for the lessons in this app.","El cable rojo va aqu\xED para medir voltaje (V) y, en medidores reales, resistencia (\u03A9). Es el \xFAnico borne correcto del cable rojo para las lecciones de esta aplicaci\xF3n.")},"jack:A":{name:o("A jack (current)","Borne A (corriente)"),info:o("For measuring larger currents in amperes. Inside, this jack is almost a direct wire to COM. If the red lead is here while you touch a voltage source, you short the source. Blocked in these voltage lessons.","Para medir corrientes grandes en amperios. Por dentro, este borne es casi un cable directo a COM. Si el cable rojo est\xE1 aqu\xED cuando tocas una fuente de voltaje, la pones en cortocircuito. Bloqueado en estas lecciones de voltaje.")},"jack:mA":{name:o("mA jack (small current)","Borne mA (corriente peque\xF1a)"),info:o("For measuring small currents in milliamperes. Like the A jack, it is a low-resistance path and must never be used for a voltage measurement. Blocked in these lessons.","Para medir corrientes peque\xF1as en miliamperios. Igual que el borne A, es un camino de baja resistencia y nunca debe usarse para medir voltaje. Bloqueado en estas lecciones.")},"btn:range":{name:o("RANGE button","Bot\xF3n RANGE"),info:o("Steps through AUTO \u2192 2 V \u2192 20 V \u2192 200 V on this training meter. AUTO lets the meter pick the range. Changing the range never raises the meter\u2019s permitted input or safety rating.","Recorre AUTO \u2192 2 V \u2192 20 V \u2192 200 V en este medidor de pr\xE1ctica. AUTO deja que el medidor elija el rango. Cambiar de rango nunca aumenta la entrada permitida ni la categor\xEDa de seguridad del medidor.")},"btn:hold":{name:o("HOLD button","Bot\xF3n HOLD"),info:o("Freezes the number on the display. While HOLD is shown, the display is an old value and does not follow the circuit. Press again to return to live readings.","Congela el n\xFAmero en la pantalla. Mientras se muestra HOLD, la pantalla es un valor antiguo y no sigue al circuito. Pulsa otra vez para volver a lecturas en vivo.")},"probe:handle":{name:o("Insulated probe handle","Mango aislado de la punta"),info:o("The only part you hold. It is covered in insulation, a material that does not carry electricity.","La \xFAnica parte que sujetas. Est\xE1 cubierta de aislamiento, un material que no conduce electricidad.")},"probe:guard":{name:o("Finger guard","Guarda para los dedos"),info:o("The raised ring that marks where your fingers must stop. Fingers stay behind it, on the handle side, so they cannot slide onto the metal tip.","El anillo elevado que marca hasta d\xF3nde llegan tus dedos. Los dedos quedan detr\xE1s, del lado del mango, para que no resbalen hacia la punta met\xE1lica.")},"probe:tip":{name:o("Exposed metal tip","Punta met\xE1lica expuesta"),info:o("The bare metal that makes electrical contact with one test point. Never touch it during a measurement, and never let it touch two terminals at once.","El metal desnudo que hace contacto el\xE9ctrico con un punto de prueba. Nunca lo toques durante una medici\xF3n ni dejes que toque dos terminales a la vez.")},plug:{name:o("Lead plug","Clavija del cable"),info:o("The end of the test lead that goes into a meter jack. Black goes to COM, red goes to V/\u03A9.","El extremo del cable de prueba que entra en un borne del medidor. El negro va a COM y el rojo a V/\u03A9.")}},Kc=[[o("Voltage (V)","Voltaje o tensi\xF3n (V)"),o("Electrical potential difference between two points. Always measured between two points.","Diferencia de potencial el\xE9ctrico entre dos puntos. Siempre se mide entre dos puntos.")],[o("Current (A)","Corriente (A)"),o("Flow of electric charge through a path, in amperes.","Flujo de carga el\xE9ctrica por un camino, en amperios.")],[o("Resistance (\u03A9)","Resistencia (\u03A9)"),o("Opposition to current, in ohms.","Oposici\xF3n a la corriente, en ohmios.")],[o("V","V"),o("Volts, the unit of voltage.","Voltios, la unidad de voltaje.")],[o("mV","mV"),o("Millivolts. 1,000 mV = 1 V.","Milivoltios. 1000 mV = 1 V.")],[o("V\u2393","V\u2393"),o("DC voltage: polarity stays the same (batteries).","Voltaje CC (corriente continua): la polaridad se mantiene (pilas).")],[o("V~","V~"),o("AC voltage: polarity reverses periodically.","Voltaje CA (corriente alterna): la polaridad se invierte peri\xF3dicamente.")],[o("COM","COM"),o("The meter\u2019s common reference connection. It does not automatically mean earth ground.","La conexi\xF3n de referencia com\xFAn del medidor. No significa autom\xE1ticamente tierra f\xEDsica.")],[o("A","A"),o("Current in amperes \u2014 also the name of the current input jack.","Corriente en amperios; tambi\xE9n el nombre del borne de corriente.")],[o("\u03A9","\u03A9"),o("Resistance in ohms.","Resistencia en ohmios.")],[o("Node","Nodo"),o("All the metal joined together with nothing in between. Every spot on one node is at the same potential.","Todo el metal unido entre s\xED sin nada en medio. Todos los puntos de un nodo est\xE1n al mismo potencial.")],[o("In parallel","En paralelo"),o("Connected across a component, side by side with it, without opening the circuit. Voltmeters connect in parallel.","Conectado entre los extremos de un componente, junto a \xE9l, sin abrir el circuito. Los volt\xEDmetros se conectan en paralelo.")],[o("Range","Rango"),o("The largest value the meter can show at its present setting.","El valor m\xE1ximo que el medidor puede mostrar con su ajuste actual.")],[o("Overrange (OL)","Sobrerrango (OL)"),o("The value is larger than the selected range. It does not mean \u201Cno voltage\u201D. This meter shows OL; real meters vary.","El valor supera el rango elegido. No significa \xABsin voltaje\xBB. Este medidor muestra OL; los reales var\xEDan.")],[o("RMS","RMS (valor eficaz)"),o("The effective value of an AC voltage. It is smaller than the peak.","El valor eficaz de un voltaje de CA. Es menor que el pico.")],[o("HOLD","HOLD"),o("Freezes the display. A held number is not a live reading.","Congela la pantalla. Un n\xFAmero retenido no es una lectura en vivo.")],[o("Nominal","Nominal"),o("The name-plate value, such as \u201C1.5 V\u201D. A measured value can differ.","El valor de etiqueta, como \xAB1,5 V\xBB. El valor medido puede ser distinto.")]],nn={unsafe_jack:{level:"block",critical:!0,title:o("Blocked: a lead is in a current jack","Bloqueado: un cable est\xE1 en un borne de corriente"),what:o("A lead is plugged into the A or mA jack, and you tried to go ahead with a voltage measurement. The simulator stopped the probe before it touched.","Un cable est\xE1 en el borne A o mA y quisiste seguir con una medici\xF3n de voltaje. El simulador detuvo la punta antes de que tocara."),why:o("The current jacks are a very low-resistance path through the meter. Across a voltage source that is a short circuit: it can damage the meter and the source and can injure you. The meter\u2019s fuse is a last-resort protection, not permission to make this connection.","Los bornes de corriente son un camino de muy baja resistencia a trav\xE9s del medidor. Entre los polos de una fuente de voltaje eso es un cortocircuito: puede da\xF1ar el medidor y la fuente, y puede lesionarte. El fusible del medidor es una protecci\xF3n de \xFAltimo recurso, no un permiso para hacer esta conexi\xF3n."),fix:o("With both probes away from the circuit, move the red lead to V/\u03A9 and keep black in COM. Then confirm the jacks again.","Con ambas puntas lejos del circuito, pasa el cable rojo a V/\u03A9 y deja el negro en COM. Luego confirma los bornes otra vez.")},wrong_jack:{level:"error",critical:!0,title:o("Wrong input jack","Borne de entrada equivocado"),what:o("You plugged a lead into a current jack (A or mA).","Conectaste un cable en un borne de corriente (A o mA)."),why:o("Those jacks are for measuring current. With a lead there, touching a voltage source would short it. Voltage measurements are blocked while this lasts.","Esos bornes son para medir corriente. Con un cable ah\xED, tocar una fuente de voltaje la pondr\xEDa en cortocircuito. Las mediciones de voltaje quedan bloqueadas mientras siga as\xED."),fix:o("Move the lead: black belongs in COM, red belongs in V/\u03A9.","Mueve el cable: el negro va en COM y el rojo en V/\u03A9.")},swapped_jacks:{level:"error",title:o("Leads are swapped at the meter","Los cables est\xE1n cruzados en el medidor"),what:o("Red is in COM and black is in V/\u03A9.","El rojo est\xE1 en COM y el negro en V/\u03A9."),why:o("The meter still works, but every sign is reversed compared with the lead colors, which makes readings easy to misread.","El medidor sigue funcionando, pero todos los signos quedan invertidos respecto a los colores de los cables, lo que hace f\xE1cil leer mal."),fix:o("Remove the probes from the circuit, then put black in COM and red in V/\u03A9.","Retira las puntas del circuito y pon el negro en COM y el rojo en V/\u03A9.")},change_connected:{level:"block",critical:!0,title:o("Blocked: probes are still on the circuit","Bloqueado: las puntas siguen en el circuito"),what:o("You tried to change the function, a jack or a lead while a probe was touching a test point.","Quisiste cambiar la funci\xF3n, un borne o un cable mientras una punta tocaba un punto de prueba."),why:o("Turning the selector or moving a plug while connected can pass through a setting that is wrong for the circuit, such as a current function, with the probes live.","Girar el selector o mover una clavija estando conectado puede pasar por un ajuste incorrecto para el circuito, como una funci\xF3n de corriente, con las puntas energizadas."),fix:o("Remove the red probe, then the black probe. Make the change. Then reconnect.","Retira la punta roja y luego la negra. Haz el cambio. Despu\xE9s vuelve a conectar.")},bridge:{level:"block",critical:!0,title:o("Blocked: the tip would bridge two terminals","Bloqueado: la punta puentear\xEDa dos terminales"),what:o("You aimed the probe at the gap between two neighbouring terminals, where the metal tip would touch both.","Apuntaste la punta al espacio entre dos terminales vecinos, donde el metal tocar\xEDa ambos."),why:o("A tip touching two terminals joins them with metal: a short circuit made by your probe.","Una punta que toca dos terminales los une con metal: un cortocircuito hecho por tu punta."),fix:o("Place the tip squarely on one labeled terminal only.","Coloca la punta de lleno sobre un solo terminal rotulado.")},tip_grip:{level:"block",critical:!0,title:o("Not there: that is the bare metal tip","Ah\xED no: esa es la punta met\xE1lica desnuda"),what:o("You reached for the exposed metal tip of the probe.","Fuiste a tomar la punta met\xE1lica expuesta."),why:o("The tip is the part that becomes electrically connected to the circuit. Fingers belong on the insulated handle, behind the finger guard.","La punta es la parte que queda conectada el\xE9ctricamente al circuito. Los dedos van en el mango aislado, detr\xE1s de la guarda."),fix:o("Click or drag the insulated handle, behind the guard.","Haz clic o arrastra el mango aislado, detr\xE1s de la guarda.")},func_block:{level:"block",critical:!0,title:o("Blocked: not a voltage function","Bloqueado: no es una funci\xF3n de voltaje"),what:o("The selector is on \u03A9 or A and you tried to touch a powered circuit.","El selector est\xE1 en \u03A9 o A y quisiste tocar un circuito energizado."),why:o("Resistance is never measured on an energized circuit, and current measurement needs a different connection. Either can damage the meter or the circuit.","La resistencia nunca se mide en un circuito energizado, y medir corriente requiere otra conexi\xF3n. Cualquiera de las dos puede da\xF1ar el medidor o el circuito."),fix:o("Select V\u2393 for DC or V~ for AC, confirm the function, then measure.","Selecciona V\u2393 para CC o V~ para CA, confirma la funci\xF3n y luego mide.")},func_not_voltage:{level:"block",title:o("Select a voltage function first","Primero selecciona una funci\xF3n de voltaje"),what:o("The selector is not on V\u2393 or V~, so there is nothing to confirm yet.","El selector no est\xE1 en V\u2393 ni en V~, as\xED que a\xFAn no hay nada que confirmar."),why:o("The check is about making sure the meter is set to measure voltage before any probe touches the circuit.","La comprobaci\xF3n consiste en asegurar que el medidor est\xE9 listo para medir voltaje antes de que una punta toque el circuito."),fix:o("Turn the selector to V\u2393 (batteries, DC circuits) or V~ (the AC training source).","Gira el selector a V\u2393 (pilas, circuitos de CC) o V~ (la fuente de pr\xE1ctica de CA).")},meter_off:{level:"block",title:o("The meter is off","El medidor est\xE1 apagado"),what:o("You tried to touch a test point with the selector on OFF.","Quisiste tocar un punto de prueba con el selector en OFF."),why:o("Set up the meter completely before the probes touch anything, because the selector must not be turned while connected.","Prepara el medidor por completo antes de que las puntas toquen algo, porque el selector no debe girarse estando conectado."),fix:o("Turn the selector to V\u2393 or V~ first.","Gira primero el selector a V\u2393 o V~.")},lead_unplugged:{level:"block",title:o("Connect the leads to the meter first","Primero conecta los cables al medidor"),what:o("The leads are not both plugged in: black in COM and red in V/\u03A9.","Los cables no est\xE1n ambos conectados: negro en COM y rojo en V/\u03A9."),why:o("Leads are connected to the meter before the probes go near a circuit, never the other way round.","Los cables se conectan al medidor antes de acercar las puntas a un circuito, nunca al rev\xE9s."),fix:o("Plug black into COM and red into V/\u03A9.","Conecta el negro en COM y el rojo en V/\u03A9.")},precheck:{level:"block",title:o("Finish the pre-measurement check first","Termina primero la comprobaci\xF3n previa"),what:o("A probe was about to touch the circuit before the check was complete. Still missing: {missing}.","Una punta iba a tocar el circuito antes de completar la comprobaci\xF3n. Falta: {missing}."),why:o("The check catches the common mistakes \u2014 damaged leads, wrong jack, wrong function \u2014 while they are still harmless.","La comprobaci\xF3n detecta los errores habituales (cables da\xF1ados, borne o funci\xF3n equivocados) cuando todav\xEDa son inofensivos."),fix:o("Complete the missing items in the \u201CPre-measurement check\u201D list, then touch the test point again.","Completa los puntos que faltan en la lista \xABComprobaci\xF3n previa a la medici\xF3n\xBB y vuelve a tocar el punto de prueba.")},unplanned_point:{level:"block",title:o("That is not one of your identified points","Ese no es uno de tus puntos identificados"),what:o("You moved a probe to {term}, but your identified test points are: {intended}.","Llevaste una punta a {term}, pero tus puntos identificados son: {intended}."),why:o("Deciding the two points before you measure is what prevents probing the wrong place by accident.","Decidir los dos puntos antes de medir es lo que evita tocar por accidente el lugar equivocado."),fix:o("Put the probe down (click its handle), click the test points you really intend to measure, then pick the probe up again.","Suelta la punta (clic en su mango), haz clic en los puntos que de verdad quieres medir y vuelve a tomar la punta.")},predict_first:{level:"block",title:o("Predict before you touch","Predice antes de tocar"),what:o("This step asks for your prediction before the probes make contact.","Este paso pide tu predicci\xF3n antes de que las puntas hagan contacto."),why:o("Predicting first is how you notice when a reading is surprising \u2014 the heart of troubleshooting.","Predecir primero es la forma de notar cu\xE1ndo una lectura sorprende: la base del diagn\xF3stico."),fix:o("Choose an answer under \u201CPredict first\u201D in the lesson panel.","Elige una respuesta en \xABPrimero predice\xBB en el panel de la lecci\xF3n.")},jack_taken:{level:"block",title:o("That jack is already in use","Ese borne ya est\xE1 ocupado"),what:o("The other lead is already plugged into that jack.","El otro cable ya est\xE1 conectado en ese borne."),why:o("Each jack takes one plug.","Cada borne admite una clavija."),fix:o("Unplug the other lead first, or choose the correct free jack.","Desconecta primero el otro cable o elige el borne libre correcto.")},range_na:{level:"note",title:o("RANGE works in a voltage function","RANGE funciona en una funci\xF3n de voltaje"),what:o("The RANGE button did nothing because the selector is not on V\u2393 or V~.","El bot\xF3n RANGE no hizo nada porque el selector no est\xE1 en V\u2393 ni V~."),why:o("Ranges in this simulator belong to the voltage functions.","En este simulador los rangos pertenecen a las funciones de voltaje."),fix:o("Turn the selector to V\u2393 or V~, then press RANGE.","Gira el selector a V\u2393 o V~ y luego pulsa RANGE.")},meter_off_btn:{level:"note",title:o("The meter is off","El medidor est\xE1 apagado"),what:o("The button did nothing because the selector is on OFF.","El bot\xF3n no hizo nada porque el selector est\xE1 en OFF."),why:o("Buttons work only when the meter is on.","Los botones funcionan solo con el medidor encendido."),fix:o("Turn the selector to a function first.","Gira primero el selector a una funci\xF3n.")},damaged_lead:{level:"error",title:o("Damaged lead found","Cable da\xF1ado encontrado"),what:o("Your inspection found a nick in the insulation with metal showing.","Tu inspecci\xF3n encontr\xF3 un corte en el aislamiento con el metal a la vista."),why:o("Damaged insulation can put your hand in contact with the circuit. Finding it now is exactly what inspection is for.","Un aislamiento da\xF1ado puede poner tu mano en contacto con el circuito. Encontrarlo ahora es justo para lo que sirve la inspecci\xF3n."),fix:o("Press \u201CReplace damaged lead\u201D in the check list. Never tape over or \u201Cjust use\u201D a damaged lead.","Pulsa \xABReemplazar cable da\xF1ado\xBB en la lista. Nunca lo cubras con cinta ni lo uses \xABpor esta vez\xBB.")},mode_mismatch:{level:"error",title:o("AC/DC setting does not match the source","El ajuste CA/CC no corresponde a la fuente"),what:o("The meter is on {have} but this source is {kind}. This simulated meter shows about zero.","El medidor est\xE1 en {have} pero esta fuente es de {kind}. Este medidor simulado muestra casi cero."),why:o("The number is misleading: voltage is present although the display is near zero. Real meters do not all behave the same in the wrong mode \u2014 some show zero, some a partial or unstable value.","El n\xFAmero es enga\xF1oso: hay voltaje aunque la pantalla marque casi cero. No todos los medidores reales se comportan igual en el modo equivocado: unos marcan cero y otros un valor parcial o inestable."),fix:o("Remove both probes, select {want}, confirm the function, then measure again.","Retira ambas puntas, selecciona {want}, confirma la funci\xF3n y vuelve a medir.")},range_low:{level:"error",title:o("Range too low (overrange)","Rango demasiado bajo (sobrerrango)"),what:o("The display shows OL: the voltage is larger than the selected {range} V range can show.","La pantalla muestra OL: el voltaje supera lo que puede mostrar el rango de {range} V elegido."),why:o("OL means \u201Ctoo big for this range\u201D, not \u201Cno voltage\u201D. Reading it as zero would be a serious mistake. OL is how this simulated meter shows overrange; real displays vary.","OL significa \xABdemasiado grande para este rango\xBB, no \xABsin voltaje\xBB. Leerlo como cero ser\xEDa un error grave. OL es como este medidor simulado indica sobrerrango; las pantallas reales var\xEDan."),fix:o("Press RANGE to choose a higher range (or AUTO). You may change range while connected \u2014 it is not a function change.","Pulsa RANGE para elegir un rango mayor (o AUTO). Puedes cambiar de rango estando conectado; no es un cambio de funci\xF3n.")},no_contact:{level:"error",title:o("Probe is not making contact","La punta no hace contacto"),what:o("The {lead} probe was left beside the terminal, not on it.","La punta {lead} qued\xF3 al lado del terminal, no sobre \xE9l."),why:o("Without metal-to-metal contact at both points there is no two-point measurement. The display may show small wandering numbers that mean nothing.","Sin contacto metal con metal en ambos puntos no hay medici\xF3n entre dos puntos. La pantalla puede mostrar n\xFAmeros peque\xF1os y cambiantes que no significan nada."),fix:o("Bring the tip onto the labeled terminal until it snaps into place.","Lleva la punta sobre el terminal rotulado hasta que encaje.")},floating:{level:"note",title:o("Only one probe is touching","Solo una punta est\xE1 tocando"),what:o("One probe is on a test point and the other is not touching anything.","Una punta est\xE1 en un punto de prueba y la otra no toca nada."),why:o("Voltage needs two points. With one input open (\u201Cfloating\u201D), a real meter can show unstable or misleading numbers \u2014 not a reliable zero.","El voltaje necesita dos puntos. Con una entrada abierta (\xABflotante\xBB), un medidor real puede mostrar n\xFAmeros inestables o enga\xF1osos, no un cero fiable."),fix:o("Place the other probe on its test point to complete the measurement.","Coloca la otra punta en su punto de prueba para completar la medici\xF3n.")},reversed:{level:"note",title:o("Negative reading: probes are reversed","Lectura negativa: puntas invertidas"),what:o("The display shows a minus sign.","La pantalla muestra un signo menos."),why:o("This is a valid reading, not an unsafe connection. The minus sign says the red probe is on the lower-potential point and the black probe on the higher one.","Es una lectura v\xE1lida, no una conexi\xF3n insegura. El signo menos indica que la punta roja est\xE1 en el punto de menor potencial y la negra en el de mayor."),fix:o("If you want a positive number, swap the two probe positions. Nothing is damaged either way.","Si quieres un n\xFAmero positivo, intercambia las posiciones de las puntas. Nada se da\xF1a en ning\xFAn caso.")},same_node:{level:"note",title:o("Both probes are on the same node","Ambas puntas est\xE1n en el mismo nodo"),what:o("Both probes touch metal that is joined together, so the meter shows about 0 V.","Ambas puntas tocan metal unido entre s\xED, as\xED que el medidor muestra unos 0 V."),why:o("There is no difference between a point and itself. This zero says nothing about whether the circuit is powered.","No hay diferencia entre un punto y \xE9l mismo. Este cero no dice nada sobre si el circuito est\xE1 energizado."),fix:o("To measure across a component, put one probe on each side of it.","Para medir entre los extremos de un componente, pon una punta a cada lado.")},hold_stale:{level:"error",title:o("HOLD is showing an old value","HOLD muestra un valor antiguo"),what:o("HOLD is on, and the connection has changed since the number was frozen.","HOLD est\xE1 activo y la conexi\xF3n cambi\xF3 desde que se congel\xF3 el n\xFAmero."),why:o("The display no longer follows the circuit. Trusting a held number as a live reading can lead to a wrong \u2014 and possibly unsafe \u2014 conclusion.","La pantalla ya no sigue al circuito. Confiar en un n\xFAmero retenido como si fuera en vivo puede llevar a una conclusi\xF3n equivocada y quiz\xE1 insegura."),fix:o("Press HOLD again so the HOLD flag disappears, then read the live value.","Pulsa HOLD otra vez para que desaparezca el aviso HOLD y lee el valor en vivo.")},remove_order:{level:"error",title:o("Remove red first, then black","Retira primero la roja y luego la negra"),what:o("The black probe came off while the red probe was still on the circuit.","La punta negra se retir\xF3 mientras la roja segu\xEDa en el circuito."),why:o("The habit taught here is: reference (black) goes on first and comes off last, so the red lead is never left connected on its own.","El h\xE1bito que se ense\xF1a aqu\xED es: la referencia (negra) se conecta primero y se retira al final, para que el cable rojo nunca quede conectado solo."),fix:o("Press Retry to put the probes back, then lift red first and black second.","Pulsa Reintentar para volver a colocar las puntas y retira primero la roja y despu\xE9s la negra.")}},Xv=Object.keys(nn).filter(n=>nn[n].critical);var Ke=n=>n.state,fn=(n,e,t)=>Ke(n).probes.red===e&&Ke(n).probes.black===t,ts=(n,e,t)=>fn(n,e,t)||fn(n,t,e),Ks=n=>!Ke(n).probes.red&&!Ke(n).probes.black,an=n=>n.reading().valid&&n.settled&&!Ke(n).hold,bd=(n,e)=>n.length===e.length&&n.every(t=>e.includes(t)),Qs=(n,e)=>bd(Ke(n).intended,e),kn=(n,...e)=>e.every(t=>n.clicked.has(t)),yn=(n,e,t=()=>!0)=>n.events.some(i=>i.type===e&&t(i)),eh={plugs:{red:"V",black:"COM"},inspected:{meter:!0,red:!0,black:!0},checklist:{jacks:!0,func:!0,range:!0,guards:!0,bridge:!0}},On={basics:o("A voltmeter always compares two points: red minus black.","Un volt\xEDmetro siempre compara dos puntos: roja menos negra."),manual:o("Real meters differ from this training meter \u2014 read your own meter\u2019s manual.","Los medidores reales difieren de este medidor de pr\xE1ctica: lee el manual del tuyo."),qualify:o("Finishing a simulation does not qualify anyone to work on energized equipment.","Terminar una simulaci\xF3n no habilita a nadie para trabajar en equipos energizados."),zero:o("A zero reading alone never proves that something is safe to touch.","Una lectura de cero por s\xED sola nunca demuestra que algo sea seguro de tocar.")},si=(n,e)=>({id:n,kind:"summary",focus:"front",title:o("Remember the sequence","Recuerda la secuencia"),points:e,setup:t=>t.setup({probes:{red:null,black:null},near:{red:null,black:null}})});function ea(n,e){let t=e.dial==="VAC"?"V~":"V\u2393",i=e.dial==="VAC"?"an AC":"a DC",s=e.dial==="VAC"?"CA":"CC",a=e.ranges||["AUTO"],r=a.map(c=>c==="AUTO"?"AUTO":`${c} V`).join(" / "),l=e.points.map(c=>e.labels[c]).join(" + ");return{id:n,kind:"do",focus:"meter",diagram:e.diagram,title:o("Set up and complete the pre-measurement check","Preparar y completar la comprobaci\xF3n previa"),goal:o(`Get the meter ready for ${i} voltage measurement and complete the pre-measurement check.`,`Dejar el medidor listo para medir voltaje de ${s} y completar la comprobaci\xF3n previa.`),why:o("Most measuring mistakes happen before a probe touches anything. The simulator will not let a probe touch a circuit until every item is done.","La mayor\xEDa de los errores de medici\xF3n ocurren antes de que una punta toque algo. El simulador no deja que una punta toque un circuito hasta completar cada punto."),action:o(`Work down the \u201CPre-measurement check\u201D list: inspect the meter and both leads (replace a damaged lead if you find one); plug black into COM and red into V/\u03A9 and confirm; turn the selector to ${t} and confirm; set RANGE to ${r} and confirm; click test points ${l} to identify them; confirm the two handling rules.`,`Recorre la lista \xABComprobaci\xF3n previa a la medici\xF3n\xBB: inspecciona el medidor y ambos cables (reemplaza un cable da\xF1ado si lo encuentras); conecta el negro en COM y el rojo en V/\u03A9 y confirma; gira el selector a ${t} y confirma; pon RANGE en ${r} y confirma; haz clic en los puntos ${l} para identificarlos; confirma las dos reglas de manejo.`),observe:o("Each list item changes to \u201CDone\u201D. The display switches on and shows the mode and range.","Cada punto de la lista cambia a \xABHecho\xBB. La pantalla se enciende y muestra el modo y el rango."),meaning:o("The meter is correctly prepared and you have decided where the probes will go \u2014 before anything is touched.","El medidor est\xE1 bien preparado y ya decidiste d\xF3nde ir\xE1n las puntas, antes de tocar nada."),hi:c=>{let h=Ke(c);return c.checkItem("inspect")?h.plugs.black!=="COM"?["plug:black","jack:COM"]:h.plugs.red!=="V"?["plug:red","jack:V"]:h.dial!==e.dial?[`dialpos:${e.dial}`]:a.includes(h.range)?Qs(c,e.points)?[]:e.points.map(u=>`term:${u}`):["btn:range"]:["meter","lead:red","lead:black"]},setup:e.setup,subs:[{label:o("Meter and both leads inspected, no damage","Medidor y ambos cables inspeccionados, sin da\xF1os"),ok:c=>c.checkItem("inspect")},{label:o("Black in COM, red in V/\u03A9 \u2014 confirmed","Negro en COM, rojo en V/\u03A9: confirmado"),ok:c=>c.jacksOK()&&Ke(c).checklist.jacks},{label:o(`Selector on ${t} \u2014 confirmed`,`Selector en ${t}: confirmado`),ok:c=>Ke(c).dial===e.dial&&Ke(c).checklist.func},{label:o(`Range ${r} \u2014 confirmed`,`Rango ${r}: confirmado`),ok:c=>a.includes(Ke(c).range)&&Ke(c).checklist.range},{label:o(`Test points identified: ${l}`,`Puntos identificados: ${l}`),ok:c=>Qs(c,e.points)},{label:o("Handling rules confirmed (guards, no bridging)","Reglas de manejo confirmadas (guardas, sin puentear)"),ok:c=>Ke(c).checklist.guards&&Ke(c).checklist.bridge}],demo:[["inspect","meter"],["inspect","red"],["replace","red"],["inspect","black"],["plug","black","COM"],["plug","red","V"],["confirm","jacks"],["dial",e.dial],["confirm","func"],["range",a[0]],["confirm","range"],["identify",e.points],["confirm","guards"],["confirm","bridge"]]}}function ns(n,e){return{id:n,kind:"do",focus:e,title:o("Remove red, then black","Retirar la roja y luego la negra"),goal:o("Disconnect the probes from the circuit in the right order.","Desconectar las puntas del circuito en el orden correcto."),why:o("The reference (black) probe goes on first and comes off last, so the red lead is never left connected on its own.","La punta de referencia (negra) se conecta primero y se retira al final, para que el cable rojo nunca quede conectado solo."),action:o("Click the red probe\u2019s handle to lift it and click it again to put it down. Then do the same with the black probe. (Or drag each probe away.)","Haz clic en el mango de la punta roja para levantarla y otra vez para dejarla. Luego haz lo mismo con la negra. (O arrastra cada punta fuera.)"),observe:o("Both probes rest on the bench. The display no longer shows a steady measurement.","Ambas puntas descansan en la mesa. La pantalla ya no muestra una medici\xF3n estable."),meaning:o("The meter is disconnected from the circuit. Only now may the selector or jacks be changed.","El medidor est\xE1 desconectado del circuito. Solo ahora se pueden cambiar el selector o los bornes."),hi:["probe:red","probe:black"],check:(t,i)=>Ks(t)&&!i.badOrder,onEvent:(t,i,s)=>t.type==="lift"&&t.lead==="black"&&Ke(s).probes.red?(i.badOrder=!0,"remove_order"):null,demo:[["lift","red"],["lift","black"]]}}function is(n){return{id:n,kind:"do",focus:"dial",title:o("Turn the meter off","Apagar el medidor"),goal:o("Leave the meter switched off.","Dejar el medidor apagado."),why:o("It saves the battery and means the next person starts from a known state.","Ahorra bater\xEDa y hace que la siguiente persona empiece desde un estado conocido."),action:o("Turn the rotary selector to OFF.","Gira el selector giratorio a OFF."),observe:o("The display goes blank.","La pantalla queda en blanco."),meaning:o("The measurement is finished and the equipment is left safe and tidy.","La medici\xF3n termin\xF3 y el equipo queda seguro y ordenado."),hi:["dialpos:OFF"],check:e=>Ke(e).dial==="OFF"&&Ks(e),demo:[["dial","OFF"]]}}function sn(n,e){let[t,i]=e.pair,s=e.labels[t],a=e.labels[i];return{id:n,kind:"do",focus:e.focus,pair:e.pair,record:e.record,title:e.title,goal:e.goal,why:e.why,action:o(`${e.pre?e.pre.en+" ":""}Answer the prediction. With no probe in hand, click ${s} and ${a} to identify them. Then touch black to ${a} and red to ${s}.`,`${e.pre?e.pre.es+" ":""}Responde la predicci\xF3n. Sin punta en la mano, haz clic en ${s} y ${a} para identificarlos. Luego toca con la negra ${a} y con la roja ${s}.`),observe:o(`About ${e.expect} once the reading settles. (A minus sign would only mean your probes are the other way round.)`,`Aproximadamente ${e.expect} cuando la lectura se estabilice. (Un signo menos solo indicar\xEDa que tus puntas est\xE1n al rev\xE9s.)`),meaning:e.meaning,hi:[`term:${t}`,`term:${i}`],predict:e.predict,expect:["reversed","same_node"],setup:e.setup,check:r=>ts(r,t,i)&&an(r)&&(!e.cond||e.cond(r)),wantText:o(`${s} and ${a}`,`${s} y ${a}`),demo:[...e.demoPre||[],["predict"],["identify",[t,i]],["touch","black",i],["touch","red",t],["wait",1700]]}}var pn=(n,e)=>({q:o("What will the display show?","\xBFQu\xE9 mostrar\xE1 la pantalla?"),opts:e,correct:n}),es=[o("About 9 V","Unos 9 V"),o("About 0 V","Unos 0 V"),o("About 4.5 V","Unos 4,5 V")],wi=[o("About 24 V","Unos 24 V"),o("About 0 V","Unos 0 V"),o("About 12 V","Unos 12 V")],Md={id:"l0",minutes:10,diagram:"none",title:o("Meet the meter","Conoce el medidor"),blurb:o("Names of every part, the symbols, and the safety boundaries.","Nombres de cada parte, los s\xEDmbolos y los l\xEDmites de seguridad."),init:n=>n.reset(),steps:[{id:"welcome",kind:"ack",focus:"front",title:o("Welcome and safety boundaries","Bienvenida y l\xEDmites de seguridad"),goal:o("Know what this lab is \u2014 and what it is not.","Saber qu\xE9 es este laboratorio y qu\xE9 no es."),why:o("You are starting from zero, so every new word is explained before it is used. Everything on this bench is simulated: batteries and isolated, low-energy training circuits only.","Empiezas desde cero, as\xED que cada palabra nueva se explica antes de usarla. Todo en esta mesa es simulado: solo pilas y circuitos de pr\xE1ctica aislados y de baja energ\xEDa."),action:o("Read this, then press Continue.","Lee esto y pulsa Continuar."),observe:o("A workbench with a multimeter, two test leads, two batteries and three training circuits.","Una mesa con un mult\xEDmetro, dos cables de prueba, dos pilas y tres circuitos de pr\xE1ctica."),meaning:o("Nothing here teaches probing wall outlets, breaker panels, mains wiring or industrial equipment, and completing the simulation does not qualify you to work on energized electrical equipment.","Nada aqu\xED ense\xF1a a medir en tomacorrientes, tableros, cableado de red ni equipos industriales, y completar la simulaci\xF3n no te habilita para trabajar en equipos el\xE9ctricos energizados.")},{id:"what",kind:"do",focus:"meter",hi:["meter"],title:o("The multimeter","El mult\xEDmetro"),goal:o("Find the instrument you will use.","Encontrar el instrumento que vas a usar."),why:o("A multimeter is one instrument with several measuring functions. A voltmeter is a meter that measures voltage \u2014 and that is the only function these lessons use.","Un mult\xEDmetro es un instrumento con varias funciones de medici\xF3n. Un volt\xEDmetro es un medidor que mide voltaje, y esa es la \xFAnica funci\xF3n que usan estas lecciones."),action:o("Click the body of the multimeter (the large yellow instrument on the left).","Haz clic en el cuerpo del mult\xEDmetro (el instrumento amarillo grande a la izquierda)."),observe:o("An information card describes it.","Una tarjeta de informaci\xF3n lo describe."),meaning:o("This is a generic teaching meter. Real meters have different layouts, so you must consult your own meter\u2019s manual.","Es un medidor did\xE1ctico gen\xE9rico. Los medidores reales tienen otras disposiciones, as\xED que debes consultar el manual del tuyo."),check:(n,e)=>kn(e,"meter"),demo:[["click","meter"]]},{id:"display",kind:"do",focus:"display",hi:["display"],title:o("The display","La pantalla"),goal:o("Learn what the display can tell you.","Saber qu\xE9 te puede decir la pantalla."),why:o("A reading is more than a number: it also has a sign, a unit and a mode. Missing one of them is a classic beginner mistake.","Una lectura es m\xE1s que un n\xFAmero: tambi\xE9n tiene signo, unidad y modo. Pasar por alto uno de ellos es un error t\xEDpico de principiante."),action:o("Click the display at the top of the meter.","Haz clic en la pantalla, en la parte superior del medidor."),observe:o("The card lists: number, minus sign (polarity), unit, mode (DC or AC), range and the HOLD flag.","La tarjeta enumera: n\xFAmero, signo menos (polaridad), unidad, modo (DC o AC), rango y el aviso HOLD."),meaning:o("You will read all of these every time, not just the big digits.","Leer\xE1s todo esto cada vez, no solo los d\xEDgitos grandes."),check:(n,e)=>kn(e,"display"),demo:[["click","display"]]},{id:"dial",kind:"do",focus:"dial",hi:["dial"],title:o("The rotary selector","El selector giratorio"),goal:o("Find the control that chooses what the meter measures.","Encontrar el control que elige qu\xE9 mide el medidor."),why:o("The same meter measures different things. The rotary selector (the big knob) picks one function at a time.","El mismo medidor mide cosas distintas. El selector giratorio (la perilla grande) elige una funci\xF3n a la vez."),action:o("Click the knob in the middle of the meter.","Haz clic en la perilla en el centro del medidor."),observe:o("The card lists the positions: OFF, V\u2393, V~, \u03A9 and A.","La tarjeta enumera las posiciones: OFF, V\u2393, V~, \u03A9 y A."),meaning:o("V means volts. V\u2393 is DC voltage (steady polarity, like a battery). V~ is AC voltage (polarity keeps reversing). \u03A9 is resistance in ohms. A is current in amperes.","V significa voltios. V\u2393 es voltaje de CC (polaridad fija, como una pila). V~ es voltaje de CA (la polaridad se invierte continuamente). \u03A9 es resistencia en ohmios. A es corriente en amperios."),check:(n,e)=>kn(e,"dial"),demo:[["click","dial"]]},{id:"turn",kind:"do",focus:"dial",hi:["dialpos:VDC","dialpos:VAC","dialpos:OFF"],title:o("Turn the selector","Girar el selector"),goal:o("Practice selecting the two voltage functions.","Practicar la selecci\xF3n de las dos funciones de voltaje."),why:o("Choosing the wrong function is one of the most common mistakes, so the positions should feel familiar.","Elegir la funci\xF3n equivocada es uno de los errores m\xE1s comunes, as\xED que las posiciones deben resultarte familiares."),action:o("Turn the selector to V\u2393, then to V~, then back to OFF. Click a label next to the knob, or drag the knob.","Gira el selector a V\u2393, luego a V~ y de vuelta a OFF. Haz clic en una etiqueta junto a la perilla o arr\xE1strala."),observe:o("The display shows \u201CDC\u201D in V\u2393 and \u201CAC\u201D in V~, and goes blank at OFF.","La pantalla muestra \xABDC\xBB en V\u2393 y \xABAC\xBB en V~, y queda en blanco en OFF."),meaning:o("The display always tells you which mode is active. Check it instead of trusting the knob position alone.","La pantalla siempre te dice qu\xE9 modo est\xE1 activo. Compru\xE9balo en lugar de fiarte solo de la posici\xF3n de la perilla."),subs:[{label:o("Selected V\u2393","Seleccionaste V\u2393"),ok:(n,e)=>yn(e,"dial",t=>t.pos==="VDC")},{label:o("Selected V~","Seleccionaste V~"),ok:(n,e)=>yn(e,"dial",t=>t.pos==="VAC")},{label:o("Back at OFF","De vuelta en OFF"),ok:(n,e)=>Ke(n).dial==="OFF"&&yn(e,"dial",t=>t.pos==="OFF")}],demo:[["dial","VDC"],["dial","VAC"],["dial","OFF"]]},{id:"com",kind:"do",focus:"jacks",hi:["jack:COM"],title:o("The COM jack","El borne COM"),goal:o("Find where the black lead connects.","Encontrar d\xF3nde se conecta el cable negro."),why:o("A jack is a socket on the meter for a test lead. COM is the meter\u2019s common reference connection: the point every reading is compared against.","Un borne es un conector del medidor para un cable de prueba. COM es la conexi\xF3n de referencia com\xFAn del medidor: el punto con el que se compara cada lectura."),action:o("Click the jack labeled COM.","Haz clic en el borne rotulado COM."),observe:o("The card explains COM.","La tarjeta explica COM."),meaning:o("The black lead always goes in COM. COM does not automatically mean earth ground.","El cable negro siempre va en COM. COM no significa autom\xE1ticamente tierra f\xEDsica."),check:(n,e)=>kn(e,"jack:COM"),demo:[["click","jack:COM"]]},{id:"vjack",kind:"do",focus:"jacks",hi:["jack:V"],title:o("The V/\u03A9 jack","El borne V/\u03A9"),goal:o("Find where the red lead connects for voltage.","Encontrar d\xF3nde se conecta el cable rojo para voltaje."),why:o("Only one jack is correct for the red lead when measuring voltage.","Solo un borne es correcto para el cable rojo al medir voltaje."),action:o("Click the jack labeled V/\u03A9.","Haz clic en el borne rotulado V/\u03A9."),observe:o("The card explains the V/\u03A9 jack.","La tarjeta explica el borne V/\u03A9."),meaning:o("Red in V/\u03A9 and black in COM is the lead setup for every measurement in this lab.","Rojo en V/\u03A9 y negro en COM es la conexi\xF3n de cables para todas las mediciones de este laboratorio."),check:(n,e)=>kn(e,"jack:V"),demo:[["click","jack:V"]]},{id:"ajacks",kind:"do",focus:"jacks",hi:["jack:A","jack:mA"],title:o("The A and mA jacks","Los bornes A y mA"),goal:o("Recognize the two jacks you must not use for voltage.","Reconocer los dos bornes que no debes usar para voltaje."),why:o("The A and mA jacks measure current. Inside the meter they are almost a plain wire to COM. A red lead left in one of them turns the meter into a short circuit across whatever you touch.","Los bornes A y mA miden corriente. Dentro del medidor son casi un cable directo a COM. Un cable rojo dejado en uno de ellos convierte al medidor en un cortocircuito sobre lo que toques."),action:o("Click the A jack, then the mA jack.","Haz clic en el borne A y luego en el borne mA."),observe:o("The cards explain what each is for and that they are blocked here.","Las tarjetas explican para qu\xE9 sirve cada uno y que aqu\xED est\xE1n bloqueados."),meaning:o("This simulator blocks every voltage measurement while a lead is in A or mA. The meter\u2019s fuse is a last resort, never permission to make that mistake.","Este simulador bloquea toda medici\xF3n de voltaje mientras un cable est\xE9 en A o mA. El fusible del medidor es un \xFAltimo recurso, nunca un permiso para cometer ese error."),check:(n,e)=>kn(e,"jack:A","jack:mA"),demo:[["click","jack:A"],["click","jack:mA"]]},{id:"probe",kind:"do",focus:"probes",hi:["probe:red","probe:black"],expect:["tip_grip"],title:o("The parts of a probe","Las partes de una punta"),goal:o("Name the three parts of a test probe.","Nombrar las tres partes de una punta de prueba."),why:o("A test lead is a flexible insulated wire with a plug at one end and a probe at the other. Where you hold the probe decides whether your fingers are near bare metal.","Un cable de prueba es un cable flexible aislado con una clavija en un extremo y una punta en el otro. D\xF3nde sujetas la punta decide si tus dedos quedan cerca del metal desnudo."),action:o("On either probe, click the long handle, the raised ring (finger guard), and the thin metal tip.","En cualquiera de las puntas, haz clic en el mango largo, en el anillo elevado (guarda) y en la punta met\xE1lica delgada."),observe:o("Three cards. Clicking the tip also brings up a coaching note \u2014 that is expected here.","Tres tarjetas. Al hacer clic en la punta met\xE1lica tambi\xE9n aparece una nota de correcci\xF3n; aqu\xED es lo esperado."),meaning:o("Hold the insulated handle, keep fingers behind the guard, and let only the metal tip touch the test point.","Sujeta el mango aislado, mant\xE9n los dedos detr\xE1s de la guarda y deja que solo la punta met\xE1lica toque el punto de prueba."),subs:[{label:o("Insulated handle","Mango aislado"),ok:(n,e)=>kn(e,"probe:handle")},{label:o("Finger guard","Guarda para los dedos"),ok:(n,e)=>kn(e,"probe:guard")},{label:o("Exposed metal tip","Punta met\xE1lica expuesta"),ok:(n,e)=>kn(e,"probe:tip")}],demo:[["click","probe:handle"],["click","probe:guard"],["click","probe:tip"]]},{id:"qcom",kind:"quiz",focus:"jacks",title:o("Check: what COM means","Comprobaci\xF3n: qu\xE9 significa COM"),goal:o("Make sure the meaning of COM has stuck.","Asegurar que el significado de COM qued\xF3 claro."),why:o("Confusing COM with earth ground leads to wrong conclusions later.","Confundir COM con tierra f\xEDsica lleva despu\xE9s a conclusiones equivocadas."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("What is the COM jack?","\xBFQu\xE9 es el borne COM?"),opts:[o("The meter\u2019s common reference connection, where the black lead goes","La conexi\xF3n de referencia com\xFAn del medidor, donde va el cable negro"),o("A connection that is always earth ground","Una conexi\xF3n que siempre es tierra f\xEDsica"),o("The jack for measuring current","El borne para medir corriente")],correct:0,explain:o("COM is simply the reference side of the meter. Whatever point the black probe touches becomes the \u201Ccompared-against\u201D point. It is not automatically earth ground.","COM es simplemente el lado de referencia del medidor. El punto que toque la punta negra pasa a ser el punto \xABcontra el que se compara\xBB. No es autom\xE1ticamente tierra f\xEDsica.")}},{id:"qmv",kind:"quiz",focus:"display",title:o("Check: volts and millivolts","Comprobaci\xF3n: voltios y milivoltios"),goal:o("Connect the two voltage units.","Relacionar las dos unidades de voltaje."),why:o("\u201CMilli\u201D means one-thousandth. Meters switch between V and mV, and misreading the unit gives an answer 1,000 times wrong.","\xABMili\xBB significa una mil\xE9sima. Los medidores cambian entre V y mV, y leer mal la unidad da un resultado 1000 veces err\xF3neo."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("How many millivolts (mV) make 1 volt (V)?","\xBFCu\xE1ntos milivoltios (mV) hacen 1 voltio (V)?"),opts:[o("10 mV","10 mV"),o("100 mV","100 mV"),o("1,000 mV","1000 mV")],correct:2,explain:o("1,000 mV = 1 V. So 500 mV is half a volt.","1000 mV = 1 V. As\xED, 500 mV es medio voltio.")}},si("sum",[On.manual,On.qualify,o("Black lead \u2192 COM. Red lead \u2192 V/\u03A9. Never A or mA for voltage.","Cable negro \u2192 COM. Cable rojo \u2192 V/\u03A9. Nunca A ni mA para voltaje.")])]},wd={id:"l1",minutes:10,diagram:"aa",title:o("Understand voltage","Entender el voltaje"),blurb:o("What a voltmeter actually compares, and what \u201Cin parallel\u201D means.","Qu\xE9 compara realmente un volt\xEDmetro y qu\xE9 significa \xABen paralelo\xBB."),init:n=>n.reset(),steps:[{id:"def",kind:"ack",focus:"aa",diagram:"analogy",title:o("Voltage is a difference between two points","El voltaje es una diferencia entre dos puntos"),goal:o("Understand what the word \u201Cvoltage\u201D means.","Entender qu\xE9 significa la palabra \xABvoltaje\xBB."),why:o("Voltage is the electrical potential difference between two points \u2014 how strongly electric charge is urged from one point toward the other. It is never a property of a single point.","El voltaje es la diferencia de potencial el\xE9ctrico entre dos puntos: con cu\xE1nta fuerza se empuja la carga el\xE9ctrica de un punto hacia el otro. Nunca es una propiedad de un solo punto."),action:o("Look at the picture of the two water tanks, then press Continue.","Mira el dibujo de los dos tanques de agua y pulsa Continuar."),observe:o("Two tanks at different heights joined by a pipe. The height difference is what pushes the water.","Dos tanques a distinta altura unidos por un tubo. La diferencia de altura es lo que empuja el agua."),meaning:o("Analogy only: voltage is like the pressure difference between the tanks. It is a helpful picture, not exactly how electricity works.","Solo una analog\xEDa: el voltaje es como la diferencia de presi\xF3n entre los tanques. Es una imagen \xFAtil, no exactamente c\xF3mo funciona la electricidad.")},{id:"vir",kind:"quiz",focus:"aa",diagram:"analogy",title:o("Voltage, current, resistance","Voltaje, corriente, resistencia"),goal:o("Tell three different quantities apart.","Distinguir tres magnitudes diferentes."),why:o("Voltage is potential difference (in the analogy: pressure difference). Current is the flow of electric charge (the water actually moving). Resistance is opposition to current (a narrow pipe).","El voltaje es diferencia de potencial (en la analog\xEDa: diferencia de presi\xF3n). La corriente es el flujo de carga el\xE9ctrica (el agua movi\xE9ndose). La resistencia es la oposici\xF3n a la corriente (un tubo estrecho)."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("A fresh battery sits on the table, connected to nothing. Which statement is true?","Una pila nueva est\xE1 sobre la mesa, sin conectar a nada. \xBFQu\xE9 afirmaci\xF3n es cierta?"),opts:[o("There is voltage between its terminals, but no current flows","Hay voltaje entre sus terminales, pero no circula corriente"),o("There is current, but no voltage","Hay corriente, pero no voltaje"),o("There is neither voltage nor current","No hay ni voltaje ni corriente")],correct:0,explain:o("Voltage can exist with no flow at all \u2014 like water pressure behind a closed tap. Current needs a complete path.","Puede haber voltaje sin ning\xFAn flujo, como la presi\xF3n del agua detr\xE1s de un grifo cerrado. La corriente necesita un camino completo.")}},{id:"points",kind:"do",focus:"aa",hi:["term:aa+","term:aa-"],title:o("Find the two points","Encontrar los dos puntos"),goal:o("Point out the two points a voltmeter would compare on the AA battery.","Se\xF1alar los dos puntos que un volt\xEDmetro comparar\xEDa en la pila AA."),why:o("A terminal is a metal contact where you can connect to a component. The battery has a positive (+) terminal and a negative (\u2212) terminal.","Un terminal es un contacto met\xE1lico donde puedes conectarte a un componente. La pila tiene un terminal positivo (+) y uno negativo (\u2212)."),action:o("Click the terminal labeled AA + and the terminal labeled AA \u2212 (on the bench or on the diagram).","Haz clic en el terminal rotulado AA + y en el rotulado AA \u2212 (en la mesa o en el diagrama)."),observe:o("Both points are marked with a ring and a check mark \u2014 on the bench and on the diagram at the same time.","Ambos puntos quedan marcados con un anillo y una marca de verificaci\xF3n, en la mesa y en el diagrama a la vez."),meaning:o("The diagram and the bench show the same circuit. Identifying the two points always comes before measuring.","El diagrama y la mesa muestran el mismo circuito. Identificar los dos puntos siempre va antes de medir."),check:n=>Qs(n,["aa+","aa-"]),demo:[["identify",["aa+","aa-"]]]},{id:"formula",kind:"quiz",focus:"aa",title:o("Red minus black","Roja menos negra"),goal:o("Learn the one rule that explains every DC reading.","Aprender la \xFAnica regla que explica toda lectura de CC."),why:o("The meter compares the red probe\u2019s point with the black probe\u2019s point: Displayed DC voltage = potential at red probe \u2212 potential at black probe.","El medidor compara el punto de la punta roja con el de la punta negra: Voltaje de CC mostrado = potencial en la punta roja \u2212 potencial en la punta negra."),action:o("Use the rule to answer.","Usa la regla para responder."),quiz:{q:o("Call the AA \u2212 terminal 0 V. Then AA + is 1.58 V higher. Red touches AA +, black touches AA \u2212. What is displayed?","Llamemos 0 V al terminal AA \u2212. Entonces AA + est\xE1 1,58 V m\xE1s alto. La roja toca AA + y la negra AA \u2212. \xBFQu\xE9 se muestra?"),opts:[o("1.58 V","1,58 V"),o("\u22121.58 V","\u22121,58 V"),o("0 V","0 V")],correct:0,explain:o("1.58 \u2212 0 = 1.58 V. Red is on the higher point, so the result is positive.","1,58 \u2212 0 = 1,58 V. La roja est\xE1 en el punto m\xE1s alto, as\xED que el resultado es positivo.")}},{id:"formula2",kind:"quiz",focus:"aa",title:o("Swap the probes","Intercambiar las puntas"),goal:o("Predict what happens when the probes are the other way round.","Predecir qu\xE9 pasa cuando las puntas est\xE1n al rev\xE9s."),why:o("The same rule works in every case. You will try this for real in Lesson 3.","La misma regla sirve en todos los casos. Lo probar\xE1s de verdad en la Lecci\xF3n 3."),action:o("Use the rule again.","Usa la regla otra vez."),quiz:{q:o("Now red touches AA \u2212 (0 V) and black touches AA + (1.58 V). What is displayed?","Ahora la roja toca AA \u2212 (0 V) y la negra AA + (1,58 V). \xBFQu\xE9 se muestra?"),opts:[o("1.58 V","1,58 V"),o("\u22121.58 V","\u22121,58 V"),o("0 V","0 V")],correct:1,explain:o("0 \u2212 1.58 = \u22121.58 V. The minus sign only tells you that red is on the lower point. Nothing is wrong or damaged.","0 \u2212 1,58 = \u22121,58 V. El signo menos solo indica que la roja est\xE1 en el punto m\xE1s bajo. Nada est\xE1 mal ni se da\xF1a.")}},{id:"parallel",kind:"do",focus:"lamp9",diagram:"lamp9",hi:[],expect:["reversed"],title:o("\u201CIn parallel\u201D: across, not in the way","\xABEn paralelo\xBB: junto a, no en medio"),goal:o("See how a voltmeter connects to a working circuit.","Ver c\xF3mo se conecta un volt\xEDmetro a un circuito en funcionamiento."),why:o("\u201CIn parallel\u201D means the meter connects across a component \u2014 one probe on each side \u2014 while the circuit\u2019s own path stays intact. You never cut a wire to measure voltage.","\xABEn paralelo\xBB significa que el medidor se conecta entre los extremos de un componente, una punta a cada lado, mientras el camino del circuito queda intacto. Nunca se corta un cable para medir voltaje."),action:o("Press \u201CShow me\u201D and watch the instructor\u2019s meter connect across the lamp while it is lit.","Pulsa \xABMu\xE9strame\xBB y observa c\xF3mo el medidor del instructor se conecta entre los extremos de la l\xE1mpara mientras est\xE1 encendida."),observe:o("The lamp stays on. The meter shows about 9 V. On the diagram the meter sits beside the lamp, not in the loop.","La l\xE1mpara sigue encendida. El medidor muestra unos 9 V. En el diagrama el medidor queda al lado de la l\xE1mpara, no dentro del lazo."),meaning:o("The meter only \u201Clooks\u201D at the two points. The circuit keeps working exactly as before.","El medidor solo \xABmira\xBB los dos puntos. El circuito sigue funcionando exactamente igual."),setup:n=>n.setup({...eh,dial:"VDC",range:"AUTO",switches:{lamp9:!0},intended:[]}),check:(n,e)=>e.demoDone||ts(n,"tp4","tp5")&&an(n),demo:[["identify",["tp4","tp5"]],["touch","black","tp5"],["touch","red","tp4"],["wait",2200]]},{id:"qpar",kind:"quiz",focus:"lamp9",diagram:"lamp9",title:o("Check: in parallel","Comprobaci\xF3n: en paralelo"),goal:o("Confirm what \u201Cin parallel\u201D means in practice.","Confirmar qu\xE9 significa \xABen paralelo\xBB en la pr\xE1ctica."),why:o("Knowing that the circuit stays intact removes a lot of beginner worry.","Saber que el circuito queda intacto quita muchas dudas de principiante."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("To measure the voltage across the lamp, what did the instructor do to the circuit wiring?","Para medir el voltaje entre los extremos de la l\xE1mpara, \xBFqu\xE9 le hizo el instructor al cableado del circuito?"),opts:[o("Nothing \u2014 the probes touched one point on each side of the lamp","Nada: las puntas tocaron un punto a cada lado de la l\xE1mpara"),o("Disconnected a wire and put the meter in the gap","Desconect\xF3 un cable y puso el medidor en el hueco"),o("Removed the lamp","Quit\xF3 la l\xE1mpara")],correct:0,explain:o("Voltage is measured across (in parallel). Putting a meter into a gap is how current is measured \u2014 a different procedure that this lab does not use.","El voltaje se mide entre los extremos (en paralelo). Poner el medidor en un hueco es como se mide corriente: otro procedimiento que este laboratorio no usa.")}},si("sum",[On.basics,o("Voltage = potential difference; current = flow of charge; resistance = opposition to current.","Voltaje = diferencia de potencial; corriente = flujo de carga; resistencia = oposici\xF3n a la corriente."),o("A voltmeter connects in parallel: across the component, with the circuit left intact.","Un volt\xEDmetro se conecta en paralelo: entre los extremos del componente, dejando el circuito intacto.")])]};function Qc(){return[{id:"inspect",kind:"do",focus:"meter",hi:["meter","lead:red","lead:black"],title:o("Inspect the meter and leads","Inspeccionar el medidor y los cables"),goal:o("Make sure the meter and both test leads are undamaged.","Asegurar que el medidor y ambos cables de prueba no tengan da\xF1os."),why:o("Insulation is the covering that keeps electricity away from your hands. A cracked case or a nicked lead is no longer protecting you.","El aislamiento es la cubierta que mantiene la electricidad lejos de tus manos. Una carcasa agrietada o un cable cortado ya no te protege."),action:o("Click the meter body, then the red lead\u2019s wire, then the black lead\u2019s wire. (Or use the three Inspect buttons in the check list.)","Haz clic en el cuerpo del medidor, luego en el cable rojo y luego en el cable negro. (O usa los tres botones Inspeccionar de la lista.)"),observe:o("Each inspection reports \u201Cno cracks, no exposed metal, insulation intact\u201D.","Cada inspecci\xF3n informa \xABsin grietas, sin metal expuesto, aislamiento intacto\xBB."),meaning:o("The equipment is fit to use. If anything had been damaged, you would replace it before going on.","El equipo est\xE1 en condiciones de uso. Si algo hubiera estado da\xF1ado, lo reemplazar\xEDas antes de continuar."),check:n=>n.checkItem("inspect"),demo:[["inspect","meter"],["inspect","red"],["inspect","black"]]},{id:"black",kind:"do",focus:"jacks",hi:["plug:black","jack:COM"],title:o("Black lead into COM","Cable negro en COM"),goal:o("Connect the black lead to the meter\u2019s reference jack.","Conectar el cable negro al borne de referencia del medidor."),why:o("Leads are connected to the meter while the probes are away from the battery, so nothing is live while you handle plugs.","Los cables se conectan al medidor mientras las puntas est\xE1n lejos de la pila, para que nada est\xE9 energizado mientras manipulas las clavijas."),action:o("With the probes resting on the bench, click the black plug and then the COM jack (or drag the plug to the jack).","Con las puntas descansando en la mesa, haz clic en la clavija negra y luego en el borne COM (o arrastra la clavija al borne)."),observe:o("The black plug sits in the COM jack.","La clavija negra queda en el borne COM."),meaning:o("The black probe is now the meter\u2019s reference point.","La punta negra es ahora el punto de referencia del medidor."),check:n=>Ke(n).plugs.black==="COM"&&Ks(n),demo:[["plug","black","COM"]]},{id:"red",kind:"do",focus:"jacks",hi:["plug:red","jack:V"],confirms:["jacks"],title:o("Red lead into V/\u03A9","Cable rojo en V/\u03A9"),goal:o("Connect the red lead to the voltage jack.","Conectar el cable rojo al borne de voltaje."),why:o("V/\u03A9 is the only correct red-lead jack for voltage. The A and mA jacks would turn the meter into a short circuit.","V/\u03A9 es el \xFAnico borne correcto del cable rojo para voltaje. Los bornes A y mA convertir\xEDan el medidor en un cortocircuito."),action:o("Click the red plug and then the V/\u03A9 jack (or drag it there).","Haz clic en la clavija roja y luego en el borne V/\u03A9 (o arr\xE1strala)."),observe:o("The red plug sits in V/\u03A9. In the check list, \u201CConfirm the correct jacks\u201D shows Done.","La clavija roja queda en V/\u03A9. En la lista, \xABConfirmar los bornes correctos\xBB muestra Hecho."),meaning:o("The leads are connected correctly for a voltage measurement.","Los cables est\xE1n bien conectados para medir voltaje."),check:n=>n.jacksOK()&&Ks(n),demo:[["plug","red","V"]]},{id:"dc",kind:"do",focus:"dial",hi:["dialpos:VDC"],confirms:["func"],title:o("Select DC voltage","Seleccionar voltaje de CC"),goal:o("Set the meter to measure DC voltage.","Ajustar el medidor para medir voltaje de CC."),why:o("A battery is a DC source: its polarity stays the same. DC voltage is marked V\u2393 on the selector.","Una pila es una fuente de CC: su polaridad se mantiene. El voltaje de CC est\xE1 marcado V\u2393 en el selector."),action:o("Turn the rotary selector to V\u2393.","Gira el selector giratorio a V\u2393."),observe:o("The display switches on and shows \u201CDC\u201D and the unit V.","La pantalla se enciende y muestra \xABDC\xBB y la unidad V."),meaning:o("The meter is now a DC voltmeter.","El medidor es ahora un volt\xEDmetro de CC."),check:n=>Ke(n).dial==="VDC",demo:[["dial","VDC"]]},{id:"auto",kind:"do",focus:"display",hi:["btn:range"],confirms:["range"],title:o("Select autorange","Seleccionar rango autom\xE1tico"),goal:o("Let the meter choose the range for you.","Dejar que el medidor elija el rango por ti."),why:o("The range is the largest value the meter can show at its present setting. With autorange (AUTO) the meter picks a suitable range itself.","El rango es el valor m\xE1ximo que el medidor puede mostrar con su ajuste actual. Con rango autom\xE1tico (AUTO) el medidor elige solo un rango adecuado."),action:o("Press the RANGE button until the display shows AUTO.","Pulsa el bot\xF3n RANGE hasta que la pantalla muestre AUTO."),observe:o("\u201CAUTO\u201D appears at the top right of the display.","\xABAUTO\xBB aparece arriba a la derecha de la pantalla."),meaning:o("You do not need to choose a range for this measurement. Lesson 4 covers manual ranges.","No necesitas elegir un rango para esta medici\xF3n. La Lecci\xF3n 4 trata los rangos manuales."),check:n=>Ke(n).dial==="VDC"&&Ke(n).range==="AUTO",demo:[["range","AUTO"]]},{id:"ident",kind:"do",focus:"aa",hi:["term:aa+","term:aa-"],title:o("Identify the battery terminals","Identificar los terminales de la pila"),goal:o("Find the battery\u2019s positive (+) and negative (\u2212) terminals.","Encontrar los terminales positivo (+) y negativo (\u2212) de la pila."),why:o("You decide where each probe will go before picking one up.","Decides d\xF3nde ir\xE1 cada punta antes de tomar una."),action:o("Click the terminal labeled AA + and the terminal labeled AA \u2212.","Haz clic en el terminal rotulado AA + y en el rotulado AA \u2212."),observe:o("Both terminals are marked with a ring and a check mark, on the bench and on the diagram.","Ambos terminales quedan marcados con un anillo y una marca de verificaci\xF3n, en la mesa y en el diagrama."),meaning:o("These are your two intended test points. The simulator will only let probes touch points you have identified.","Estos son tus dos puntos de prueba previstos. El simulador solo deja que las puntas toquen puntos que hayas identificado."),check:n=>Qs(n,["aa+","aa-"]),demo:[["identify",["aa+","aa-"]]]},{id:"grip",kind:"do",focus:"probes",hi:["probe:red","probe:black"],confirms:["guards","bridge"],title:o("Hold the handles behind the guards","Sujetar los mangos detr\xE1s de las guardas"),goal:o("Grip each probe the safe way.","Sujetar cada punta de forma segura."),why:o("Your fingers stay on the insulated handle, behind the finger guard, and each metal tip will touch one terminal only.","Tus dedos quedan en el mango aislado, detr\xE1s de la guarda, y cada punta met\xE1lica tocar\xE1 un solo terminal."),action:o("Click the handle of the black probe, then the handle of the red probe.","Haz clic en el mango de la punta negra y luego en el mango de la punta roja."),observe:o("Each probe lifts \u201Cin hand\u201D when gripped by the handle. The last two check-list items show Done.","Cada punta se levanta \xABen la mano\xBB al tomarla por el mango. Los dos \xFAltimos puntos de la lista muestran Hecho."),meaning:o("The pre-measurement check is complete. Now, and only now, a probe may touch the battery.","La comprobaci\xF3n previa est\xE1 completa. Ahora, y solo ahora, una punta puede tocar la pila."),check:(n,e)=>yn(e,"grip",t=>t.lead==="red"&&t.part==="handle")&&yn(e,"grip",t=>t.lead==="black"&&t.part==="handle"),demo:[["grip","black"],["grip","red"]]},{id:"tblack",kind:"do",focus:"aa",hi:["probe:black","term:aa-"],title:o("Touch black to negative","Tocar el negativo con la negra"),goal:o("Put the reference probe on the battery\u2019s negative terminal.","Poner la punta de referencia en el terminal negativo de la pila."),why:o("The black (reference) probe goes on first.","La punta negra (referencia) se coloca primero."),action:o("Drag the black probe by its handle to AA \u2212. Or click the black handle, then click AA \u2212.","Arrastra la punta negra por su mango hasta AA \u2212. O haz clic en el mango negro y luego en AA \u2212."),observe:o("The black tip snaps onto AA \u2212. The display still wanders near zero: only one point is connected.","La punta negra encaja en AA \u2212. La pantalla sigue variando cerca de cero: solo hay un punto conectado."),meaning:o("One probe alone measures nothing. A voltage needs two points.","Una sola punta no mide nada. Un voltaje necesita dos puntos."),expect:["floating"],check:n=>Ke(n).probes.black==="aa-",demo:[["touch","black","aa-"]]},{id:"tred",kind:"do",focus:"aa",hi:["probe:red","term:aa+"],title:o("Touch red to positive","Tocar el positivo con la roja"),goal:o("Complete the two-point connection.","Completar la conexi\xF3n entre dos puntos."),why:o("With red on the higher point and black on the lower point, the reading will be positive.","Con la roja en el punto m\xE1s alto y la negra en el m\xE1s bajo, la lectura ser\xE1 positiva."),action:o("Drag the red probe by its handle to AA +. Or click the red handle, then click AA +.","Arrastra la punta roja por su mango hasta AA +. O haz clic en el mango rojo y luego en AA +."),observe:o("The red tip snaps onto AA +. The digits start to climb.","La punta roja encaja en AA +. Los d\xEDgitos empiezan a subir."),meaning:o("The meter is now connected across the battery \u2014 in parallel with it.","El medidor est\xE1 ahora conectado entre los terminales de la pila: en paralelo con ella."),check:n=>fn(n,"aa+","aa-"),demo:[["touch","red","aa+"]]},{id:"settle",kind:"do",focus:"display",hi:["display"],title:o("Wait for the reading to settle","Esperar a que la lectura se estabilice"),goal:o("Give the meter a moment before you read it.","Darle un momento al medidor antes de leerlo."),why:o("A digital meter takes a short time to work out a steady value. The first digits you see are not the answer.","Un medidor digital tarda un poco en calcular un valor estable. Los primeros d\xEDgitos que ves no son la respuesta."),action:o("Keep both probes still and watch the display until it stops changing.","Mant\xE9n ambas puntas quietas y observa la pantalla hasta que deje de cambiar."),observe:o("The number stops at 1.580 and the status line says \u201CReading is steady\u201D.","El n\xFAmero se detiene en 1.580 y la l\xEDnea de estado dice \xABLa lectura es estable\xBB."),meaning:o("You now have a real, steady measurement.","Ahora tienes una medici\xF3n real y estable."),check:n=>fn(n,"aa+","aa-")&&an(n),demo:[["wait",1800]]},{id:"read",kind:"entry",focus:"display",hi:["display"],title:o("Read number, sign and unit","Leer n\xFAmero, signo y unidad"),goal:o("Read the complete result: number, sign and unit.","Leer el resultado completo: n\xFAmero, signo y unidad."),why:o("\u201C1.58\u201D alone is not a measurement. Is it positive or negative? Volts or millivolts? DC or AC?","\xAB1.58\xBB por s\xED solo no es una medici\xF3n. \xBFEs positivo o negativo? \xBFVoltios o milivoltios? \xBFCC o CA?"),action:o("Say the reading aloud, then enter the sign, the number and the unit below and press Check.","Di la lectura en voz alta; luego ingresa abajo el signo, el n\xFAmero y la unidad y pulsa Comprobar."),observe:o("No minus sign, 1.580, and the unit V with \u201CDC\u201D.","Sin signo menos, 1.580, y la unidad V con \xABDC\xBB."),meaning:o("\u201CPositive 1.58 volts DC\u201D: the red probe\u2019s point is 1.58 V higher than the black probe\u2019s point. (Simulated reading.)","\xAB1,58 voltios de CC, positivo\xBB: el punto de la punta roja est\xE1 1,58 V por encima del de la negra. (Lectura simulada.)"),entry:{type:"reading"},pre:n=>fn(n,"aa+","aa-")&&an(n),demo:[["wait",1800],["entry"]]},ns("remove","aa"),is("off")]}var Sd={id:"l2",minutes:14,diagram:"aa",title:o("First battery measurement","Primera medici\xF3n de una pila"),blurb:o("The complete procedure on an AA battery \u2014 guided, then on your own.","El procedimiento completo en una pila AA: guiado y luego por tu cuenta."),init:n=>n.reset({range:200}),steps:[...Qc(),{id:"nominal",kind:"quiz",focus:"aa",title:o("Nominal and measured","Nominal y medido"),goal:o("Interpret 1.58 V on a battery labeled 1.5 V.","Interpretar 1,58 V en una pila rotulada 1,5 V."),why:o("\u201C1.5 V\u201D is the battery\u2019s nominal rating \u2014 its name-plate value. A measured value can differ from it.","\xAB1,5 V\xBB es el valor nominal de la pila: su valor de etiqueta. Un valor medido puede ser distinto."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("The battery is labeled 1.5 V and the meter read 1.58 V with nothing else connected. What can you conclude?","La pila est\xE1 rotulada 1,5 V y el medidor marc\xF3 1,58 V sin nada m\xE1s conectado. \xBFQu\xE9 puedes concluir?"),opts:[o("The reading is normal: 1.5 V is a nominal label, and an unloaded battery often reads a little higher","La lectura es normal: 1,5 V es un valor nominal, y una pila sin carga suele marcar algo m\xE1s"),o("The meter must be faulty, because it should read exactly 1.500 V","El medidor debe estar averiado, porque deber\xEDa marcar exactamente 1,500 V"),o("The battery is proven to be healthy and full","Queda demostrado que la pila est\xE1 sana y llena")],correct:0,explain:o("One voltage reading with no load does not prove a battery\u2019s capacity or overall health \u2014 a tired battery can still show a good voltage until it has to supply current.","Una sola lectura de voltaje sin carga no demuestra la capacidad ni el estado general de una pila: una pila gastada puede mostrar buen voltaje hasta que tiene que entregar corriente.")}},{id:"handover",kind:"ack",focus:"front",title:o("Your turn","Tu turno"),goal:o("Repeat the whole procedure on your own.","Repetir todo el procedimiento por tu cuenta."),why:o("Doing it again without step-by-step coaching is what makes it stick.","Hacerlo otra vez sin gu\xEDa paso a paso es lo que lo fija en la memoria."),action:o("The equipment has been reset: leads unplugged, meter off. Press Continue, then carry out all 13 steps. The list ticks off as your setup becomes correct.","El equipo se reinici\xF3: cables desconectados y medidor apagado. Pulsa Continuar y realiza los 13 pasos. La lista se ir\xE1 marcando cuando tu configuraci\xF3n sea correcta."),observe:o("No highlights this time. A Hint button is there if you get stuck.","Esta vez sin resaltados. Hay un bot\xF3n Pista si te atascas."),meaning:o("Safety blocks still work exactly as before.","Los bloqueos de seguridad funcionan exactamente igual que antes."),setup:n=>n.reset({range:200})},...Qc().map((n,e)=>({...n,id:`solo_${n.id}`,independent:!0,soloFirst:e===0})),si("sum",[On.basics,o("1.5 V is a nominal rating; 1.58 V is a normal measured value.","1,5 V es un valor nominal; 1,58 V es un valor medido normal."),o("One unloaded voltage reading does not prove a battery\u2019s capacity or health.","Una lectura de voltaje sin carga no demuestra la capacidad ni el estado de una pila.")])]},Ad={"aa+":"AA +","aa-":"AA \u2212"},ro=[o("About +1.58 V","Unos +1,58 V"),o("About \u22121.58 V","Unos \u22121,58 V"),o("About 0 V","Unos 0 V")],Td={id:"l3",minutes:12,diagram:"aa",title:o("Polarity and reference points","Polaridad y puntos de referencia"),blurb:o("Reverse the probes, share a node, lift a probe \u2014 and predict each result first.","Invierte las puntas, comparte un nodo, levanta una punta, y predice cada resultado antes."),init:n=>n.reset(),steps:[ea("setup",{dial:"VDC",points:["aa+","aa-"],labels:Ad}),{id:"normal",kind:"do",focus:"aa",hi:["term:aa+","term:aa-"],pair:["aa+","aa-"],title:o("Red on +, black on \u2212","Roja en +, negra en \u2212"),goal:o("Take the normal reading as a starting point.","Tomar la lectura normal como punto de partida."),why:o("Polarity means which of the two points is higher (+) and which is lower (\u2212).","La polaridad indica cu\xE1l de los dos puntos es m\xE1s alto (+) y cu\xE1l m\xE1s bajo (\u2212)."),action:o("Answer the prediction. Then touch black to AA \u2212 and red to AA +.","Responde la predicci\xF3n. Luego toca AA \u2212 con la negra y AA + con la roja."),observe:o("About 1.580 V with no minus sign.","Unos 1.580 V sin signo menos."),meaning:o("Red minus black = 1.58 \u2212 0 = +1.58 V.","Roja menos negra = 1,58 \u2212 0 = +1,58 V."),predict:pn(0,ro),check:n=>fn(n,"aa+","aa-")&&an(n),demo:[["predict"],["touch","black","aa-"],["touch","red","aa+"],["wait",1700]]},{id:"reverse",kind:"do",focus:"aa",hi:["term:aa+","term:aa-"],expect:["reversed","floating","same_node"],pair:["aa-","aa+"],title:o("Reverse the probes","Invertir las puntas"),goal:o("See what the meter shows when the probes are swapped.","Ver qu\xE9 muestra el medidor cuando las puntas se intercambian."),why:o("Beginners often fear this is dangerous. On this battery it is simply another valid measurement.","Los principiantes suelen temer que esto sea peligroso. En esta pila es simplemente otra medici\xF3n v\xE1lida."),action:o("Answer the prediction. Then move the probes so that red is on AA \u2212 and black is on AA +.","Responde la predicci\xF3n. Luego mueve las puntas para que la roja quede en AA \u2212 y la negra en AA +."),observe:o("About \u22121.580 V: the same number with a minus sign in front.","Unos \u22121.580 V: el mismo n\xFAmero con un signo menos delante."),meaning:o("The negative sign indicates that the red probe is at a lower potential than the black probe. It is a valid reading, not an unsafe connection.","El signo negativo indica que la punta roja est\xE1 a menor potencial que la negra. Es una lectura v\xE1lida, no una conexi\xF3n insegura."),predict:pn(1,ro),check:n=>fn(n,"aa-","aa+")&&an(n),demo:[["predict"],["lift","red"],["touch","black","aa+"],["touch","red","aa-"],["wait",1700]]},{id:"same",kind:"do",focus:"aa",hi:["term:aa+"],expect:["same_node","reversed","floating"],title:o("Both probes on the same node","Ambas puntas en el mismo nodo"),goal:o("Find out what the meter shows between a point and itself.","Averiguar qu\xE9 muestra el medidor entre un punto y \xE9l mismo."),why:o("A node is all the metal that is joined together with nothing in between. Every spot on one node is at the same potential.","Un nodo es todo el metal unido entre s\xED sin nada en medio. Todos los puntos de un nodo est\xE1n al mismo potencial."),action:o("Answer the prediction. Then put both probes on the AA + terminal.","Responde la predicci\xF3n. Luego pon ambas puntas en el terminal AA +."),observe:o("About 0.000 V.","Unos 0.000 V."),meaning:o("Zero here means \u201Cno difference between these two points\u201D. It does not mean the battery is dead \u2014 it still has 1.58 V across it.","Aqu\xED cero significa \xABno hay diferencia entre estos dos puntos\xBB. No significa que la pila est\xE9 agotada: sigue teniendo 1,58 V entre sus terminales."),predict:pn(2,ro),check:n=>fn(n,"aa+","aa+")&&an(n),demo:[["predict"],["touch","red","aa+"],["touch","black","aa+"],["wait",1700]]},{id:"open",kind:"do",focus:"aa",hi:["probe:black"],expect:["floating","same_node"],title:o("One probe disconnected","Una punta desconectada"),goal:o("See what the display does with only one probe connected.","Ver qu\xE9 hace la pantalla con una sola punta conectada."),why:o("An input that is connected to nothing is called \u201Cfloating\u201D. People often assume it must read zero.","Una entrada que no est\xE1 conectada a nada se llama \xABflotante\xBB. Mucha gente supone que debe marcar cero."),action:o("Answer the prediction. Then lift the black probe off the battery (click its handle, then click it again to put it down) and leave red on AA +.","Responde la predicci\xF3n. Luego levanta la punta negra de la pila (clic en su mango y otro clic para dejarla) y deja la roja en AA +."),observe:o("The status line says \u201CNo valid two-point measurement\u201D. The digits wander by a few thousandths of a volt and may change sign.","La l\xEDnea de estado dice \xABNo hay medici\xF3n v\xE1lida entre dos puntos\xBB. Los d\xEDgitos var\xEDan unas mil\xE9simas de voltio y pueden cambiar de signo."),meaning:o("A floating input does not reliably read zero. Real meters may show unstable or misleading numbers. A number without two good contacts is not a measurement.","Una entrada flotante no marca cero de forma fiable. Los medidores reales pueden mostrar n\xFAmeros inestables o enga\xF1osos. Un n\xFAmero sin dos buenos contactos no es una medici\xF3n."),predict:{q:o("What will the display show with the black probe in the air?","\xBFQu\xE9 mostrar\xE1 la pantalla con la punta negra en el aire?"),opts:[o("Exactly 0.000 V, steadily","Exactamente 0.000 V, de forma estable"),o("Small wandering numbers that are not a real measurement","N\xFAmeros peque\xF1os y cambiantes que no son una medici\xF3n real"),o("1.58 V, the same as before","1,58 V, igual que antes")],correct:1},check:n=>Ke(n).probes.red==="aa+"&&!Ke(n).probes.black&&n.reading().reason==="open",demo:[["predict"],["touch","red","aa+"],["lift","black"],["wait",2500]]},{id:"qneg",kind:"quiz",focus:"aa",title:o("Check: a negative reading","Comprobaci\xF3n: una lectura negativa"),goal:o("Explain a minus sign in your own words.","Explicar un signo menos con tus propias palabras."),why:o("You need to tell a valid negative reading apart from a genuinely unsafe connection.","Necesitas distinguir una lectura negativa v\xE1lida de una conexi\xF3n realmente insegura."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("The display shows \u22121.58 V DC. What does it tell you?","La pantalla muestra \u22121,58 V CC. \xBFQu\xE9 te dice?"),opts:[o("The red probe is on the lower-potential point; the reading is valid","La punta roja est\xE1 en el punto de menor potencial; la lectura es v\xE1lida"),o("The meter is being damaged and must be disconnected at once","El medidor se est\xE1 da\xF1ando y hay que desconectarlo ya"),o("The battery is producing negative energy","La pila est\xE1 produciendo energ\xEDa negativa")],correct:0,explain:o("Reversed probes on a voltage function give a valid negative number. What is unsafe is a different thing entirely: a lead in a current jack, the wrong function, or a tip bridging terminals.","Las puntas invertidas en una funci\xF3n de voltaje dan un n\xFAmero negativo v\xE1lido. Lo inseguro es algo totalmente distinto: un cable en un borne de corriente, la funci\xF3n equivocada o una punta puenteando terminales.")}},ns("remove","aa"),is("off"),si("sum",[On.basics,o("A minus sign means red is on the lower point. Valid, not unsafe.","Un signo menos significa que la roja est\xE1 en el punto m\xE1s bajo. V\xE1lido, no inseguro."),o("Same node \u2192 about 0 V. One probe open \u2192 no valid measurement, and not a reliable zero.","Mismo nodo \u2192 unos 0 V. Una punta abierta \u2192 no hay medici\xF3n v\xE1lida ni un cero fiable.")])]},Ed={"b9+":"9V +","b9-":"9V \u2212"},Cd={id:"l4",minutes:14,diagram:"b9",title:o("Manual ranging and units","Rango manual y unidades"),blurb:o("Choose a range for a 9 V battery, see overrange, and convert V and mV.","Elige un rango para una bater\xEDa de 9 V, observa el sobrerrango y convierte V y mV."),init:n=>n.reset(),steps:[{id:"ranges",kind:"do",focus:"display",hi:["dialpos:VDC","btn:range"],title:o("This meter\u2019s DC ranges","Los rangos de CC de este medidor"),goal:o("See the three manual DC ranges of this training meter.","Ver los tres rangos manuales de CC de este medidor de pr\xE1ctica."),why:o("This fictional training meter documents its ranges like a manual would: 2 V (shows up to 1.999, in steps of 0.001 V), 20 V (up to 19.99, steps of 0.01 V) and 200 V (up to 199.9, steps of 0.1 V).","Este medidor de pr\xE1ctica ficticio documenta sus rangos como lo har\xEDa un manual: 2 V (muestra hasta 1.999, en pasos de 0,001 V), 20 V (hasta 19.99, pasos de 0,01 V) y 200 V (hasta 199.9, pasos de 0,1 V)."),action:o("Turn the selector to V\u2393. Then press RANGE repeatedly until you have seen 2 V, 20 V and 200 V.","Gira el selector a V\u2393. Luego pulsa RANGE varias veces hasta haber visto 2 V, 20 V y 200 V."),observe:o("The display shows MANUAL with the range, and the decimal point moves.","La pantalla muestra MANUAL con el rango y el punto decimal se desplaza."),meaning:o("In manual ranging, you choose the range. A smaller range shows more decimal places but tops out sooner.","En rango manual, t\xFA eliges el rango. Un rango menor muestra m\xE1s decimales pero se agota antes."),subs:[{label:o("Selector on V\u2393","Selector en V\u2393"),ok:n=>Ke(n).dial==="VDC"},{label:o("Seen 2 V","Visto 2 V"),ok:(n,e)=>yn(e,"range",t=>t.range===2)},{label:o("Seen 20 V","Visto 20 V"),ok:(n,e)=>yn(e,"range",t=>t.range===20)},{label:o("Seen 200 V","Visto 200 V"),ok:(n,e)=>yn(e,"range",t=>t.range===200)}],demo:[["dial","VDC"],["range",2],["range",20],["range",200]]},{id:"qrange",kind:"quiz",focus:"b9",title:o("Choose a range for 9 V","Elegir un rango para 9 V"),goal:o("Pick the best manual range for a known 9 V battery.","Elegir el mejor rango manual para una bater\xEDa conocida de 9 V."),why:o("The best range is the smallest one that is still larger than the voltage you expect: it fits the value and gives the most useful decimals.","El mejor rango es el menor que siga siendo mayor que el voltaje que esperas: abarca el valor y da los decimales m\xE1s \xFAtiles."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("The battery is labeled 9 V. Which range of this meter fits best?","La bater\xEDa est\xE1 rotulada 9 V. \xBFQu\xE9 rango de este medidor conviene m\xE1s?"),opts:[o("2 V","2 V"),o("20 V","20 V"),o("200 V","200 V")],correct:1,explain:o("9 V does not fit in the 2 V range. It fits in both 20 V and 200 V, but 20 V shows 9.36 where 200 V shows only 9.4.","9 V no cabe en el rango de 2 V. Cabe en 20 V y en 200 V, pero 20 V muestra 9.36 donde 200 V solo muestra 9.4.")}},ea("setup",{dial:"VDC",ranges:[20],points:["b9+","b9-"],labels:Ed}),{id:"m20",kind:"do",focus:"b9",hi:["term:b9+","term:b9-"],pair:["b9+","b9-"],expect:["reversed"],title:o("Measure on the 20 V range","Medir en el rango de 20 V"),goal:o("Measure the 9 V battery on a well-chosen range.","Medir la bater\xEDa de 9 V con un rango bien elegido."),why:o("The two snap terminals of a 9 V battery are close together. Each tip goes squarely on one terminal \u2014 never in the gap between them.","Los dos terminales a presi\xF3n de una bater\xEDa de 9 V est\xE1n muy juntos. Cada punta va de lleno sobre un terminal, nunca en el hueco entre ambos."),action:o("Touch black to 9V \u2212 and red to 9V +.","Toca 9V \u2212 con la negra y 9V + con la roja."),observe:o("About 9.36 V (simulated). Two decimal places.","Unos 9.36 V (simulado). Dos decimales."),meaning:o("The value fits the 20 V range with room to spare, and you can read it to a hundredth of a volt.","El valor cabe de sobra en el rango de 20 V y puedes leerlo hasta la cent\xE9sima de voltio."),check:n=>fn(n,"b9+","b9-")&&an(n)&&Ke(n).range===20,demo:[["touch","black","b9-"],["touch","red","b9+"],["wait",1700]]},{id:"ol",kind:"do",focus:"display",hi:["btn:range"],expect:["range_low"],title:o("See an overrange","Ver un sobrerrango"),goal:o("Learn what this meter shows when the range is too small.","Saber qu\xE9 muestra este medidor cuando el rango es demasiado peque\xF1o."),why:o("Overrange means the value is bigger than the selected range can display. You may change range with the probes connected, because the function does not change.","Sobrerrango significa que el valor es mayor de lo que el rango elegido puede mostrar. Puedes cambiar de rango con las puntas conectadas, porque la funci\xF3n no cambia."),action:o("Leave the probes on the battery. Press RANGE until the range is 2 V.","Deja las puntas en la bater\xEDa. Pulsa RANGE hasta que el rango sea 2 V."),observe:o("The display shows \u201COL\u201D instead of a number, and the coach flags it \u2014 expected here.","La pantalla muestra \xABOL\xBB en lugar de un n\xFAmero y el instructor lo se\xF1ala; aqu\xED es lo esperado."),meaning:o("Overrange means the selected range is too small \u2014 not that voltage is absent. \u201COL\u201D is specific to this simulated meter; real displays vary, so check your manual.","Sobrerrango significa que el rango elegido es demasiado peque\xF1o, no que no haya voltaje. \xABOL\xBB es propio de este medidor simulado; las pantallas reales var\xEDan, as\xED que consulta tu manual."),check:n=>fn(n,"b9+","b9-")&&Ke(n).range===2&&n.display.ol,demo:[["range",2],["wait",1500]]},{id:"m200",kind:"do",focus:"display",hi:["btn:range"],title:o("Try the 200 V range","Probar el rango de 200 V"),goal:o("See what a larger-than-needed range does to the reading.","Ver qu\xE9 le hace a la lectura un rango mayor del necesario."),why:o("A higher range always \u201Cfits\u201D, but there is a cost.","Un rango mayor siempre \xABcabe\xBB, pero tiene un costo."),action:o("Press RANGE until the range is 200 V.","Pulsa RANGE hasta que el rango sea 200 V."),observe:o("About 9.4 V: only one decimal place.","Unos 9.4 V: un solo decimal."),meaning:o("A higher range may show fewer useful decimal places. The battery did not change \u2014 only the detail you can see.","Un rango mayor puede mostrar menos decimales \xFAtiles. La bater\xEDa no cambi\xF3; solo cambi\xF3 el detalle que puedes ver."),check:n=>fn(n,"b9+","b9-")&&Ke(n).range===200&&an(n),demo:[["range",200],["wait",1500]]},{id:"hold",kind:"do",focus:"display",hi:["btn:hold"],expect:["hold_stale","floating"],title:o("HOLD freezes the display","HOLD congela la pantalla"),goal:o("See how HOLD can leave an old number on the display.","Ver c\xF3mo HOLD puede dejar un n\xFAmero antiguo en la pantalla."),why:o("HOLD freezes the number so you can look away from the probes and read it afterwards. The danger: a frozen number looks exactly like a live one.","HOLD congela el n\xFAmero para que puedas apartar la vista de las puntas y leerlo despu\xE9s. El peligro: un n\xFAmero congelado se ve igual que uno en vivo."),action:o("With the probes still on the battery, press HOLD. Then lift the red probe off the battery and put it down. Look at the display. Finally press HOLD again.","Con las puntas a\xFAn en la bater\xEDa, pulsa HOLD. Luego levanta la punta roja de la bater\xEDa y d\xE9jala. Mira la pantalla. Por \xFAltimo pulsa HOLD otra vez."),observe:o("With HOLD on, the display keeps showing 9.4 V and the word HOLD although the red probe touches nothing; the coach flags a stale reading \u2014 expected here. After the second press it returns to live.","Con HOLD activo, la pantalla sigue mostrando 9.4 V y la palabra HOLD aunque la punta roja no toque nada; el instructor se\xF1ala una lectura antigua, y aqu\xED es lo esperado. Tras la segunda pulsaci\xF3n vuelve a estar en vivo."),meaning:o("A held reading is no longer live. Always look for the HOLD flag before you trust a number.","Una lectura retenida ya no est\xE1 en vivo. Busca siempre el aviso HOLD antes de fiarte de un n\xFAmero."),subs:[{label:o("HOLD pressed while measuring","HOLD pulsado mientras med\xEDas"),ok:(n,e)=>yn(e,"hold",t=>t.on)},{label:o("Red probe lifted while HOLD was on (display stayed frozen)","Punta roja levantada con HOLD activo (la pantalla qued\xF3 congelada)"),ok:(n,e)=>yn(e,"detect",t=>t.code==="hold_stale")},{label:o("HOLD released \u2014 display is live again","HOLD liberado: la pantalla vuelve a estar en vivo"),ok:(n,e)=>!Ke(n).hold&&yn(e,"detect",t=>t.code==="hold_stale")}],demo:[["hold"],["wait",800],["lift","red"],["wait",2200],["hold"],["wait",800]]},{id:"qrating",kind:"quiz",focus:"meter",title:o("Range is not a safety rating","El rango no es una categor\xEDa de seguridad"),goal:o("Separate \u201Crange\u201D from \u201Cwhat the meter is allowed to measure\u201D.","Separar \xABrango\xBB de \xABlo que el medidor tiene permitido medir\xBB."),why:o("Every meter has a maximum permitted input and a safety rating printed on it and stated in its manual. The range setting does not change either.","Todo medidor tiene una entrada m\xE1xima permitida y una categor\xEDa de seguridad impresas en \xE9l y en su manual. El ajuste de rango no cambia ninguna de las dos."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("You select the highest range. What happens to the meter\u2019s permitted input and safety rating?","Seleccionas el rango m\xE1s alto. \xBFQu\xE9 pasa con la entrada permitida y la categor\xEDa de seguridad del medidor?"),opts:[o("Nothing \u2014 they stay exactly the same","Nada: siguen exactamente igual"),o("They increase, so the meter can safely measure more","Aumentan, as\xED que el medidor puede medir m\xE1s con seguridad"),o("The meter becomes protected against any voltage","El medidor queda protegido contra cualquier voltaje")],correct:0,explain:o("Range only decides how the number is displayed. The meter\u2019s limits are fixed by its design.","El rango solo decide c\xF3mo se muestra el n\xFAmero. Los l\xEDmites del medidor los fija su dise\xF1o.")}},{id:"qunknown",kind:"quiz",focus:"meter",title:o("When the voltage is unknown","Cuando el voltaje es desconocido"),goal:o("Know the right order of thinking for an unknown voltage.","Conocer el orden correcto de razonamiento ante un voltaje desconocido."),why:o("First the measurement situation itself must be verified as safe and within the meter\u2019s rating. Only then does range selection matter \u2014 and for that you follow the manufacturer\u2019s manual, which typically says to use autorange or to start at the highest range and step down.","Primero hay que verificar que la situaci\xF3n de medici\xF3n sea segura y est\xE9 dentro de la categor\xEDa del medidor. Solo entonces importa la elecci\xF3n del rango, y para eso sigues el manual del fabricante, que normalmente indica usar rango autom\xE1tico o empezar por el rango m\xE1s alto e ir bajando."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("Someone says: \u201CI don\u2019t know what voltage is in there, so I\u2019ll just pick the highest range and measure.\u201D What is wrong with that?","Alguien dice: \xABNo s\xE9 qu\xE9 voltaje hay ah\xED, as\xED que elijo el rango m\xE1s alto y mido\xBB. \xBFQu\xE9 est\xE1 mal?"),opts:[o("Choosing the highest range does not make an unknown circuit safe to approach","Elegir el rango m\xE1s alto no vuelve seguro acercarse a un circuito desconocido"),o("Nothing \u2014 the highest range protects the meter and the person","Nada: el rango m\xE1s alto protege al medidor y a la persona"),o("They should pick the lowest range instead","Deber\xEDa elegir el rango m\xE1s bajo")],correct:0,explain:o("Range is a display setting. Whether a circuit may be measured at all depends on the circuit, the meter\u2019s rating, and the person\u2019s training and authorization \u2014 never on the range.","El rango es un ajuste de visualizaci\xF3n. Que un circuito pueda medirse depende del circuito, de la categor\xEDa del medidor y de la formaci\xF3n y autorizaci\xF3n de la persona, nunca del rango.")}},{id:"u1",kind:"entry",focus:"display",title:o("Units: volts to millivolts","Unidades: de voltios a milivoltios"),goal:o("Convert volts to millivolts.","Convertir voltios a milivoltios."),why:o("1 V = 1,000 mV, so to go from V to mV you multiply by 1,000.","1 V = 1000 mV, as\xED que para pasar de V a mV multiplicas por 1000."),action:o("Type the answer and press Check.","Escribe la respuesta y pulsa Comprobar."),observe:o("The coach confirms the conversion.","El instructor confirma la conversi\xF3n."),meaning:o("1.5 V and 1,500 mV are the same voltage written two ways.","1,5 V y 1500 mV son el mismo voltaje escrito de dos maneras."),entry:{type:"convert",q:o("1.5 V = ? mV","1,5 V = ? mV"),answer:1500,unit:"mV"},demo:[["entry"]]},{id:"u2",kind:"entry",focus:"display",title:o("Units: a small voltage","Unidades: un voltaje peque\xF1o"),goal:o("Convert a small voltage to millivolts.","Convertir un voltaje peque\xF1o a milivoltios."),why:o("Small voltages are easier to read in millivolts.","Los voltajes peque\xF1os se leen mejor en milivoltios."),action:o("Type the answer and press Check.","Escribe la respuesta y pulsa Comprobar."),observe:o("The coach confirms the conversion.","El instructor confirma la conversi\xF3n."),meaning:o("0.024 V = 24 mV. Always read the unit next to the number.","0,024 V = 24 mV. Lee siempre la unidad junto al n\xFAmero."),entry:{type:"convert",q:o("0.024 V = ? mV","0,024 V = ? mV"),answer:24,unit:"mV"},demo:[["entry"]]},ns("remove","b9"),is("off"),si("sum",[o("Overrange (OL here) means \u201Crange too small\u201D, not \u201Cno voltage\u201D.","Sobrerrango (OL aqu\xED) significa \xABrango demasiado peque\xF1o\xBB, no \xABsin voltaje\xBB."),o("A reading with HOLD showing is frozen, not live.","Una lectura con HOLD a la vista est\xE1 congelada, no en vivo."),o("A higher range shows fewer decimals and never raises the meter\u2019s permitted input or safety rating.","Un rango mayor muestra menos decimales y nunca aumenta la entrada permitida ni la categor\xEDa de seguridad del medidor."),o("1 V = 1,000 mV.","1 V = 1000 mV."),On.manual])]},Si={tp1:"TP1",tp2:"TP2",tp3:"TP3",tp4:"TP4",tp5:"TP5",tp6:"TP6"},Ba=n=>Ke(n).switches.lamp9,oo=n=>!Ke(n).switches.lamp9,Rd={id:"l5",minutes:14,diagram:"lamp9",title:o("Measure a working circuit","Medir un circuito en funcionamiento"),blurb:o("Battery, switch and lamp in series \u2014 measured with the switch closed and open.","Bater\xEDa, interruptor y l\xE1mpara en serie, medidos con el interruptor cerrado y abierto."),init:n=>n.reset(),steps:[{id:"tour",kind:"do",focus:"lamp9",hi:["switch:lamp9"],title:o("Meet the circuit","Conocer el circuito"),goal:o("Understand the lamp circuit before measuring it.","Entender el circuito de la l\xE1mpara antes de medirlo."),why:o("\u201CIn series\u201D means the parts are joined one after another in a single loop: 9 V battery \u2192 switch \u2192 lamp \u2192 back to the battery. A switch is closed when it completes the path and open when it breaks it.","\xABEn serie\xBB significa que las partes est\xE1n unidas una tras otra en un solo lazo: bater\xEDa de 9 V \u2192 interruptor \u2192 l\xE1mpara \u2192 de vuelta a la bater\xEDa. Un interruptor est\xE1 cerrado cuando completa el camino y abierto cuando lo interrumpe."),action:o("Click the switch on the lamp circuit to close it.","Haz clic en el interruptor del circuito de la l\xE1mpara para cerrarlo."),observe:o("The switch label changes to CLOSED and the lamp label to LAMP ON. Test points TP1\u2013TP6 sit on each side of every part.","La etiqueta del interruptor cambia a CERRADO y la de la l\xE1mpara a L\xC1MPARA ENCENDIDA. Los puntos TP1\u2013TP6 est\xE1n a cada lado de cada parte."),meaning:o("This is an idealized circuit: perfect wires and a perfect switch. Real wiring and components produce small voltage drops.","Es un circuito ideal: cables perfectos y un interruptor perfecto. El cableado y los componentes reales producen peque\xF1as ca\xEDdas de voltaje."),check:Ba,demo:[["switch","lamp9",!0]]},ea("setup",{dial:"VDC",ranges:["AUTO",20],points:["tp1","tp6"],labels:Si,setup:n=>n.setup({damaged:{red:!0}})}),sn("bat_c",{labels:Si,pair:["tp1","tp6"],focus:"lamp9",expect:"9.00 V",cond:Ba,record:o("Battery \u2014 switch closed","Bater\xEDa: interruptor cerrado"),title:o("Across the battery (switch closed)","Entre los terminales de la bater\xEDa (cerrado)"),goal:o("Find the voltage across the battery while the lamp is on.","Hallar el voltaje de la bater\xEDa con la l\xE1mpara encendida."),why:o("The source is always the first thing to check: everything else depends on it.","La fuente es siempre lo primero que se revisa: todo lo dem\xE1s depende de ella."),meaning:o("The battery supplies 9 V to the loop.","La bater\xEDa entrega 9 V al lazo."),predict:pn(0,es)}),sn("lamp_c",{labels:Si,pair:["tp4","tp5"],focus:"lamp9",expect:"9.00 V",cond:Ba,record:o("Lamp \u2014 switch closed","L\xE1mpara: interruptor cerrado"),title:o("Across the lamp (switch closed)","Entre los extremos de la l\xE1mpara (cerrado)"),goal:o("Find the voltage across the lamp while it is on.","Hallar el voltaje de la l\xE1mpara mientras est\xE1 encendida."),why:o("\u201CAcross the lamp\u201D means one probe on each side of the lamp: TP4 and TP5.","\xABEntre los extremos de la l\xE1mpara\xBB significa una punta a cada lado: TP4 y TP5."),meaning:o("All 9 V appear across the lamp: it is the only part in the loop that opposes the current.","Los 9 V aparecen completos en la l\xE1mpara: es la \xFAnica parte del lazo que se opone a la corriente."),predict:pn(0,es)}),sn("sw_c",{labels:Si,pair:["tp2","tp3"],focus:"lamp9",expect:"0.000 V",cond:Ba,record:o("Switch \u2014 switch closed","Interruptor: cerrado"),title:o("Across the closed switch","Entre los extremos del interruptor cerrado"),goal:o("Find the voltage across the switch while it is closed.","Hallar el voltaje del interruptor mientras est\xE1 cerrado."),why:o("A closed ideal switch is just a piece of metal joining TP2 and TP3.","Un interruptor ideal cerrado es solo un trozo de metal que une TP2 y TP3."),meaning:o("Both sides of a closed ideal switch are the same node, so the difference is 0 V \u2014 even though current is flowing through it. A real switch would show a very small drop.","Ambos lados de un interruptor ideal cerrado son el mismo nodo, as\xED que la diferencia es 0 V, aunque circule corriente por \xE9l. Un interruptor real mostrar\xEDa una ca\xEDda muy peque\xF1a."),predict:pn(1,es)}),sn("bat_o",{labels:Si,pair:["tp1","tp6"],focus:"lamp9",expect:"9.00 V",cond:oo,pre:o("First click the switch to open it (the lamp goes off).","Primero haz clic en el interruptor para abrirlo (la l\xE1mpara se apaga)."),demoPre:[["switch","lamp9",!1]],record:o("Battery \u2014 switch open","Bater\xEDa: interruptor abierto"),title:o("Across the battery (switch open)","Entre los terminales de la bater\xEDa (abierto)"),goal:o("Check the battery again with the lamp off.","Revisar la bater\xEDa otra vez con la l\xE1mpara apagada."),why:o("Opening the switch stops the current. Does the battery voltage disappear?","Abrir el interruptor detiene la corriente. \xBFDesaparece el voltaje de la bater\xEDa?"),meaning:o("The battery still has 9 V across it. Voltage does not need current to exist.","La bater\xEDa sigue teniendo 9 V. El voltaje no necesita corriente para existir."),predict:pn(0,es)}),sn("lamp_o",{labels:Si,pair:["tp4","tp5"],focus:"lamp9",expect:"0.000 V",cond:oo,record:o("Lamp \u2014 switch open","L\xE1mpara: interruptor abierto"),title:o("Across the lamp (switch open)","Entre los extremos de la l\xE1mpara (abierto)"),goal:o("Find the voltage across the lamp while it is off.","Hallar el voltaje de la l\xE1mpara mientras est\xE1 apagada."),why:o("The lamp is intact but no current flows through it.","La l\xE1mpara est\xE1 intacta pero no circula corriente por ella."),meaning:o("With no current, nothing pushes charge through the lamp, so both of its sides sit at the same potential: 0 V across it. This zero does not mean the circuit is unpowered \u2014 the battery is still there.","Sin corriente, nada empuja carga a trav\xE9s de la l\xE1mpara, as\xED que sus dos lados quedan al mismo potencial: 0 V entre sus extremos. Este cero no significa que el circuito est\xE9 sin energ\xEDa: la bater\xEDa sigue ah\xED."),predict:pn(1,es)}),sn("sw_o",{labels:Si,pair:["tp2","tp3"],focus:"lamp9",expect:"9.00 V",cond:oo,record:o("Switch \u2014 switch open","Interruptor: abierto"),title:o("Across the open switch","Entre los extremos del interruptor abierto"),goal:o("Find the voltage across the switch while it is open.","Hallar el voltaje del interruptor mientras est\xE1 abierto."),why:o("This is the result that surprises most beginners.","Este es el resultado que sorprende a la mayor\xEDa de los principiantes."),meaning:o("TP2 is still joined to battery +. TP3 is joined through the unlit lamp to battery \u2212. So the full 9 V appears across the gap in the switch, although no current flows around the loop.","TP2 sigue unido al + de la bater\xEDa. TP3 est\xE1 unido, a trav\xE9s de la l\xE1mpara apagada, al \u2212 de la bater\xEDa. Por eso los 9 V completos aparecen en el hueco del interruptor, aunque no circule corriente por el lazo."),predict:pn(0,es)}),{id:"qopen",kind:"quiz",focus:"lamp9",title:o("Check: the open switch","Comprobaci\xF3n: el interruptor abierto"),goal:o("Explain the 9 V across the open switch.","Explicar los 9 V en el interruptor abierto."),why:o("If you can explain this, you understand voltage as a difference between two points.","Si puedes explicar esto, entiendes el voltaje como diferencia entre dos puntos."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("Why can an open switch have 9 V across it when no current flows?","\xBFPor qu\xE9 un interruptor abierto puede tener 9 V entre sus extremos si no circula corriente?"),opts:[o("One side is still connected to battery + and the other side, through the lamp, to battery \u2212","Un lado sigue conectado al + de la bater\xEDa y el otro, a trav\xE9s de la l\xE1mpara, al \u2212 de la bater\xEDa"),o("Current is secretly flowing through the open switch","La corriente circula en secreto por el interruptor abierto"),o("The meter is adding its own 9 V","El medidor a\xF1ade sus propios 9 V")],correct:0,explain:o("The gap in the switch is the one place where the two sides of the battery face each other, so the whole battery voltage shows up there. Results in this lesson are idealized.","El hueco del interruptor es el \xFAnico lugar donde los dos lados de la bater\xEDa quedan frente a frente, as\xED que ah\xED aparece todo el voltaje de la bater\xEDa. Los resultados de esta lecci\xF3n son ideales.")}},ns("remove","lamp9"),is("off"),si("sum",[o("Closed (ideal): battery 9 V, lamp 9 V, switch 0 V. Open: battery 9 V, lamp 0 V, switch 9 V.","Cerrado (ideal): bater\xEDa 9 V, l\xE1mpara 9 V, interruptor 0 V. Abierto: bater\xEDa 9 V, l\xE1mpara 0 V, interruptor 9 V."),o("An open switch can have full voltage across it with no current flowing.","Un interruptor abierto puede tener el voltaje completo entre sus extremos sin que circule corriente."),o("These values are idealized; real wiring and parts add small voltage drops.","Estos valores son ideales; el cableado y las piezas reales a\xF1aden peque\xF1as ca\xEDdas de voltaje."),On.zero])]},Pd={ac1:"AC 1",ac2:"AC 2"},Ld={id:"l6",minutes:11,diagram:"ac12",title:o("Introductory AC measurement","Introducci\xF3n a la medici\xF3n de CA"),blurb:o("DC versus AC, RMS, and what a wrong AC/DC setting does \u2014 on a simulated 12 V source only.","CC frente a CA, RMS y qu\xE9 pasa con un ajuste CA/CC equivocado, solo en una fuente simulada de 12 V."),init:n=>n.reset(),steps:[{id:"dcac",kind:"quiz",focus:"ac12",diagram:"wave",title:o("DC and AC","CC y CA"),goal:o("Tell DC and AC apart.","Distinguir CC y CA."),why:o("DC (direct current) keeps the same polarity: + stays +. AC (alternating current) periodically reverses polarity: the two terminals keep swapping which one is higher, many times per second.","La CC (corriente continua) mantiene la misma polaridad: + sigue siendo +. La CA (corriente alterna) invierte la polaridad peri\xF3dicamente: los dos terminales intercambian cu\xE1l es el m\xE1s alto muchas veces por segundo."),action:o("Watch the two moving traces, then choose the best answer.","Observa los dos trazos en movimiento y elige la mejor respuesta."),quiz:{q:o("Which trace is AC?","\xBFQu\xE9 trazo es CA?"),opts:[o("The wave that swings above and below the zero line","La onda que oscila por encima y por debajo de la l\xEDnea de cero"),o("The flat line that stays above zero","La l\xEDnea plana que permanece sobre cero")],correct:0,explain:o("Above the line one terminal is higher; below it the other one is. That repeated reversal is what \u201Calternating\u201D means. This lesson uses only the simulated, isolated 12 V AC training source \u2014 never a wall outlet.","Sobre la l\xEDnea un terminal es el m\xE1s alto; debajo lo es el otro. Esa inversi\xF3n repetida es lo que significa \xABalterna\xBB. Esta lecci\xF3n usa solo la fuente de pr\xE1ctica de 12 V CA simulada y aislada, nunca un tomacorriente.")}},{id:"rms",kind:"quiz",focus:"ac12",diagram:"wave",title:o("RMS: the effective value","RMS: el valor eficaz"),goal:o("Understand the single number a meter shows for AC.","Entender el \xFAnico n\xFAmero que un medidor muestra para CA."),why:o("An AC voltage changes all the time, so the meter reports its RMS value: the effective value \u2014 the steady DC voltage that would heat a lamp filament just as much. The wave\u2019s peak is higher than its RMS value.","Un voltaje de CA cambia todo el tiempo, as\xED que el medidor informa su valor RMS: el valor eficaz, es decir, el voltaje de CC constante que calentar\xEDa igual el filamento de una l\xE1mpara. El pico de la onda es mayor que su valor RMS."),action:o("Look at the RMS line and the peak marker on the wave, then answer.","Mira la l\xEDnea RMS y la marca de pico en la onda y responde."),quiz:{q:o("The source is a sine wave of 12 V RMS. How high is its peak?","La fuente es una onda senoidal de 12 V RMS. \xBFCu\xE1nto vale su pico?"),opts:[o("About 17 V \u2014 higher than the RMS value","Unos 17 V: mayor que el valor RMS"),o("Exactly 12 V \u2014 peak and RMS are the same","Exactamente 12 V: pico y RMS son iguales"),o("About 6 V","Unos 6 V")],correct:0,explain:o("For a sine wave the peak is about 1.41 times the RMS value: 12 V RMS peaks near 17 V. Never read an RMS number as the peak.","En una onda senoidal el pico es unas 1,41 veces el valor RMS: 12 V RMS alcanzan picos de unos 17 V. Nunca leas un n\xFAmero RMS como si fuera el pico.")}},ea("setup",{dial:"VAC",points:["ac1","ac2"],labels:Pd,diagram:"ac12"}),{id:"mac",kind:"do",focus:"ac12",hi:["term:ac1","term:ac2"],pair:["ac1","ac2"],title:o("Measure 12 V AC","Medir 12 V CA"),goal:o("Measure the AC training source in the correct mode.","Medir la fuente de pr\xE1ctica de CA en el modo correcto."),why:o("For AC voltage the selector must be on V~. Black still goes on first.","Para voltaje de CA el selector debe estar en V~. La negra sigue coloc\xE1ndose primero."),action:o("Touch black to AC 2 and red to AC 1.","Toca AC 2 con la negra y AC 1 con la roja."),observe:o("About 12.00 V with \u201CAC\u201D on the display and no polarity sign.","Unos 12.00 V con \xABAC\xBB en la pantalla y sin signo de polaridad."),meaning:o("The meter shows the RMS value of the simulated sine wave. Because the polarity keeps reversing, an AC reading has no plus or minus.","El medidor muestra el valor RMS de la onda senoidal simulada. Como la polaridad se invierte continuamente, una lectura de CA no tiene signo."),check:n=>ts(n,"ac1","ac2")&&an(n)&&Ke(n).dial==="VAC",demo:[["touch","black","ac2"],["touch","red","ac1"],["wait",1700]]},{id:"mismatch",kind:"do",focus:"ac12",hi:["dialpos:VDC"],expect:["mode_mismatch"],title:o("The wrong setting on purpose","El ajuste equivocado, a prop\xF3sito"),goal:o("See what an AC/DC mismatch looks like, so you can recognize it.","Ver c\xF3mo se ve un desajuste CA/CC para poder reconocerlo."),why:o("Measuring an AC source on V\u2393 (or a DC source on V~) is a very common slip.","Medir una fuente de CA en V\u2393 (o una de CC en V~) es un descuido muy com\xFAn."),action:o("Remove red, then black. Turn the selector to V\u2393 and confirm the function in the check list. Then touch black to AC 2 and red to AC 1 again.","Retira la roja y luego la negra. Gira el selector a V\u2393 y confirma la funci\xF3n en la lista. Luego vuelve a tocar AC 2 con la negra y AC 1 con la roja."),observe:o("This simulated meter shows about 0.000 V and the coach flags an AC/DC mismatch \u2014 expected here.","Este medidor simulado muestra unos 0.000 V y el instructor se\xF1ala un desajuste CA/CC; aqu\xED es lo esperado."),meaning:o("The source is still delivering 12 V AC \u2014 the number is misleading. Real meters do not all show the same thing in the wrong mode. A near-zero display never proves that voltage is absent.","La fuente sigue entregando 12 V CA: el n\xFAmero es enga\xF1oso. No todos los medidores reales muestran lo mismo en el modo equivocado. Una pantalla cercana a cero nunca demuestra que no haya voltaje."),subs:[{label:o("Selector on V\u2393","Selector en V\u2393"),ok:n=>Ke(n).dial==="VDC"},{label:o("Probes back on AC 1 and AC 2, reading steady","Puntas de nuevo en AC 1 y AC 2, lectura estable"),ok:n=>ts(n,"ac1","ac2")&&an(n)&&Ke(n).dial==="VDC"}],demo:[["lift","red"],["lift","black"],["dial","VDC"],["confirm","func"],["touch","black","ac2"],["touch","red","ac1"],["wait",2e3]]},{id:"fix",kind:"do",focus:"ac12",hi:["dialpos:VAC"],title:o("Correct the setting","Corregir el ajuste"),goal:o("Put the mistake right and measure properly.","Corregir el error y medir correctamente."),why:o("The function may only be changed with the probes off the circuit.","La funci\xF3n solo puede cambiarse con las puntas fuera del circuito."),action:o("Remove red, then black. Turn the selector to V~, confirm the function, and measure AC 1 to AC 2 again.","Retira la roja y luego la negra. Gira el selector a V~, confirma la funci\xF3n y vuelve a medir entre AC 1 y AC 2."),observe:o("About 12.00 V AC again.","De nuevo unos 12.00 V CA."),meaning:o("Checking the mode on the display before trusting a number is part of every measurement.","Comprobar el modo en la pantalla antes de fiarte de un n\xFAmero forma parte de toda medici\xF3n."),check:n=>ts(n,"ac1","ac2")&&an(n)&&Ke(n).dial==="VAC",demo:[["lift","red"],["lift","black"],["dial","VAC"],["confirm","func"],["touch","black","ac2"],["touch","red","ac1"],["wait",1700]]},ns("remove","ac12"),is("off"),si("sum",[o("DC keeps its polarity; AC periodically reverses it.","La CC mantiene su polaridad; la CA la invierte peri\xF3dicamente."),o("V~ shows RMS, the effective value. The peak of a sine wave is higher (12 V RMS \u2248 17 V peak).","V~ muestra el RMS, el valor eficaz. El pico de una onda senoidal es mayor (12 V RMS \u2248 17 V de pico)."),o("A wrong AC/DC setting gives a misleading number, and real meters differ in what they show.","Un ajuste CA/CC equivocado da un n\xFAmero enga\xF1oso, y los medidores reales difieren en lo que muestran."),On.zero])]},ii={x1:"X1 (+24 V)",x2:"X2 (0 V)",x3:"X3",x4:"X4",x5:"X5",x6:"X6"},co=n=>Ke(n).switches.panel24,lo=n=>co(n)&&!Ke(n).faults.w2open,za=n=>co(n)&&Ke(n).faults.w2open,Id={id:"l7",minutes:15,diagram:"panel24",title:o("Connection to industrial controls","Relaci\xF3n con controles industriales"),blurb:o("A virtual 24 V DC training panel: a healthy circuit, then an open-wire fault found by evidence.","Un panel virtual de pr\xE1ctica de 24 V CC: un circuito sano y luego una falla de cable abierto hallada con evidencia."),init:n=>n.reset(),steps:[{id:"intro",kind:"quiz",focus:"panel24",title:o("The 24 V training panel","El panel de pr\xE1ctica de 24 V"),goal:o("Understand what this panel is and what \u201C0 V\u201D means on it.","Entender qu\xE9 es este panel y qu\xE9 significa \xAB0 V\xBB en \xE9l."),why:o("Many control circuits run on 24 V DC. This panel is completely virtual, isolated and current-limited: a +24 V terminal, a 0 V terminal, a switch S1 and an indicator lamp H1. 0 V is the point this circuit\u2019s designer chose as the reference for its voltages.","Muchos circuitos de control funcionan con 24 V CC. Este panel es totalmente virtual, aislado y con corriente limitada: un terminal +24 V, un terminal 0 V, un interruptor S1 y una l\xE1mpara indicadora H1. 0 V es el punto que el dise\xF1ador de este circuito eligi\xF3 como referencia de sus voltajes."),action:o("Choose the best answer.","Elige la mejor respuesta."),quiz:{q:o("On this panel, what is the terminal marked 0 V?","En este panel, \xBFqu\xE9 es el terminal marcado 0 V?"),opts:[o("The chosen circuit reference \u2014 not automatically protective earth","La referencia elegida del circuito; no es autom\xE1ticamente la tierra de protecci\xF3n"),o("Always the same thing as protective earth","Siempre lo mismo que la tierra de protecci\xF3n"),o("A terminal that can never have voltage on it relative to anything","Un terminal que nunca puede tener voltaje respecto a nada")],correct:0,explain:o("\u201C0 V\u201D only means \u201Cwe call this point zero\u201D. Whether it is also connected to protective earth depends on the installation and its drawings. This lesson stays on the simulated panel \u2014 it is not a guide to opening real industrial equipment.","\xAB0 V\xBB solo significa \xABa este punto lo llamamos cero\xBB. Que adem\xE1s est\xE9 conectado a la tierra de protecci\xF3n depende de la instalaci\xF3n y de sus planos. Esta lecci\xF3n se queda en el panel simulado; no es una gu\xEDa para abrir equipos industriales reales.")}},{id:"close",kind:"do",focus:"panel24",hi:["switch:panel24"],title:o("Switch the circuit on","Encender el circuito"),goal:o("See the healthy circuit working.","Ver funcionar el circuito sano."),why:o("Troubleshooting starts with knowing what \u201Cnormal\u201D looks like.","El diagn\xF3stico empieza por saber c\xF3mo se ve lo \xABnormal\xBB."),action:o("Click switch S1 on the 24 V panel to close it.","Haz clic en el interruptor S1 del panel de 24 V para cerrarlo."),observe:o("S1 shows CLOSED and lamp H1 shows LAMP ON.","S1 muestra CERRADO y la l\xE1mpara H1 muestra L\xC1MPARA ENCENDIDA."),meaning:o("Current path: +24 V (X1) \u2192 X3 \u2192 S1 \u2192 X4 \u2192 wire W2 \u2192 X5 \u2192 lamp H1 \u2192 X6 \u2192 0 V (X2).","Camino de la corriente: +24 V (X1) \u2192 X3 \u2192 S1 \u2192 X4 \u2192 cable W2 \u2192 X5 \u2192 l\xE1mpara H1 \u2192 X6 \u2192 0 V (X2)."),check:co,demo:[["switch","panel24",!0]]},ea("setup",{dial:"VDC",ranges:["AUTO",200],points:["x1","x2"],labels:ii}),sn("h_sup",{labels:ii,pair:["x1","x2"],focus:"panel24",expect:"24.0 V",cond:lo,record:o("Healthy \u2014 supply X1 to X2","Sano: alimentaci\xF3n X1 a X2"),title:o("Healthy: check the supply","Sano: revisar la alimentaci\xF3n"),goal:o("Step 1 and 2 of the sequence: predict, then check the supply across +24 V and 0 V.","Pasos 1 y 2 de la secuencia: predecir y luego revisar la alimentaci\xF3n entre +24 V y 0 V."),why:o("If the supply is missing, nothing downstream can work \u2014 so it is always checked first.","Si falta la alimentaci\xF3n, nada de lo que sigue puede funcionar; por eso siempre se revisa primero."),meaning:o("The supply is present. On AUTO the meter uses its 200 V range, so you see one decimal place.","La alimentaci\xF3n est\xE1 presente. En AUTO el medidor usa su rango de 200 V, as\xED que ves un decimal."),predict:pn(0,wi)}),sn("h_out",{labels:ii,pair:["x4","x2"],focus:"panel24",expect:"24.0 V",cond:lo,record:o("Healthy \u2014 switched output X4 to 0 V","Sano: salida conmutada X4 a 0 V"),title:o("Healthy: switched output to 0 V","Sano: salida conmutada respecto a 0 V"),goal:o("Step 3: measure the switched output (X4) relative to 0 V.","Paso 3: medir la salida conmutada (X4) respecto a 0 V."),why:o("\u201CRelative to 0 V\u201D means the black probe stays on the 0 V reference while the red probe visits the point of interest.","\xABRespecto a 0 V\xBB significa que la punta negra se queda en la referencia de 0 V mientras la roja visita el punto de inter\xE9s."),meaning:o("With S1 closed, 24 V reaches the output side of the switch.","Con S1 cerrado, los 24 V llegan al lado de salida del interruptor."),predict:pn(0,wi)}),sn("h_lamp",{labels:ii,pair:["x5","x6"],focus:"panel24",expect:"24.0 V",cond:lo,record:o("Healthy \u2014 across lamp X5 to X6","Sano: l\xE1mpara X5 a X6"),title:o("Healthy: across the lamp","Sano: entre los extremos de la l\xE1mpara"),goal:o("Step 4: measure across the lamp.","Paso 4: medir entre los extremos de la l\xE1mpara."),why:o("The lamp lights only when voltage actually reaches both of its terminals.","La l\xE1mpara enciende solo cuando el voltaje llega de verdad a sus dos terminales."),meaning:o("Step 5: compared with the diagram, every reading matches a healthy circuit \u2014 24 V supply, 24 V at the switched output, 24 V across the lamp, lamp on.","Paso 5: comparadas con el diagrama, todas las lecturas corresponden a un circuito sano: 24 V de alimentaci\xF3n, 24 V en la salida conmutada, 24 V en la l\xE1mpara, l\xE1mpara encendida."),predict:pn(0,wi)}),{id:"fault",kind:"ack",focus:"panel24",title:o("A fault appears","Aparece una falla"),goal:o("Start a fault-finding task the right way.","Empezar bien una tarea de b\xFAsqueda de fallas."),why:o("The instructor has put one fault into the virtual panel. S1 is closed but lamp H1 stays off. Guessing (\u201Cmust be the lamp\u201D) is how wrong parts get replaced.","El instructor introdujo una falla en el panel virtual. S1 est\xE1 cerrado pero la l\xE1mpara H1 sigue apagada. Adivinar (\xABdebe ser la l\xE1mpara\xBB) es la forma de cambiar piezas equivocadas."),action:o("Look at the panel and the diagram: S1 CLOSED, LAMP OFF. Then press Continue and repeat the same three measurements.","Mira el panel y el diagrama: S1 CERRADO, L\xC1MPARA APAGADA. Luego pulsa Continuar y repite las mismas tres mediciones."),observe:o("The probes have been put down for you, and the lamp is off.","Las puntas se dejaron en reposo y la l\xE1mpara est\xE1 apagada."),meaning:o("You will collect evidence first and name the fault last.","Primero reunir\xE1s evidencia y al final nombrar\xE1s la falla."),setup:n=>n.setup({probes:{red:null,black:null},near:{red:null,black:null},faults:{w2open:!0},faultRevealed:!1,switches:{panel24:!0},intended:[]})},sn("f_sup",{labels:ii,pair:["x1","x2"],focus:"panel24",expect:"24.0 V",cond:za,record:o("Fault \u2014 supply X1 to X2","Falla: alimentaci\xF3n X1 a X2"),title:o("Fault: check the supply","Falla: revisar la alimentaci\xF3n"),goal:o("Check the supply across +24 V and 0 V.","Revisar la alimentaci\xF3n entre +24 V y 0 V."),why:o("Predict what a healthy circuit would show here, then compare.","Predice lo que mostrar\xEDa aqu\xED un circuito sano y compara."),meaning:o("The supply is fine, so the problem lies somewhere after it.","La alimentaci\xF3n est\xE1 bien, as\xED que el problema est\xE1 en alg\xFAn punto posterior."),predict:{q:o("What would a healthy circuit show here?","\xBFQu\xE9 mostrar\xEDa aqu\xED un circuito sano?"),opts:wi,correct:0}}),sn("f_out",{labels:ii,pair:["x4","x2"],focus:"panel24",expect:"24.0 V",cond:za,record:o("Fault \u2014 switched output X4 to 0 V","Falla: salida conmutada X4 a 0 V"),title:o("Fault: switched output to 0 V","Falla: salida conmutada respecto a 0 V"),goal:o("Measure the switched output (X4) relative to 0 V.","Medir la salida conmutada (X4) respecto a 0 V."),why:o("This tells you whether the switch is passing the supply on.","Esto te dice si el interruptor est\xE1 dejando pasar la alimentaci\xF3n."),meaning:o("24 V arrives at X4, so the switch is doing its job.","Llegan 24 V a X4, as\xED que el interruptor cumple su funci\xF3n."),predict:{q:o("What would a healthy circuit show here?","\xBFQu\xE9 mostrar\xEDa aqu\xED un circuito sano?"),opts:wi,correct:0}}),sn("f_lamp",{labels:ii,pair:["x5","x6"],focus:"panel24",expect:"0.000 V",cond:za,record:o("Fault \u2014 across lamp X5 to X6","Falla: l\xE1mpara X5 a X6"),title:o("Fault: across the lamp","Falla: entre los extremos de la l\xE1mpara"),goal:o("Measure across the lamp.","Medir entre los extremos de la l\xE1mpara."),why:o("A healthy circuit shows 24 V here. A different reading is evidence.","Un circuito sano muestra 24 V aqu\xED. Una lectura distinta es evidencia."),meaning:o("About 0 V: the lamp is not receiving voltage. On its own this reading does not say why \u2014 an open switch, a missing supply or a broken wire would all look like this.","Unos 0 V: la l\xE1mpara no recibe voltaje. Por s\xED sola esta lectura no dice por qu\xE9: un interruptor abierto, la falta de alimentaci\xF3n o un cable roto se ver\xEDan igual."),predict:{q:o("What would a healthy circuit show here?","\xBFQu\xE9 mostrar\xEDa aqu\xED un circuito sano?"),opts:wi,correct:0}}),sn("f_x5",{labels:ii,pair:["x5","x2"],focus:"panel24",expect:"0.000 V",cond:za,record:o("Fault \u2014 lamp input X5 to 0 V","Falla: entrada de l\xE1mpara X5 a 0 V"),title:o("Fault: where does the voltage stop?","Falla: \xBFd\xF3nde se detiene el voltaje?"),goal:o("Find out whether 24 V reaches the lamp\u2019s input terminal X5.","Averiguar si los 24 V llegan al terminal de entrada X5 de la l\xE1mpara."),why:o("X4 has 24 V. On the diagram, X4 and X5 are joined by wire W2, so a healthy X5 must show the same.","X4 tiene 24 V. En el diagrama, X4 y X5 est\xE1n unidos por el cable W2, as\xED que un X5 sano debe mostrar lo mismo."),meaning:o("24 V at X4 but about 0 V at X5: the voltage is lost between two points the diagram says are joined.","24 V en X4 pero unos 0 V en X5: el voltaje se pierde entre dos puntos que el diagrama dice que est\xE1n unidos."),predict:{q:o("What would a healthy circuit show here?","\xBFQu\xE9 mostrar\xEDa aqu\xED un circuito sano?"),opts:wi,correct:0}}),{id:"diagnose",kind:"quiz",focus:"panel24",title:o("Explain the evidence, then name the fault","Explicar la evidencia y luego nombrar la falla"),goal:o("Step 6: explain the evidence before naming a fault.","Paso 6: explicar la evidencia antes de nombrar una falla."),why:o("Your readings: supply 24 V \xB7 X4 to 0 V 24 V \xB7 across lamp 0 V \xB7 X5 to 0 V 0 V.","Tus lecturas: alimentaci\xF3n 24 V \xB7 X4 a 0 V 24 V \xB7 l\xE1mpara 0 V \xB7 X5 a 0 V 0 V."),action:o("Choose the conclusion that the evidence supports.","Elige la conclusi\xF3n que la evidencia respalda."),quiz:{q:o("Which conclusion fits all four readings and the diagram?","\xBFQu\xE9 conclusi\xF3n concuerda con las cuatro lecturas y el diagrama?"),opts:[o("There is an open in the connection between X4 and X5 (wire W2 or its terminals)","Hay una interrupci\xF3n en la conexi\xF3n entre X4 y X5 (el cable W2 o sus terminales)"),o("The lamp is burnt out, because it has 0 V across it","La l\xE1mpara est\xE1 fundida, porque tiene 0 V entre sus extremos"),o("The 24 V supply has failed","La alimentaci\xF3n de 24 V fall\xF3"),o("Switch S1 is not closing","El interruptor S1 no cierra")],correct:0,explain:o("24 V is present at X4 and absent at X5, and only W2 lies between them. A burnt-out lamp would be an open lamp with 24 V across it, not 0 V. One reading never proves one specific failed part \u2014 the chain of readings does.","Hay 24 V en X4 y no en X5, y entre ambos solo est\xE1 W2. Una l\xE1mpara fundida ser\xEDa una l\xE1mpara abierta con 24 V entre sus extremos, no 0 V. Una sola lectura nunca demuestra una pieza concreta averiada; la cadena de lecturas s\xED."),onCorrect:n=>n.setup({faultRevealed:!0})}},ns("remove","panel24"),is("off"),si("sum",[o("Predict \u2192 check supply \u2192 switched output relative to 0 V \u2192 across the load \u2192 compare with the diagram \u2192 explain the evidence before naming a fault.","Predecir \u2192 revisar alimentaci\xF3n \u2192 salida conmutada respecto a 0 V \u2192 entre los extremos de la carga \u2192 comparar con el diagrama \u2192 explicar la evidencia antes de nombrar una falla."),o("0 V is the chosen circuit reference, not automatically protective earth.","0 V es la referencia elegida del circuito, no autom\xE1ticamente la tierra de protecci\xF3n."),o("One voltage reading never proves that one specific component has failed.","Una sola lectura de voltaje nunca demuestra que un componente concreto haya fallado."),On.qualify])]},Un=[Md,wd,Sd,Td,Cd,Rd,Ld,Id],th={on:fn,pairOn:ts,parked:Ks,meas:an,intendedIs:Qs,READY:eh};var{on:Dd,pairOn:kd,meas:nh,READY:ho}=th,Ai=n=>n.state,Wt=[{id:"a1",lesson:"l0",focus:"jacks",diagram:"none",title:o("Identify COM and the voltage jack","Identificar COM y el borne de voltaje"),prompt:o("Connect both test leads to the meter the way a voltage measurement needs. Then submit.","Conecta ambos cables de prueba al medidor como lo requiere una medici\xF3n de voltaje. Luego env\xEDa."),setup:n=>n.reset(),fails:[{ok:n=>Ai(n).plugs.black==="COM",msg:o("The black lead is not in COM.","El cable negro no est\xE1 en COM.")},{ok:n=>Ai(n).plugs.red==="V",msg:o("The red lead is not in V/\u03A9.","El cable rojo no est\xE1 en V/\u03A9.")}],explain:o("Black \u2192 COM (the reference). Red \u2192 V/\u03A9. The A and mA jacks are for current and are never used for voltage.","Negro \u2192 COM (la referencia). Rojo \u2192 V/\u03A9. Los bornes A y mA son para corriente y nunca se usan para voltaje.")},{id:"a2",lesson:"l2",focus:"dial",diagram:"none",title:o("Select DC voltage","Seleccionar voltaje de CC"),prompt:o("Set the meter to measure the voltage of a battery. Then submit.","Ajusta el medidor para medir el voltaje de una pila. Luego env\xEDa."),setup:n=>n.reset({plugs:{red:"V",black:"COM"}}),fails:[{ok:n=>Ai(n).dial==="VDC",msg:o("The selector is not on V\u2393.","El selector no est\xE1 en V\u2393.")}],explain:o("A battery is a DC source, so the selector goes to V\u2393. The display confirms it with \u201CDC\u201D.","Una pila es una fuente de CC, as\xED que el selector va en V\u2393. La pantalla lo confirma con \xABDC\xBB.")},{id:"a3",lesson:"l2",focus:"aa",diagram:"aa",title:o("Measure the AA battery","Medir la pila AA"),prompt:o("Starting from scratch, measure the AA battery with red on + and black on \u2212, including the full pre-measurement check. Leave the probes connected, enter the reading, and submit.","Empezando desde cero, mide la pila AA con la roja en + y la negra en \u2212, incluida toda la comprobaci\xF3n previa. Deja las puntas conectadas, ingresa la lectura y env\xEDa."),setup:n=>n.reset({range:200}),entry:{type:"reading"},fails:[{ok:n=>Dd(n,"aa+","aa-"),msg:o("The probes are not on AA + (red) and AA \u2212 (black).","Las puntas no est\xE1n en AA + (roja) y AA \u2212 (negra).")},{ok:n=>Ai(n).dial==="VDC",msg:o("The meter is not on V\u2393.","El medidor no est\xE1 en V\u2393.")},{ok:n=>!Ai(n).hold,msg:o("HOLD is on, so the display is not live.","HOLD est\xE1 activo, as\xED que la pantalla no est\xE1 en vivo.")},{ok:n=>!n.display.ol,msg:o("The display shows overrange (OL): the range is too small.","La pantalla muestra sobrerrango (OL): el rango es demasiado peque\xF1o.")},{ok:n=>nh(n),msg:o("There is no steady two-point reading yet.","A\xFAn no hay una lectura estable entre dos puntos.")}],explain:o("Inspect \u2192 black in COM, red in V/\u03A9 \u2192 V\u2393 and range \u2192 identify AA + and AA \u2212 \u2192 black on \u2212, red on + \u2192 read sign, number and unit: about +1.58 V DC.","Inspeccionar \u2192 negro en COM, rojo en V/\u03A9 \u2192 V\u2393 y rango \u2192 identificar AA + y AA \u2212 \u2192 negra en \u2212, roja en + \u2192 leer signo, n\xFAmero y unidad: unos +1,58 V CC.")},{id:"a4",lesson:"l3",focus:"aa",diagram:"aa",title:o("Explain a negative reading","Explicar una lectura negativa"),prompt:o("Choose the best explanation.","Elige la mejor explicaci\xF3n."),setup:n=>n.reset(),quiz:{q:o("On a battery, the meter shows \u22121.58 V DC. What does the minus sign mean?","En una pila, el medidor muestra \u22121,58 V CC. \xBFQu\xE9 significa el signo menos?"),opts:[o("The battery is faulty","La pila est\xE1 defectuosa"),o("The red probe is on the lower-potential point and the black probe on the higher one","La punta roja est\xE1 en el punto de menor potencial y la negra en el de mayor"),o("The meter is in the wrong function and unsafe","El medidor est\xE1 en la funci\xF3n equivocada y es inseguro"),o("The range is too small","El rango es demasiado peque\xF1o")],correct:1},explain:o("Displayed DC voltage = potential at red \u2212 potential at black. Negative means red is on the lower point. It is a valid reading, not an unsafe connection.","Voltaje de CC mostrado = potencial en la roja \u2212 potencial en la negra. Negativo significa que la roja est\xE1 en el punto m\xE1s bajo. Es una lectura v\xE1lida, no una conexi\xF3n insegura.")},{id:"a5",lesson:"l4",focus:"display",diagram:"b9",title:o("Select a range for the 9 V battery","Elegir un rango para la bater\xEDa de 9 V"),prompt:o("You are about to measure a battery labeled 9 V using manual ranging. This meter\u2019s ranges are 2 V, 20 V and 200 V. Select the most suitable manual range, then submit.","Vas a medir una bater\xEDa rotulada 9 V usando rango manual. Los rangos de este medidor son 2 V, 20 V y 200 V. Selecciona el rango manual m\xE1s adecuado y env\xEDa."),setup:n=>n.reset({...ho,dial:"VDC",range:"AUTO"}),fails:[{ok:n=>Ai(n).range===20,msg:o("The selected range is not 20 V.","El rango elegido no es 20 V.")}],explain:o("20 V is the smallest range above 9 V: the value fits and you keep two decimals. 2 V would show overrange; 200 V would lose a decimal.","20 V es el menor rango por encima de 9 V: el valor cabe y conservas dos decimales. 2 V mostrar\xEDa sobrerrango; 200 V perder\xEDa un decimal.")},{id:"a6",lesson:"l3",focus:"lamp9",diagram:"lamp9",title:o("Explain a same-node zero reading","Explicar un cero en el mismo nodo"),prompt:o("Choose the best explanation.","Elige la mejor explicaci\xF3n."),setup:n=>n.reset({switches:{lamp9:!0}}),quiz:{q:o("The lamp is lit. Red is on TP1 and black is on TP2, which are joined by a wire. The meter shows 0.000 V. Why?","La l\xE1mpara est\xE1 encendida. La roja est\xE1 en TP1 y la negra en TP2, unidos por un cable. El medidor muestra 0.000 V. \xBFPor qu\xE9?"),opts:[o("The battery is flat","La bater\xEDa est\xE1 agotada"),o("The circuit is switched off","El circuito est\xE1 apagado"),o("Both probes are on the same node, so there is no difference between them","Ambas puntas est\xE1n en el mismo nodo, as\xED que no hay diferencia entre ellas"),o("The meter is broken","El medidor est\xE1 averiado")],correct:2},explain:o("Points joined by metal are one node, at one potential. The zero says nothing about whether the circuit is powered \u2014 here the lamp is on.","Los puntos unidos por metal son un solo nodo, a un solo potencial. El cero no dice nada sobre si el circuito est\xE1 energizado; aqu\xED la l\xE1mpara est\xE1 encendida.")},{id:"a7",lesson:"l5",focus:"lamp9",diagram:"lamp9",title:o("Measure voltage across the lamp","Medir el voltaje de la l\xE1mpara"),prompt:o("The meter is already prepared and the lamp is on. Choose your two test points, measure the voltage across the lamp, leave the probes connected, enter the reading and submit.","El medidor ya est\xE1 preparado y la l\xE1mpara est\xE1 encendida. Elige tus dos puntos de prueba, mide el voltaje entre los extremos de la l\xE1mpara, deja las puntas conectadas, ingresa la lectura y env\xEDa."),setup:n=>n.reset({...ho,dial:"VDC",range:"AUTO",switches:{lamp9:!0}}),entry:{type:"reading"},fails:[{ok:n=>kd(n,"tp4","tp5"),msg:o("The probes are not on the lamp\u2019s own two terminals (TP4 and TP5).","Las puntas no est\xE1n en los dos terminales propios de la l\xE1mpara (TP4 y TP5).")},{ok:n=>nh(n),msg:o("There is no steady two-point reading yet.","A\xFAn no hay una lectura estable entre dos puntos.")}],explain:o("\u201CAcross the lamp\u201D means one probe on each lamp terminal: TP4 and TP5. With the switch closed the idealized reading is 9.00 V (or \u22129.00 V with the probes reversed).","\xABEntre los extremos de la l\xE1mpara\xBB significa una punta en cada terminal de la l\xE1mpara: TP4 y TP5. Con el interruptor cerrado la lectura ideal es 9.00 V (o \u22129.00 V con las puntas invertidas).")},{id:"a8",lesson:"l0",focus:"jacks",diagram:"b9",title:o("Recognize an unsafe current-jack setup","Reconocer una conexi\xF3n insegura en el borne de corriente"),prompt:o("A colleague hands you this meter \u201Cready to check the 9 V battery\u201D. Look at the jacks. Answer the question, put the meter right, then submit.","Un compa\xF1ero te entrega este medidor \xABlisto para revisar la bater\xEDa de 9 V\xBB. Mira los bornes. Responde la pregunta, corrige el medidor y env\xEDa."),setup:n=>n.reset({plugs:{red:"A",black:"COM"},dial:"VDC",range:"AUTO",inspected:{meter:!0,red:!0,black:!0},checklist:{jacks:!1,func:!0,range:!0,guards:!0,bridge:!0}}),quiz:{q:o("What do you do?","\xBFQu\xE9 haces?"),opts:[o("Measure \u2014 the meter\u2019s fuse will protect it if anything is wrong","Medir: el fusible del medidor lo proteger\xE1 si algo est\xE1 mal"),o("Switch the selector to A so it matches the red lead","Girar el selector a A para que coincida con el cable rojo"),o("Stop: the red lead is in the A jack. Move it to V/\u03A9 before any voltage measurement","Detenerme: el cable rojo est\xE1 en el borne A. Pasarlo a V/\u03A9 antes de cualquier medici\xF3n de voltaje")],correct:2},fails:[{ok:n=>n.jacksOK(),msg:o("The leads are still not black in COM and red in V/\u03A9.","Los cables siguen sin estar negro en COM y rojo en V/\u03A9.")}],explain:o("With red in A, touching the battery would short it through the meter: possible damage or injury. The fuse is a last resort, not permission. Red belongs in V/\u03A9.","Con el rojo en A, tocar la bater\xEDa la pondr\xEDa en cortocircuito a trav\xE9s del medidor: posible da\xF1o o lesi\xF3n. El fusible es un \xFAltimo recurso, no un permiso. El rojo va en V/\u03A9.")},{id:"a9",lesson:"l4",focus:"display",diagram:"none",expect:["hold_stale"],title:o("Identify a stale HOLD reading","Identificar una lectura HOLD antigua"),prompt:o("Both probes are lying on the bench, touching nothing. Look at the display. Answer the question, put the meter right, then submit.","Ambas puntas est\xE1n sobre la mesa, sin tocar nada. Mira la pantalla. Responde la pregunta, corrige el medidor y env\xEDa."),setup:n=>{n.reset({...ho,dial:"VDC",range:"AUTO"}),n.presetHold({digits:"9.36"})},quiz:{q:o("The display shows 9.36 V. What is going on?","La pantalla muestra 9.36 V. \xBFQu\xE9 est\xE1 pasando?"),opts:[o("There is 9.36 V between the probe tips right now","Hay 9,36 V entre las puntas en este momento"),o("HOLD is on: this is an old, frozen value \u2014 not a live reading","HOLD est\xE1 activo: es un valor antiguo y congelado, no una lectura en vivo"),o("The meter needs a new battery","El medidor necesita una bater\xEDa nueva")],correct:1},fails:[{ok:n=>!Ai(n).hold,msg:o("HOLD is still on.","HOLD sigue activo.")}],explain:o("The HOLD flag means the number is frozen. Press HOLD again to return to live readings before trusting the display.","El aviso HOLD significa que el n\xFAmero est\xE1 congelado. Pulsa HOLD otra vez para volver a lecturas en vivo antes de fiarte de la pantalla.")},{id:"a10",lesson:"l6",focus:"front",diagram:"none",title:o("Zero does not establish safe isolation","Cero no establece un aislamiento seguro"),prompt:o("Choose the best explanation.","Elige la mejor explicaci\xF3n."),setup:n=>n.reset(),quiz:{q:o("A meter reads 0.00 V between two points. Why does that reading alone not prove the equipment is safe to touch?","Un medidor marca 0.00 V entre dos puntos. \xBFPor qu\xE9 esa lectura por s\xED sola no demuestra que el equipo sea seguro de tocar?"),opts:[o("It does prove it \u2014 zero volts means no danger","S\xED lo demuestra: cero voltios significa que no hay peligro"),o("Zero can also come from the wrong AC/DC setting, HOLD, a bad lead or contact, or both probes on the same node \u2014 and other points may still be live","El cero tambi\xE9n puede venir de un ajuste CA/CC equivocado, de HOLD, de un cable o contacto defectuoso, o de tener ambas puntas en el mismo nodo; adem\xE1s otros puntos pueden seguir energizados"),o("Because meters always read a little low","Porque los medidores siempre marcan un poco de menos")],correct:1},explain:o("A zero is only as trustworthy as the measurement behind it. Proving that real equipment is de-energized is a formal procedure for trained, authorized people \u2014 it is not taught by this simulation.","Un cero es tan fiable como la medici\xF3n que lo respalda. Demostrar que un equipo real est\xE1 sin energ\xEDa es un procedimiento formal para personas formadas y autorizadas; esta simulaci\xF3n no lo ense\xF1a.")}],ih={unsafe_jack:"l0",wrong_jack:"l0",swapped_jacks:"l0",lead_unplugged:"l2",change_connected:"l2",bridge:"l4",tip_grip:"l0",func_block:"l0",func_not_voltage:"l2",meter_off:"l2",precheck:"l2",unplanned_point:"l5",mode_mismatch:"l6",range_low:"l4",no_contact:"l3",floating:"l3",reversed:"l3",same_node:"l3",hold_stale:"l4",remove_order:"l2"};var Ha={lamp9:{pts:{tp1:[50,50],tp2:[130,50],tp3:[215,50],tp4:[310,50],tp5:[310,180],tp6:[50,180]},labels:{tp1:"TP1",tp2:"TP2",tp3:"TP3",tp4:"TP4",tp5:"TP5",tp6:"TP6"},src:"9 V",sw:"lamp9",swName:"S",lampName:{en:"Lamp",es:"L\xE1mpara"},plus:"+",minus:"\u2212"},panel24:{pts:{x1:[50,50],x3:[130,50],x4:[215,50],x5:[310,50],x6:[310,180],x2:[50,180]},labels:{x1:"X1 +24 V",x3:"X3",x4:"X4",x5:"X5",x6:"X6",x2:"X2 0 V"},src:"24 V",sw:"panel24",swName:"S1",lampName:{en:"Lamp H1",es:"L\xE1mpara H1"},plus:"+24 V",minus:"0 V",w2:!0}},ta={aa:{top:"aa+",bottom:"aa-",sym:"bat",cap:{en:"AA battery \u2014 1.5 V nominal",es:"Pila AA: 1,5 V nominal"}},b9:{top:"b9+",bottom:"b9-",sym:"bat",cap:{en:"9 V battery \u2014 9 V nominal",es:"Bater\xEDa de 9 V: 9 V nominal"}},ac12:{top:"ac1",bottom:"ac2",sym:"ac",cap:{en:"12 V AC training source (simulated, isolated)",es:"Fuente de pr\xE1ctica 12 V CA (simulada, aislada)"}}};function uo(n,e,t,i,s,a,r=0,l=-16,c="middle"){let h=s.state,u=h.intended.includes(n),d=a.hoverTerm===n,f=h.probes.red===n,g=h.probes.black===n,y=At()==="es",_=`${i}${u?y?", identificado":", identified":""}${f?y?", punta roja":", red probe":""}${g?y?", punta negra":", black probe":""}`;return`<g class="tp${u?" intended":""}${d?" hover":""}" data-term="${n}" tabindex="0" role="button" aria-label="${_t(_)}" transform="translate(${e},${t})">
    <circle class="hit" r="17"/>${u?'<circle class="ring" r="11"/>':""}<circle class="dot" r="5"/>
    <text x="${r}" y="${l}" text-anchor="${c}">${u?"\u2714 ":""}${_t(i)}</text>
    ${f?'<g class="mk mk-red"><rect x="9" y="-9" width="16" height="16" rx="3"/><text x="17" y="3.5" text-anchor="middle">R</text></g>':""}
    ${g?`<g class="mk mk-black"><circle cx="-17" cy="0" r="8.5"/><text x="-17" y="3.5" text-anchor="middle">${y?"N":"B"}</text></g>`:""}
  </g>`}function ah(n,e,t){if(!n||!e||n[0]===e[0]&&n[1]===e[1])return"";let i=(n[0]+e[0])/2,s=(n[1]+e[1])/2,a=t[0]-i,r=t[1]-s,l=Math.hypot(a,r)||1,c=Math.min(104,l);a=a/l*c,r=r/l*c;let h=i+a,u=s+r;return`<g class="vm"><path d="M${n[0]} ${n[1]}L${h} ${u}L${e[0]} ${e[1]}"/><circle cx="${h}" cy="${u}" r="13"/><text x="${h}" y="${u+4.5}" text-anchor="middle">V</text></g>`}function rh(n,e){let t=n.state;return[e[t.probes.red],e[t.probes.black]]}function Od(n,e,t){let i=Ha[n],s=e.state,a=Object.keys(i.pts),r=i.pts,[l,c,h,u,d,f]=a.map(C=>r[C]),g=s.switches[i.sw],y=e.lampOn(n),_=L(g?P.closed:P.open),m=L(y?P.lampOn:P.lampOff),p=i.w2&&s.faults.w2open&&s.faultRevealed,[E,b]=rh(e,r),M=y?[0,45,90,135,180,225,270,315].map(C=>{let I=C*Math.PI/180;return`<path class="ray" d="M${310+Math.cos(I)*20} ${115+Math.sin(I)*20}L${310+Math.cos(I)*27} ${115+Math.sin(I)*27}"/>`}).join(""):"",z=(C,I,G,S)=>uo(C,r[C][0],r[C][1],i.labels[C],e,t,I,G,S);return`<svg class="diagram" viewBox="0 0 360 226" role="group" aria-label="${_t(L(P.diagram))}">
    <path class="wire" d="M${l[0]} ${l[1]}V96 M50 134V${f[1]} M${l[0]} ${l[1]}H${c[0]} M${h[0]} ${h[1]}H${p?250:u[0]} ${p?`M274 50H${u[0]}`:""} M${u[0]} ${u[1]}V99 M310 131V${d[1]} M${d[0]} ${d[1]}H${f[0]}"/>
    <path class="comp" d="M34 96H66"/><path class="comp thick" d="M41 106H59"/><path class="comp" d="M34 124H66"/><path class="comp thick" d="M41 134H59"/>
    <path class="wire" d="M50 106V124" stroke-dasharray="2 3"/>
    <text class="lbl" x="72" y="101">${i.plus}</text><text class="lbl" x="72" y="139">${i.minus}</text><text class="lbl strong" x="16" y="119" text-anchor="middle">${i.src}</text>
    <circle class="comp fill" cx="${c[0]+14}" cy="50" r="3"/><circle class="comp fill" cx="${h[0]-14}" cy="50" r="3"/>
    <path class="comp" d="M${c[0]} 50H${c[0]+14} M${h[0]-14} 50H${h[0]}"/>
    <path class="comp thick" d="M${c[0]+14} 50L${g?h[0]-14:h[0]-22} ${g?50:27}"/>
    <text class="lbl strong" x="${(c[0]+h[0])/2}" y="${g?34:18}" text-anchor="middle">${i.swName}: ${_t(_)}</text>
    ${i.w2?`<text class="lbl" x="262" y="${p?40:43}" text-anchor="middle">W2</text>`:""}
    ${p?`<path class="break" d="M246 42L254 58M270 42L278 58"/><text class="lbl strong warn" x="262" y="26" text-anchor="middle">\u2716 ${_t(L(P.faultOpen))}</text>`:""}
    <circle class="comp${y?" lit":""}" cx="310" cy="115" r="16"/><path class="comp" d="M299 104L321 126M321 104L299 126"/>${M}
    <text class="lbl" x="284" y="103" text-anchor="end">${_t(L(i.lampName))}</text><text class="lbl strong" x="284" y="119" text-anchor="end">${_t(m)}</text>
    ${ah(E,b,[180,122])}
    ${z(a[0],0,-14,"middle")}${z(a[1],0,26,"middle")}${z(a[2],0,26,"middle")}${z(a[3],0,-14,"middle")}
    ${z(a[4],0,28,"middle")}${z(a[5],0,28,"middle")}
  </svg>`}function sh(n,e,t){let i=ta[n],s={[i.top]:[150,46],[i.bottom]:[150,184]},[a,r]=rh(e,s),l=i.sym==="bat"?`<path class="comp" d="M126 98H174"/><path class="comp thick" d="M137 110H163"/><path class="comp" d="M126 122H174"/><path class="comp thick" d="M137 134H163"/>
       <path class="wire" d="M150 46V98M150 134V184"/><text class="lbl strong" x="186" y="103">+</text><text class="lbl strong" x="186" y="139">\u2212</text>`:'<circle class="comp" cx="150" cy="115" r="24"/><path class="comp" d="M134 115q8 -18 16 0t16 0"/><path class="wire" d="M150 46V91M150 139V184"/>';return`<svg class="diagram" viewBox="0 0 360 226" role="group" aria-label="${_t(L(P.diagram))}">
    ${l}
    <text class="lbl" x="180" y="218" text-anchor="middle">${_t(L(i.cap))}</text>
    ${ah(a,r,[330,115])}
    ${uo(i.top,150,46,Tt[i.top].label,e,t,0,-16)}
    ${uo(i.bottom,150,184,Tt[i.bottom].label,e,t,-30,5,"end")}
  </svg>`}function Ud(){let e=At()==="es"?{tag:"SOLO UNA ANALOG\xCDA",hi:"Tanque alto",lo:"Tanque bajo",dp:"Diferencia de presi\xF3n \u2194 Voltaje",fl:"Agua que fluye \u2194 Corriente",nr:"Tubo estrecho \u2194 Resistencia"}:{tag:"ANALOGY ONLY",hi:"High tank",lo:"Low tank",dp:"Pressure difference \u2194 Voltage",fl:"Water flowing \u2194 Current",nr:"Narrow pipe \u2194 Resistance"};return`<svg class="diagram" viewBox="0 0 360 226" role="img" aria-label="${e.tag}: ${e.dp}; ${e.fl}; ${e.nr}">
    <rect class="tag" x="112" y="4" width="136" height="20" rx="10"/><text class="lbl strong inv" x="180" y="18" text-anchor="middle">${e.tag}</text>
    <path class="comp" d="M30 40V120H110V40"/><rect class="water" x="31" y="62" width="78" height="57"/>
    <path class="comp" d="M250 100V170H330V100"/><rect class="water" x="251" y="146" width="78" height="23"/>
    <path class="comp" d="M110 112H160L175 126H215L230 140H250 M110 120H156L171 134H211L226 148H250"/>
    <path class="flow" d="M132 106H152M146 101L153 106L146 111"/>
    <path class="dim" d="M345 62V146M340 62H350M340 146H350"/>
    <text class="lbl" x="70" y="36" text-anchor="middle">${e.hi}</text><text class="lbl" x="290" y="96" text-anchor="middle">${e.lo}</text>
    <text class="lbl strong" x="12" y="192">${e.dp}</text><text class="lbl" x="12" y="207">${e.fl}</text><text class="lbl" x="12" y="222">${e.nr}</text>
  </svg>`}function oh(n,e,t){return Ha[n]?Od(n,e,t):n==="ac12"?sh(n,e,t)+'<canvas class="wave" width="720" height="300" aria-hidden="true"></canvas>':ta[n]?sh(n,e,t):n==="analogy"?Ud():n==="wave"?'<canvas class="wave" width="720" height="380" aria-hidden="true"></canvas>':""}function po(n){return Ha[n]?Object.keys(Ha[n].pts):ta[n]?[ta[n].top,ta[n].bottom]:[]}function lh(n,e){let t=n.getContext("2d"),i=n.width,s=n.height,a=At()==="es",r=getComputedStyle(n),l=r.getPropertyValue("--ink").trim()||"#16222b",c=r.getPropertyValue("--mute").trim()||"#5c6b76",h=r.getPropertyValue("--accent").trim()||"#0b6e8a";t.clearRect(0,0,i,s),t.lineJoin="round";let u=s>320,d=176,f=i-16,g=(b,M)=>`${M?"600 ":""}${b}px system-ui, sans-serif`,y=0;u&&(t.strokeStyle=c,t.lineWidth=1.5,t.setLineDash([]),t.beginPath(),t.moveTo(d,86),t.lineTo(f,86),t.stroke(),t.strokeStyle=l,t.lineWidth=4,t.beginPath(),t.moveTo(d,42),t.lineTo(f,42),t.stroke(),t.fillStyle=l,t.font=g(30,!0),t.fillText(a?"CC: polaridad fija":"DC: steady polarity",d,28),t.fillStyle=c,t.font=g(26),t.fillText("0 V",10,92),t.fillText("+",10,48),y=118);let _=y+(s-y)/2+8,m=(s-y)/2-44,p=m/Math.SQRT2;t.strokeStyle=c,t.lineWidth=1.5,t.setLineDash([]),t.beginPath(),t.moveTo(d,_),t.lineTo(f,_),t.stroke(),t.setLineDash([10,8]),t.strokeStyle=h,t.lineWidth=2.5,t.beginPath(),t.moveTo(d,_-p),t.lineTo(f,_-p),t.stroke(),t.setLineDash([3,6]),t.strokeStyle=c,t.lineWidth=2,t.beginPath(),t.moveTo(d,_-m),t.lineTo(f,_-m),t.stroke(),t.setLineDash([]),t.strokeStyle=l,t.lineWidth=4,t.beginPath();let E=Math.PI*2*2.5/(f-d);for(let b=d;b<=f;b+=3){let M=_-m*Math.sin(E*(b-d)-e*2.2);b===d?t.moveTo(b,M):t.lineTo(b,M)}t.stroke(),t.fillStyle=l,t.font=g(30,!0),t.fillText(a?"CA: la polaridad se invierte":"AC: polarity keeps reversing",d,y+28),t.font=g(26),t.fillStyle=c,t.fillText("0 V",10,_+6),t.fillText(a?"pico \u224817 V":"peak \u224817 V",10,_-m+2),t.fillStyle=h,t.font=g(26,!0),t.fillText("RMS 12 V",10,_-p+8)}var vc="170",qi={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},$i={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Nd=0,ch=1,Vd=2;var yu=1,_c=2,Hn=3,mi=0,Jt=1,Gn=2,pi=0,ws=1,hh=2,uh=3,dh=4,Fd=5,Di=100,Bd=101,zd=102,Hd=103,Gd=104,Wd=200,qd=201,$d=202,jd=203,Xo=204,Yo=205,Xd=206,Yd=207,Zd=208,Jd=209,Kd=210,Qd=211,ep=212,tp=213,np=214,Zo=0,Jo=1,Ko=2,Es=3,Qo=4,el=5,tl=6,nl=7,vu=0,ip=1,sp=2,fi=0,ap=1,rp=2,op=3,lp=4,cp=5,hp=6,up=7;var _u=300,Cs=301,Rs=302,il=303,sl=304,qr=306,al=1e3,Oi=1001,rl=1002,wn=1003,dp=1004;var Ga=1005;var Rn=1006,fo=1007;var Ui=1008;var Xn=1009,xu=1010,bu=1011,ya=1012,xc=1013,Ni=1014,Wn=1015,Ra=1016,bc=1017,Mc=1018,Ps=1020,Mu=35902,wu=1021,Su=1022,Mn=1023,Au=1024,Tu=1025,Ss=1026,Ls=1027,Eu=1028,wc=1029,Cu=1030,Sc=1031;var Ac=1033,mr=33776,gr=33777,yr=33778,vr=33779,ol=35840,ll=35841,cl=35842,hl=35843,ul=36196,dl=37492,pl=37496,fl=37808,ml=37809,gl=37810,yl=37811,vl=37812,_l=37813,xl=37814,bl=37815,Ml=37816,wl=37817,Sl=37818,Al=37819,Tl=37820,El=37821,_r=36492,Cl=36494,Rl=36495,Ru=36283,Pl=36284,Ll=36285,Il=36286;var xr=2300,Dl=2301,mo=2302,ph=2400,fh=2401,mh=2402;var pp=3200,fp=3201;var Pu=0,mp=1,ui="",Zt="srgb",Us="srgb-linear",$r="linear",dt="srgb";var ss=7680;var gh=519,gp=512,yp=513,vp=514,Lu=515,_p=516,xp=517,bp=518,Mp=519,kl=35044;var yh="300 es",qn=2e3,br=2001,Yn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let s=this._listeners[e];if(s!==void 0){let a=s.indexOf(t);a!==-1&&s.splice(a,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let i=this._listeners[e.type];if(i!==void 0){e.target=this;let s=i.slice(0);for(let a=0,r=s.length;a<r;a++)s[a].call(this,e);e.target=null}}},Ft=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],vh=1234567,da=Math.PI/180,va=180/Math.PI;function $n(){let n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Ft[n&255]+Ft[n>>8&255]+Ft[n>>16&255]+Ft[n>>24&255]+"-"+Ft[e&255]+Ft[e>>8&255]+"-"+Ft[e>>16&15|64]+Ft[e>>24&255]+"-"+Ft[t&63|128]+Ft[t>>8&255]+"-"+Ft[t>>16&255]+Ft[t>>24&255]+Ft[i&255]+Ft[i>>8&255]+Ft[i>>16&255]+Ft[i>>24&255]).toLowerCase()}function kt(n,e,t){return Math.max(e,Math.min(t,n))}function Tc(n,e){return(n%e+e)%e}function wp(n,e,t,i,s){return i+(n-e)*(s-i)/(t-e)}function Sp(n,e,t){return n!==e?(t-n)/(e-n):0}function pa(n,e,t){return(1-t)*n+t*e}function Ap(n,e,t,i){return pa(n,e,1-Math.exp(-t*i))}function Tp(n,e=1){return e-Math.abs(Tc(n,e*2)-e)}function Ep(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function Cp(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function Rp(n,e){return n+Math.floor(Math.random()*(e-n+1))}function Pp(n,e){return n+Math.random()*(e-n)}function Lp(n){return n*(.5-Math.random())}function Ip(n){n!==void 0&&(vh=n);let e=vh+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Dp(n){return n*da}function kp(n){return n*va}function Op(n){return(n&n-1)===0&&n!==0}function Up(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function Np(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function Vp(n,e,t,i,s){let a=Math.cos,r=Math.sin,l=a(t/2),c=r(t/2),h=a((e+i)/2),u=r((e+i)/2),d=a((e-i)/2),f=r((e-i)/2),g=a((i-e)/2),y=r((i-e)/2);switch(s){case"XYX":n.set(l*u,c*d,c*f,l*h);break;case"YZY":n.set(c*f,l*u,c*d,l*h);break;case"ZXZ":n.set(c*d,c*f,l*u,l*h);break;case"XZX":n.set(l*u,c*y,c*g,l*h);break;case"YXY":n.set(c*g,l*u,c*y,l*h);break;case"ZYZ":n.set(c*y,c*g,l*u,l*h);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function bn(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function ct(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}var Iu={DEG2RAD:da,RAD2DEG:va,generateUUID:$n,clamp:kt,euclideanModulo:Tc,mapLinear:wp,inverseLerp:Sp,lerp:pa,damp:Ap,pingpong:Tp,smoothstep:Ep,smootherstep:Cp,randInt:Rp,randFloat:Pp,randFloatSpread:Lp,seededRandom:Ip,degToRad:Dp,radToDeg:kp,isPowerOfTwo:Op,ceilPowerOfTwo:Up,floorPowerOfTwo:Np,setQuaternionFromProperEuler:Vp,normalize:ct,denormalize:bn},we=class n{constructor(e=0,t=0){n.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,i=this.y,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6],this.y=s[1]*t+s[4]*i+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let i=this.dot(e)/t;return Math.acos(kt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let i=Math.cos(t),s=Math.sin(t),a=this.x-e.x,r=this.y-e.y;return this.x=a*i-r*s+e.x,this.y=a*s+r*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},je=class n{constructor(e,t,i,s,a,r,l,c,h){n.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,s,a,r,l,c,h)}set(e,t,i,s,a,r,l,c,h){let u=this.elements;return u[0]=e,u[1]=s,u[2]=l,u[3]=t,u[4]=a,u[5]=c,u[6]=i,u[7]=r,u[8]=h,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let i=e.elements,s=t.elements,a=this.elements,r=i[0],l=i[3],c=i[6],h=i[1],u=i[4],d=i[7],f=i[2],g=i[5],y=i[8],_=s[0],m=s[3],p=s[6],E=s[1],b=s[4],M=s[7],z=s[2],C=s[5],I=s[8];return a[0]=r*_+l*E+c*z,a[3]=r*m+l*b+c*C,a[6]=r*p+l*M+c*I,a[1]=h*_+u*E+d*z,a[4]=h*m+u*b+d*C,a[7]=h*p+u*M+d*I,a[2]=f*_+g*E+y*z,a[5]=f*m+g*b+y*C,a[8]=f*p+g*M+y*I,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],i=e[1],s=e[2],a=e[3],r=e[4],l=e[5],c=e[6],h=e[7],u=e[8];return t*r*u-t*l*h-i*a*u+i*l*c+s*a*h-s*r*c}invert(){let e=this.elements,t=e[0],i=e[1],s=e[2],a=e[3],r=e[4],l=e[5],c=e[6],h=e[7],u=e[8],d=u*r-l*h,f=l*c-u*a,g=h*a-r*c,y=t*d+i*f+s*g;if(y===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/y;return e[0]=d*_,e[1]=(s*h-u*i)*_,e[2]=(l*i-s*r)*_,e[3]=f*_,e[4]=(u*t-s*c)*_,e[5]=(s*a-l*t)*_,e[6]=g*_,e[7]=(i*c-h*t)*_,e[8]=(r*t-i*a)*_,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,s,a,r,l){let c=Math.cos(a),h=Math.sin(a);return this.set(i*c,i*h,-i*(c*r+h*l)+r+e,-s*h,s*c,-s*(-h*r+c*l)+l+t,0,0,1),this}scale(e,t){return this.premultiply(go.makeScale(e,t)),this}rotate(e){return this.premultiply(go.makeRotation(-e)),this}translate(e,t){return this.premultiply(go.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,i=e.elements;for(let s=0;s<9;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){let i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}},go=new je;function Du(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Mr(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function Fp(){let n=Mr("canvas");return n.style.display="block",n}var _h={};function ha(n){n in _h||(_h[n]=!0,console.warn(n))}function Bp(n,e,t){return new Promise(function(i,s){function a(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(a,t);break;default:i()}}setTimeout(a,t)})}function zp(n){let e=n.elements;e[2]=.5*e[2]+.5*e[3],e[6]=.5*e[6]+.5*e[7],e[10]=.5*e[10]+.5*e[11],e[14]=.5*e[14]+.5*e[15]}function Hp(n){let e=n.elements;e[11]===-1?(e[10]=-e[10]-1,e[14]=-e[14]):(e[10]=-e[10],e[14]=-e[14]+1)}var at={enabled:!0,workingColorSpace:Us,spaces:{},convert:function(n,e,t){return this.enabled===!1||e===t||!e||!t||(this.spaces[e].transfer===dt&&(n.r=jn(n.r),n.g=jn(n.g),n.b=jn(n.b)),this.spaces[e].primaries!==this.spaces[t].primaries&&(n.applyMatrix3(this.spaces[e].toXYZ),n.applyMatrix3(this.spaces[t].fromXYZ)),this.spaces[t].transfer===dt&&(n.r=As(n.r),n.g=As(n.g),n.b=As(n.b))),n},fromWorkingColorSpace:function(n,e){return this.convert(n,this.workingColorSpace,e)},toWorkingColorSpace:function(n,e){return this.convert(n,e,this.workingColorSpace)},getPrimaries:function(n){return this.spaces[n].primaries},getTransfer:function(n){return n===ui?$r:this.spaces[n].transfer},getLuminanceCoefficients:function(n,e=this.workingColorSpace){return n.fromArray(this.spaces[e].luminanceCoefficients)},define:function(n){Object.assign(this.spaces,n)},_getMatrix:function(n,e,t){return n.copy(this.spaces[e].toXYZ).multiply(this.spaces[t].fromXYZ)},_getDrawingBufferColorSpace:function(n){return this.spaces[n].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(n=this.workingColorSpace){return this.spaces[n].workingColorSpaceConfig.unpackColorSpace}};function jn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function As(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}var xh=[.64,.33,.3,.6,.15,.06],bh=[.2126,.7152,.0722],Mh=[.3127,.329],wh=new je().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Sh=new je().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);at.define({[Us]:{primaries:xh,whitePoint:Mh,transfer:$r,toXYZ:wh,fromXYZ:Sh,luminanceCoefficients:bh,workingColorSpaceConfig:{unpackColorSpace:Zt},outputColorSpaceConfig:{drawingBufferColorSpace:Zt}},[Zt]:{primaries:xh,whitePoint:Mh,transfer:dt,toXYZ:wh,fromXYZ:Sh,luminanceCoefficients:bh,outputColorSpaceConfig:{drawingBufferColorSpace:Zt}}});var as,Ol=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{as===void 0&&(as=Mr("canvas")),as.width=e.width,as.height=e.height;let i=as.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=as}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=Mr("canvas");t.width=e.width,t.height=e.height;let i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);let s=i.getImageData(0,0,e.width,e.height),a=s.data;for(let r=0;r<a.length;r++)a[r]=jn(a[r]/255)*255;return i.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(jn(t[i]/255)*255):t[i]=jn(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},Gp=0,wr=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Gp++}),this.uuid=$n(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let a;if(Array.isArray(s)){a=[];for(let r=0,l=s.length;r<l;r++)s[r].isDataTexture?a.push(yo(s[r].image)):a.push(yo(s[r]))}else a=yo(s);i.url=a}return t||(e.images[this.uuid]=i),i}};function yo(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Ol.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var Wp=0,hn=class n extends Yn{constructor(e=n.DEFAULT_IMAGE,t=n.DEFAULT_MAPPING,i=Oi,s=Oi,a=Rn,r=Ui,l=Mn,c=Xn,h=n.DEFAULT_ANISOTROPY,u=ui){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Wp++}),this.uuid=$n(),this.name="",this.source=new wr(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=a,this.minFilter=r,this.anisotropy=h,this.format=l,this.internalFormat=null,this.type=c,this.offset=new we(0,0),this.repeat=new we(1,1),this.center=new we(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new je,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==_u)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case al:e.x=e.x-Math.floor(e.x);break;case Oi:e.x=e.x<0?0:1;break;case rl:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case al:e.y=e.y-Math.floor(e.y);break;case Oi:e.y=e.y<0?0:1;break;case rl:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};hn.DEFAULT_IMAGE=null;hn.DEFAULT_MAPPING=_u;hn.DEFAULT_ANISOTROPY=1;var pt=class n{constructor(e=0,t=0,i=0,s=1){n.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,s){return this.x=e,this.y=t,this.z=i,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,i=this.y,s=this.z,a=this.w,r=e.elements;return this.x=r[0]*t+r[4]*i+r[8]*s+r[12]*a,this.y=r[1]*t+r[5]*i+r[9]*s+r[13]*a,this.z=r[2]*t+r[6]*i+r[10]*s+r[14]*a,this.w=r[3]*t+r[7]*i+r[11]*s+r[15]*a,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,s,a,c=e.elements,h=c[0],u=c[4],d=c[8],f=c[1],g=c[5],y=c[9],_=c[2],m=c[6],p=c[10];if(Math.abs(u-f)<.01&&Math.abs(d-_)<.01&&Math.abs(y-m)<.01){if(Math.abs(u+f)<.1&&Math.abs(d+_)<.1&&Math.abs(y+m)<.1&&Math.abs(h+g+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let b=(h+1)/2,M=(g+1)/2,z=(p+1)/2,C=(u+f)/4,I=(d+_)/4,G=(y+m)/4;return b>M&&b>z?b<.01?(i=0,s=.707106781,a=.707106781):(i=Math.sqrt(b),s=C/i,a=I/i):M>z?M<.01?(i=.707106781,s=0,a=.707106781):(s=Math.sqrt(M),i=C/s,a=G/s):z<.01?(i=.707106781,s=.707106781,a=0):(a=Math.sqrt(z),i=I/a,s=G/a),this.set(i,s,a,t),this}let E=Math.sqrt((m-y)*(m-y)+(d-_)*(d-_)+(f-u)*(f-u));return Math.abs(E)<.001&&(E=1),this.x=(m-y)/E,this.y=(d-_)/E,this.z=(f-u)/E,this.w=Math.acos((h+g+p-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Ul=class extends Yn{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new pt(0,0,e,t),this.scissorTest=!1,this.viewport=new pt(0,0,e,t);let s={width:e,height:t,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Rn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);let a=new hn(s,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);a.flipY=!1,a.generateMipmaps=i.generateMipmaps,a.internalFormat=i.internalFormat,this.textures=[];let r=i.count;for(let l=0;l<r;l++)this.textures[l]=a.clone(),this.textures[l].isRenderTargetTexture=!0;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let s=0,a=this.textures.length;s<a;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=i;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let i=0,s=e.textures.length;i<s;i++)this.textures[i]=e.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0;let t=Object.assign({},e.texture.image);return this.texture.source=new wr(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},Zn=class extends Ul{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}},Sr=class extends hn{constructor(e=null,t=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=wn,this.minFilter=wn,this.wrapR=Oi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Nl=class extends hn{constructor(e=null,t=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=wn,this.minFilter=wn,this.wrapR=Oi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var un=class{constructor(e=0,t=0,i=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=s}static slerpFlat(e,t,i,s,a,r,l){let c=i[s+0],h=i[s+1],u=i[s+2],d=i[s+3],f=a[r+0],g=a[r+1],y=a[r+2],_=a[r+3];if(l===0){e[t+0]=c,e[t+1]=h,e[t+2]=u,e[t+3]=d;return}if(l===1){e[t+0]=f,e[t+1]=g,e[t+2]=y,e[t+3]=_;return}if(d!==_||c!==f||h!==g||u!==y){let m=1-l,p=c*f+h*g+u*y+d*_,E=p>=0?1:-1,b=1-p*p;if(b>Number.EPSILON){let z=Math.sqrt(b),C=Math.atan2(z,p*E);m=Math.sin(m*C)/z,l=Math.sin(l*C)/z}let M=l*E;if(c=c*m+f*M,h=h*m+g*M,u=u*m+y*M,d=d*m+_*M,m===1-l){let z=1/Math.sqrt(c*c+h*h+u*u+d*d);c*=z,h*=z,u*=z,d*=z}}e[t]=c,e[t+1]=h,e[t+2]=u,e[t+3]=d}static multiplyQuaternionsFlat(e,t,i,s,a,r){let l=i[s],c=i[s+1],h=i[s+2],u=i[s+3],d=a[r],f=a[r+1],g=a[r+2],y=a[r+3];return e[t]=l*y+u*d+c*g-h*f,e[t+1]=c*y+u*f+h*d-l*g,e[t+2]=h*y+u*g+l*f-c*d,e[t+3]=u*y-l*d-c*f-h*g,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,s){return this._x=e,this._y=t,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let i=e._x,s=e._y,a=e._z,r=e._order,l=Math.cos,c=Math.sin,h=l(i/2),u=l(s/2),d=l(a/2),f=c(i/2),g=c(s/2),y=c(a/2);switch(r){case"XYZ":this._x=f*u*d+h*g*y,this._y=h*g*d-f*u*y,this._z=h*u*y+f*g*d,this._w=h*u*d-f*g*y;break;case"YXZ":this._x=f*u*d+h*g*y,this._y=h*g*d-f*u*y,this._z=h*u*y-f*g*d,this._w=h*u*d+f*g*y;break;case"ZXY":this._x=f*u*d-h*g*y,this._y=h*g*d+f*u*y,this._z=h*u*y+f*g*d,this._w=h*u*d-f*g*y;break;case"ZYX":this._x=f*u*d-h*g*y,this._y=h*g*d+f*u*y,this._z=h*u*y-f*g*d,this._w=h*u*d+f*g*y;break;case"YZX":this._x=f*u*d+h*g*y,this._y=h*g*d+f*u*y,this._z=h*u*y-f*g*d,this._w=h*u*d-f*g*y;break;case"XZY":this._x=f*u*d-h*g*y,this._y=h*g*d-f*u*y,this._z=h*u*y+f*g*d,this._w=h*u*d+f*g*y;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+r)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let i=t/2,s=Math.sin(i);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,i=t[0],s=t[4],a=t[8],r=t[1],l=t[5],c=t[9],h=t[2],u=t[6],d=t[10],f=i+l+d;if(f>0){let g=.5/Math.sqrt(f+1);this._w=.25/g,this._x=(u-c)*g,this._y=(a-h)*g,this._z=(r-s)*g}else if(i>l&&i>d){let g=2*Math.sqrt(1+i-l-d);this._w=(u-c)/g,this._x=.25*g,this._y=(s+r)/g,this._z=(a+h)/g}else if(l>d){let g=2*Math.sqrt(1+l-i-d);this._w=(a-h)/g,this._x=(s+r)/g,this._y=.25*g,this._z=(c+u)/g}else{let g=2*Math.sqrt(1+d-i-l);this._w=(r-s)/g,this._x=(a+h)/g,this._y=(c+u)/g,this._z=.25*g}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(kt(this.dot(e),-1,1)))}rotateTowards(e,t){let i=this.angleTo(e);if(i===0)return this;let s=Math.min(1,t/i);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let i=e._x,s=e._y,a=e._z,r=e._w,l=t._x,c=t._y,h=t._z,u=t._w;return this._x=i*u+r*l+s*h-a*c,this._y=s*u+r*c+a*l-i*h,this._z=a*u+r*h+i*c-s*l,this._w=r*u-i*l-s*c-a*h,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let i=this._x,s=this._y,a=this._z,r=this._w,l=r*e._w+i*e._x+s*e._y+a*e._z;if(l<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,l=-l):this.copy(e),l>=1)return this._w=r,this._x=i,this._y=s,this._z=a,this;let c=1-l*l;if(c<=Number.EPSILON){let g=1-t;return this._w=g*r+t*this._w,this._x=g*i+t*this._x,this._y=g*s+t*this._y,this._z=g*a+t*this._z,this.normalize(),this}let h=Math.sqrt(c),u=Math.atan2(h,l),d=Math.sin((1-t)*u)/h,f=Math.sin(t*u)/h;return this._w=r*d+this._w*f,this._x=i*d+this._x*f,this._y=s*d+this._y*f,this._z=a*d+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),a=Math.sqrt(i);return this.set(s*Math.sin(e),s*Math.cos(e),a*Math.sin(t),a*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},k=class n{constructor(e=0,t=0,i=0){n.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Ah.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Ah.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,i=this.y,s=this.z,a=e.elements;return this.x=a[0]*t+a[3]*i+a[6]*s,this.y=a[1]*t+a[4]*i+a[7]*s,this.z=a[2]*t+a[5]*i+a[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,i=this.y,s=this.z,a=e.elements,r=1/(a[3]*t+a[7]*i+a[11]*s+a[15]);return this.x=(a[0]*t+a[4]*i+a[8]*s+a[12])*r,this.y=(a[1]*t+a[5]*i+a[9]*s+a[13])*r,this.z=(a[2]*t+a[6]*i+a[10]*s+a[14])*r,this}applyQuaternion(e){let t=this.x,i=this.y,s=this.z,a=e.x,r=e.y,l=e.z,c=e.w,h=2*(r*s-l*i),u=2*(l*t-a*s),d=2*(a*i-r*t);return this.x=t+c*h+r*d-l*u,this.y=i+c*u+l*h-a*d,this.z=s+c*d+a*u-r*h,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,i=this.y,s=this.z,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*s,this.y=a[1]*t+a[5]*i+a[9]*s,this.z=a[2]*t+a[6]*i+a[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let i=e.x,s=e.y,a=e.z,r=t.x,l=t.y,c=t.z;return this.x=s*c-a*l,this.y=a*r-i*c,this.z=i*l-s*r,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return vo.copy(this).projectOnVector(e),this.sub(vo)}reflect(e){return this.sub(vo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let i=this.dot(e)/t;return Math.acos(kt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,i=this.y-e.y,s=this.z-e.z;return t*t+i*i+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){let s=Math.sin(t)*e;return this.x=s*Math.sin(i),this.y=Math.cos(t)*e,this.z=s*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},vo=new k,Ah=new un,Vi=class{constructor(e=new k(1/0,1/0,1/0),t=new k(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(vn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(vn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let i=vn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let i=e.geometry;if(i!==void 0){let a=i.getAttribute("position");if(t===!0&&a!==void 0&&e.isInstancedMesh!==!0)for(let r=0,l=a.count;r<l;r++)e.isMesh===!0?e.getVertexPosition(r,vn):vn.fromBufferAttribute(a,r),vn.applyMatrix4(e.matrixWorld),this.expandByPoint(vn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Wa.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Wa.copy(i.boundingBox)),Wa.applyMatrix4(e.matrixWorld),this.union(Wa)}let s=e.children;for(let a=0,r=s.length;a<r;a++)this.expandByObject(s[a],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,vn),vn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(na),qa.subVectors(this.max,na),rs.subVectors(e.a,na),os.subVectors(e.b,na),ls.subVectors(e.c,na),ai.subVectors(os,rs),ri.subVectors(ls,os),Ti.subVectors(rs,ls);let t=[0,-ai.z,ai.y,0,-ri.z,ri.y,0,-Ti.z,Ti.y,ai.z,0,-ai.x,ri.z,0,-ri.x,Ti.z,0,-Ti.x,-ai.y,ai.x,0,-ri.y,ri.x,0,-Ti.y,Ti.x,0];return!_o(t,rs,os,ls,qa)||(t=[1,0,0,0,1,0,0,0,1],!_o(t,rs,os,ls,qa))?!1:($a.crossVectors(ai,ri),t=[$a.x,$a.y,$a.z],_o(t,rs,os,ls,qa))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,vn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(vn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Nn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Nn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Nn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Nn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Nn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Nn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Nn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Nn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Nn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}},Nn=[new k,new k,new k,new k,new k,new k,new k,new k],vn=new k,Wa=new Vi,rs=new k,os=new k,ls=new k,ai=new k,ri=new k,Ti=new k,na=new k,qa=new k,$a=new k,Ei=new k;function _o(n,e,t,i,s){for(let a=0,r=n.length-3;a<=r;a+=3){Ei.fromArray(n,a);let l=s.x*Math.abs(Ei.x)+s.y*Math.abs(Ei.y)+s.z*Math.abs(Ei.z),c=e.dot(Ei),h=t.dot(Ei),u=i.dot(Ei);if(Math.max(-Math.max(c,h,u),Math.min(c,h,u))>l)return!1}return!0}var qp=new Vi,ia=new k,xo=new k,_a=class{constructor(e=new k,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let i=this.center;t!==void 0?i.copy(t):qp.setFromPoints(e).getCenter(i);let s=0;for(let a=0,r=e.length;a<r;a++)s=Math.max(s,i.distanceToSquared(e[a]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;ia.subVectors(e,this.center);let t=ia.lengthSq();if(t>this.radius*this.radius){let i=Math.sqrt(t),s=(i-this.radius)*.5;this.center.addScaledVector(ia,s/i),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(xo.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(ia.copy(e.center).add(xo)),this.expandByPoint(ia.copy(e.center).sub(xo))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},Vn=new k,bo=new k,ja=new k,oi=new k,Mo=new k,Xa=new k,wo=new k,Is=class{constructor(e=new k,t=new k(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Vn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Vn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Vn.copy(this.origin).addScaledVector(this.direction,t),Vn.distanceToSquared(e))}distanceSqToSegment(e,t,i,s){bo.copy(e).add(t).multiplyScalar(.5),ja.copy(t).sub(e).normalize(),oi.copy(this.origin).sub(bo);let a=e.distanceTo(t)*.5,r=-this.direction.dot(ja),l=oi.dot(this.direction),c=-oi.dot(ja),h=oi.lengthSq(),u=Math.abs(1-r*r),d,f,g,y;if(u>0)if(d=r*c-l,f=r*l-c,y=a*u,d>=0)if(f>=-y)if(f<=y){let _=1/u;d*=_,f*=_,g=d*(d+r*f+2*l)+f*(r*d+f+2*c)+h}else f=a,d=Math.max(0,-(r*f+l)),g=-d*d+f*(f+2*c)+h;else f=-a,d=Math.max(0,-(r*f+l)),g=-d*d+f*(f+2*c)+h;else f<=-y?(d=Math.max(0,-(-r*a+l)),f=d>0?-a:Math.min(Math.max(-a,-c),a),g=-d*d+f*(f+2*c)+h):f<=y?(d=0,f=Math.min(Math.max(-a,-c),a),g=f*(f+2*c)+h):(d=Math.max(0,-(r*a+l)),f=d>0?a:Math.min(Math.max(-a,-c),a),g=-d*d+f*(f+2*c)+h);else f=r>0?-a:a,d=Math.max(0,-(r*f+l)),g=-d*d+f*(f+2*c)+h;return i&&i.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(bo).addScaledVector(ja,f),g}intersectSphere(e,t){Vn.subVectors(e.center,this.origin);let i=Vn.dot(this.direction),s=Vn.dot(Vn)-i*i,a=e.radius*e.radius;if(s>a)return null;let r=Math.sqrt(a-s),l=i-r,c=i+r;return c<0?null:l<0?this.at(c,t):this.at(l,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){let i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,s,a,r,l,c,h=1/this.direction.x,u=1/this.direction.y,d=1/this.direction.z,f=this.origin;return h>=0?(i=(e.min.x-f.x)*h,s=(e.max.x-f.x)*h):(i=(e.max.x-f.x)*h,s=(e.min.x-f.x)*h),u>=0?(a=(e.min.y-f.y)*u,r=(e.max.y-f.y)*u):(a=(e.max.y-f.y)*u,r=(e.min.y-f.y)*u),i>r||a>s||((a>i||isNaN(i))&&(i=a),(r<s||isNaN(s))&&(s=r),d>=0?(l=(e.min.z-f.z)*d,c=(e.max.z-f.z)*d):(l=(e.max.z-f.z)*d,c=(e.min.z-f.z)*d),i>c||l>s)||((l>i||i!==i)&&(i=l),(c<s||s!==s)&&(s=c),s<0)?null:this.at(i>=0?i:s,t)}intersectsBox(e){return this.intersectBox(e,Vn)!==null}intersectTriangle(e,t,i,s,a){Mo.subVectors(t,e),Xa.subVectors(i,e),wo.crossVectors(Mo,Xa);let r=this.direction.dot(wo),l;if(r>0){if(s)return null;l=1}else if(r<0)l=-1,r=-r;else return null;oi.subVectors(this.origin,e);let c=l*this.direction.dot(Xa.crossVectors(oi,Xa));if(c<0)return null;let h=l*this.direction.dot(Mo.cross(oi));if(h<0||c+h>r)return null;let u=-l*oi.dot(wo);return u<0?null:this.at(u/r,a)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Mt=class n{constructor(e,t,i,s,a,r,l,c,h,u,d,f,g,y,_,m){n.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,s,a,r,l,c,h,u,d,f,g,y,_,m)}set(e,t,i,s,a,r,l,c,h,u,d,f,g,y,_,m){let p=this.elements;return p[0]=e,p[4]=t,p[8]=i,p[12]=s,p[1]=a,p[5]=r,p[9]=l,p[13]=c,p[2]=h,p[6]=u,p[10]=d,p[14]=f,p[3]=g,p[7]=y,p[11]=_,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new n().fromArray(this.elements)}copy(e){let t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){let t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,i=e.elements,s=1/cs.setFromMatrixColumn(e,0).length(),a=1/cs.setFromMatrixColumn(e,1).length(),r=1/cs.setFromMatrixColumn(e,2).length();return t[0]=i[0]*s,t[1]=i[1]*s,t[2]=i[2]*s,t[3]=0,t[4]=i[4]*a,t[5]=i[5]*a,t[6]=i[6]*a,t[7]=0,t[8]=i[8]*r,t[9]=i[9]*r,t[10]=i[10]*r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,i=e.x,s=e.y,a=e.z,r=Math.cos(i),l=Math.sin(i),c=Math.cos(s),h=Math.sin(s),u=Math.cos(a),d=Math.sin(a);if(e.order==="XYZ"){let f=r*u,g=r*d,y=l*u,_=l*d;t[0]=c*u,t[4]=-c*d,t[8]=h,t[1]=g+y*h,t[5]=f-_*h,t[9]=-l*c,t[2]=_-f*h,t[6]=y+g*h,t[10]=r*c}else if(e.order==="YXZ"){let f=c*u,g=c*d,y=h*u,_=h*d;t[0]=f+_*l,t[4]=y*l-g,t[8]=r*h,t[1]=r*d,t[5]=r*u,t[9]=-l,t[2]=g*l-y,t[6]=_+f*l,t[10]=r*c}else if(e.order==="ZXY"){let f=c*u,g=c*d,y=h*u,_=h*d;t[0]=f-_*l,t[4]=-r*d,t[8]=y+g*l,t[1]=g+y*l,t[5]=r*u,t[9]=_-f*l,t[2]=-r*h,t[6]=l,t[10]=r*c}else if(e.order==="ZYX"){let f=r*u,g=r*d,y=l*u,_=l*d;t[0]=c*u,t[4]=y*h-g,t[8]=f*h+_,t[1]=c*d,t[5]=_*h+f,t[9]=g*h-y,t[2]=-h,t[6]=l*c,t[10]=r*c}else if(e.order==="YZX"){let f=r*c,g=r*h,y=l*c,_=l*h;t[0]=c*u,t[4]=_-f*d,t[8]=y*d+g,t[1]=d,t[5]=r*u,t[9]=-l*u,t[2]=-h*u,t[6]=g*d+y,t[10]=f-_*d}else if(e.order==="XZY"){let f=r*c,g=r*h,y=l*c,_=l*h;t[0]=c*u,t[4]=-d,t[8]=h*u,t[1]=f*d+_,t[5]=r*u,t[9]=g*d-y,t[2]=y*d-g,t[6]=l*u,t[10]=_*d+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose($p,e,jp)}lookAt(e,t,i){let s=this.elements;return rn.subVectors(e,t),rn.lengthSq()===0&&(rn.z=1),rn.normalize(),li.crossVectors(i,rn),li.lengthSq()===0&&(Math.abs(i.z)===1?rn.x+=1e-4:rn.z+=1e-4,rn.normalize(),li.crossVectors(i,rn)),li.normalize(),Ya.crossVectors(rn,li),s[0]=li.x,s[4]=Ya.x,s[8]=rn.x,s[1]=li.y,s[5]=Ya.y,s[9]=rn.y,s[2]=li.z,s[6]=Ya.z,s[10]=rn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let i=e.elements,s=t.elements,a=this.elements,r=i[0],l=i[4],c=i[8],h=i[12],u=i[1],d=i[5],f=i[9],g=i[13],y=i[2],_=i[6],m=i[10],p=i[14],E=i[3],b=i[7],M=i[11],z=i[15],C=s[0],I=s[4],G=s[8],S=s[12],w=s[1],V=s[5],j=s[9],$=s[13],J=s[2],ae=s[6],Y=s[10],ce=s[14],Z=s[3],de=s[7],Me=s[11],Ie=s[15];return a[0]=r*C+l*w+c*J+h*Z,a[4]=r*I+l*V+c*ae+h*de,a[8]=r*G+l*j+c*Y+h*Me,a[12]=r*S+l*$+c*ce+h*Ie,a[1]=u*C+d*w+f*J+g*Z,a[5]=u*I+d*V+f*ae+g*de,a[9]=u*G+d*j+f*Y+g*Me,a[13]=u*S+d*$+f*ce+g*Ie,a[2]=y*C+_*w+m*J+p*Z,a[6]=y*I+_*V+m*ae+p*de,a[10]=y*G+_*j+m*Y+p*Me,a[14]=y*S+_*$+m*ce+p*Ie,a[3]=E*C+b*w+M*J+z*Z,a[7]=E*I+b*V+M*ae+z*de,a[11]=E*G+b*j+M*Y+z*Me,a[15]=E*S+b*$+M*ce+z*Ie,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],i=e[4],s=e[8],a=e[12],r=e[1],l=e[5],c=e[9],h=e[13],u=e[2],d=e[6],f=e[10],g=e[14],y=e[3],_=e[7],m=e[11],p=e[15];return y*(+a*c*d-s*h*d-a*l*f+i*h*f+s*l*g-i*c*g)+_*(+t*c*g-t*h*f+a*r*f-s*r*g+s*h*u-a*c*u)+m*(+t*h*d-t*l*g-a*r*d+i*r*g+a*l*u-i*h*u)+p*(-s*l*u-t*c*d+t*l*f+s*r*d-i*r*f+i*c*u)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=i),this}invert(){let e=this.elements,t=e[0],i=e[1],s=e[2],a=e[3],r=e[4],l=e[5],c=e[6],h=e[7],u=e[8],d=e[9],f=e[10],g=e[11],y=e[12],_=e[13],m=e[14],p=e[15],E=d*m*h-_*f*h+_*c*g-l*m*g-d*c*p+l*f*p,b=y*f*h-u*m*h-y*c*g+r*m*g+u*c*p-r*f*p,M=u*_*h-y*d*h+y*l*g-r*_*g-u*l*p+r*d*p,z=y*d*c-u*_*c-y*l*f+r*_*f+u*l*m-r*d*m,C=t*E+i*b+s*M+a*z;if(C===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let I=1/C;return e[0]=E*I,e[1]=(_*f*a-d*m*a-_*s*g+i*m*g+d*s*p-i*f*p)*I,e[2]=(l*m*a-_*c*a+_*s*h-i*m*h-l*s*p+i*c*p)*I,e[3]=(d*c*a-l*f*a-d*s*h+i*f*h+l*s*g-i*c*g)*I,e[4]=b*I,e[5]=(u*m*a-y*f*a+y*s*g-t*m*g-u*s*p+t*f*p)*I,e[6]=(y*c*a-r*m*a-y*s*h+t*m*h+r*s*p-t*c*p)*I,e[7]=(r*f*a-u*c*a+u*s*h-t*f*h-r*s*g+t*c*g)*I,e[8]=M*I,e[9]=(y*d*a-u*_*a-y*i*g+t*_*g+u*i*p-t*d*p)*I,e[10]=(r*_*a-y*l*a+y*i*h-t*_*h-r*i*p+t*l*p)*I,e[11]=(u*l*a-r*d*a-u*i*h+t*d*h+r*i*g-t*l*g)*I,e[12]=z*I,e[13]=(u*_*s-y*d*s+y*i*f-t*_*f-u*i*m+t*d*m)*I,e[14]=(y*l*s-r*_*s-y*i*c+t*_*c+r*i*m-t*l*m)*I,e[15]=(r*d*s-u*l*s+u*i*c-t*d*c-r*i*f+t*l*f)*I,this}scale(e){let t=this.elements,i=e.x,s=e.y,a=e.z;return t[0]*=i,t[4]*=s,t[8]*=a,t[1]*=i,t[5]*=s,t[9]*=a,t[2]*=i,t[6]*=s,t[10]*=a,t[3]*=i,t[7]*=s,t[11]*=a,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,s))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let i=Math.cos(t),s=Math.sin(t),a=1-i,r=e.x,l=e.y,c=e.z,h=a*r,u=a*l;return this.set(h*r+i,h*l-s*c,h*c+s*l,0,h*l+s*c,u*l+i,u*c-s*r,0,h*c-s*l,u*c+s*r,a*c*c+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,s,a,r){return this.set(1,i,a,0,e,1,r,0,t,s,1,0,0,0,0,1),this}compose(e,t,i){let s=this.elements,a=t._x,r=t._y,l=t._z,c=t._w,h=a+a,u=r+r,d=l+l,f=a*h,g=a*u,y=a*d,_=r*u,m=r*d,p=l*d,E=c*h,b=c*u,M=c*d,z=i.x,C=i.y,I=i.z;return s[0]=(1-(_+p))*z,s[1]=(g+M)*z,s[2]=(y-b)*z,s[3]=0,s[4]=(g-M)*C,s[5]=(1-(f+p))*C,s[6]=(m+E)*C,s[7]=0,s[8]=(y+b)*I,s[9]=(m-E)*I,s[10]=(1-(f+_))*I,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,i){let s=this.elements,a=cs.set(s[0],s[1],s[2]).length(),r=cs.set(s[4],s[5],s[6]).length(),l=cs.set(s[8],s[9],s[10]).length();this.determinant()<0&&(a=-a),e.x=s[12],e.y=s[13],e.z=s[14],_n.copy(this);let h=1/a,u=1/r,d=1/l;return _n.elements[0]*=h,_n.elements[1]*=h,_n.elements[2]*=h,_n.elements[4]*=u,_n.elements[5]*=u,_n.elements[6]*=u,_n.elements[8]*=d,_n.elements[9]*=d,_n.elements[10]*=d,t.setFromRotationMatrix(_n),i.x=a,i.y=r,i.z=l,this}makePerspective(e,t,i,s,a,r,l=qn){let c=this.elements,h=2*a/(t-e),u=2*a/(i-s),d=(t+e)/(t-e),f=(i+s)/(i-s),g,y;if(l===qn)g=-(r+a)/(r-a),y=-2*r*a/(r-a);else if(l===br)g=-r/(r-a),y=-r*a/(r-a);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+l);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=y,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,s,a,r,l=qn){let c=this.elements,h=1/(t-e),u=1/(i-s),d=1/(r-a),f=(t+e)*h,g=(i+s)*u,y,_;if(l===qn)y=(r+a)*d,_=-2*d;else if(l===br)y=a*d,_=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+l);return c[0]=2*h,c[4]=0,c[8]=0,c[12]=-f,c[1]=0,c[5]=2*u,c[9]=0,c[13]=-g,c[2]=0,c[6]=0,c[10]=_,c[14]=-y,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,i=e.elements;for(let s=0;s<16;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){let i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}},cs=new k,_n=new Mt,$p=new k(0,0,0),jp=new k(1,1,1),li=new k,Ya=new k,rn=new k,Th=new Mt,Eh=new un,Pn=class n{constructor(e=0,t=0,i=0,s=n.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,s=this._order){return this._x=e,this._y=t,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){let s=e.elements,a=s[0],r=s[4],l=s[8],c=s[1],h=s[5],u=s[9],d=s[2],f=s[6],g=s[10];switch(t){case"XYZ":this._y=Math.asin(kt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,g),this._z=Math.atan2(-r,a)):(this._x=Math.atan2(f,h),this._z=0);break;case"YXZ":this._x=Math.asin(-kt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(l,g),this._z=Math.atan2(c,h)):(this._y=Math.atan2(-d,a),this._z=0);break;case"ZXY":this._x=Math.asin(kt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-d,g),this._z=Math.atan2(-r,h)):(this._y=0,this._z=Math.atan2(c,a));break;case"ZYX":this._y=Math.asin(-kt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(f,g),this._z=Math.atan2(c,a)):(this._x=0,this._z=Math.atan2(-r,h));break;case"YZX":this._z=Math.asin(kt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,h),this._y=Math.atan2(-d,a)):(this._x=0,this._y=Math.atan2(l,g));break;case"XZY":this._z=Math.asin(-kt(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(f,h),this._y=Math.atan2(l,a)):(this._x=Math.atan2(-u,g),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return Th.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Th,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Eh.setFromEuler(this),this.setFromQuaternion(Eh,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Pn.DEFAULT_ORDER="XYZ";var xa=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Xp=0,Ch=new k,hs=new un,Fn=new Mt,Za=new k,sa=new k,Yp=new k,Zp=new un,Rh=new k(1,0,0),Ph=new k(0,1,0),Lh=new k(0,0,1),Ih={type:"added"},Jp={type:"removed"},us={type:"childadded",child:null},So={type:"childremoved",child:null},Ht=class n extends Yn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Xp++}),this.uuid=$n(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=n.DEFAULT_UP.clone();let e=new k,t=new Pn,i=new un,s=new k(1,1,1);function a(){i.setFromEuler(t,!1)}function r(){t.setFromQuaternion(i,void 0,!1)}t._onChange(a),i._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Mt},normalMatrix:{value:new je}}),this.matrix=new Mt,this.matrixWorld=new Mt,this.matrixAutoUpdate=n.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=n.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new xa,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return hs.setFromAxisAngle(e,t),this.quaternion.multiply(hs),this}rotateOnWorldAxis(e,t){return hs.setFromAxisAngle(e,t),this.quaternion.premultiply(hs),this}rotateX(e){return this.rotateOnAxis(Rh,e)}rotateY(e){return this.rotateOnAxis(Ph,e)}rotateZ(e){return this.rotateOnAxis(Lh,e)}translateOnAxis(e,t){return Ch.copy(e).applyQuaternion(this.quaternion),this.position.add(Ch.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Rh,e)}translateY(e){return this.translateOnAxis(Ph,e)}translateZ(e){return this.translateOnAxis(Lh,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Fn.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?Za.copy(e):Za.set(e,t,i);let s=this.parent;this.updateWorldMatrix(!0,!1),sa.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Fn.lookAt(sa,Za,this.up):Fn.lookAt(Za,sa,this.up),this.quaternion.setFromRotationMatrix(Fn),s&&(Fn.extractRotation(s.matrixWorld),hs.setFromRotationMatrix(Fn),this.quaternion.premultiply(hs.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Ih),us.child=e,this.dispatchEvent(us),us.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Jp),So.child=e,this.dispatchEvent(So),So.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Fn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Fn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Fn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Ih),us.child=e,this.dispatchEvent(us),us.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,s=this.children.length;i<s;i++){let r=this.children[i].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);let s=this.children;for(let a=0,r=s.length;a<r;a++)s[a].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(sa,e,Yp),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(sa,Zp,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){let i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let s=this.children;for(let a=0,r=s.length;a<r;a++)s[a].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(l=>({boxInitialized:l.boxInitialized,boxMin:l.box.min.toArray(),boxMax:l.box.max.toArray(),sphereInitialized:l.sphereInitialized,sphereRadius:l.sphere.radius,sphereCenter:l.sphere.center.toArray()})),s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function a(l,c){return l[c.uuid]===void 0&&(l[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=a(e.geometries,this.geometry);let l=this.geometry.parameters;if(l!==void 0&&l.shapes!==void 0){let c=l.shapes;if(Array.isArray(c))for(let h=0,u=c.length;h<u;h++){let d=c[h];a(e.shapes,d)}else a(e.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(a(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let l=[];for(let c=0,h=this.material.length;c<h;c++)l.push(a(e.materials,this.material[c]));s.material=l}else s.material=a(e.materials,this.material);if(this.children.length>0){s.children=[];for(let l=0;l<this.children.length;l++)s.children.push(this.children[l].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let l=0;l<this.animations.length;l++){let c=this.animations[l];s.animations.push(a(e.animations,c))}}if(t){let l=r(e.geometries),c=r(e.materials),h=r(e.textures),u=r(e.images),d=r(e.shapes),f=r(e.skeletons),g=r(e.animations),y=r(e.nodes);l.length>0&&(i.geometries=l),c.length>0&&(i.materials=c),h.length>0&&(i.textures=h),u.length>0&&(i.images=u),d.length>0&&(i.shapes=d),f.length>0&&(i.skeletons=f),g.length>0&&(i.animations=g),y.length>0&&(i.nodes=y)}return i.object=s,i;function r(l){let c=[];for(let h in l){let u=l[h];delete u.metadata,c.push(u)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){let s=e.children[i];this.add(s.clone())}return this}};Ht.DEFAULT_UP=new k(0,1,0);Ht.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ht.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var xn=new k,Bn=new k,Ao=new k,zn=new k,ds=new k,ps=new k,Dh=new k,To=new k,Eo=new k,Co=new k,Ro=new pt,Po=new pt,Lo=new pt,di=class n{constructor(e=new k,t=new k,i=new k){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,s){s.subVectors(i,t),xn.subVectors(e,t),s.cross(xn);let a=s.lengthSq();return a>0?s.multiplyScalar(1/Math.sqrt(a)):s.set(0,0,0)}static getBarycoord(e,t,i,s,a){xn.subVectors(s,t),Bn.subVectors(i,t),Ao.subVectors(e,t);let r=xn.dot(xn),l=xn.dot(Bn),c=xn.dot(Ao),h=Bn.dot(Bn),u=Bn.dot(Ao),d=r*h-l*l;if(d===0)return a.set(0,0,0),null;let f=1/d,g=(h*c-l*u)*f,y=(r*u-l*c)*f;return a.set(1-g-y,y,g)}static containsPoint(e,t,i,s){return this.getBarycoord(e,t,i,s,zn)===null?!1:zn.x>=0&&zn.y>=0&&zn.x+zn.y<=1}static getInterpolation(e,t,i,s,a,r,l,c){return this.getBarycoord(e,t,i,s,zn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(a,zn.x),c.addScaledVector(r,zn.y),c.addScaledVector(l,zn.z),c)}static getInterpolatedAttribute(e,t,i,s,a,r){return Ro.setScalar(0),Po.setScalar(0),Lo.setScalar(0),Ro.fromBufferAttribute(e,t),Po.fromBufferAttribute(e,i),Lo.fromBufferAttribute(e,s),r.setScalar(0),r.addScaledVector(Ro,a.x),r.addScaledVector(Po,a.y),r.addScaledVector(Lo,a.z),r}static isFrontFacing(e,t,i,s){return xn.subVectors(i,t),Bn.subVectors(e,t),xn.cross(Bn).dot(s)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,s){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,i,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return xn.subVectors(this.c,this.b),Bn.subVectors(this.a,this.b),xn.cross(Bn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return n.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return n.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,s,a){return n.getInterpolation(e,this.a,this.b,this.c,t,i,s,a)}containsPoint(e){return n.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return n.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let i=this.a,s=this.b,a=this.c,r,l;ds.subVectors(s,i),ps.subVectors(a,i),To.subVectors(e,i);let c=ds.dot(To),h=ps.dot(To);if(c<=0&&h<=0)return t.copy(i);Eo.subVectors(e,s);let u=ds.dot(Eo),d=ps.dot(Eo);if(u>=0&&d<=u)return t.copy(s);let f=c*d-u*h;if(f<=0&&c>=0&&u<=0)return r=c/(c-u),t.copy(i).addScaledVector(ds,r);Co.subVectors(e,a);let g=ds.dot(Co),y=ps.dot(Co);if(y>=0&&g<=y)return t.copy(a);let _=g*h-c*y;if(_<=0&&h>=0&&y<=0)return l=h/(h-y),t.copy(i).addScaledVector(ps,l);let m=u*y-g*d;if(m<=0&&d-u>=0&&g-y>=0)return Dh.subVectors(a,s),l=(d-u)/(d-u+(g-y)),t.copy(s).addScaledVector(Dh,l);let p=1/(m+_+f);return r=_*p,l=f*p,t.copy(i).addScaledVector(ds,r).addScaledVector(ps,l)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},ku={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ci={h:0,s:0,l:0},Ja={h:0,s:0,l:0};function Io(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}var Qe=class{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Zt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,at.toWorkingColorSpace(this,t),this}setRGB(e,t,i,s=at.workingColorSpace){return this.r=e,this.g=t,this.b=i,at.toWorkingColorSpace(this,s),this}setHSL(e,t,i,s=at.workingColorSpace){if(e=Tc(e,1),t=kt(t,0,1),i=kt(i,0,1),t===0)this.r=this.g=this.b=i;else{let a=i<=.5?i*(1+t):i+t-i*t,r=2*i-a;this.r=Io(r,a,e+1/3),this.g=Io(r,a,e),this.b=Io(r,a,e-1/3)}return at.toWorkingColorSpace(this,s),this}setStyle(e,t=Zt){function i(a){a!==void 0&&parseFloat(a)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let a,r=s[1],l=s[2];switch(r){case"rgb":case"rgba":if(a=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(l))return i(a[4]),this.setRGB(Math.min(255,parseInt(a[1],10))/255,Math.min(255,parseInt(a[2],10))/255,Math.min(255,parseInt(a[3],10))/255,t);if(a=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(l))return i(a[4]),this.setRGB(Math.min(100,parseInt(a[1],10))/100,Math.min(100,parseInt(a[2],10))/100,Math.min(100,parseInt(a[3],10))/100,t);break;case"hsl":case"hsla":if(a=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(l))return i(a[4]),this.setHSL(parseFloat(a[1])/360,parseFloat(a[2])/100,parseFloat(a[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let a=s[1],r=a.length;if(r===3)return this.setRGB(parseInt(a.charAt(0),16)/15,parseInt(a.charAt(1),16)/15,parseInt(a.charAt(2),16)/15,t);if(r===6)return this.setHex(parseInt(a,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Zt){let i=ku[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=jn(e.r),this.g=jn(e.g),this.b=jn(e.b),this}copyLinearToSRGB(e){return this.r=As(e.r),this.g=As(e.g),this.b=As(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Zt){return at.fromWorkingColorSpace(Bt.copy(this),e),Math.round(kt(Bt.r*255,0,255))*65536+Math.round(kt(Bt.g*255,0,255))*256+Math.round(kt(Bt.b*255,0,255))}getHexString(e=Zt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=at.workingColorSpace){at.fromWorkingColorSpace(Bt.copy(this),t);let i=Bt.r,s=Bt.g,a=Bt.b,r=Math.max(i,s,a),l=Math.min(i,s,a),c,h,u=(l+r)/2;if(l===r)c=0,h=0;else{let d=r-l;switch(h=u<=.5?d/(r+l):d/(2-r-l),r){case i:c=(s-a)/d+(s<a?6:0);break;case s:c=(a-i)/d+2;break;case a:c=(i-s)/d+4;break}c/=6}return e.h=c,e.s=h,e.l=u,e}getRGB(e,t=at.workingColorSpace){return at.fromWorkingColorSpace(Bt.copy(this),t),e.r=Bt.r,e.g=Bt.g,e.b=Bt.b,e}getStyle(e=Zt){at.fromWorkingColorSpace(Bt.copy(this),e);let t=Bt.r,i=Bt.g,s=Bt.b;return e!==Zt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(e,t,i){return this.getHSL(ci),this.setHSL(ci.h+e,ci.s+t,ci.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(ci),e.getHSL(Ja);let i=pa(ci.h,Ja.h,t),s=pa(ci.s,Ja.s,t),a=pa(ci.l,Ja.l,t);return this.setHSL(i,s,a),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,i=this.g,s=this.b,a=e.elements;return this.r=a[0]*t+a[3]*i+a[6]*s,this.g=a[1]*t+a[4]*i+a[7]*s,this.b=a[2]*t+a[5]*i+a[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Bt=new Qe;Qe.NAMES=ku;var Kp=0,gi=class extends Yn{static get type(){return"Material"}get type(){return this.constructor.type}set type(e){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Kp++}),this.uuid=$n(),this.name="",this.blending=ws,this.side=mi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Xo,this.blendDst=Yo,this.blendEquation=Di,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Qe(0,0,0),this.blendAlpha=0,this.depthFunc=Es,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=gh,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ss,this.stencilZFail=ss,this.stencilZPass=ss,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[t]=i}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==ws&&(i.blending=this.blending),this.side!==mi&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Xo&&(i.blendSrc=this.blendSrc),this.blendDst!==Yo&&(i.blendDst=this.blendDst),this.blendEquation!==Di&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Es&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==gh&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ss&&(i.stencilFail=this.stencilFail),this.stencilZFail!==ss&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==ss&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(a){let r=[];for(let l in a){let c=a[l];delete c.metadata,r.push(c)}return r}if(t){let a=s(e.textures),r=s(e.images);a.length>0&&(i.textures=a),r.length>0&&(i.images=r)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,i=null;if(t!==null){let s=t.length;i=new Array(s);for(let a=0;a!==s;++a)i[a]=t[a].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}},Jn=class extends gi{static get type(){return"MeshBasicMaterial"}constructor(e){super(),this.isMeshBasicMaterial=!0,this.color=new Qe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pn,this.combine=vu,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};var Ct=new k,Ka=new we,cn=class{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=kl,this.updateRanges=[],this.gpuType=Wn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let s=0,a=this.itemSize;s<a;s++)this.array[e+s]=t.array[i+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Ka.fromBufferAttribute(this,t),Ka.applyMatrix3(e),this.setXY(t,Ka.x,Ka.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix3(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix4(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyNormalMatrix(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.transformDirection(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=bn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=ct(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=bn(t,this.array)),t}setX(e,t){return this.normalized&&(t=ct(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=bn(t,this.array)),t}setY(e,t){return this.normalized&&(t=ct(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=bn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=ct(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=bn(t,this.array)),t}setW(e,t){return this.normalized&&(t=ct(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=ct(t,this.array),i=ct(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,s){return e*=this.itemSize,this.normalized&&(t=ct(t,this.array),i=ct(i,this.array),s=ct(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this}setXYZW(e,t,i,s,a){return e*=this.itemSize,this.normalized&&(t=ct(t,this.array),i=ct(i,this.array),s=ct(s,this.array),a=ct(a,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this.array[e+3]=a,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==kl&&(e.usage=this.usage),e}};var Ar=class extends cn{constructor(e,t,i){super(new Uint16Array(e),t,i)}};var Tr=class extends cn{constructor(e,t,i){super(new Uint32Array(e),t,i)}};var Et=class extends cn{constructor(e,t,i){super(new Float32Array(e),t,i)}},Qp=0,mn=new Mt,Do=new Ht,fs=new k,on=new Vi,aa=new Vi,Dt=new k,Kt=class n extends Yn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Qp++}),this.uuid=$n(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Du(e)?Tr:Ar)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let a=new je().getNormalMatrix(e);i.applyNormalMatrix(a),i.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return mn.makeRotationFromQuaternion(e),this.applyMatrix4(mn),this}rotateX(e){return mn.makeRotationX(e),this.applyMatrix4(mn),this}rotateY(e){return mn.makeRotationY(e),this.applyMatrix4(mn),this}rotateZ(e){return mn.makeRotationZ(e),this.applyMatrix4(mn),this}translate(e,t,i){return mn.makeTranslation(e,t,i),this.applyMatrix4(mn),this}scale(e,t,i){return mn.makeScale(e,t,i),this.applyMatrix4(mn),this}lookAt(e){return Do.lookAt(e),Do.updateMatrix(),this.applyMatrix4(Do.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(fs).negate(),this.translate(fs.x,fs.y,fs.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let i=[];for(let s=0,a=e.length;s<a;s++){let r=e[s];i.push(r.x,r.y,r.z||0)}this.setAttribute("position",new Et(i,3))}else{for(let i=0,s=t.count;i<s;i++){let a=e[i];t.setXYZ(i,a.x,a.y,a.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Vi);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new k(-1/0,-1/0,-1/0),new k(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,s=t.length;i<s;i++){let a=t[i];on.setFromBufferAttribute(a),this.morphTargetsRelative?(Dt.addVectors(this.boundingBox.min,on.min),this.boundingBox.expandByPoint(Dt),Dt.addVectors(this.boundingBox.max,on.max),this.boundingBox.expandByPoint(Dt)):(this.boundingBox.expandByPoint(on.min),this.boundingBox.expandByPoint(on.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new _a);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new k,1/0);return}if(e){let i=this.boundingSphere.center;if(on.setFromBufferAttribute(e),t)for(let a=0,r=t.length;a<r;a++){let l=t[a];aa.setFromBufferAttribute(l),this.morphTargetsRelative?(Dt.addVectors(on.min,aa.min),on.expandByPoint(Dt),Dt.addVectors(on.max,aa.max),on.expandByPoint(Dt)):(on.expandByPoint(aa.min),on.expandByPoint(aa.max))}on.getCenter(i);let s=0;for(let a=0,r=e.count;a<r;a++)Dt.fromBufferAttribute(e,a),s=Math.max(s,i.distanceToSquared(Dt));if(t)for(let a=0,r=t.length;a<r;a++){let l=t[a],c=this.morphTargetsRelative;for(let h=0,u=l.count;h<u;h++)Dt.fromBufferAttribute(l,h),c&&(fs.fromBufferAttribute(e,h),Dt.add(fs)),s=Math.max(s,i.distanceToSquared(Dt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=t.position,s=t.normal,a=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new cn(new Float32Array(4*i.count),4));let r=this.getAttribute("tangent"),l=[],c=[];for(let G=0;G<i.count;G++)l[G]=new k,c[G]=new k;let h=new k,u=new k,d=new k,f=new we,g=new we,y=new we,_=new k,m=new k;function p(G,S,w){h.fromBufferAttribute(i,G),u.fromBufferAttribute(i,S),d.fromBufferAttribute(i,w),f.fromBufferAttribute(a,G),g.fromBufferAttribute(a,S),y.fromBufferAttribute(a,w),u.sub(h),d.sub(h),g.sub(f),y.sub(f);let V=1/(g.x*y.y-y.x*g.y);isFinite(V)&&(_.copy(u).multiplyScalar(y.y).addScaledVector(d,-g.y).multiplyScalar(V),m.copy(d).multiplyScalar(g.x).addScaledVector(u,-y.x).multiplyScalar(V),l[G].add(_),l[S].add(_),l[w].add(_),c[G].add(m),c[S].add(m),c[w].add(m))}let E=this.groups;E.length===0&&(E=[{start:0,count:e.count}]);for(let G=0,S=E.length;G<S;++G){let w=E[G],V=w.start,j=w.count;for(let $=V,J=V+j;$<J;$+=3)p(e.getX($+0),e.getX($+1),e.getX($+2))}let b=new k,M=new k,z=new k,C=new k;function I(G){z.fromBufferAttribute(s,G),C.copy(z);let S=l[G];b.copy(S),b.sub(z.multiplyScalar(z.dot(S))).normalize(),M.crossVectors(C,S);let V=M.dot(c[G])<0?-1:1;r.setXYZW(G,b.x,b.y,b.z,V)}for(let G=0,S=E.length;G<S;++G){let w=E[G],V=w.start,j=w.count;for(let $=V,J=V+j;$<J;$+=3)I(e.getX($+0)),I(e.getX($+1)),I(e.getX($+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new cn(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let f=0,g=i.count;f<g;f++)i.setXYZ(f,0,0,0);let s=new k,a=new k,r=new k,l=new k,c=new k,h=new k,u=new k,d=new k;if(e)for(let f=0,g=e.count;f<g;f+=3){let y=e.getX(f+0),_=e.getX(f+1),m=e.getX(f+2);s.fromBufferAttribute(t,y),a.fromBufferAttribute(t,_),r.fromBufferAttribute(t,m),u.subVectors(r,a),d.subVectors(s,a),u.cross(d),l.fromBufferAttribute(i,y),c.fromBufferAttribute(i,_),h.fromBufferAttribute(i,m),l.add(u),c.add(u),h.add(u),i.setXYZ(y,l.x,l.y,l.z),i.setXYZ(_,c.x,c.y,c.z),i.setXYZ(m,h.x,h.y,h.z)}else for(let f=0,g=t.count;f<g;f+=3)s.fromBufferAttribute(t,f+0),a.fromBufferAttribute(t,f+1),r.fromBufferAttribute(t,f+2),u.subVectors(r,a),d.subVectors(s,a),u.cross(d),i.setXYZ(f+0,u.x,u.y,u.z),i.setXYZ(f+1,u.x,u.y,u.z),i.setXYZ(f+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Dt.fromBufferAttribute(e,t),Dt.normalize(),e.setXYZ(t,Dt.x,Dt.y,Dt.z)}toNonIndexed(){function e(l,c){let h=l.array,u=l.itemSize,d=l.normalized,f=new h.constructor(c.length*u),g=0,y=0;for(let _=0,m=c.length;_<m;_++){l.isInterleavedBufferAttribute?g=c[_]*l.data.stride+l.offset:g=c[_]*u;for(let p=0;p<u;p++)f[y++]=h[g++]}return new cn(f,u,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new n,i=this.index.array,s=this.attributes;for(let l in s){let c=s[l],h=e(c,i);t.setAttribute(l,h)}let a=this.morphAttributes;for(let l in a){let c=[],h=a[l];for(let u=0,d=h.length;u<d;u++){let f=h[u],g=e(f,i);c.push(g)}t.morphAttributes[l]=c}t.morphTargetsRelative=this.morphTargetsRelative;let r=this.groups;for(let l=0,c=r.length;l<c;l++){let h=r[l];t.addGroup(h.start,h.count,h.materialIndex)}return t}toJSON(){let e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let c=this.parameters;for(let h in c)c[h]!==void 0&&(e[h]=c[h]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let i=this.attributes;for(let c in i){let h=i[c];e.data.attributes[c]=h.toJSON(e.data)}let s={},a=!1;for(let c in this.morphAttributes){let h=this.morphAttributes[c],u=[];for(let d=0,f=h.length;d<f;d++){let g=h[d];u.push(g.toJSON(e.data))}u.length>0&&(s[c]=u,a=!0)}a&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let r=this.groups;r.length>0&&(e.data.groups=JSON.parse(JSON.stringify(r)));let l=this.boundingSphere;return l!==null&&(e.data.boundingSphere={center:l.center.toArray(),radius:l.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let i=e.index;i!==null&&this.setIndex(i.clone(t));let s=e.attributes;for(let h in s){let u=s[h];this.setAttribute(h,u.clone(t))}let a=e.morphAttributes;for(let h in a){let u=[],d=a[h];for(let f=0,g=d.length;f<g;f++)u.push(d[f].clone(t));this.morphAttributes[h]=u}this.morphTargetsRelative=e.morphTargetsRelative;let r=e.groups;for(let h=0,u=r.length;h<u;h++){let d=r[h];this.addGroup(d.start,d.count,d.materialIndex)}let l=e.boundingBox;l!==null&&(this.boundingBox=l.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},kh=new Mt,Ci=new Is,Qa=new _a,Oh=new k,er=new k,tr=new k,nr=new k,ko=new k,ir=new k,Uh=new k,sr=new k,Ot=class extends Ht{constructor(e=new Kt,t=new Jn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=s.length;a<r;a++){let l=s[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[l]=a}}}}getVertexPosition(e,t){let i=this.geometry,s=i.attributes.position,a=i.morphAttributes.position,r=i.morphTargetsRelative;t.fromBufferAttribute(s,e);let l=this.morphTargetInfluences;if(a&&l){ir.set(0,0,0);for(let c=0,h=a.length;c<h;c++){let u=l[c],d=a[c];u!==0&&(ko.fromBufferAttribute(d,e),r?ir.addScaledVector(ko,u):ir.addScaledVector(ko.sub(t),u))}t.add(ir)}return t}raycast(e,t){let i=this.geometry,s=this.material,a=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Qa.copy(i.boundingSphere),Qa.applyMatrix4(a),Ci.copy(e.ray).recast(e.near),!(Qa.containsPoint(Ci.origin)===!1&&(Ci.intersectSphere(Qa,Oh)===null||Ci.origin.distanceToSquared(Oh)>(e.far-e.near)**2))&&(kh.copy(a).invert(),Ci.copy(e.ray).applyMatrix4(kh),!(i.boundingBox!==null&&Ci.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Ci)))}_computeIntersections(e,t,i){let s,a=this.geometry,r=this.material,l=a.index,c=a.attributes.position,h=a.attributes.uv,u=a.attributes.uv1,d=a.attributes.normal,f=a.groups,g=a.drawRange;if(l!==null)if(Array.isArray(r))for(let y=0,_=f.length;y<_;y++){let m=f[y],p=r[m.materialIndex],E=Math.max(m.start,g.start),b=Math.min(l.count,Math.min(m.start+m.count,g.start+g.count));for(let M=E,z=b;M<z;M+=3){let C=l.getX(M),I=l.getX(M+1),G=l.getX(M+2);s=ar(this,p,e,i,h,u,d,C,I,G),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let y=Math.max(0,g.start),_=Math.min(l.count,g.start+g.count);for(let m=y,p=_;m<p;m+=3){let E=l.getX(m),b=l.getX(m+1),M=l.getX(m+2);s=ar(this,r,e,i,h,u,d,E,b,M),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(c!==void 0)if(Array.isArray(r))for(let y=0,_=f.length;y<_;y++){let m=f[y],p=r[m.materialIndex],E=Math.max(m.start,g.start),b=Math.min(c.count,Math.min(m.start+m.count,g.start+g.count));for(let M=E,z=b;M<z;M+=3){let C=M,I=M+1,G=M+2;s=ar(this,p,e,i,h,u,d,C,I,G),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let y=Math.max(0,g.start),_=Math.min(c.count,g.start+g.count);for(let m=y,p=_;m<p;m+=3){let E=m,b=m+1,M=m+2;s=ar(this,r,e,i,h,u,d,E,b,M),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}};function ef(n,e,t,i,s,a,r,l){let c;if(e.side===Jt?c=i.intersectTriangle(r,a,s,!0,l):c=i.intersectTriangle(s,a,r,e.side===mi,l),c===null)return null;sr.copy(l),sr.applyMatrix4(n.matrixWorld);let h=t.ray.origin.distanceTo(sr);return h<t.near||h>t.far?null:{distance:h,point:sr.clone(),object:n}}function ar(n,e,t,i,s,a,r,l,c,h){n.getVertexPosition(l,er),n.getVertexPosition(c,tr),n.getVertexPosition(h,nr);let u=ef(n,e,t,i,er,tr,nr,Uh);if(u){let d=new k;di.getBarycoord(Uh,er,tr,nr,d),s&&(u.uv=di.getInterpolatedAttribute(s,l,c,h,d,new we)),a&&(u.uv1=di.getInterpolatedAttribute(a,l,c,h,d,new we)),r&&(u.normal=di.getInterpolatedAttribute(r,l,c,h,d,new k),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));let f={a:l,b:c,c:h,normal:new k,materialIndex:0};di.getNormal(er,tr,nr,f.normal),u.face=f,u.barycoord=d}return u}var Fi=class n extends Kt{constructor(e=1,t=1,i=1,s=1,a=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:s,heightSegments:a,depthSegments:r};let l=this;s=Math.floor(s),a=Math.floor(a),r=Math.floor(r);let c=[],h=[],u=[],d=[],f=0,g=0;y("z","y","x",-1,-1,i,t,e,r,a,0),y("z","y","x",1,-1,i,t,-e,r,a,1),y("x","z","y",1,1,e,i,t,s,r,2),y("x","z","y",1,-1,e,i,-t,s,r,3),y("x","y","z",1,-1,e,t,i,s,a,4),y("x","y","z",-1,-1,e,t,-i,s,a,5),this.setIndex(c),this.setAttribute("position",new Et(h,3)),this.setAttribute("normal",new Et(u,3)),this.setAttribute("uv",new Et(d,2));function y(_,m,p,E,b,M,z,C,I,G,S){let w=M/I,V=z/G,j=M/2,$=z/2,J=C/2,ae=I+1,Y=G+1,ce=0,Z=0,de=new k;for(let Me=0;Me<Y;Me++){let Ie=Me*V-$;for(let We=0;We<ae;We++){let Ye=We*w-j;de[_]=Ye*E,de[m]=Ie*b,de[p]=J,h.push(de.x,de.y,de.z),de[_]=0,de[m]=0,de[p]=C>0?1:-1,u.push(de.x,de.y,de.z),d.push(We/I),d.push(1-Me/G),ce+=1}}for(let Me=0;Me<G;Me++)for(let Ie=0;Ie<I;Ie++){let We=f+Ie+ae*Me,Ye=f+Ie+ae*(Me+1),ee=f+(Ie+1)+ae*(Me+1),ue=f+(Ie+1)+ae*Me;c.push(We,Ye,ue),c.push(Ye,ee,ue),Z+=6}l.addGroup(g,Z,S),g+=Z,f+=ce}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function Ds(n){let e={};for(let t in n){e[t]={};for(let i in n[t]){let s=n[t][i];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=s.clone():Array.isArray(s)?e[t][i]=s.slice():e[t][i]=s}}return e}function $t(n){let e={};for(let t=0;t<n.length;t++){let i=Ds(n[t]);for(let s in i)e[s]=i[s]}return e}function tf(n){let e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function Ou(n){let e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:at.workingColorSpace}var nf={clone:Ds,merge:$t},sf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,af=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Ln=class extends gi{static get type(){return"ShaderMaterial"}constructor(e){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=sf,this.fragmentShader=af,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ds(e.uniforms),this.uniformsGroups=tf(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let r=this.uniforms[s].value;r&&r.isTexture?t.uniforms[s]={type:"t",value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[s]={type:"c",value:r.getHex()}:r&&r.isVector2?t.uniforms[s]={type:"v2",value:r.toArray()}:r&&r.isVector3?t.uniforms[s]={type:"v3",value:r.toArray()}:r&&r.isVector4?t.uniforms[s]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?t.uniforms[s]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?t.uniforms[s]={type:"m4",value:r.toArray()}:t.uniforms[s]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let i={};for(let s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}},Er=class extends Ht{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Mt,this.projectionMatrix=new Mt,this.projectionMatrixInverse=new Mt,this.coordinateSystem=qn}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},hi=new k,Nh=new we,Vh=new we,zt=class extends Er{constructor(e=50,t=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=va*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(da*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return va*2*Math.atan(Math.tan(da*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){hi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(hi.x,hi.y).multiplyScalar(-e/hi.z),hi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(hi.x,hi.y).multiplyScalar(-e/hi.z)}getViewSize(e,t){return this.getViewBounds(e,Nh,Vh),t.subVectors(Vh,Nh)}setViewOffset(e,t,i,s,a,r){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(da*.5*this.fov)/this.zoom,i=2*t,s=this.aspect*i,a=-.5*s,r=this.view;if(this.view!==null&&this.view.enabled){let c=r.fullWidth,h=r.fullHeight;a+=r.offsetX*s/c,t-=r.offsetY*i/h,s*=r.width/c,i*=r.height/h}let l=this.filmOffset;l!==0&&(a+=e*l/this.getFilmWidth()),this.projectionMatrix.makePerspective(a,a+s,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},ms=-90,gs=1,Vl=class extends Ht{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new zt(ms,gs,e,t);s.layers=this.layers,this.add(s);let a=new zt(ms,gs,e,t);a.layers=this.layers,this.add(a);let r=new zt(ms,gs,e,t);r.layers=this.layers,this.add(r);let l=new zt(ms,gs,e,t);l.layers=this.layers,this.add(l);let c=new zt(ms,gs,e,t);c.layers=this.layers,this.add(c);let h=new zt(ms,gs,e,t);h.layers=this.layers,this.add(h)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[i,s,a,r,l,c]=t;for(let h of t)this.remove(h);if(e===qn)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),a.up.set(0,0,-1),a.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),l.up.set(0,1,0),l.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===br)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),a.up.set(0,0,1),a.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),l.up.set(0,-1,0),l.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let h of t)this.add(h),h.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[a,r,l,c,h,u]=this.children,d=e.getRenderTarget(),f=e.getActiveCubeFace(),g=e.getActiveMipmapLevel(),y=e.xr.enabled;e.xr.enabled=!1;let _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,s),e.render(t,a),e.setRenderTarget(i,1,s),e.render(t,r),e.setRenderTarget(i,2,s),e.render(t,l),e.setRenderTarget(i,3,s),e.render(t,c),e.setRenderTarget(i,4,s),e.render(t,h),i.texture.generateMipmaps=_,e.setRenderTarget(i,5,s),e.render(t,u),e.setRenderTarget(d,f,g),e.xr.enabled=y,i.texture.needsPMREMUpdate=!0}},Cr=class extends hn{constructor(e,t,i,s,a,r,l,c,h,u){e=e!==void 0?e:[],t=t!==void 0?t:Cs,super(e,t,i,s,a,r,l,c,h,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Fl=class extends Zn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let i={width:e,height:e,depth:1},s=[i,i,i,i,i,i];this.texture=new Cr(s,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Rn}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Fi(5,5,5),a=new Ln({name:"CubemapFromEquirect",uniforms:Ds(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Jt,blending:pi});a.uniforms.tEquirect.value=t;let r=new Ot(s,a),l=t.minFilter;return t.minFilter===Ui&&(t.minFilter=Rn),new Vl(1,10,this).update(e,r),t.minFilter=l,r.geometry.dispose(),r.material.dispose(),this}clear(e,t,i,s){let a=e.getRenderTarget();for(let r=0;r<6;r++)e.setRenderTarget(this,r),e.clear(t,i,s);e.setRenderTarget(a)}},Oo=new k,rf=new k,of=new je,ln=class{constructor(e=new k(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,s){return this.normal.set(e,t,i),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){let s=Oo.subVectors(i,t).cross(rf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let i=e.delta(Oo),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/s;return a<0||a>1?null:t.copy(e.start).addScaledVector(i,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let i=t||of.getNormalMatrix(e),s=this.coplanarPoint(Oo).applyMatrix4(e),a=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(a),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Ri=new _a,rr=new k,ba=class{constructor(e=new ln,t=new ln,i=new ln,s=new ln,a=new ln,r=new ln){this.planes=[e,t,i,s,a,r]}set(e,t,i,s,a,r){let l=this.planes;return l[0].copy(e),l[1].copy(t),l[2].copy(i),l[3].copy(s),l[4].copy(a),l[5].copy(r),this}copy(e){let t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=qn){let i=this.planes,s=e.elements,a=s[0],r=s[1],l=s[2],c=s[3],h=s[4],u=s[5],d=s[6],f=s[7],g=s[8],y=s[9],_=s[10],m=s[11],p=s[12],E=s[13],b=s[14],M=s[15];if(i[0].setComponents(c-a,f-h,m-g,M-p).normalize(),i[1].setComponents(c+a,f+h,m+g,M+p).normalize(),i[2].setComponents(c+r,f+u,m+y,M+E).normalize(),i[3].setComponents(c-r,f-u,m-y,M-E).normalize(),i[4].setComponents(c-l,f-d,m-_,M-b).normalize(),t===qn)i[5].setComponents(c+l,f+d,m+_,M+b).normalize();else if(t===br)i[5].setComponents(l,d,_,b).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ri.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ri.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ri)}intersectsSprite(e){return Ri.center.set(0,0,0),Ri.radius=.7071067811865476,Ri.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ri)}intersectsSphere(e){let t=this.planes,i=e.center,s=-e.radius;for(let a=0;a<6;a++)if(t[a].distanceToPoint(i)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let i=0;i<6;i++){let s=t[i];if(rr.x=s.normal.x>0?e.max.x:e.min.x,rr.y=s.normal.y>0?e.max.y:e.min.y,rr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(rr)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};function Uu(){let n=null,e=!1,t=null,i=null;function s(a,r){t(a,r),i=n.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(s),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(a){t=a},setContext:function(a){n=a}}}function lf(n){let e=new WeakMap;function t(l,c){let h=l.array,u=l.usage,d=h.byteLength,f=n.createBuffer();n.bindBuffer(c,f),n.bufferData(c,h,u),l.onUploadCallback();let g;if(h instanceof Float32Array)g=n.FLOAT;else if(h instanceof Uint16Array)l.isFloat16BufferAttribute?g=n.HALF_FLOAT:g=n.UNSIGNED_SHORT;else if(h instanceof Int16Array)g=n.SHORT;else if(h instanceof Uint32Array)g=n.UNSIGNED_INT;else if(h instanceof Int32Array)g=n.INT;else if(h instanceof Int8Array)g=n.BYTE;else if(h instanceof Uint8Array)g=n.UNSIGNED_BYTE;else if(h instanceof Uint8ClampedArray)g=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+h);return{buffer:f,type:g,bytesPerElement:h.BYTES_PER_ELEMENT,version:l.version,size:d}}function i(l,c,h){let u=c.array,d=c.updateRanges;if(n.bindBuffer(h,l),d.length===0)n.bufferSubData(h,0,u);else{d.sort((g,y)=>g.start-y.start);let f=0;for(let g=1;g<d.length;g++){let y=d[f],_=d[g];_.start<=y.start+y.count+1?y.count=Math.max(y.count,_.start+_.count-y.start):(++f,d[f]=_)}d.length=f+1;for(let g=0,y=d.length;g<y;g++){let _=d[g];n.bufferSubData(h,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(l){return l.isInterleavedBufferAttribute&&(l=l.data),e.get(l)}function a(l){l.isInterleavedBufferAttribute&&(l=l.data);let c=e.get(l);c&&(n.deleteBuffer(c.buffer),e.delete(l))}function r(l,c){if(l.isInterleavedBufferAttribute&&(l=l.data),l.isGLBufferAttribute){let u=e.get(l);(!u||u.version<l.version)&&e.set(l,{buffer:l.buffer,type:l.type,bytesPerElement:l.elementSize,version:l.version});return}let h=e.get(l);if(h===void 0)e.set(l,t(l,c));else if(h.version<l.version){if(h.size!==l.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(h.buffer,l,c),h.version=l.version}}return{get:s,remove:a,update:r}}var Bi=class n extends Kt{constructor(e=1,t=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:s};let a=e/2,r=t/2,l=Math.floor(i),c=Math.floor(s),h=l+1,u=c+1,d=e/l,f=t/c,g=[],y=[],_=[],m=[];for(let p=0;p<u;p++){let E=p*f-r;for(let b=0;b<h;b++){let M=b*d-a;y.push(M,-E,0),_.push(0,0,1),m.push(b/l),m.push(1-p/c)}}for(let p=0;p<c;p++)for(let E=0;E<l;E++){let b=E+h*p,M=E+h*(p+1),z=E+1+h*(p+1),C=E+1+h*p;g.push(b,M,C),g.push(M,z,C)}this.setIndex(g),this.setAttribute("position",new Et(y,3)),this.setAttribute("normal",new Et(_,3)),this.setAttribute("uv",new Et(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.width,e.height,e.widthSegments,e.heightSegments)}},cf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,hf=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,uf=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,df=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,pf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,ff=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,mf=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,gf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,yf=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,vf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,_f=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,xf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bf=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Mf=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,wf=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Sf=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Af=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Tf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Ef=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Cf=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Rf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Pf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Lf=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,If=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Df=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,kf=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Of=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Uf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Nf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Vf=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Ff="gl_FragColor = linearToOutputTexel( gl_FragColor );",Bf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,zf=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Hf=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Gf=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Wf=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,qf=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,$f=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,jf=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Xf=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Yf=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Zf=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Jf=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Kf=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Qf=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,em=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,tm=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,nm=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,im=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,sm=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,am=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,rm=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,om=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lm=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,cm=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,hm=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,um=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,dm=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,pm=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,fm=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,mm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,gm=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,ym=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,vm=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,_m=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,xm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,bm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Mm=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,wm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Sm=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Am=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Tm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Em=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Cm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Rm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Pm=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Lm=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Im=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Dm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,km=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Om=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Um=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Nm=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Vm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Fm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Bm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,zm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Hm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Gm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Wm=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,qm=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,$m=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,jm=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Xm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Ym=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Zm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Jm=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Km=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Qm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,eg=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tg=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,ng=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,ig=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,sg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,ag=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,rg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,og=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,lg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,cg=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ug=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,dg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,pg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,fg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,mg=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,gg=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,yg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,vg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,_g=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,bg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Mg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,wg=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Sg=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ag=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Tg=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Eg=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Cg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Rg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Pg=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Lg=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ig=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Dg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Og=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ug=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Ng=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Vg=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Fg=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Bg=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,zg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Xe={alphahash_fragment:cf,alphahash_pars_fragment:hf,alphamap_fragment:uf,alphamap_pars_fragment:df,alphatest_fragment:pf,alphatest_pars_fragment:ff,aomap_fragment:mf,aomap_pars_fragment:gf,batching_pars_vertex:yf,batching_vertex:vf,begin_vertex:_f,beginnormal_vertex:xf,bsdfs:bf,iridescence_fragment:Mf,bumpmap_pars_fragment:wf,clipping_planes_fragment:Sf,clipping_planes_pars_fragment:Af,clipping_planes_pars_vertex:Tf,clipping_planes_vertex:Ef,color_fragment:Cf,color_pars_fragment:Rf,color_pars_vertex:Pf,color_vertex:Lf,common:If,cube_uv_reflection_fragment:Df,defaultnormal_vertex:kf,displacementmap_pars_vertex:Of,displacementmap_vertex:Uf,emissivemap_fragment:Nf,emissivemap_pars_fragment:Vf,colorspace_fragment:Ff,colorspace_pars_fragment:Bf,envmap_fragment:zf,envmap_common_pars_fragment:Hf,envmap_pars_fragment:Gf,envmap_pars_vertex:Wf,envmap_physical_pars_fragment:tm,envmap_vertex:qf,fog_vertex:$f,fog_pars_vertex:jf,fog_fragment:Xf,fog_pars_fragment:Yf,gradientmap_pars_fragment:Zf,lightmap_pars_fragment:Jf,lights_lambert_fragment:Kf,lights_lambert_pars_fragment:Qf,lights_pars_begin:em,lights_toon_fragment:nm,lights_toon_pars_fragment:im,lights_phong_fragment:sm,lights_phong_pars_fragment:am,lights_physical_fragment:rm,lights_physical_pars_fragment:om,lights_fragment_begin:lm,lights_fragment_maps:cm,lights_fragment_end:hm,logdepthbuf_fragment:um,logdepthbuf_pars_fragment:dm,logdepthbuf_pars_vertex:pm,logdepthbuf_vertex:fm,map_fragment:mm,map_pars_fragment:gm,map_particle_fragment:ym,map_particle_pars_fragment:vm,metalnessmap_fragment:_m,metalnessmap_pars_fragment:xm,morphinstance_vertex:bm,morphcolor_vertex:Mm,morphnormal_vertex:wm,morphtarget_pars_vertex:Sm,morphtarget_vertex:Am,normal_fragment_begin:Tm,normal_fragment_maps:Em,normal_pars_fragment:Cm,normal_pars_vertex:Rm,normal_vertex:Pm,normalmap_pars_fragment:Lm,clearcoat_normal_fragment_begin:Im,clearcoat_normal_fragment_maps:Dm,clearcoat_pars_fragment:km,iridescence_pars_fragment:Om,opaque_fragment:Um,packing:Nm,premultiplied_alpha_fragment:Vm,project_vertex:Fm,dithering_fragment:Bm,dithering_pars_fragment:zm,roughnessmap_fragment:Hm,roughnessmap_pars_fragment:Gm,shadowmap_pars_fragment:Wm,shadowmap_pars_vertex:qm,shadowmap_vertex:$m,shadowmask_pars_fragment:jm,skinbase_vertex:Xm,skinning_pars_vertex:Ym,skinning_vertex:Zm,skinnormal_vertex:Jm,specularmap_fragment:Km,specularmap_pars_fragment:Qm,tonemapping_fragment:eg,tonemapping_pars_fragment:tg,transmission_fragment:ng,transmission_pars_fragment:ig,uv_pars_fragment:sg,uv_pars_vertex:ag,uv_vertex:rg,worldpos_vertex:og,background_vert:lg,background_frag:cg,backgroundCube_vert:hg,backgroundCube_frag:ug,cube_vert:dg,cube_frag:pg,depth_vert:fg,depth_frag:mg,distanceRGBA_vert:gg,distanceRGBA_frag:yg,equirect_vert:vg,equirect_frag:_g,linedashed_vert:xg,linedashed_frag:bg,meshbasic_vert:Mg,meshbasic_frag:wg,meshlambert_vert:Sg,meshlambert_frag:Ag,meshmatcap_vert:Tg,meshmatcap_frag:Eg,meshnormal_vert:Cg,meshnormal_frag:Rg,meshphong_vert:Pg,meshphong_frag:Lg,meshphysical_vert:Ig,meshphysical_frag:Dg,meshtoon_vert:kg,meshtoon_frag:Og,points_vert:Ug,points_frag:Ng,shadow_vert:Vg,shadow_frag:Fg,sprite_vert:Bg,sprite_frag:zg},ge={common:{diffuse:{value:new Qe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new je},alphaMap:{value:null},alphaMapTransform:{value:new je},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new je}},envmap:{envMap:{value:null},envMapRotation:{value:new je},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new je}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new je}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new je},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new je},normalScale:{value:new we(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new je},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new je}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new je}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new je}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Qe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Qe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new je},alphaTest:{value:0},uvTransform:{value:new je}},sprite:{diffuse:{value:new Qe(16777215)},opacity:{value:1},center:{value:new we(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new je},alphaMap:{value:null},alphaMapTransform:{value:new je},alphaTest:{value:0}}},Cn={basic:{uniforms:$t([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.fog]),vertexShader:Xe.meshbasic_vert,fragmentShader:Xe.meshbasic_frag},lambert:{uniforms:$t([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new Qe(0)}}]),vertexShader:Xe.meshlambert_vert,fragmentShader:Xe.meshlambert_frag},phong:{uniforms:$t([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new Qe(0)},specular:{value:new Qe(1118481)},shininess:{value:30}}]),vertexShader:Xe.meshphong_vert,fragmentShader:Xe.meshphong_frag},standard:{uniforms:$t([ge.common,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.roughnessmap,ge.metalnessmap,ge.fog,ge.lights,{emissive:{value:new Qe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Xe.meshphysical_vert,fragmentShader:Xe.meshphysical_frag},toon:{uniforms:$t([ge.common,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.gradientmap,ge.fog,ge.lights,{emissive:{value:new Qe(0)}}]),vertexShader:Xe.meshtoon_vert,fragmentShader:Xe.meshtoon_frag},matcap:{uniforms:$t([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,{matcap:{value:null}}]),vertexShader:Xe.meshmatcap_vert,fragmentShader:Xe.meshmatcap_frag},points:{uniforms:$t([ge.points,ge.fog]),vertexShader:Xe.points_vert,fragmentShader:Xe.points_frag},dashed:{uniforms:$t([ge.common,ge.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Xe.linedashed_vert,fragmentShader:Xe.linedashed_frag},depth:{uniforms:$t([ge.common,ge.displacementmap]),vertexShader:Xe.depth_vert,fragmentShader:Xe.depth_frag},normal:{uniforms:$t([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,{opacity:{value:1}}]),vertexShader:Xe.meshnormal_vert,fragmentShader:Xe.meshnormal_frag},sprite:{uniforms:$t([ge.sprite,ge.fog]),vertexShader:Xe.sprite_vert,fragmentShader:Xe.sprite_frag},background:{uniforms:{uvTransform:{value:new je},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Xe.background_vert,fragmentShader:Xe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new je}},vertexShader:Xe.backgroundCube_vert,fragmentShader:Xe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Xe.cube_vert,fragmentShader:Xe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Xe.equirect_vert,fragmentShader:Xe.equirect_frag},distanceRGBA:{uniforms:$t([ge.common,ge.displacementmap,{referencePosition:{value:new k},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Xe.distanceRGBA_vert,fragmentShader:Xe.distanceRGBA_frag},shadow:{uniforms:$t([ge.lights,ge.fog,{color:{value:new Qe(0)},opacity:{value:1}}]),vertexShader:Xe.shadow_vert,fragmentShader:Xe.shadow_frag}};Cn.physical={uniforms:$t([Cn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new je},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new je},clearcoatNormalScale:{value:new we(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new je},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new je},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new je},sheen:{value:0},sheenColor:{value:new Qe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new je},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new je},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new je},transmissionSamplerSize:{value:new we},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new je},attenuationDistance:{value:0},attenuationColor:{value:new Qe(0)},specularColor:{value:new Qe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new je},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new je},anisotropyVector:{value:new we},anisotropyMap:{value:null},anisotropyMapTransform:{value:new je}}]),vertexShader:Xe.meshphysical_vert,fragmentShader:Xe.meshphysical_frag};var or={r:0,b:0,g:0},Pi=new Pn,Hg=new Mt;function Gg(n,e,t,i,s,a,r){let l=new Qe(0),c=a===!0?0:1,h,u,d=null,f=0,g=null;function y(E){let b=E.isScene===!0?E.background:null;return b&&b.isTexture&&(b=(E.backgroundBlurriness>0?t:e).get(b)),b}function _(E){let b=!1,M=y(E);M===null?p(l,c):M&&M.isColor&&(p(M,1),b=!0);let z=n.xr.getEnvironmentBlendMode();z==="additive"?i.buffers.color.setClear(0,0,0,1,r):z==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,r),(n.autoClear||b)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function m(E,b){let M=y(b);M&&(M.isCubeTexture||M.mapping===qr)?(u===void 0&&(u=new Ot(new Fi(1,1,1),new Ln({name:"BackgroundCubeMaterial",uniforms:Ds(Cn.backgroundCube.uniforms),vertexShader:Cn.backgroundCube.vertexShader,fragmentShader:Cn.backgroundCube.fragmentShader,side:Jt,depthTest:!1,depthWrite:!1,fog:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(z,C,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(u)),Pi.copy(b.backgroundRotation),Pi.x*=-1,Pi.y*=-1,Pi.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(Pi.y*=-1,Pi.z*=-1),u.material.uniforms.envMap.value=M,u.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=b.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Hg.makeRotationFromEuler(Pi)),u.material.toneMapped=at.getTransfer(M.colorSpace)!==dt,(d!==M||f!==M.version||g!==n.toneMapping)&&(u.material.needsUpdate=!0,d=M,f=M.version,g=n.toneMapping),u.layers.enableAll(),E.unshift(u,u.geometry,u.material,0,0,null)):M&&M.isTexture&&(h===void 0&&(h=new Ot(new Bi(2,2),new Ln({name:"BackgroundMaterial",uniforms:Ds(Cn.background.uniforms),vertexShader:Cn.background.vertexShader,fragmentShader:Cn.background.fragmentShader,side:mi,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(h)),h.material.uniforms.t2D.value=M,h.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,h.material.toneMapped=at.getTransfer(M.colorSpace)!==dt,M.matrixAutoUpdate===!0&&M.updateMatrix(),h.material.uniforms.uvTransform.value.copy(M.matrix),(d!==M||f!==M.version||g!==n.toneMapping)&&(h.material.needsUpdate=!0,d=M,f=M.version,g=n.toneMapping),h.layers.enableAll(),E.unshift(h,h.geometry,h.material,0,0,null))}function p(E,b){E.getRGB(or,Ou(n)),i.buffers.color.setClear(or.r,or.g,or.b,b,r)}return{getClearColor:function(){return l},setClearColor:function(E,b=1){l.set(E),c=b,p(l,c)},getClearAlpha:function(){return c},setClearAlpha:function(E){c=E,p(l,c)},render:_,addToRenderList:m}}function Wg(n,e){let t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=f(null),a=s,r=!1;function l(w,V,j,$,J){let ae=!1,Y=d($,j,V);a!==Y&&(a=Y,h(a.object)),ae=g(w,$,j,J),ae&&y(w,$,j,J),J!==null&&e.update(J,n.ELEMENT_ARRAY_BUFFER),(ae||r)&&(r=!1,M(w,V,j,$),J!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(J).buffer))}function c(){return n.createVertexArray()}function h(w){return n.bindVertexArray(w)}function u(w){return n.deleteVertexArray(w)}function d(w,V,j){let $=j.wireframe===!0,J=i[w.id];J===void 0&&(J={},i[w.id]=J);let ae=J[V.id];ae===void 0&&(ae={},J[V.id]=ae);let Y=ae[$];return Y===void 0&&(Y=f(c()),ae[$]=Y),Y}function f(w){let V=[],j=[],$=[];for(let J=0;J<t;J++)V[J]=0,j[J]=0,$[J]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:V,enabledAttributes:j,attributeDivisors:$,object:w,attributes:{},index:null}}function g(w,V,j,$){let J=a.attributes,ae=V.attributes,Y=0,ce=j.getAttributes();for(let Z in ce)if(ce[Z].location>=0){let Me=J[Z],Ie=ae[Z];if(Ie===void 0&&(Z==="instanceMatrix"&&w.instanceMatrix&&(Ie=w.instanceMatrix),Z==="instanceColor"&&w.instanceColor&&(Ie=w.instanceColor)),Me===void 0||Me.attribute!==Ie||Ie&&Me.data!==Ie.data)return!0;Y++}return a.attributesNum!==Y||a.index!==$}function y(w,V,j,$){let J={},ae=V.attributes,Y=0,ce=j.getAttributes();for(let Z in ce)if(ce[Z].location>=0){let Me=ae[Z];Me===void 0&&(Z==="instanceMatrix"&&w.instanceMatrix&&(Me=w.instanceMatrix),Z==="instanceColor"&&w.instanceColor&&(Me=w.instanceColor));let Ie={};Ie.attribute=Me,Me&&Me.data&&(Ie.data=Me.data),J[Z]=Ie,Y++}a.attributes=J,a.attributesNum=Y,a.index=$}function _(){let w=a.newAttributes;for(let V=0,j=w.length;V<j;V++)w[V]=0}function m(w){p(w,0)}function p(w,V){let j=a.newAttributes,$=a.enabledAttributes,J=a.attributeDivisors;j[w]=1,$[w]===0&&(n.enableVertexAttribArray(w),$[w]=1),J[w]!==V&&(n.vertexAttribDivisor(w,V),J[w]=V)}function E(){let w=a.newAttributes,V=a.enabledAttributes;for(let j=0,$=V.length;j<$;j++)V[j]!==w[j]&&(n.disableVertexAttribArray(j),V[j]=0)}function b(w,V,j,$,J,ae,Y){Y===!0?n.vertexAttribIPointer(w,V,j,J,ae):n.vertexAttribPointer(w,V,j,$,J,ae)}function M(w,V,j,$){_();let J=$.attributes,ae=j.getAttributes(),Y=V.defaultAttributeValues;for(let ce in ae){let Z=ae[ce];if(Z.location>=0){let de=J[ce];if(de===void 0&&(ce==="instanceMatrix"&&w.instanceMatrix&&(de=w.instanceMatrix),ce==="instanceColor"&&w.instanceColor&&(de=w.instanceColor)),de!==void 0){let Me=de.normalized,Ie=de.itemSize,We=e.get(de);if(We===void 0)continue;let Ye=We.buffer,ee=We.type,ue=We.bytesPerElement,Pe=ee===n.INT||ee===n.UNSIGNED_INT||de.gpuType===xc;if(de.isInterleavedBufferAttribute){let ye=de.data,Le=ye.stride,He=de.offset;if(ye.isInstancedInterleavedBuffer){for(let $e=0;$e<Z.locationSize;$e++)p(Z.location+$e,ye.meshPerAttribute);w.isInstancedMesh!==!0&&$._maxInstanceCount===void 0&&($._maxInstanceCount=ye.meshPerAttribute*ye.count)}else for(let $e=0;$e<Z.locationSize;$e++)m(Z.location+$e);n.bindBuffer(n.ARRAY_BUFFER,Ye);for(let $e=0;$e<Z.locationSize;$e++)b(Z.location+$e,Ie/Z.locationSize,ee,Me,Le*ue,(He+Ie/Z.locationSize*$e)*ue,Pe)}else{if(de.isInstancedBufferAttribute){for(let ye=0;ye<Z.locationSize;ye++)p(Z.location+ye,de.meshPerAttribute);w.isInstancedMesh!==!0&&$._maxInstanceCount===void 0&&($._maxInstanceCount=de.meshPerAttribute*de.count)}else for(let ye=0;ye<Z.locationSize;ye++)m(Z.location+ye);n.bindBuffer(n.ARRAY_BUFFER,Ye);for(let ye=0;ye<Z.locationSize;ye++)b(Z.location+ye,Ie/Z.locationSize,ee,Me,Ie*ue,Ie/Z.locationSize*ye*ue,Pe)}}else if(Y!==void 0){let Me=Y[ce];if(Me!==void 0)switch(Me.length){case 2:n.vertexAttrib2fv(Z.location,Me);break;case 3:n.vertexAttrib3fv(Z.location,Me);break;case 4:n.vertexAttrib4fv(Z.location,Me);break;default:n.vertexAttrib1fv(Z.location,Me)}}}}E()}function z(){G();for(let w in i){let V=i[w];for(let j in V){let $=V[j];for(let J in $)u($[J].object),delete $[J];delete V[j]}delete i[w]}}function C(w){if(i[w.id]===void 0)return;let V=i[w.id];for(let j in V){let $=V[j];for(let J in $)u($[J].object),delete $[J];delete V[j]}delete i[w.id]}function I(w){for(let V in i){let j=i[V];if(j[w.id]===void 0)continue;let $=j[w.id];for(let J in $)u($[J].object),delete $[J];delete j[w.id]}}function G(){S(),r=!0,a!==s&&(a=s,h(a.object))}function S(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:l,reset:G,resetDefaultState:S,dispose:z,releaseStatesOfGeometry:C,releaseStatesOfProgram:I,initAttributes:_,enableAttribute:m,disableUnusedAttributes:E}}function qg(n,e,t){let i;function s(h){i=h}function a(h,u){n.drawArrays(i,h,u),t.update(u,i,1)}function r(h,u,d){d!==0&&(n.drawArraysInstanced(i,h,u,d),t.update(u,i,d))}function l(h,u,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,h,0,u,0,d);let g=0;for(let y=0;y<d;y++)g+=u[y];t.update(g,i,1)}function c(h,u,d,f){if(d===0)return;let g=e.get("WEBGL_multi_draw");if(g===null)for(let y=0;y<h.length;y++)r(h[y],u[y],f[y]);else{g.multiDrawArraysInstancedWEBGL(i,h,0,u,0,f,0,d);let y=0;for(let _=0;_<d;_++)y+=u[_]*f[_];t.update(y,i,1)}}this.setMode=s,this.render=a,this.renderInstances=r,this.renderMultiDraw=l,this.renderMultiDrawInstances=c}function $g(n,e,t,i){let s;function a(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let I=e.get("EXT_texture_filter_anisotropic");s=n.getParameter(I.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function r(I){return!(I!==Mn&&i.convert(I)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function l(I){let G=I===Ra&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(I!==Xn&&i.convert(I)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&I!==Wn&&!G)}function c(I){if(I==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";I="mediump"}return I==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let h=t.precision!==void 0?t.precision:"highp",u=c(h);u!==h&&(console.warn("THREE.WebGLRenderer:",h,"not supported, using",u,"instead."),h=u);let d=t.logarithmicDepthBuffer===!0,f=t.reverseDepthBuffer===!0&&e.has("EXT_clip_control"),g=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),y=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=n.getParameter(n.MAX_TEXTURE_SIZE),m=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),p=n.getParameter(n.MAX_VERTEX_ATTRIBS),E=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),b=n.getParameter(n.MAX_VARYING_VECTORS),M=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),z=y>0,C=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:r,textureTypeReadable:l,precision:h,logarithmicDepthBuffer:d,reverseDepthBuffer:f,maxTextures:g,maxVertexTextures:y,maxTextureSize:_,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:E,maxVaryings:b,maxFragmentUniforms:M,vertexTextures:z,maxSamples:C}}function jg(n){let e=this,t=null,i=0,s=!1,a=!1,r=new ln,l=new je,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,f){let g=d.length!==0||f||i!==0||s;return s=f,i=d.length,g},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(d,f){t=u(d,f,0)},this.setState=function(d,f,g){let y=d.clippingPlanes,_=d.clipIntersection,m=d.clipShadows,p=n.get(d);if(!s||y===null||y.length===0||a&&!m)a?u(null):h();else{let E=a?0:i,b=E*4,M=p.clippingState||null;c.value=M,M=u(y,f,b,g);for(let z=0;z!==b;++z)M[z]=t[z];p.clippingState=M,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=E}};function h(){c.value!==t&&(c.value=t,c.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(d,f,g,y){let _=d!==null?d.length:0,m=null;if(_!==0){if(m=c.value,y!==!0||m===null){let p=g+_*4,E=f.matrixWorldInverse;l.getNormalMatrix(E),(m===null||m.length<p)&&(m=new Float32Array(p));for(let b=0,M=g;b!==_;++b,M+=4)r.copy(d[b]).applyMatrix4(E,l),r.normal.toArray(m,M),m[M+3]=r.constant}c.value=m,c.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,m}}function Xg(n){let e=new WeakMap;function t(r,l){return l===il?r.mapping=Cs:l===sl&&(r.mapping=Rs),r}function i(r){if(r&&r.isTexture){let l=r.mapping;if(l===il||l===sl)if(e.has(r)){let c=e.get(r).texture;return t(c,r.mapping)}else{let c=r.image;if(c&&c.height>0){let h=new Fl(c.height);return h.fromEquirectangularTexture(n,r),e.set(r,h),r.addEventListener("dispose",s),t(h.texture,r.mapping)}else return null}}return r}function s(r){let l=r.target;l.removeEventListener("dispose",s);let c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap}return{get:i,dispose:a}}var Rr=class extends Er{constructor(e=-1,t=1,i=1,s=-1,a=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=s,this.near=a,this.far=r,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,s,a,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2,a=i-e,r=i+e,l=s+t,c=s-t;if(this.view!==null&&this.view.enabled){let h=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;a+=h*this.view.offsetX,r=a+h*this.view.width,l-=u*this.view.offsetY,c=l-u*this.view.height}this.projectionMatrix.makeOrthographic(a,r,l,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Ms=4,Fh=[.125,.215,.35,.446,.526,.582],ki=20,Uo=new Rr,Bh=new Qe,No=null,Vo=0,Fo=0,Bo=!1,Ii=(1+Math.sqrt(5))/2,ys=1/Ii,zh=[new k(-Ii,ys,0),new k(Ii,ys,0),new k(-ys,0,Ii),new k(ys,0,Ii),new k(0,Ii,-ys),new k(0,Ii,ys),new k(-1,1,-1),new k(1,1,-1),new k(-1,1,1),new k(1,1,1)],Pr=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,s=100){No=this._renderer.getRenderTarget(),Vo=this._renderer.getActiveCubeFace(),Fo=this._renderer.getActiveMipmapLevel(),Bo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);let a=this._allocateTargets();return a.depthBuffer=!0,this._sceneToCubeUV(e,i,s,a),t>0&&this._blur(a,0,0,t),this._applyPMREM(a),this._cleanup(a),a}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Wh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Gh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(No,Vo,Fo),this._renderer.xr.enabled=Bo,e.scissorTest=!1,lr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Cs||e.mapping===Rs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),No=this._renderer.getRenderTarget(),Vo=this._renderer.getActiveCubeFace(),Fo=this._renderer.getActiveMipmapLevel(),Bo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Rn,minFilter:Rn,generateMipmaps:!1,type:Ra,format:Mn,colorSpace:Us,depthBuffer:!1},s=Hh(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Hh(e,t,i);let{_lodMax:a}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Yg(a)),this._blurMaterial=Zg(a,e,t)}return s}_compileMaterial(e){let t=new Ot(this._lodPlanes[0],e);this._renderer.compile(t,Uo)}_sceneToCubeUV(e,t,i,s){let l=new zt(90,1,t,i),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(Bh),u.toneMapping=fi,u.autoClear=!1;let g=new Jn({name:"PMREM.Background",side:Jt,depthWrite:!1,depthTest:!1}),y=new Ot(new Fi,g),_=!1,m=e.background;m?m.isColor&&(g.color.copy(m),e.background=null,_=!0):(g.color.copy(Bh),_=!0);for(let p=0;p<6;p++){let E=p%3;E===0?(l.up.set(0,c[p],0),l.lookAt(h[p],0,0)):E===1?(l.up.set(0,0,c[p]),l.lookAt(0,h[p],0)):(l.up.set(0,c[p],0),l.lookAt(0,0,h[p]));let b=this._cubeSize;lr(s,E*b,p>2?b:0,b,b),u.setRenderTarget(s),_&&u.render(y,l),u.render(e,l)}y.geometry.dispose(),y.material.dispose(),u.toneMapping=f,u.autoClear=d,e.background=m}_textureToCubeUV(e,t){let i=this._renderer,s=e.mapping===Cs||e.mapping===Rs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Wh()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Gh());let a=s?this._cubemapMaterial:this._equirectMaterial,r=new Ot(this._lodPlanes[0],a),l=a.uniforms;l.envMap.value=e;let c=this._cubeSize;lr(t,0,0,3*c,2*c),i.setRenderTarget(t),i.render(r,Uo)}_applyPMREM(e){let t=this._renderer,i=t.autoClear;t.autoClear=!1;let s=this._lodPlanes.length;for(let a=1;a<s;a++){let r=Math.sqrt(this._sigmas[a]*this._sigmas[a]-this._sigmas[a-1]*this._sigmas[a-1]),l=zh[(s-a-1)%zh.length];this._blur(e,a-1,a,r,l)}t.autoClear=i}_blur(e,t,i,s,a){let r=this._pingPongRenderTarget;this._halfBlur(e,r,t,i,s,"latitudinal",a),this._halfBlur(r,e,i,i,s,"longitudinal",a)}_halfBlur(e,t,i,s,a,r,l){let c=this._renderer,h=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let u=3,d=new Ot(this._lodPlanes[s],h),f=h.uniforms,g=this._sizeLods[i]-1,y=isFinite(a)?Math.PI/(2*g):2*Math.PI/(2*ki-1),_=a/y,m=isFinite(a)?1+Math.floor(u*_):ki;m>ki&&console.warn(`sigmaRadians, ${a}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${ki}`);let p=[],E=0;for(let I=0;I<ki;++I){let G=I/_,S=Math.exp(-G*G/2);p.push(S),I===0?E+=S:I<m&&(E+=2*S)}for(let I=0;I<p.length;I++)p[I]=p[I]/E;f.envMap.value=e.texture,f.samples.value=m,f.weights.value=p,f.latitudinal.value=r==="latitudinal",l&&(f.poleAxis.value=l);let{_lodMax:b}=this;f.dTheta.value=y,f.mipInt.value=b-i;let M=this._sizeLods[s],z=3*M*(s>b-Ms?s-b+Ms:0),C=4*(this._cubeSize-M);lr(t,z,C,3*M,2*M),c.setRenderTarget(t),c.render(d,Uo)}};function Yg(n){let e=[],t=[],i=[],s=n,a=n-Ms+1+Fh.length;for(let r=0;r<a;r++){let l=Math.pow(2,s);t.push(l);let c=1/l;r>n-Ms?c=Fh[r-n+Ms-1]:r===0&&(c=0),i.push(c);let h=1/(l-2),u=-h,d=1+h,f=[u,u,d,u,d,d,u,u,d,d,u,d],g=6,y=6,_=3,m=2,p=1,E=new Float32Array(_*y*g),b=new Float32Array(m*y*g),M=new Float32Array(p*y*g);for(let C=0;C<g;C++){let I=C%3*2/3-1,G=C>2?0:-1,S=[I,G,0,I+2/3,G,0,I+2/3,G+1,0,I,G,0,I+2/3,G+1,0,I,G+1,0];E.set(S,_*y*C),b.set(f,m*y*C);let w=[C,C,C,C,C,C];M.set(w,p*y*C)}let z=new Kt;z.setAttribute("position",new cn(E,_)),z.setAttribute("uv",new cn(b,m)),z.setAttribute("faceIndex",new cn(M,p)),e.push(z),s>Ms&&s--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function Hh(n,e,t){let i=new Zn(n,e,t);return i.texture.mapping=qr,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function lr(n,e,t,i,s){n.viewport.set(e,t,i,s),n.scissor.set(e,t,i,s)}function Zg(n,e,t){let i=new Float32Array(ki),s=new k(0,1,0);return new Ln({name:"SphericalGaussianBlur",defines:{n:ki,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Ec(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:pi,depthTest:!1,depthWrite:!1})}function Gh(){return new Ln({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Ec(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:pi,depthTest:!1,depthWrite:!1})}function Wh(){return new Ln({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ec(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:pi,depthTest:!1,depthWrite:!1})}function Ec(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Jg(n){let e=new WeakMap,t=null;function i(l){if(l&&l.isTexture){let c=l.mapping,h=c===il||c===sl,u=c===Cs||c===Rs;if(h||u){let d=e.get(l),f=d!==void 0?d.texture.pmremVersion:0;if(l.isRenderTargetTexture&&l.pmremVersion!==f)return t===null&&(t=new Pr(n)),d=h?t.fromEquirectangular(l,d):t.fromCubemap(l,d),d.texture.pmremVersion=l.pmremVersion,e.set(l,d),d.texture;if(d!==void 0)return d.texture;{let g=l.image;return h&&g&&g.height>0||u&&g&&s(g)?(t===null&&(t=new Pr(n)),d=h?t.fromEquirectangular(l):t.fromCubemap(l),d.texture.pmremVersion=l.pmremVersion,e.set(l,d),l.addEventListener("dispose",a),d.texture):null}}}return l}function s(l){let c=0,h=6;for(let u=0;u<h;u++)l[u]!==void 0&&c++;return c===h}function a(l){let c=l.target;c.removeEventListener("dispose",a);let h=e.get(c);h!==void 0&&(e.delete(c),h.dispose())}function r(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:r}}function Kg(n){let e={};function t(i){if(e[i]!==void 0)return e[i];let s;switch(i){case"WEBGL_depth_texture":s=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=n.getExtension(i)}return e[i]=s,s}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){let s=t(i);return s===null&&ha("THREE.WebGLRenderer: "+i+" extension not supported."),s}}}function Qg(n,e,t,i){let s={},a=new WeakMap;function r(d){let f=d.target;f.index!==null&&e.remove(f.index);for(let y in f.attributes)e.remove(f.attributes[y]);for(let y in f.morphAttributes){let _=f.morphAttributes[y];for(let m=0,p=_.length;m<p;m++)e.remove(_[m])}f.removeEventListener("dispose",r),delete s[f.id];let g=a.get(f);g&&(e.remove(g),a.delete(f)),i.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function l(d,f){return s[f.id]===!0||(f.addEventListener("dispose",r),s[f.id]=!0,t.memory.geometries++),f}function c(d){let f=d.attributes;for(let y in f)e.update(f[y],n.ARRAY_BUFFER);let g=d.morphAttributes;for(let y in g){let _=g[y];for(let m=0,p=_.length;m<p;m++)e.update(_[m],n.ARRAY_BUFFER)}}function h(d){let f=[],g=d.index,y=d.attributes.position,_=0;if(g!==null){let E=g.array;_=g.version;for(let b=0,M=E.length;b<M;b+=3){let z=E[b+0],C=E[b+1],I=E[b+2];f.push(z,C,C,I,I,z)}}else if(y!==void 0){let E=y.array;_=y.version;for(let b=0,M=E.length/3-1;b<M;b+=3){let z=b+0,C=b+1,I=b+2;f.push(z,C,C,I,I,z)}}else return;let m=new(Du(f)?Tr:Ar)(f,1);m.version=_;let p=a.get(d);p&&e.remove(p),a.set(d,m)}function u(d){let f=a.get(d);if(f){let g=d.index;g!==null&&f.version<g.version&&h(d)}else h(d);return a.get(d)}return{get:l,update:c,getWireframeAttribute:u}}function e0(n,e,t){let i;function s(f){i=f}let a,r;function l(f){a=f.type,r=f.bytesPerElement}function c(f,g){n.drawElements(i,g,a,f*r),t.update(g,i,1)}function h(f,g,y){y!==0&&(n.drawElementsInstanced(i,g,a,f*r,y),t.update(g,i,y))}function u(f,g,y){if(y===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,g,0,a,f,0,y);let m=0;for(let p=0;p<y;p++)m+=g[p];t.update(m,i,1)}function d(f,g,y,_){if(y===0)return;let m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<f.length;p++)h(f[p]/r,g[p],_[p]);else{m.multiDrawElementsInstancedWEBGL(i,g,0,a,f,0,_,0,y);let p=0;for(let E=0;E<y;E++)p+=g[E]*_[E];t.update(p,i,1)}}this.setMode=s,this.setIndex=l,this.render=c,this.renderInstances=h,this.renderMultiDraw=u,this.renderMultiDrawInstances=d}function t0(n){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(a,r,l){switch(t.calls++,r){case n.TRIANGLES:t.triangles+=l*(a/3);break;case n.LINES:t.lines+=l*(a/2);break;case n.LINE_STRIP:t.lines+=l*(a-1);break;case n.LINE_LOOP:t.lines+=l*a;break;case n.POINTS:t.points+=l*a;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",r);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:i}}function n0(n,e,t){let i=new WeakMap,s=new pt;function a(r,l,c){let h=r.morphTargetInfluences,u=l.morphAttributes.position||l.morphAttributes.normal||l.morphAttributes.color,d=u!==void 0?u.length:0,f=i.get(l);if(f===void 0||f.count!==d){let S=function(){I.dispose(),i.delete(l),l.removeEventListener("dispose",S)};f!==void 0&&f.texture.dispose();let g=l.morphAttributes.position!==void 0,y=l.morphAttributes.normal!==void 0,_=l.morphAttributes.color!==void 0,m=l.morphAttributes.position||[],p=l.morphAttributes.normal||[],E=l.morphAttributes.color||[],b=0;g===!0&&(b=1),y===!0&&(b=2),_===!0&&(b=3);let M=l.attributes.position.count*b,z=1;M>e.maxTextureSize&&(z=Math.ceil(M/e.maxTextureSize),M=e.maxTextureSize);let C=new Float32Array(M*z*4*d),I=new Sr(C,M,z,d);I.type=Wn,I.needsUpdate=!0;let G=b*4;for(let w=0;w<d;w++){let V=m[w],j=p[w],$=E[w],J=M*z*4*w;for(let ae=0;ae<V.count;ae++){let Y=ae*G;g===!0&&(s.fromBufferAttribute(V,ae),C[J+Y+0]=s.x,C[J+Y+1]=s.y,C[J+Y+2]=s.z,C[J+Y+3]=0),y===!0&&(s.fromBufferAttribute(j,ae),C[J+Y+4]=s.x,C[J+Y+5]=s.y,C[J+Y+6]=s.z,C[J+Y+7]=0),_===!0&&(s.fromBufferAttribute($,ae),C[J+Y+8]=s.x,C[J+Y+9]=s.y,C[J+Y+10]=s.z,C[J+Y+11]=$.itemSize===4?s.w:1)}}f={count:d,texture:I,size:new we(M,z)},i.set(l,f),l.addEventListener("dispose",S)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)c.getUniforms().setValue(n,"morphTexture",r.morphTexture,t);else{let g=0;for(let _=0;_<h.length;_++)g+=h[_];let y=l.morphTargetsRelative?1:1-g;c.getUniforms().setValue(n,"morphTargetBaseInfluence",y),c.getUniforms().setValue(n,"morphTargetInfluences",h)}c.getUniforms().setValue(n,"morphTargetsTexture",f.texture,t),c.getUniforms().setValue(n,"morphTargetsTextureSize",f.size)}return{update:a}}function i0(n,e,t,i){let s=new WeakMap;function a(c){let h=i.render.frame,u=c.geometry,d=e.get(c,u);if(s.get(d)!==h&&(e.update(d),s.set(d,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),s.get(c)!==h&&(t.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,n.ARRAY_BUFFER),s.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;s.get(f)!==h&&(f.update(),s.set(f,h))}return d}function r(){s=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:a,dispose:r}}var Lr=class extends hn{constructor(e,t,i,s,a,r,l,c,h,u=Ss){if(u!==Ss&&u!==Ls)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&u===Ss&&(i=Ni),i===void 0&&u===Ls&&(i=Ps),super(null,s,a,r,l,c,u,i,h),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=l!==void 0?l:wn,this.minFilter=c!==void 0?c:wn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Nu=new hn,qh=new Lr(1,1),Vu=new Sr,Fu=new Nl,Bu=new Cr,$h=[],jh=[],Xh=new Float32Array(16),Yh=new Float32Array(9),Zh=new Float32Array(4);function Ns(n,e,t){let i=n[0];if(i<=0||i>0)return n;let s=e*t,a=$h[s];if(a===void 0&&(a=new Float32Array(s),$h[s]=a),e!==0){i.toArray(a,0);for(let r=1,l=0;r!==e;++r)l+=t,n[r].toArray(a,l)}return a}function Rt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Pt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function jr(n,e){let t=jh[e];t===void 0&&(t=new Int32Array(e),jh[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function s0(n,e){let t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function a0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;n.uniform2fv(this.addr,e),Pt(t,e)}}function r0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Rt(t,e))return;n.uniform3fv(this.addr,e),Pt(t,e)}}function o0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;n.uniform4fv(this.addr,e),Pt(t,e)}}function l0(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Rt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Pt(t,e)}else{if(Rt(t,i))return;Zh.set(i),n.uniformMatrix2fv(this.addr,!1,Zh),Pt(t,i)}}function c0(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Rt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Pt(t,e)}else{if(Rt(t,i))return;Yh.set(i),n.uniformMatrix3fv(this.addr,!1,Yh),Pt(t,i)}}function h0(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Rt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Pt(t,e)}else{if(Rt(t,i))return;Xh.set(i),n.uniformMatrix4fv(this.addr,!1,Xh),Pt(t,i)}}function u0(n,e){let t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function d0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;n.uniform2iv(this.addr,e),Pt(t,e)}}function p0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Rt(t,e))return;n.uniform3iv(this.addr,e),Pt(t,e)}}function f0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;n.uniform4iv(this.addr,e),Pt(t,e)}}function m0(n,e){let t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function g0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;n.uniform2uiv(this.addr,e),Pt(t,e)}}function y0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Rt(t,e))return;n.uniform3uiv(this.addr,e),Pt(t,e)}}function v0(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;n.uniform4uiv(this.addr,e),Pt(t,e)}}function _0(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let a;this.type===n.SAMPLER_2D_SHADOW?(qh.compareFunction=Lu,a=qh):a=Nu,t.setTexture2D(e||a,s)}function x0(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture3D(e||Fu,s)}function b0(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTextureCube(e||Bu,s)}function M0(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture2DArray(e||Vu,s)}function w0(n){switch(n){case 5126:return s0;case 35664:return a0;case 35665:return r0;case 35666:return o0;case 35674:return l0;case 35675:return c0;case 35676:return h0;case 5124:case 35670:return u0;case 35667:case 35671:return d0;case 35668:case 35672:return p0;case 35669:case 35673:return f0;case 5125:return m0;case 36294:return g0;case 36295:return y0;case 36296:return v0;case 35678:case 36198:case 36298:case 36306:case 35682:return _0;case 35679:case 36299:case 36307:return x0;case 35680:case 36300:case 36308:case 36293:return b0;case 36289:case 36303:case 36311:case 36292:return M0}}function S0(n,e){n.uniform1fv(this.addr,e)}function A0(n,e){let t=Ns(e,this.size,2);n.uniform2fv(this.addr,t)}function T0(n,e){let t=Ns(e,this.size,3);n.uniform3fv(this.addr,t)}function E0(n,e){let t=Ns(e,this.size,4);n.uniform4fv(this.addr,t)}function C0(n,e){let t=Ns(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function R0(n,e){let t=Ns(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function P0(n,e){let t=Ns(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function L0(n,e){n.uniform1iv(this.addr,e)}function I0(n,e){n.uniform2iv(this.addr,e)}function D0(n,e){n.uniform3iv(this.addr,e)}function k0(n,e){n.uniform4iv(this.addr,e)}function O0(n,e){n.uniform1uiv(this.addr,e)}function U0(n,e){n.uniform2uiv(this.addr,e)}function N0(n,e){n.uniform3uiv(this.addr,e)}function V0(n,e){n.uniform4uiv(this.addr,e)}function F0(n,e,t){let i=this.cache,s=e.length,a=jr(t,s);Rt(i,a)||(n.uniform1iv(this.addr,a),Pt(i,a));for(let r=0;r!==s;++r)t.setTexture2D(e[r]||Nu,a[r])}function B0(n,e,t){let i=this.cache,s=e.length,a=jr(t,s);Rt(i,a)||(n.uniform1iv(this.addr,a),Pt(i,a));for(let r=0;r!==s;++r)t.setTexture3D(e[r]||Fu,a[r])}function z0(n,e,t){let i=this.cache,s=e.length,a=jr(t,s);Rt(i,a)||(n.uniform1iv(this.addr,a),Pt(i,a));for(let r=0;r!==s;++r)t.setTextureCube(e[r]||Bu,a[r])}function H0(n,e,t){let i=this.cache,s=e.length,a=jr(t,s);Rt(i,a)||(n.uniform1iv(this.addr,a),Pt(i,a));for(let r=0;r!==s;++r)t.setTexture2DArray(e[r]||Vu,a[r])}function G0(n){switch(n){case 5126:return S0;case 35664:return A0;case 35665:return T0;case 35666:return E0;case 35674:return C0;case 35675:return R0;case 35676:return P0;case 5124:case 35670:return L0;case 35667:case 35671:return I0;case 35668:case 35672:return D0;case 35669:case 35673:return k0;case 5125:return O0;case 36294:return U0;case 36295:return N0;case 36296:return V0;case 35678:case 36198:case 36298:case 36306:case 35682:return F0;case 35679:case 36299:case 36307:return B0;case 35680:case 36300:case 36308:case 36293:return z0;case 36289:case 36303:case 36311:case 36292:return H0}}var Bl=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=w0(t.type)}},zl=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=G0(t.type)}},Hl=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){let s=this.seq;for(let a=0,r=s.length;a!==r;++a){let l=s[a];l.setValue(e,t[l.id],i)}}},zo=/(\w+)(\])?(\[|\.)?/g;function Jh(n,e){n.seq.push(e),n.map[e.id]=e}function W0(n,e,t){let i=n.name,s=i.length;for(zo.lastIndex=0;;){let a=zo.exec(i),r=zo.lastIndex,l=a[1],c=a[2]==="]",h=a[3];if(c&&(l=l|0),h===void 0||h==="["&&r+2===s){Jh(t,h===void 0?new Bl(l,n,e):new zl(l,n,e));break}else{let d=t.map[l];d===void 0&&(d=new Hl(l),Jh(t,d)),t=d}}}var Ts=class{constructor(e,t){this.seq=[],this.map={};let i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<i;++s){let a=e.getActiveUniform(t,s),r=e.getUniformLocation(t,a.name);W0(a,r,this)}}setValue(e,t,i,s){let a=this.map[t];a!==void 0&&a.setValue(e,i,s)}setOptional(e,t,i){let s=t[i];s!==void 0&&this.setValue(e,i,s)}static upload(e,t,i,s){for(let a=0,r=t.length;a!==r;++a){let l=t[a],c=i[l.id];c.needsUpdate!==!1&&l.setValue(e,c.value,s)}}static seqWithValue(e,t){let i=[];for(let s=0,a=e.length;s!==a;++s){let r=e[s];r.id in t&&i.push(r)}return i}};function Kh(n,e,t){let i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}var q0=37297,$0=0;function j0(n,e){let t=n.split(`
`),i=[],s=Math.max(e-6,0),a=Math.min(e+6,t.length);for(let r=s;r<a;r++){let l=r+1;i.push(`${l===e?">":" "} ${l}: ${t[r]}`)}return i.join(`
`)}var Qh=new je;function X0(n){at._getMatrix(Qh,at.workingColorSpace,n);let e=`mat3( ${Qh.elements.map(t=>t.toFixed(4))} )`;switch(at.getTransfer(n)){case $r:return[e,"LinearTransferOETF"];case dt:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function eu(n,e,t){let i=n.getShaderParameter(e,n.COMPILE_STATUS),s=n.getShaderInfoLog(e).trim();if(i&&s==="")return"";let a=/ERROR: 0:(\d+)/.exec(s);if(a){let r=parseInt(a[1]);return t.toUpperCase()+`

`+s+`

`+j0(n.getShaderSource(e),r)}else return s}function Y0(n,e){let t=X0(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Z0(n,e){let t;switch(e){case ap:t="Linear";break;case rp:t="Reinhard";break;case op:t="Cineon";break;case lp:t="ACESFilmic";break;case hp:t="AgX";break;case up:t="Neutral";break;case cp:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var cr=new k;function J0(){at.getLuminanceCoefficients(cr);let n=cr.x.toFixed(4),e=cr.y.toFixed(4),t=cr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function K0(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ua).join(`
`)}function Q0(n){let e=[];for(let t in n){let i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function ey(n,e){let t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){let a=n.getActiveAttrib(e,s),r=a.name,l=1;a.type===n.FLOAT_MAT2&&(l=2),a.type===n.FLOAT_MAT3&&(l=3),a.type===n.FLOAT_MAT4&&(l=4),t[r]={type:a.type,location:n.getAttribLocation(e,r),locationSize:l}}return t}function ua(n){return n!==""}function tu(n,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function nu(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var ty=/^[ \t]*#include +<([\w\d./]+)>/gm;function Gl(n){return n.replace(ty,iy)}var ny=new Map;function iy(n,e){let t=Xe[e];if(t===void 0){let i=ny.get(e);if(i!==void 0)t=Xe[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return Gl(t)}var sy=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function iu(n){return n.replace(sy,ay)}function ay(n,e,t,i){let s="";for(let a=parseInt(e);a<parseInt(t);a++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return s}function su(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function ry(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===yu?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===_c?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===Hn&&(e="SHADOWMAP_TYPE_VSM"),e}function oy(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case Cs:case Rs:e="ENVMAP_TYPE_CUBE";break;case qr:e="ENVMAP_TYPE_CUBE_UV";break}return e}function ly(n){let e="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case Rs:e="ENVMAP_MODE_REFRACTION";break}return e}function cy(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case vu:e="ENVMAP_BLENDING_MULTIPLY";break;case ip:e="ENVMAP_BLENDING_MIX";break;case sp:e="ENVMAP_BLENDING_ADD";break}return e}function hy(n){let e=n.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function uy(n,e,t,i){let s=n.getContext(),a=t.defines,r=t.vertexShader,l=t.fragmentShader,c=ry(t),h=oy(t),u=ly(t),d=cy(t),f=hy(t),g=K0(t),y=Q0(a),_=s.createProgram(),m,p,E=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y].filter(ua).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y].filter(ua).join(`
`),p.length>0&&(p+=`
`)):(m=[su(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ua).join(`
`),p=[su(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",t.envMap?"#define "+d:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==fi?"#define TONE_MAPPING":"",t.toneMapping!==fi?Xe.tonemapping_pars_fragment:"",t.toneMapping!==fi?Z0("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Xe.colorspace_pars_fragment,Y0("linearToOutputTexel",t.outputColorSpace),J0(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(ua).join(`
`)),r=Gl(r),r=tu(r,t),r=nu(r,t),l=Gl(l),l=tu(l,t),l=nu(l,t),r=iu(r),l=iu(l),t.isRawShaderMaterial!==!0&&(E=`#version 300 es
`,m=[g,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===yh?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===yh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let b=E+m+r,M=E+p+l,z=Kh(s,s.VERTEX_SHADER,b),C=Kh(s,s.FRAGMENT_SHADER,M);s.attachShader(_,z),s.attachShader(_,C),t.index0AttributeName!==void 0?s.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function I(V){if(n.debug.checkShaderErrors){let j=s.getProgramInfoLog(_).trim(),$=s.getShaderInfoLog(z).trim(),J=s.getShaderInfoLog(C).trim(),ae=!0,Y=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(ae=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,_,z,C);else{let ce=eu(s,z,"vertex"),Z=eu(s,C,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+V.name+`
Material Type: `+V.type+`

Program Info Log: `+j+`
`+ce+`
`+Z)}else j!==""?console.warn("THREE.WebGLProgram: Program Info Log:",j):($===""||J==="")&&(Y=!1);Y&&(V.diagnostics={runnable:ae,programLog:j,vertexShader:{log:$,prefix:m},fragmentShader:{log:J,prefix:p}})}s.deleteShader(z),s.deleteShader(C),G=new Ts(s,_),S=ey(s,_)}let G;this.getUniforms=function(){return G===void 0&&I(this),G};let S;this.getAttributes=function(){return S===void 0&&I(this),S};let w=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return w===!1&&(w=s.getProgramParameter(_,q0)),w},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=$0++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=z,this.fragmentShader=C,this}var dy=0,Wl=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,i=e.fragmentShader,s=this._getShaderStage(t),a=this._getShaderStage(i),r=this._getShaderCacheForMaterial(e);return r.has(s)===!1&&(r.add(s),s.usedTimes++),r.has(a)===!1&&(r.add(a),a.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){let t=this.shaderCache,i=t.get(e);return i===void 0&&(i=new ql(e),t.set(e,i)),i}},ql=class{constructor(e){this.id=dy++,this.code=e,this.usedTimes=0}};function py(n,e,t,i,s,a,r){let l=new xa,c=new Wl,h=new Set,u=[],d=s.logarithmicDepthBuffer,f=s.vertexTextures,g=s.precision,y={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(S){return h.add(S),S===0?"uv":`uv${S}`}function m(S,w,V,j,$){let J=j.fog,ae=$.geometry,Y=S.isMeshStandardMaterial?j.environment:null,ce=(S.isMeshStandardMaterial?t:e).get(S.envMap||Y),Z=ce&&ce.mapping===qr?ce.image.height:null,de=y[S.type];S.precision!==null&&(g=s.getMaxPrecision(S.precision),g!==S.precision&&console.warn("THREE.WebGLProgram.getParameters:",S.precision,"not supported, using",g,"instead."));let Me=ae.morphAttributes.position||ae.morphAttributes.normal||ae.morphAttributes.color,Ie=Me!==void 0?Me.length:0,We=0;ae.morphAttributes.position!==void 0&&(We=1),ae.morphAttributes.normal!==void 0&&(We=2),ae.morphAttributes.color!==void 0&&(We=3);let Ye,ee,ue,Pe;if(de){let Ae=Cn[de];Ye=Ae.vertexShader,ee=Ae.fragmentShader}else Ye=S.vertexShader,ee=S.fragmentShader,c.update(S),ue=c.getVertexShaderID(S),Pe=c.getFragmentShaderID(S);let ye=n.getRenderTarget(),Le=n.state.buffers.depth.getReversed(),He=$.isInstancedMesh===!0,$e=$.isBatchedMesh===!0,gt=!!S.map,et=!!S.matcap,wt=!!ce,B=!!S.aoMap,Nt=!!S.lightMap,tt=!!S.bumpMap,Ne=!!S.normalMap,ke=!!S.displacementMap,yt=!!S.emissiveMap,Ue=!!S.metalnessMap,T=!!S.roughnessMap,x=S.anisotropy>0,q=S.clearcoat>0,ie=S.dispersion>0,re=S.iridescence>0,K=S.sheen>0,Te=S.transmission>0,ve=x&&!!S.anisotropyMap,Se=q&&!!S.clearcoatMap,nt=q&&!!S.clearcoatNormalMap,he=q&&!!S.clearcoatRoughnessMap,Ee=re&&!!S.iridescenceMap,Fe=re&&!!S.iridescenceThicknessMap,Be=K&&!!S.sheenColorMap,pe=K&&!!S.sheenRoughnessMap,Ze=!!S.specularMap,qe=!!S.specularColorMap,ht=!!S.specularIntensityMap,F=Te&&!!S.transmissionMap,_e=Te&&!!S.thicknessMap,X=!!S.gradientMap,te=!!S.alphaMap,be=S.alphaTest>0,xe=!!S.alphaHash,Ge=!!S.extensions,ut=fi;S.toneMapped&&(ye===null||ye.isXRRenderTarget===!0)&&(ut=n.toneMapping);let it={shaderID:de,shaderType:S.type,shaderName:S.name,vertexShader:Ye,fragmentShader:ee,defines:S.defines,customVertexShaderID:ue,customFragmentShaderID:Pe,isRawShaderMaterial:S.isRawShaderMaterial===!0,glslVersion:S.glslVersion,precision:g,batching:$e,batchingColor:$e&&$._colorsTexture!==null,instancing:He,instancingColor:He&&$.instanceColor!==null,instancingMorph:He&&$.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:ye===null?n.outputColorSpace:ye.isXRRenderTarget===!0?ye.texture.colorSpace:Us,alphaToCoverage:!!S.alphaToCoverage,map:gt,matcap:et,envMap:wt,envMapMode:wt&&ce.mapping,envMapCubeUVHeight:Z,aoMap:B,lightMap:Nt,bumpMap:tt,normalMap:Ne,displacementMap:f&&ke,emissiveMap:yt,normalMapObjectSpace:Ne&&S.normalMapType===mp,normalMapTangentSpace:Ne&&S.normalMapType===Pu,metalnessMap:Ue,roughnessMap:T,anisotropy:x,anisotropyMap:ve,clearcoat:q,clearcoatMap:Se,clearcoatNormalMap:nt,clearcoatRoughnessMap:he,dispersion:ie,iridescence:re,iridescenceMap:Ee,iridescenceThicknessMap:Fe,sheen:K,sheenColorMap:Be,sheenRoughnessMap:pe,specularMap:Ze,specularColorMap:qe,specularIntensityMap:ht,transmission:Te,transmissionMap:F,thicknessMap:_e,gradientMap:X,opaque:S.transparent===!1&&S.blending===ws&&S.alphaToCoverage===!1,alphaMap:te,alphaTest:be,alphaHash:xe,combine:S.combine,mapUv:gt&&_(S.map.channel),aoMapUv:B&&_(S.aoMap.channel),lightMapUv:Nt&&_(S.lightMap.channel),bumpMapUv:tt&&_(S.bumpMap.channel),normalMapUv:Ne&&_(S.normalMap.channel),displacementMapUv:ke&&_(S.displacementMap.channel),emissiveMapUv:yt&&_(S.emissiveMap.channel),metalnessMapUv:Ue&&_(S.metalnessMap.channel),roughnessMapUv:T&&_(S.roughnessMap.channel),anisotropyMapUv:ve&&_(S.anisotropyMap.channel),clearcoatMapUv:Se&&_(S.clearcoatMap.channel),clearcoatNormalMapUv:nt&&_(S.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:he&&_(S.clearcoatRoughnessMap.channel),iridescenceMapUv:Ee&&_(S.iridescenceMap.channel),iridescenceThicknessMapUv:Fe&&_(S.iridescenceThicknessMap.channel),sheenColorMapUv:Be&&_(S.sheenColorMap.channel),sheenRoughnessMapUv:pe&&_(S.sheenRoughnessMap.channel),specularMapUv:Ze&&_(S.specularMap.channel),specularColorMapUv:qe&&_(S.specularColorMap.channel),specularIntensityMapUv:ht&&_(S.specularIntensityMap.channel),transmissionMapUv:F&&_(S.transmissionMap.channel),thicknessMapUv:_e&&_(S.thicknessMap.channel),alphaMapUv:te&&_(S.alphaMap.channel),vertexTangents:!!ae.attributes.tangent&&(Ne||x),vertexColors:S.vertexColors,vertexAlphas:S.vertexColors===!0&&!!ae.attributes.color&&ae.attributes.color.itemSize===4,pointsUvs:$.isPoints===!0&&!!ae.attributes.uv&&(gt||te),fog:!!J,useFog:S.fog===!0,fogExp2:!!J&&J.isFogExp2,flatShading:S.flatShading===!0,sizeAttenuation:S.sizeAttenuation===!0,logarithmicDepthBuffer:d,reverseDepthBuffer:Le,skinning:$.isSkinnedMesh===!0,morphTargets:ae.morphAttributes.position!==void 0,morphNormals:ae.morphAttributes.normal!==void 0,morphColors:ae.morphAttributes.color!==void 0,morphTargetsCount:Ie,morphTextureStride:We,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:S.dithering,shadowMapEnabled:n.shadowMap.enabled&&V.length>0,shadowMapType:n.shadowMap.type,toneMapping:ut,decodeVideoTexture:gt&&S.map.isVideoTexture===!0&&at.getTransfer(S.map.colorSpace)===dt,decodeVideoTextureEmissive:yt&&S.emissiveMap.isVideoTexture===!0&&at.getTransfer(S.emissiveMap.colorSpace)===dt,premultipliedAlpha:S.premultipliedAlpha,doubleSided:S.side===Gn,flipSided:S.side===Jt,useDepthPacking:S.depthPacking>=0,depthPacking:S.depthPacking||0,index0AttributeName:S.index0AttributeName,extensionClipCullDistance:Ge&&S.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ge&&S.extensions.multiDraw===!0||$e)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:S.customProgramCacheKey()};return it.vertexUv1s=h.has(1),it.vertexUv2s=h.has(2),it.vertexUv3s=h.has(3),h.clear(),it}function p(S){let w=[];if(S.shaderID?w.push(S.shaderID):(w.push(S.customVertexShaderID),w.push(S.customFragmentShaderID)),S.defines!==void 0)for(let V in S.defines)w.push(V),w.push(S.defines[V]);return S.isRawShaderMaterial===!1&&(E(w,S),b(w,S),w.push(n.outputColorSpace)),w.push(S.customProgramCacheKey),w.join()}function E(S,w){S.push(w.precision),S.push(w.outputColorSpace),S.push(w.envMapMode),S.push(w.envMapCubeUVHeight),S.push(w.mapUv),S.push(w.alphaMapUv),S.push(w.lightMapUv),S.push(w.aoMapUv),S.push(w.bumpMapUv),S.push(w.normalMapUv),S.push(w.displacementMapUv),S.push(w.emissiveMapUv),S.push(w.metalnessMapUv),S.push(w.roughnessMapUv),S.push(w.anisotropyMapUv),S.push(w.clearcoatMapUv),S.push(w.clearcoatNormalMapUv),S.push(w.clearcoatRoughnessMapUv),S.push(w.iridescenceMapUv),S.push(w.iridescenceThicknessMapUv),S.push(w.sheenColorMapUv),S.push(w.sheenRoughnessMapUv),S.push(w.specularMapUv),S.push(w.specularColorMapUv),S.push(w.specularIntensityMapUv),S.push(w.transmissionMapUv),S.push(w.thicknessMapUv),S.push(w.combine),S.push(w.fogExp2),S.push(w.sizeAttenuation),S.push(w.morphTargetsCount),S.push(w.morphAttributeCount),S.push(w.numDirLights),S.push(w.numPointLights),S.push(w.numSpotLights),S.push(w.numSpotLightMaps),S.push(w.numHemiLights),S.push(w.numRectAreaLights),S.push(w.numDirLightShadows),S.push(w.numPointLightShadows),S.push(w.numSpotLightShadows),S.push(w.numSpotLightShadowsWithMaps),S.push(w.numLightProbes),S.push(w.shadowMapType),S.push(w.toneMapping),S.push(w.numClippingPlanes),S.push(w.numClipIntersection),S.push(w.depthPacking)}function b(S,w){l.disableAll(),w.supportsVertexTextures&&l.enable(0),w.instancing&&l.enable(1),w.instancingColor&&l.enable(2),w.instancingMorph&&l.enable(3),w.matcap&&l.enable(4),w.envMap&&l.enable(5),w.normalMapObjectSpace&&l.enable(6),w.normalMapTangentSpace&&l.enable(7),w.clearcoat&&l.enable(8),w.iridescence&&l.enable(9),w.alphaTest&&l.enable(10),w.vertexColors&&l.enable(11),w.vertexAlphas&&l.enable(12),w.vertexUv1s&&l.enable(13),w.vertexUv2s&&l.enable(14),w.vertexUv3s&&l.enable(15),w.vertexTangents&&l.enable(16),w.anisotropy&&l.enable(17),w.alphaHash&&l.enable(18),w.batching&&l.enable(19),w.dispersion&&l.enable(20),w.batchingColor&&l.enable(21),S.push(l.mask),l.disableAll(),w.fog&&l.enable(0),w.useFog&&l.enable(1),w.flatShading&&l.enable(2),w.logarithmicDepthBuffer&&l.enable(3),w.reverseDepthBuffer&&l.enable(4),w.skinning&&l.enable(5),w.morphTargets&&l.enable(6),w.morphNormals&&l.enable(7),w.morphColors&&l.enable(8),w.premultipliedAlpha&&l.enable(9),w.shadowMapEnabled&&l.enable(10),w.doubleSided&&l.enable(11),w.flipSided&&l.enable(12),w.useDepthPacking&&l.enable(13),w.dithering&&l.enable(14),w.transmission&&l.enable(15),w.sheen&&l.enable(16),w.opaque&&l.enable(17),w.pointsUvs&&l.enable(18),w.decodeVideoTexture&&l.enable(19),w.decodeVideoTextureEmissive&&l.enable(20),w.alphaToCoverage&&l.enable(21),S.push(l.mask)}function M(S){let w=y[S.type],V;if(w){let j=Cn[w];V=nf.clone(j.uniforms)}else V=S.uniforms;return V}function z(S,w){let V;for(let j=0,$=u.length;j<$;j++){let J=u[j];if(J.cacheKey===w){V=J,++V.usedTimes;break}}return V===void 0&&(V=new uy(n,w,S,a),u.push(V)),V}function C(S){if(--S.usedTimes===0){let w=u.indexOf(S);u[w]=u[u.length-1],u.pop(),S.destroy()}}function I(S){c.remove(S)}function G(){c.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:M,acquireProgram:z,releaseProgram:C,releaseShaderCache:I,programs:u,dispose:G}}function fy(){let n=new WeakMap;function e(r){return n.has(r)}function t(r){let l=n.get(r);return l===void 0&&(l={},n.set(r,l)),l}function i(r){n.delete(r)}function s(r,l,c){n.get(r)[l]=c}function a(){n=new WeakMap}return{has:e,get:t,remove:i,update:s,dispose:a}}function my(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function au(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function ru(){let n=[],e=0,t=[],i=[],s=[];function a(){e=0,t.length=0,i.length=0,s.length=0}function r(d,f,g,y,_,m){let p=n[e];return p===void 0?(p={id:d.id,object:d,geometry:f,material:g,groupOrder:y,renderOrder:d.renderOrder,z:_,group:m},n[e]=p):(p.id=d.id,p.object=d,p.geometry=f,p.material=g,p.groupOrder=y,p.renderOrder=d.renderOrder,p.z=_,p.group=m),e++,p}function l(d,f,g,y,_,m){let p=r(d,f,g,y,_,m);g.transmission>0?i.push(p):g.transparent===!0?s.push(p):t.push(p)}function c(d,f,g,y,_,m){let p=r(d,f,g,y,_,m);g.transmission>0?i.unshift(p):g.transparent===!0?s.unshift(p):t.unshift(p)}function h(d,f){t.length>1&&t.sort(d||my),i.length>1&&i.sort(f||au),s.length>1&&s.sort(f||au)}function u(){for(let d=e,f=n.length;d<f;d++){let g=n[d];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:t,transmissive:i,transparent:s,init:a,push:l,unshift:c,finish:u,sort:h}}function gy(){let n=new WeakMap;function e(i,s){let a=n.get(i),r;return a===void 0?(r=new ru,n.set(i,[r])):s>=a.length?(r=new ru,a.push(r)):r=a[s],r}function t(){n=new WeakMap}return{get:e,dispose:t}}function yy(){let n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new k,color:new Qe};break;case"SpotLight":t={position:new k,direction:new k,color:new Qe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new k,color:new Qe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new k,skyColor:new Qe,groundColor:new Qe};break;case"RectAreaLight":t={color:new Qe,position:new k,halfWidth:new k,halfHeight:new k};break}return n[e.id]=t,t}}}function vy(){let n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}var _y=0;function xy(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function by(n){let e=new yy,t=vy(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let h=0;h<9;h++)i.probe.push(new k);let s=new k,a=new Mt,r=new Mt;function l(h){let u=0,d=0,f=0;for(let S=0;S<9;S++)i.probe[S].set(0,0,0);let g=0,y=0,_=0,m=0,p=0,E=0,b=0,M=0,z=0,C=0,I=0;h.sort(xy);for(let S=0,w=h.length;S<w;S++){let V=h[S],j=V.color,$=V.intensity,J=V.distance,ae=V.shadow&&V.shadow.map?V.shadow.map.texture:null;if(V.isAmbientLight)u+=j.r*$,d+=j.g*$,f+=j.b*$;else if(V.isLightProbe){for(let Y=0;Y<9;Y++)i.probe[Y].addScaledVector(V.sh.coefficients[Y],$);I++}else if(V.isDirectionalLight){let Y=e.get(V);if(Y.color.copy(V.color).multiplyScalar(V.intensity),V.castShadow){let ce=V.shadow,Z=t.get(V);Z.shadowIntensity=ce.intensity,Z.shadowBias=ce.bias,Z.shadowNormalBias=ce.normalBias,Z.shadowRadius=ce.radius,Z.shadowMapSize=ce.mapSize,i.directionalShadow[g]=Z,i.directionalShadowMap[g]=ae,i.directionalShadowMatrix[g]=V.shadow.matrix,E++}i.directional[g]=Y,g++}else if(V.isSpotLight){let Y=e.get(V);Y.position.setFromMatrixPosition(V.matrixWorld),Y.color.copy(j).multiplyScalar($),Y.distance=J,Y.coneCos=Math.cos(V.angle),Y.penumbraCos=Math.cos(V.angle*(1-V.penumbra)),Y.decay=V.decay,i.spot[_]=Y;let ce=V.shadow;if(V.map&&(i.spotLightMap[z]=V.map,z++,ce.updateMatrices(V),V.castShadow&&C++),i.spotLightMatrix[_]=ce.matrix,V.castShadow){let Z=t.get(V);Z.shadowIntensity=ce.intensity,Z.shadowBias=ce.bias,Z.shadowNormalBias=ce.normalBias,Z.shadowRadius=ce.radius,Z.shadowMapSize=ce.mapSize,i.spotShadow[_]=Z,i.spotShadowMap[_]=ae,M++}_++}else if(V.isRectAreaLight){let Y=e.get(V);Y.color.copy(j).multiplyScalar($),Y.halfWidth.set(V.width*.5,0,0),Y.halfHeight.set(0,V.height*.5,0),i.rectArea[m]=Y,m++}else if(V.isPointLight){let Y=e.get(V);if(Y.color.copy(V.color).multiplyScalar(V.intensity),Y.distance=V.distance,Y.decay=V.decay,V.castShadow){let ce=V.shadow,Z=t.get(V);Z.shadowIntensity=ce.intensity,Z.shadowBias=ce.bias,Z.shadowNormalBias=ce.normalBias,Z.shadowRadius=ce.radius,Z.shadowMapSize=ce.mapSize,Z.shadowCameraNear=ce.camera.near,Z.shadowCameraFar=ce.camera.far,i.pointShadow[y]=Z,i.pointShadowMap[y]=ae,i.pointShadowMatrix[y]=V.shadow.matrix,b++}i.point[y]=Y,y++}else if(V.isHemisphereLight){let Y=e.get(V);Y.skyColor.copy(V.color).multiplyScalar($),Y.groundColor.copy(V.groundColor).multiplyScalar($),i.hemi[p]=Y,p++}}m>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ge.LTC_FLOAT_1,i.rectAreaLTC2=ge.LTC_FLOAT_2):(i.rectAreaLTC1=ge.LTC_HALF_1,i.rectAreaLTC2=ge.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=d,i.ambient[2]=f;let G=i.hash;(G.directionalLength!==g||G.pointLength!==y||G.spotLength!==_||G.rectAreaLength!==m||G.hemiLength!==p||G.numDirectionalShadows!==E||G.numPointShadows!==b||G.numSpotShadows!==M||G.numSpotMaps!==z||G.numLightProbes!==I)&&(i.directional.length=g,i.spot.length=_,i.rectArea.length=m,i.point.length=y,i.hemi.length=p,i.directionalShadow.length=E,i.directionalShadowMap.length=E,i.pointShadow.length=b,i.pointShadowMap.length=b,i.spotShadow.length=M,i.spotShadowMap.length=M,i.directionalShadowMatrix.length=E,i.pointShadowMatrix.length=b,i.spotLightMatrix.length=M+z-C,i.spotLightMap.length=z,i.numSpotLightShadowsWithMaps=C,i.numLightProbes=I,G.directionalLength=g,G.pointLength=y,G.spotLength=_,G.rectAreaLength=m,G.hemiLength=p,G.numDirectionalShadows=E,G.numPointShadows=b,G.numSpotShadows=M,G.numSpotMaps=z,G.numLightProbes=I,i.version=_y++)}function c(h,u){let d=0,f=0,g=0,y=0,_=0,m=u.matrixWorldInverse;for(let p=0,E=h.length;p<E;p++){let b=h[p];if(b.isDirectionalLight){let M=i.directional[d];M.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(m),d++}else if(b.isSpotLight){let M=i.spot[g];M.position.setFromMatrixPosition(b.matrixWorld),M.position.applyMatrix4(m),M.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(m),g++}else if(b.isRectAreaLight){let M=i.rectArea[y];M.position.setFromMatrixPosition(b.matrixWorld),M.position.applyMatrix4(m),r.identity(),a.copy(b.matrixWorld),a.premultiply(m),r.extractRotation(a),M.halfWidth.set(b.width*.5,0,0),M.halfHeight.set(0,b.height*.5,0),M.halfWidth.applyMatrix4(r),M.halfHeight.applyMatrix4(r),y++}else if(b.isPointLight){let M=i.point[f];M.position.setFromMatrixPosition(b.matrixWorld),M.position.applyMatrix4(m),f++}else if(b.isHemisphereLight){let M=i.hemi[_];M.direction.setFromMatrixPosition(b.matrixWorld),M.direction.transformDirection(m),_++}}}return{setup:l,setupView:c,state:i}}function ou(n){let e=new by(n),t=[],i=[];function s(u){h.camera=u,t.length=0,i.length=0}function a(u){t.push(u)}function r(u){i.push(u)}function l(){e.setup(t)}function c(u){e.setupView(t,u)}let h={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:h,setupLights:l,setupLightsView:c,pushLight:a,pushShadow:r}}function My(n){let e=new WeakMap;function t(s,a=0){let r=e.get(s),l;return r===void 0?(l=new ou(n),e.set(s,[l])):a>=r.length?(l=new ou(n),r.push(l)):l=r[a],l}function i(){e=new WeakMap}return{get:t,dispose:i}}var $l=class extends gi{static get type(){return"MeshDepthMaterial"}constructor(e){super(),this.isMeshDepthMaterial=!0,this.depthPacking=pp,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},jl=class extends gi{static get type(){return"MeshDistanceMaterial"}constructor(e){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}},wy=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Sy=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Ay(n,e,t){let i=new ba,s=new we,a=new we,r=new pt,l=new $l({depthPacking:fp}),c=new jl,h={},u=t.maxTextureSize,d={[mi]:Jt,[Jt]:mi,[Gn]:Gn},f=new Ln({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new we},radius:{value:4}},vertexShader:wy,fragmentShader:Sy}),g=f.clone();g.defines.HORIZONTAL_PASS=1;let y=new Kt;y.setAttribute("position",new cn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new Ot(y,f),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=yu;let p=this.type;this.render=function(C,I,G){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||C.length===0)return;let S=n.getRenderTarget(),w=n.getActiveCubeFace(),V=n.getActiveMipmapLevel(),j=n.state;j.setBlending(pi),j.buffers.color.setClear(1,1,1,1),j.buffers.depth.setTest(!0),j.setScissorTest(!1);let $=p!==Hn&&this.type===Hn,J=p===Hn&&this.type!==Hn;for(let ae=0,Y=C.length;ae<Y;ae++){let ce=C[ae],Z=ce.shadow;if(Z===void 0){console.warn("THREE.WebGLShadowMap:",ce,"has no shadow.");continue}if(Z.autoUpdate===!1&&Z.needsUpdate===!1)continue;s.copy(Z.mapSize);let de=Z.getFrameExtents();if(s.multiply(de),a.copy(Z.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(a.x=Math.floor(u/de.x),s.x=a.x*de.x,Z.mapSize.x=a.x),s.y>u&&(a.y=Math.floor(u/de.y),s.y=a.y*de.y,Z.mapSize.y=a.y)),Z.map===null||$===!0||J===!0){let Ie=this.type!==Hn?{minFilter:wn,magFilter:wn}:{};Z.map!==null&&Z.map.dispose(),Z.map=new Zn(s.x,s.y,Ie),Z.map.texture.name=ce.name+".shadowMap",Z.camera.updateProjectionMatrix()}n.setRenderTarget(Z.map),n.clear();let Me=Z.getViewportCount();for(let Ie=0;Ie<Me;Ie++){let We=Z.getViewport(Ie);r.set(a.x*We.x,a.y*We.y,a.x*We.z,a.y*We.w),j.viewport(r),Z.updateMatrices(ce,Ie),i=Z.getFrustum(),M(I,G,Z.camera,ce,this.type)}Z.isPointLightShadow!==!0&&this.type===Hn&&E(Z,G),Z.needsUpdate=!1}p=this.type,m.needsUpdate=!1,n.setRenderTarget(S,w,V)};function E(C,I){let G=e.update(_);f.defines.VSM_SAMPLES!==C.blurSamples&&(f.defines.VSM_SAMPLES=C.blurSamples,g.defines.VSM_SAMPLES=C.blurSamples,f.needsUpdate=!0,g.needsUpdate=!0),C.mapPass===null&&(C.mapPass=new Zn(s.x,s.y)),f.uniforms.shadow_pass.value=C.map.texture,f.uniforms.resolution.value=C.mapSize,f.uniforms.radius.value=C.radius,n.setRenderTarget(C.mapPass),n.clear(),n.renderBufferDirect(I,null,G,f,_,null),g.uniforms.shadow_pass.value=C.mapPass.texture,g.uniforms.resolution.value=C.mapSize,g.uniforms.radius.value=C.radius,n.setRenderTarget(C.map),n.clear(),n.renderBufferDirect(I,null,G,g,_,null)}function b(C,I,G,S){let w=null,V=G.isPointLight===!0?C.customDistanceMaterial:C.customDepthMaterial;if(V!==void 0)w=V;else if(w=G.isPointLight===!0?c:l,n.localClippingEnabled&&I.clipShadows===!0&&Array.isArray(I.clippingPlanes)&&I.clippingPlanes.length!==0||I.displacementMap&&I.displacementScale!==0||I.alphaMap&&I.alphaTest>0||I.map&&I.alphaTest>0){let j=w.uuid,$=I.uuid,J=h[j];J===void 0&&(J={},h[j]=J);let ae=J[$];ae===void 0&&(ae=w.clone(),J[$]=ae,I.addEventListener("dispose",z)),w=ae}if(w.visible=I.visible,w.wireframe=I.wireframe,S===Hn?w.side=I.shadowSide!==null?I.shadowSide:I.side:w.side=I.shadowSide!==null?I.shadowSide:d[I.side],w.alphaMap=I.alphaMap,w.alphaTest=I.alphaTest,w.map=I.map,w.clipShadows=I.clipShadows,w.clippingPlanes=I.clippingPlanes,w.clipIntersection=I.clipIntersection,w.displacementMap=I.displacementMap,w.displacementScale=I.displacementScale,w.displacementBias=I.displacementBias,w.wireframeLinewidth=I.wireframeLinewidth,w.linewidth=I.linewidth,G.isPointLight===!0&&w.isMeshDistanceMaterial===!0){let j=n.properties.get(w);j.light=G}return w}function M(C,I,G,S,w){if(C.visible===!1)return;if(C.layers.test(I.layers)&&(C.isMesh||C.isLine||C.isPoints)&&(C.castShadow||C.receiveShadow&&w===Hn)&&(!C.frustumCulled||i.intersectsObject(C))){C.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,C.matrixWorld);let $=e.update(C),J=C.material;if(Array.isArray(J)){let ae=$.groups;for(let Y=0,ce=ae.length;Y<ce;Y++){let Z=ae[Y],de=J[Z.materialIndex];if(de&&de.visible){let Me=b(C,de,S,w);C.onBeforeShadow(n,C,I,G,$,Me,Z),n.renderBufferDirect(G,null,$,Me,C,Z),C.onAfterShadow(n,C,I,G,$,Me,Z)}}}else if(J.visible){let ae=b(C,J,S,w);C.onBeforeShadow(n,C,I,G,$,ae,null),n.renderBufferDirect(G,null,$,ae,C,null),C.onAfterShadow(n,C,I,G,$,ae,null)}}let j=C.children;for(let $=0,J=j.length;$<J;$++)M(j[$],I,G,S,w)}function z(C){C.target.removeEventListener("dispose",z);for(let G in h){let S=h[G],w=C.target.uuid;w in S&&(S[w].dispose(),delete S[w])}}}var Ty={[Zo]:Jo,[Ko]:tl,[Qo]:nl,[Es]:el,[Jo]:Zo,[tl]:Ko,[nl]:Qo,[el]:Es};function Ey(n,e){function t(){let F=!1,_e=new pt,X=null,te=new pt(0,0,0,0);return{setMask:function(be){X!==be&&!F&&(n.colorMask(be,be,be,be),X=be)},setLocked:function(be){F=be},setClear:function(be,xe,Ge,ut,it){it===!0&&(be*=ut,xe*=ut,Ge*=ut),_e.set(be,xe,Ge,ut),te.equals(_e)===!1&&(n.clearColor(be,xe,Ge,ut),te.copy(_e))},reset:function(){F=!1,X=null,te.set(-1,0,0,0)}}}function i(){let F=!1,_e=!1,X=null,te=null,be=null;return{setReversed:function(xe){if(_e!==xe){let Ge=e.get("EXT_clip_control");_e?Ge.clipControlEXT(Ge.LOWER_LEFT_EXT,Ge.ZERO_TO_ONE_EXT):Ge.clipControlEXT(Ge.LOWER_LEFT_EXT,Ge.NEGATIVE_ONE_TO_ONE_EXT);let ut=be;be=null,this.setClear(ut)}_e=xe},getReversed:function(){return _e},setTest:function(xe){xe?ye(n.DEPTH_TEST):Le(n.DEPTH_TEST)},setMask:function(xe){X!==xe&&!F&&(n.depthMask(xe),X=xe)},setFunc:function(xe){if(_e&&(xe=Ty[xe]),te!==xe){switch(xe){case Zo:n.depthFunc(n.NEVER);break;case Jo:n.depthFunc(n.ALWAYS);break;case Ko:n.depthFunc(n.LESS);break;case Es:n.depthFunc(n.LEQUAL);break;case Qo:n.depthFunc(n.EQUAL);break;case el:n.depthFunc(n.GEQUAL);break;case tl:n.depthFunc(n.GREATER);break;case nl:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}te=xe}},setLocked:function(xe){F=xe},setClear:function(xe){be!==xe&&(_e&&(xe=1-xe),n.clearDepth(xe),be=xe)},reset:function(){F=!1,X=null,te=null,be=null,_e=!1}}}function s(){let F=!1,_e=null,X=null,te=null,be=null,xe=null,Ge=null,ut=null,it=null;return{setTest:function(Ae){F||(Ae?ye(n.STENCIL_TEST):Le(n.STENCIL_TEST))},setMask:function(Ae){_e!==Ae&&!F&&(n.stencilMask(Ae),_e=Ae)},setFunc:function(Ae,Vt,jt){(X!==Ae||te!==Vt||be!==jt)&&(n.stencilFunc(Ae,Vt,jt),X=Ae,te=Vt,be=jt)},setOp:function(Ae,Vt,jt){(xe!==Ae||Ge!==Vt||ut!==jt)&&(n.stencilOp(Ae,Vt,jt),xe=Ae,Ge=Vt,ut=jt)},setLocked:function(Ae){F=Ae},setClear:function(Ae){it!==Ae&&(n.clearStencil(Ae),it=Ae)},reset:function(){F=!1,_e=null,X=null,te=null,be=null,xe=null,Ge=null,ut=null,it=null}}}let a=new t,r=new i,l=new s,c=new WeakMap,h=new WeakMap,u={},d={},f=new WeakMap,g=[],y=null,_=!1,m=null,p=null,E=null,b=null,M=null,z=null,C=null,I=new Qe(0,0,0),G=0,S=!1,w=null,V=null,j=null,$=null,J=null,ae=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS),Y=!1,ce=0,Z=n.getParameter(n.VERSION);Z.indexOf("WebGL")!==-1?(ce=parseFloat(/^WebGL (\d)/.exec(Z)[1]),Y=ce>=1):Z.indexOf("OpenGL ES")!==-1&&(ce=parseFloat(/^OpenGL ES (\d)/.exec(Z)[1]),Y=ce>=2);let de=null,Me={},Ie=n.getParameter(n.SCISSOR_BOX),We=n.getParameter(n.VIEWPORT),Ye=new pt().fromArray(Ie),ee=new pt().fromArray(We);function ue(F,_e,X,te){let be=new Uint8Array(4),xe=n.createTexture();n.bindTexture(F,xe),n.texParameteri(F,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(F,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Ge=0;Ge<X;Ge++)F===n.TEXTURE_3D||F===n.TEXTURE_2D_ARRAY?n.texImage3D(_e,0,n.RGBA,1,1,te,0,n.RGBA,n.UNSIGNED_BYTE,be):n.texImage2D(_e+Ge,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,be);return xe}let Pe={};Pe[n.TEXTURE_2D]=ue(n.TEXTURE_2D,n.TEXTURE_2D,1),Pe[n.TEXTURE_CUBE_MAP]=ue(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),Pe[n.TEXTURE_2D_ARRAY]=ue(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),Pe[n.TEXTURE_3D]=ue(n.TEXTURE_3D,n.TEXTURE_3D,1,1),a.setClear(0,0,0,1),r.setClear(1),l.setClear(0),ye(n.DEPTH_TEST),r.setFunc(Es),tt(!1),Ne(ch),ye(n.CULL_FACE),B(pi);function ye(F){u[F]!==!0&&(n.enable(F),u[F]=!0)}function Le(F){u[F]!==!1&&(n.disable(F),u[F]=!1)}function He(F,_e){return d[F]!==_e?(n.bindFramebuffer(F,_e),d[F]=_e,F===n.DRAW_FRAMEBUFFER&&(d[n.FRAMEBUFFER]=_e),F===n.FRAMEBUFFER&&(d[n.DRAW_FRAMEBUFFER]=_e),!0):!1}function $e(F,_e){let X=g,te=!1;if(F){X=f.get(_e),X===void 0&&(X=[],f.set(_e,X));let be=F.textures;if(X.length!==be.length||X[0]!==n.COLOR_ATTACHMENT0){for(let xe=0,Ge=be.length;xe<Ge;xe++)X[xe]=n.COLOR_ATTACHMENT0+xe;X.length=be.length,te=!0}}else X[0]!==n.BACK&&(X[0]=n.BACK,te=!0);te&&n.drawBuffers(X)}function gt(F){return y!==F?(n.useProgram(F),y=F,!0):!1}let et={[Di]:n.FUNC_ADD,[Bd]:n.FUNC_SUBTRACT,[zd]:n.FUNC_REVERSE_SUBTRACT};et[Hd]=n.MIN,et[Gd]=n.MAX;let wt={[Wd]:n.ZERO,[qd]:n.ONE,[$d]:n.SRC_COLOR,[Xo]:n.SRC_ALPHA,[Kd]:n.SRC_ALPHA_SATURATE,[Zd]:n.DST_COLOR,[Xd]:n.DST_ALPHA,[jd]:n.ONE_MINUS_SRC_COLOR,[Yo]:n.ONE_MINUS_SRC_ALPHA,[Jd]:n.ONE_MINUS_DST_COLOR,[Yd]:n.ONE_MINUS_DST_ALPHA,[Qd]:n.CONSTANT_COLOR,[ep]:n.ONE_MINUS_CONSTANT_COLOR,[tp]:n.CONSTANT_ALPHA,[np]:n.ONE_MINUS_CONSTANT_ALPHA};function B(F,_e,X,te,be,xe,Ge,ut,it,Ae){if(F===pi){_===!0&&(Le(n.BLEND),_=!1);return}if(_===!1&&(ye(n.BLEND),_=!0),F!==Fd){if(F!==m||Ae!==S){if((p!==Di||M!==Di)&&(n.blendEquation(n.FUNC_ADD),p=Di,M=Di),Ae)switch(F){case ws:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case hh:n.blendFunc(n.ONE,n.ONE);break;case uh:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case dh:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",F);break}else switch(F){case ws:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case hh:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case uh:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case dh:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",F);break}E=null,b=null,z=null,C=null,I.set(0,0,0),G=0,m=F,S=Ae}return}be=be||_e,xe=xe||X,Ge=Ge||te,(_e!==p||be!==M)&&(n.blendEquationSeparate(et[_e],et[be]),p=_e,M=be),(X!==E||te!==b||xe!==z||Ge!==C)&&(n.blendFuncSeparate(wt[X],wt[te],wt[xe],wt[Ge]),E=X,b=te,z=xe,C=Ge),(ut.equals(I)===!1||it!==G)&&(n.blendColor(ut.r,ut.g,ut.b,it),I.copy(ut),G=it),m=F,S=!1}function Nt(F,_e){F.side===Gn?Le(n.CULL_FACE):ye(n.CULL_FACE);let X=F.side===Jt;_e&&(X=!X),tt(X),F.blending===ws&&F.transparent===!1?B(pi):B(F.blending,F.blendEquation,F.blendSrc,F.blendDst,F.blendEquationAlpha,F.blendSrcAlpha,F.blendDstAlpha,F.blendColor,F.blendAlpha,F.premultipliedAlpha),r.setFunc(F.depthFunc),r.setTest(F.depthTest),r.setMask(F.depthWrite),a.setMask(F.colorWrite);let te=F.stencilWrite;l.setTest(te),te&&(l.setMask(F.stencilWriteMask),l.setFunc(F.stencilFunc,F.stencilRef,F.stencilFuncMask),l.setOp(F.stencilFail,F.stencilZFail,F.stencilZPass)),yt(F.polygonOffset,F.polygonOffsetFactor,F.polygonOffsetUnits),F.alphaToCoverage===!0?ye(n.SAMPLE_ALPHA_TO_COVERAGE):Le(n.SAMPLE_ALPHA_TO_COVERAGE)}function tt(F){w!==F&&(F?n.frontFace(n.CW):n.frontFace(n.CCW),w=F)}function Ne(F){F!==Nd?(ye(n.CULL_FACE),F!==V&&(F===ch?n.cullFace(n.BACK):F===Vd?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):Le(n.CULL_FACE),V=F}function ke(F){F!==j&&(Y&&n.lineWidth(F),j=F)}function yt(F,_e,X){F?(ye(n.POLYGON_OFFSET_FILL),($!==_e||J!==X)&&(n.polygonOffset(_e,X),$=_e,J=X)):Le(n.POLYGON_OFFSET_FILL)}function Ue(F){F?ye(n.SCISSOR_TEST):Le(n.SCISSOR_TEST)}function T(F){F===void 0&&(F=n.TEXTURE0+ae-1),de!==F&&(n.activeTexture(F),de=F)}function x(F,_e,X){X===void 0&&(de===null?X=n.TEXTURE0+ae-1:X=de);let te=Me[X];te===void 0&&(te={type:void 0,texture:void 0},Me[X]=te),(te.type!==F||te.texture!==_e)&&(de!==X&&(n.activeTexture(X),de=X),n.bindTexture(F,_e||Pe[F]),te.type=F,te.texture=_e)}function q(){let F=Me[de];F!==void 0&&F.type!==void 0&&(n.bindTexture(F.type,null),F.type=void 0,F.texture=void 0)}function ie(){try{n.compressedTexImage2D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function re(){try{n.compressedTexImage3D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function K(){try{n.texSubImage2D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Te(){try{n.texSubImage3D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function ve(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Se(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function nt(){try{n.texStorage2D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function he(){try{n.texStorage3D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Ee(){try{n.texImage2D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Fe(){try{n.texImage3D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Be(F){Ye.equals(F)===!1&&(n.scissor(F.x,F.y,F.z,F.w),Ye.copy(F))}function pe(F){ee.equals(F)===!1&&(n.viewport(F.x,F.y,F.z,F.w),ee.copy(F))}function Ze(F,_e){let X=h.get(_e);X===void 0&&(X=new WeakMap,h.set(_e,X));let te=X.get(F);te===void 0&&(te=n.getUniformBlockIndex(_e,F.name),X.set(F,te))}function qe(F,_e){let te=h.get(_e).get(F);c.get(_e)!==te&&(n.uniformBlockBinding(_e,te,F.__bindingPointIndex),c.set(_e,te))}function ht(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),r.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),u={},de=null,Me={},d={},f=new WeakMap,g=[],y=null,_=!1,m=null,p=null,E=null,b=null,M=null,z=null,C=null,I=new Qe(0,0,0),G=0,S=!1,w=null,V=null,j=null,$=null,J=null,Ye.set(0,0,n.canvas.width,n.canvas.height),ee.set(0,0,n.canvas.width,n.canvas.height),a.reset(),r.reset(),l.reset()}return{buffers:{color:a,depth:r,stencil:l},enable:ye,disable:Le,bindFramebuffer:He,drawBuffers:$e,useProgram:gt,setBlending:B,setMaterial:Nt,setFlipSided:tt,setCullFace:Ne,setLineWidth:ke,setPolygonOffset:yt,setScissorTest:Ue,activeTexture:T,bindTexture:x,unbindTexture:q,compressedTexImage2D:ie,compressedTexImage3D:re,texImage2D:Ee,texImage3D:Fe,updateUBOMapping:Ze,uniformBlockBinding:qe,texStorage2D:nt,texStorage3D:he,texSubImage2D:K,texSubImage3D:Te,compressedTexSubImage2D:ve,compressedTexSubImage3D:Se,scissor:Be,viewport:pe,reset:ht}}function lu(n,e,t,i){let s=Cy(i);switch(t){case wu:return n*e;case Au:return n*e;case Tu:return n*e*2;case Eu:return n*e/s.components*s.byteLength;case wc:return n*e/s.components*s.byteLength;case Cu:return n*e*2/s.components*s.byteLength;case Sc:return n*e*2/s.components*s.byteLength;case Su:return n*e*3/s.components*s.byteLength;case Mn:return n*e*4/s.components*s.byteLength;case Ac:return n*e*4/s.components*s.byteLength;case mr:case gr:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case yr:case vr:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case ll:case hl:return Math.max(n,16)*Math.max(e,8)/4;case ol:case cl:return Math.max(n,8)*Math.max(e,8)/2;case ul:case dl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case pl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case fl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case ml:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case gl:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case yl:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case vl:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case _l:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case xl:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case bl:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case Ml:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case wl:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case Sl:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case Al:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case Tl:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case El:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case _r:case Cl:case Rl:return Math.ceil(n/4)*Math.ceil(e/4)*16;case Ru:case Pl:return Math.ceil(n/4)*Math.ceil(e/4)*8;case Ll:case Il:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Cy(n){switch(n){case Xn:case xu:return{byteLength:1,components:1};case ya:case bu:case Ra:return{byteLength:2,components:1};case bc:case Mc:return{byteLength:2,components:4};case Ni:case xc:case Wn:return{byteLength:4,components:1};case Mu:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}function Ry(n,e,t,i,s,a,r){let l=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),h=new we,u=new WeakMap,d,f=new WeakMap,g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function y(T,x){return g?new OffscreenCanvas(T,x):Mr("canvas")}function _(T,x,q){let ie=1,re=Ue(T);if((re.width>q||re.height>q)&&(ie=q/Math.max(re.width,re.height)),ie<1)if(typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&T instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&T instanceof ImageBitmap||typeof VideoFrame<"u"&&T instanceof VideoFrame){let K=Math.floor(ie*re.width),Te=Math.floor(ie*re.height);d===void 0&&(d=y(K,Te));let ve=x?y(K,Te):d;return ve.width=K,ve.height=Te,ve.getContext("2d").drawImage(T,0,0,K,Te),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+re.width+"x"+re.height+") to ("+K+"x"+Te+")."),ve}else return"data"in T&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+re.width+"x"+re.height+")."),T;return T}function m(T){return T.generateMipmaps}function p(T){n.generateMipmap(T)}function E(T){return T.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:T.isWebGL3DRenderTarget?n.TEXTURE_3D:T.isWebGLArrayRenderTarget||T.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function b(T,x,q,ie,re=!1){if(T!==null){if(n[T]!==void 0)return n[T];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+T+"'")}let K=x;if(x===n.RED&&(q===n.FLOAT&&(K=n.R32F),q===n.HALF_FLOAT&&(K=n.R16F),q===n.UNSIGNED_BYTE&&(K=n.R8)),x===n.RED_INTEGER&&(q===n.UNSIGNED_BYTE&&(K=n.R8UI),q===n.UNSIGNED_SHORT&&(K=n.R16UI),q===n.UNSIGNED_INT&&(K=n.R32UI),q===n.BYTE&&(K=n.R8I),q===n.SHORT&&(K=n.R16I),q===n.INT&&(K=n.R32I)),x===n.RG&&(q===n.FLOAT&&(K=n.RG32F),q===n.HALF_FLOAT&&(K=n.RG16F),q===n.UNSIGNED_BYTE&&(K=n.RG8)),x===n.RG_INTEGER&&(q===n.UNSIGNED_BYTE&&(K=n.RG8UI),q===n.UNSIGNED_SHORT&&(K=n.RG16UI),q===n.UNSIGNED_INT&&(K=n.RG32UI),q===n.BYTE&&(K=n.RG8I),q===n.SHORT&&(K=n.RG16I),q===n.INT&&(K=n.RG32I)),x===n.RGB_INTEGER&&(q===n.UNSIGNED_BYTE&&(K=n.RGB8UI),q===n.UNSIGNED_SHORT&&(K=n.RGB16UI),q===n.UNSIGNED_INT&&(K=n.RGB32UI),q===n.BYTE&&(K=n.RGB8I),q===n.SHORT&&(K=n.RGB16I),q===n.INT&&(K=n.RGB32I)),x===n.RGBA_INTEGER&&(q===n.UNSIGNED_BYTE&&(K=n.RGBA8UI),q===n.UNSIGNED_SHORT&&(K=n.RGBA16UI),q===n.UNSIGNED_INT&&(K=n.RGBA32UI),q===n.BYTE&&(K=n.RGBA8I),q===n.SHORT&&(K=n.RGBA16I),q===n.INT&&(K=n.RGBA32I)),x===n.RGB&&q===n.UNSIGNED_INT_5_9_9_9_REV&&(K=n.RGB9_E5),x===n.RGBA){let Te=re?$r:at.getTransfer(ie);q===n.FLOAT&&(K=n.RGBA32F),q===n.HALF_FLOAT&&(K=n.RGBA16F),q===n.UNSIGNED_BYTE&&(K=Te===dt?n.SRGB8_ALPHA8:n.RGBA8),q===n.UNSIGNED_SHORT_4_4_4_4&&(K=n.RGBA4),q===n.UNSIGNED_SHORT_5_5_5_1&&(K=n.RGB5_A1)}return(K===n.R16F||K===n.R32F||K===n.RG16F||K===n.RG32F||K===n.RGBA16F||K===n.RGBA32F)&&e.get("EXT_color_buffer_float"),K}function M(T,x){let q;return T?x===null||x===Ni||x===Ps?q=n.DEPTH24_STENCIL8:x===Wn?q=n.DEPTH32F_STENCIL8:x===ya&&(q=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===Ni||x===Ps?q=n.DEPTH_COMPONENT24:x===Wn?q=n.DEPTH_COMPONENT32F:x===ya&&(q=n.DEPTH_COMPONENT16),q}function z(T,x){return m(T)===!0||T.isFramebufferTexture&&T.minFilter!==wn&&T.minFilter!==Rn?Math.log2(Math.max(x.width,x.height))+1:T.mipmaps!==void 0&&T.mipmaps.length>0?T.mipmaps.length:T.isCompressedTexture&&Array.isArray(T.image)?x.mipmaps.length:1}function C(T){let x=T.target;x.removeEventListener("dispose",C),G(x),x.isVideoTexture&&u.delete(x)}function I(T){let x=T.target;x.removeEventListener("dispose",I),w(x)}function G(T){let x=i.get(T);if(x.__webglInit===void 0)return;let q=T.source,ie=f.get(q);if(ie){let re=ie[x.__cacheKey];re.usedTimes--,re.usedTimes===0&&S(T),Object.keys(ie).length===0&&f.delete(q)}i.remove(T)}function S(T){let x=i.get(T);n.deleteTexture(x.__webglTexture);let q=T.source,ie=f.get(q);delete ie[x.__cacheKey],r.memory.textures--}function w(T){let x=i.get(T);if(T.depthTexture&&(T.depthTexture.dispose(),i.remove(T.depthTexture)),T.isWebGLCubeRenderTarget)for(let ie=0;ie<6;ie++){if(Array.isArray(x.__webglFramebuffer[ie]))for(let re=0;re<x.__webglFramebuffer[ie].length;re++)n.deleteFramebuffer(x.__webglFramebuffer[ie][re]);else n.deleteFramebuffer(x.__webglFramebuffer[ie]);x.__webglDepthbuffer&&n.deleteRenderbuffer(x.__webglDepthbuffer[ie])}else{if(Array.isArray(x.__webglFramebuffer))for(let ie=0;ie<x.__webglFramebuffer.length;ie++)n.deleteFramebuffer(x.__webglFramebuffer[ie]);else n.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&n.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&n.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let ie=0;ie<x.__webglColorRenderbuffer.length;ie++)x.__webglColorRenderbuffer[ie]&&n.deleteRenderbuffer(x.__webglColorRenderbuffer[ie]);x.__webglDepthRenderbuffer&&n.deleteRenderbuffer(x.__webglDepthRenderbuffer)}let q=T.textures;for(let ie=0,re=q.length;ie<re;ie++){let K=i.get(q[ie]);K.__webglTexture&&(n.deleteTexture(K.__webglTexture),r.memory.textures--),i.remove(q[ie])}i.remove(T)}let V=0;function j(){V=0}function $(){let T=V;return T>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+T+" texture units while this GPU supports only "+s.maxTextures),V+=1,T}function J(T){let x=[];return x.push(T.wrapS),x.push(T.wrapT),x.push(T.wrapR||0),x.push(T.magFilter),x.push(T.minFilter),x.push(T.anisotropy),x.push(T.internalFormat),x.push(T.format),x.push(T.type),x.push(T.generateMipmaps),x.push(T.premultiplyAlpha),x.push(T.flipY),x.push(T.unpackAlignment),x.push(T.colorSpace),x.join()}function ae(T,x){let q=i.get(T);if(T.isVideoTexture&&ke(T),T.isRenderTargetTexture===!1&&T.version>0&&q.__version!==T.version){let ie=T.image;if(ie===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ie.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{ee(q,T,x);return}}t.bindTexture(n.TEXTURE_2D,q.__webglTexture,n.TEXTURE0+x)}function Y(T,x){let q=i.get(T);if(T.version>0&&q.__version!==T.version){ee(q,T,x);return}t.bindTexture(n.TEXTURE_2D_ARRAY,q.__webglTexture,n.TEXTURE0+x)}function ce(T,x){let q=i.get(T);if(T.version>0&&q.__version!==T.version){ee(q,T,x);return}t.bindTexture(n.TEXTURE_3D,q.__webglTexture,n.TEXTURE0+x)}function Z(T,x){let q=i.get(T);if(T.version>0&&q.__version!==T.version){ue(q,T,x);return}t.bindTexture(n.TEXTURE_CUBE_MAP,q.__webglTexture,n.TEXTURE0+x)}let de={[al]:n.REPEAT,[Oi]:n.CLAMP_TO_EDGE,[rl]:n.MIRRORED_REPEAT},Me={[wn]:n.NEAREST,[dp]:n.NEAREST_MIPMAP_NEAREST,[Ga]:n.NEAREST_MIPMAP_LINEAR,[Rn]:n.LINEAR,[fo]:n.LINEAR_MIPMAP_NEAREST,[Ui]:n.LINEAR_MIPMAP_LINEAR},Ie={[gp]:n.NEVER,[Mp]:n.ALWAYS,[yp]:n.LESS,[Lu]:n.LEQUAL,[vp]:n.EQUAL,[bp]:n.GEQUAL,[_p]:n.GREATER,[xp]:n.NOTEQUAL};function We(T,x){if(x.type===Wn&&e.has("OES_texture_float_linear")===!1&&(x.magFilter===Rn||x.magFilter===fo||x.magFilter===Ga||x.magFilter===Ui||x.minFilter===Rn||x.minFilter===fo||x.minFilter===Ga||x.minFilter===Ui)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(T,n.TEXTURE_WRAP_S,de[x.wrapS]),n.texParameteri(T,n.TEXTURE_WRAP_T,de[x.wrapT]),(T===n.TEXTURE_3D||T===n.TEXTURE_2D_ARRAY)&&n.texParameteri(T,n.TEXTURE_WRAP_R,de[x.wrapR]),n.texParameteri(T,n.TEXTURE_MAG_FILTER,Me[x.magFilter]),n.texParameteri(T,n.TEXTURE_MIN_FILTER,Me[x.minFilter]),x.compareFunction&&(n.texParameteri(T,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(T,n.TEXTURE_COMPARE_FUNC,Ie[x.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===wn||x.minFilter!==Ga&&x.minFilter!==Ui||x.type===Wn&&e.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||i.get(x).__currentAnisotropy){let q=e.get("EXT_texture_filter_anisotropic");n.texParameterf(T,q.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,s.getMaxAnisotropy())),i.get(x).__currentAnisotropy=x.anisotropy}}}function Ye(T,x){let q=!1;T.__webglInit===void 0&&(T.__webglInit=!0,x.addEventListener("dispose",C));let ie=x.source,re=f.get(ie);re===void 0&&(re={},f.set(ie,re));let K=J(x);if(K!==T.__cacheKey){re[K]===void 0&&(re[K]={texture:n.createTexture(),usedTimes:0},r.memory.textures++,q=!0),re[K].usedTimes++;let Te=re[T.__cacheKey];Te!==void 0&&(re[T.__cacheKey].usedTimes--,Te.usedTimes===0&&S(x)),T.__cacheKey=K,T.__webglTexture=re[K].texture}return q}function ee(T,x,q){let ie=n.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(ie=n.TEXTURE_2D_ARRAY),x.isData3DTexture&&(ie=n.TEXTURE_3D);let re=Ye(T,x),K=x.source;t.bindTexture(ie,T.__webglTexture,n.TEXTURE0+q);let Te=i.get(K);if(K.version!==Te.__version||re===!0){t.activeTexture(n.TEXTURE0+q);let ve=at.getPrimaries(at.workingColorSpace),Se=x.colorSpace===ui?null:at.getPrimaries(x.colorSpace),nt=x.colorSpace===ui||ve===Se?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,x.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,x.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,nt);let he=_(x.image,!1,s.maxTextureSize);he=yt(x,he);let Ee=a.convert(x.format,x.colorSpace),Fe=a.convert(x.type),Be=b(x.internalFormat,Ee,Fe,x.colorSpace,x.isVideoTexture);We(ie,x);let pe,Ze=x.mipmaps,qe=x.isVideoTexture!==!0,ht=Te.__version===void 0||re===!0,F=K.dataReady,_e=z(x,he);if(x.isDepthTexture)Be=M(x.format===Ls,x.type),ht&&(qe?t.texStorage2D(n.TEXTURE_2D,1,Be,he.width,he.height):t.texImage2D(n.TEXTURE_2D,0,Be,he.width,he.height,0,Ee,Fe,null));else if(x.isDataTexture)if(Ze.length>0){qe&&ht&&t.texStorage2D(n.TEXTURE_2D,_e,Be,Ze[0].width,Ze[0].height);for(let X=0,te=Ze.length;X<te;X++)pe=Ze[X],qe?F&&t.texSubImage2D(n.TEXTURE_2D,X,0,0,pe.width,pe.height,Ee,Fe,pe.data):t.texImage2D(n.TEXTURE_2D,X,Be,pe.width,pe.height,0,Ee,Fe,pe.data);x.generateMipmaps=!1}else qe?(ht&&t.texStorage2D(n.TEXTURE_2D,_e,Be,he.width,he.height),F&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,he.width,he.height,Ee,Fe,he.data)):t.texImage2D(n.TEXTURE_2D,0,Be,he.width,he.height,0,Ee,Fe,he.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){qe&&ht&&t.texStorage3D(n.TEXTURE_2D_ARRAY,_e,Be,Ze[0].width,Ze[0].height,he.depth);for(let X=0,te=Ze.length;X<te;X++)if(pe=Ze[X],x.format!==Mn)if(Ee!==null)if(qe){if(F)if(x.layerUpdates.size>0){let be=lu(pe.width,pe.height,x.format,x.type);for(let xe of x.layerUpdates){let Ge=pe.data.subarray(xe*be/pe.data.BYTES_PER_ELEMENT,(xe+1)*be/pe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,X,0,0,xe,pe.width,pe.height,1,Ee,Ge)}x.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,X,0,0,0,pe.width,pe.height,he.depth,Ee,pe.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,X,Be,pe.width,pe.height,he.depth,0,pe.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else qe?F&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,X,0,0,0,pe.width,pe.height,he.depth,Ee,Fe,pe.data):t.texImage3D(n.TEXTURE_2D_ARRAY,X,Be,pe.width,pe.height,he.depth,0,Ee,Fe,pe.data)}else{qe&&ht&&t.texStorage2D(n.TEXTURE_2D,_e,Be,Ze[0].width,Ze[0].height);for(let X=0,te=Ze.length;X<te;X++)pe=Ze[X],x.format!==Mn?Ee!==null?qe?F&&t.compressedTexSubImage2D(n.TEXTURE_2D,X,0,0,pe.width,pe.height,Ee,pe.data):t.compressedTexImage2D(n.TEXTURE_2D,X,Be,pe.width,pe.height,0,pe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):qe?F&&t.texSubImage2D(n.TEXTURE_2D,X,0,0,pe.width,pe.height,Ee,Fe,pe.data):t.texImage2D(n.TEXTURE_2D,X,Be,pe.width,pe.height,0,Ee,Fe,pe.data)}else if(x.isDataArrayTexture)if(qe){if(ht&&t.texStorage3D(n.TEXTURE_2D_ARRAY,_e,Be,he.width,he.height,he.depth),F)if(x.layerUpdates.size>0){let X=lu(he.width,he.height,x.format,x.type);for(let te of x.layerUpdates){let be=he.data.subarray(te*X/he.data.BYTES_PER_ELEMENT,(te+1)*X/he.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,te,he.width,he.height,1,Ee,Fe,be)}x.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,he.width,he.height,he.depth,Ee,Fe,he.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,Be,he.width,he.height,he.depth,0,Ee,Fe,he.data);else if(x.isData3DTexture)qe?(ht&&t.texStorage3D(n.TEXTURE_3D,_e,Be,he.width,he.height,he.depth),F&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,he.width,he.height,he.depth,Ee,Fe,he.data)):t.texImage3D(n.TEXTURE_3D,0,Be,he.width,he.height,he.depth,0,Ee,Fe,he.data);else if(x.isFramebufferTexture){if(ht)if(qe)t.texStorage2D(n.TEXTURE_2D,_e,Be,he.width,he.height);else{let X=he.width,te=he.height;for(let be=0;be<_e;be++)t.texImage2D(n.TEXTURE_2D,be,Be,X,te,0,Ee,Fe,null),X>>=1,te>>=1}}else if(Ze.length>0){if(qe&&ht){let X=Ue(Ze[0]);t.texStorage2D(n.TEXTURE_2D,_e,Be,X.width,X.height)}for(let X=0,te=Ze.length;X<te;X++)pe=Ze[X],qe?F&&t.texSubImage2D(n.TEXTURE_2D,X,0,0,Ee,Fe,pe):t.texImage2D(n.TEXTURE_2D,X,Be,Ee,Fe,pe);x.generateMipmaps=!1}else if(qe){if(ht){let X=Ue(he);t.texStorage2D(n.TEXTURE_2D,_e,Be,X.width,X.height)}F&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,Ee,Fe,he)}else t.texImage2D(n.TEXTURE_2D,0,Be,Ee,Fe,he);m(x)&&p(ie),Te.__version=K.version,x.onUpdate&&x.onUpdate(x)}T.__version=x.version}function ue(T,x,q){if(x.image.length!==6)return;let ie=Ye(T,x),re=x.source;t.bindTexture(n.TEXTURE_CUBE_MAP,T.__webglTexture,n.TEXTURE0+q);let K=i.get(re);if(re.version!==K.__version||ie===!0){t.activeTexture(n.TEXTURE0+q);let Te=at.getPrimaries(at.workingColorSpace),ve=x.colorSpace===ui?null:at.getPrimaries(x.colorSpace),Se=x.colorSpace===ui||Te===ve?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,x.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,x.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Se);let nt=x.isCompressedTexture||x.image[0].isCompressedTexture,he=x.image[0]&&x.image[0].isDataTexture,Ee=[];for(let te=0;te<6;te++)!nt&&!he?Ee[te]=_(x.image[te],!0,s.maxCubemapSize):Ee[te]=he?x.image[te].image:x.image[te],Ee[te]=yt(x,Ee[te]);let Fe=Ee[0],Be=a.convert(x.format,x.colorSpace),pe=a.convert(x.type),Ze=b(x.internalFormat,Be,pe,x.colorSpace),qe=x.isVideoTexture!==!0,ht=K.__version===void 0||ie===!0,F=re.dataReady,_e=z(x,Fe);We(n.TEXTURE_CUBE_MAP,x);let X;if(nt){qe&&ht&&t.texStorage2D(n.TEXTURE_CUBE_MAP,_e,Ze,Fe.width,Fe.height);for(let te=0;te<6;te++){X=Ee[te].mipmaps;for(let be=0;be<X.length;be++){let xe=X[be];x.format!==Mn?Be!==null?qe?F&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,be,0,0,xe.width,xe.height,Be,xe.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,be,Ze,xe.width,xe.height,0,xe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):qe?F&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,be,0,0,xe.width,xe.height,Be,pe,xe.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,be,Ze,xe.width,xe.height,0,Be,pe,xe.data)}}}else{if(X=x.mipmaps,qe&&ht){X.length>0&&_e++;let te=Ue(Ee[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,_e,Ze,te.width,te.height)}for(let te=0;te<6;te++)if(he){qe?F&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,0,0,Ee[te].width,Ee[te].height,Be,pe,Ee[te].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,Ze,Ee[te].width,Ee[te].height,0,Be,pe,Ee[te].data);for(let be=0;be<X.length;be++){let Ge=X[be].image[te].image;qe?F&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,be+1,0,0,Ge.width,Ge.height,Be,pe,Ge.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,be+1,Ze,Ge.width,Ge.height,0,Be,pe,Ge.data)}}else{qe?F&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,0,0,Be,pe,Ee[te]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,Ze,Be,pe,Ee[te]);for(let be=0;be<X.length;be++){let xe=X[be];qe?F&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,be+1,0,0,Be,pe,xe.image[te]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,be+1,Ze,Be,pe,xe.image[te])}}}m(x)&&p(n.TEXTURE_CUBE_MAP),K.__version=re.version,x.onUpdate&&x.onUpdate(x)}T.__version=x.version}function Pe(T,x,q,ie,re,K){let Te=a.convert(q.format,q.colorSpace),ve=a.convert(q.type),Se=b(q.internalFormat,Te,ve,q.colorSpace),nt=i.get(x),he=i.get(q);if(he.__renderTarget=x,!nt.__hasExternalTextures){let Ee=Math.max(1,x.width>>K),Fe=Math.max(1,x.height>>K);re===n.TEXTURE_3D||re===n.TEXTURE_2D_ARRAY?t.texImage3D(re,K,Se,Ee,Fe,x.depth,0,Te,ve,null):t.texImage2D(re,K,Se,Ee,Fe,0,Te,ve,null)}t.bindFramebuffer(n.FRAMEBUFFER,T),Ne(x)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ie,re,he.__webglTexture,0,tt(x)):(re===n.TEXTURE_2D||re>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&re<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,ie,re,he.__webglTexture,K),t.bindFramebuffer(n.FRAMEBUFFER,null)}function ye(T,x,q){if(n.bindRenderbuffer(n.RENDERBUFFER,T),x.depthBuffer){let ie=x.depthTexture,re=ie&&ie.isDepthTexture?ie.type:null,K=M(x.stencilBuffer,re),Te=x.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ve=tt(x);Ne(x)?l.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ve,K,x.width,x.height):q?n.renderbufferStorageMultisample(n.RENDERBUFFER,ve,K,x.width,x.height):n.renderbufferStorage(n.RENDERBUFFER,K,x.width,x.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,Te,n.RENDERBUFFER,T)}else{let ie=x.textures;for(let re=0;re<ie.length;re++){let K=ie[re],Te=a.convert(K.format,K.colorSpace),ve=a.convert(K.type),Se=b(K.internalFormat,Te,ve,K.colorSpace),nt=tt(x);q&&Ne(x)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,nt,Se,x.width,x.height):Ne(x)?l.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,nt,Se,x.width,x.height):n.renderbufferStorage(n.RENDERBUFFER,Se,x.width,x.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Le(T,x){if(x&&x.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,T),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let ie=i.get(x.depthTexture);ie.__renderTarget=x,(!ie.__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),ae(x.depthTexture,0);let re=ie.__webglTexture,K=tt(x);if(x.depthTexture.format===Ss)Ne(x)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,re,0,K):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,re,0);else if(x.depthTexture.format===Ls)Ne(x)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,re,0,K):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,re,0);else throw new Error("Unknown depthTexture format")}function He(T){let x=i.get(T),q=T.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==T.depthTexture){let ie=T.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),ie){let re=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,ie.removeEventListener("dispose",re)};ie.addEventListener("dispose",re),x.__depthDisposeCallback=re}x.__boundDepthTexture=ie}if(T.depthTexture&&!x.__autoAllocateDepthBuffer){if(q)throw new Error("target.depthTexture not supported in Cube render targets");Le(x.__webglFramebuffer,T)}else if(q){x.__webglDepthbuffer=[];for(let ie=0;ie<6;ie++)if(t.bindFramebuffer(n.FRAMEBUFFER,x.__webglFramebuffer[ie]),x.__webglDepthbuffer[ie]===void 0)x.__webglDepthbuffer[ie]=n.createRenderbuffer(),ye(x.__webglDepthbuffer[ie],T,!1);else{let re=T.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,K=x.__webglDepthbuffer[ie];n.bindRenderbuffer(n.RENDERBUFFER,K),n.framebufferRenderbuffer(n.FRAMEBUFFER,re,n.RENDERBUFFER,K)}}else if(t.bindFramebuffer(n.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=n.createRenderbuffer(),ye(x.__webglDepthbuffer,T,!1);else{let ie=T.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,re=x.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,re),n.framebufferRenderbuffer(n.FRAMEBUFFER,ie,n.RENDERBUFFER,re)}t.bindFramebuffer(n.FRAMEBUFFER,null)}function $e(T,x,q){let ie=i.get(T);x!==void 0&&Pe(ie.__webglFramebuffer,T,T.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),q!==void 0&&He(T)}function gt(T){let x=T.texture,q=i.get(T),ie=i.get(x);T.addEventListener("dispose",I);let re=T.textures,K=T.isWebGLCubeRenderTarget===!0,Te=re.length>1;if(Te||(ie.__webglTexture===void 0&&(ie.__webglTexture=n.createTexture()),ie.__version=x.version,r.memory.textures++),K){q.__webglFramebuffer=[];for(let ve=0;ve<6;ve++)if(x.mipmaps&&x.mipmaps.length>0){q.__webglFramebuffer[ve]=[];for(let Se=0;Se<x.mipmaps.length;Se++)q.__webglFramebuffer[ve][Se]=n.createFramebuffer()}else q.__webglFramebuffer[ve]=n.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){q.__webglFramebuffer=[];for(let ve=0;ve<x.mipmaps.length;ve++)q.__webglFramebuffer[ve]=n.createFramebuffer()}else q.__webglFramebuffer=n.createFramebuffer();if(Te)for(let ve=0,Se=re.length;ve<Se;ve++){let nt=i.get(re[ve]);nt.__webglTexture===void 0&&(nt.__webglTexture=n.createTexture(),r.memory.textures++)}if(T.samples>0&&Ne(T)===!1){q.__webglMultisampledFramebuffer=n.createFramebuffer(),q.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,q.__webglMultisampledFramebuffer);for(let ve=0;ve<re.length;ve++){let Se=re[ve];q.__webglColorRenderbuffer[ve]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,q.__webglColorRenderbuffer[ve]);let nt=a.convert(Se.format,Se.colorSpace),he=a.convert(Se.type),Ee=b(Se.internalFormat,nt,he,Se.colorSpace,T.isXRRenderTarget===!0),Fe=tt(T);n.renderbufferStorageMultisample(n.RENDERBUFFER,Fe,Ee,T.width,T.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ve,n.RENDERBUFFER,q.__webglColorRenderbuffer[ve])}n.bindRenderbuffer(n.RENDERBUFFER,null),T.depthBuffer&&(q.__webglDepthRenderbuffer=n.createRenderbuffer(),ye(q.__webglDepthRenderbuffer,T,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(K){t.bindTexture(n.TEXTURE_CUBE_MAP,ie.__webglTexture),We(n.TEXTURE_CUBE_MAP,x);for(let ve=0;ve<6;ve++)if(x.mipmaps&&x.mipmaps.length>0)for(let Se=0;Se<x.mipmaps.length;Se++)Pe(q.__webglFramebuffer[ve][Se],T,x,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ve,Se);else Pe(q.__webglFramebuffer[ve],T,x,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ve,0);m(x)&&p(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Te){for(let ve=0,Se=re.length;ve<Se;ve++){let nt=re[ve],he=i.get(nt);t.bindTexture(n.TEXTURE_2D,he.__webglTexture),We(n.TEXTURE_2D,nt),Pe(q.__webglFramebuffer,T,nt,n.COLOR_ATTACHMENT0+ve,n.TEXTURE_2D,0),m(nt)&&p(n.TEXTURE_2D)}t.unbindTexture()}else{let ve=n.TEXTURE_2D;if((T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(ve=T.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(ve,ie.__webglTexture),We(ve,x),x.mipmaps&&x.mipmaps.length>0)for(let Se=0;Se<x.mipmaps.length;Se++)Pe(q.__webglFramebuffer[Se],T,x,n.COLOR_ATTACHMENT0,ve,Se);else Pe(q.__webglFramebuffer,T,x,n.COLOR_ATTACHMENT0,ve,0);m(x)&&p(ve),t.unbindTexture()}T.depthBuffer&&He(T)}function et(T){let x=T.textures;for(let q=0,ie=x.length;q<ie;q++){let re=x[q];if(m(re)){let K=E(T),Te=i.get(re).__webglTexture;t.bindTexture(K,Te),p(K),t.unbindTexture()}}}let wt=[],B=[];function Nt(T){if(T.samples>0){if(Ne(T)===!1){let x=T.textures,q=T.width,ie=T.height,re=n.COLOR_BUFFER_BIT,K=T.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Te=i.get(T),ve=x.length>1;if(ve)for(let Se=0;Se<x.length;Se++)t.bindFramebuffer(n.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Se,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,Te.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Se,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,Te.__webglMultisampledFramebuffer),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Te.__webglFramebuffer);for(let Se=0;Se<x.length;Se++){if(T.resolveDepthBuffer&&(T.depthBuffer&&(re|=n.DEPTH_BUFFER_BIT),T.stencilBuffer&&T.resolveStencilBuffer&&(re|=n.STENCIL_BUFFER_BIT)),ve){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Te.__webglColorRenderbuffer[Se]);let nt=i.get(x[Se]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,nt,0)}n.blitFramebuffer(0,0,q,ie,0,0,q,ie,re,n.NEAREST),c===!0&&(wt.length=0,B.length=0,wt.push(n.COLOR_ATTACHMENT0+Se),T.depthBuffer&&T.resolveDepthBuffer===!1&&(wt.push(K),B.push(K),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,B)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,wt))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),ve)for(let Se=0;Se<x.length;Se++){t.bindFramebuffer(n.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Se,n.RENDERBUFFER,Te.__webglColorRenderbuffer[Se]);let nt=i.get(x[Se]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,Te.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Se,n.TEXTURE_2D,nt,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Te.__webglMultisampledFramebuffer)}else if(T.depthBuffer&&T.resolveDepthBuffer===!1&&c){let x=T.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[x])}}}function tt(T){return Math.min(s.maxSamples,T.samples)}function Ne(T){let x=i.get(T);return T.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function ke(T){let x=r.render.frame;u.get(T)!==x&&(u.set(T,x),T.update())}function yt(T,x){let q=T.colorSpace,ie=T.format,re=T.type;return T.isCompressedTexture===!0||T.isVideoTexture===!0||q!==Us&&q!==ui&&(at.getTransfer(q)===dt?(ie!==Mn||re!==Xn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",q)),x}function Ue(T){return typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement?(h.width=T.naturalWidth||T.width,h.height=T.naturalHeight||T.height):typeof VideoFrame<"u"&&T instanceof VideoFrame?(h.width=T.displayWidth,h.height=T.displayHeight):(h.width=T.width,h.height=T.height),h}this.allocateTextureUnit=$,this.resetTextureUnits=j,this.setTexture2D=ae,this.setTexture2DArray=Y,this.setTexture3D=ce,this.setTextureCube=Z,this.rebindTextures=$e,this.setupRenderTarget=gt,this.updateRenderTargetMipmap=et,this.updateMultisampleRenderTarget=Nt,this.setupDepthRenderbuffer=He,this.setupFrameBufferTexture=Pe,this.useMultisampledRTT=Ne}function Py(n,e){function t(i,s=ui){let a,r=at.getTransfer(s);if(i===Xn)return n.UNSIGNED_BYTE;if(i===bc)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Mc)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Mu)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===xu)return n.BYTE;if(i===bu)return n.SHORT;if(i===ya)return n.UNSIGNED_SHORT;if(i===xc)return n.INT;if(i===Ni)return n.UNSIGNED_INT;if(i===Wn)return n.FLOAT;if(i===Ra)return n.HALF_FLOAT;if(i===wu)return n.ALPHA;if(i===Su)return n.RGB;if(i===Mn)return n.RGBA;if(i===Au)return n.LUMINANCE;if(i===Tu)return n.LUMINANCE_ALPHA;if(i===Ss)return n.DEPTH_COMPONENT;if(i===Ls)return n.DEPTH_STENCIL;if(i===Eu)return n.RED;if(i===wc)return n.RED_INTEGER;if(i===Cu)return n.RG;if(i===Sc)return n.RG_INTEGER;if(i===Ac)return n.RGBA_INTEGER;if(i===mr||i===gr||i===yr||i===vr)if(r===dt)if(a=e.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(i===mr)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===gr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===yr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===vr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(i===mr)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===gr)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===yr)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===vr)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===ol||i===ll||i===cl||i===hl)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(i===ol)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===ll)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===cl)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===hl)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===ul||i===dl||i===pl)if(a=e.get("WEBGL_compressed_texture_etc"),a!==null){if(i===ul||i===dl)return r===dt?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(i===pl)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===fl||i===ml||i===gl||i===yl||i===vl||i===_l||i===xl||i===bl||i===Ml||i===wl||i===Sl||i===Al||i===Tl||i===El)if(a=e.get("WEBGL_compressed_texture_astc"),a!==null){if(i===fl)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===ml)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===gl)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===yl)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===vl)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===_l)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===xl)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===bl)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Ml)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===wl)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Sl)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Al)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Tl)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===El)return r===dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===_r||i===Cl||i===Rl)if(a=e.get("EXT_texture_compression_bptc"),a!==null){if(i===_r)return r===dt?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Cl)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Rl)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Ru||i===Pl||i===Ll||i===Il)if(a=e.get("EXT_texture_compression_rgtc"),a!==null){if(i===_r)return a.COMPRESSED_RED_RGTC1_EXT;if(i===Pl)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Ll)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Il)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Ps?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}var Xl=class extends zt{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}},Ut=class extends Ht{constructor(){super(),this.isGroup=!0,this.type="Group"}},Ly={type:"move"},fa=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ut,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ut,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new k,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new k),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ut,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new k,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new k),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let s=null,a=null,r=null,l=this._targetRay,c=this._grip,h=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(h&&e.hand){r=!0;for(let _ of e.hand.values()){let m=t.getJointPose(_,i),p=this._getHandJoint(h,_);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}let u=h.joints["index-finger-tip"],d=h.joints["thumb-tip"],f=u.position.distanceTo(d.position),g=.02,y=.005;h.inputState.pinching&&f>g+y?(h.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!h.inputState.pinching&&f<=g-y&&(h.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(a=t.getPose(e.gripSpace,i),a!==null&&(c.matrix.fromArray(a.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,a.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(a.linearVelocity)):c.hasLinearVelocity=!1,a.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(a.angularVelocity)):c.hasAngularVelocity=!1));l!==null&&(s=t.getPose(e.targetRaySpace,i),s===null&&a!==null&&(s=a),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1,this.dispatchEvent(Ly)))}return l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),h!==null&&(h.visible=r!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let i=new Ut;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}},Iy=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Dy=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Yl=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,i){if(this.texture===null){let s=new hn,a=e.properties.get(s);a.__webglTexture=t.texture,(t.depthNear!=i.depthNear||t.depthFar!=i.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=s}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,i=new Ln({vertexShader:Iy,fragmentShader:Dy,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Ot(new Bi(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Zl=class extends Yn{constructor(e,t){super();let i=this,s=null,a=1,r=null,l="local-floor",c=1,h=null,u=null,d=null,f=null,g=null,y=null,_=new Yl,m=t.getContextAttributes(),p=null,E=null,b=[],M=[],z=new we,C=null,I=new zt;I.viewport=new pt;let G=new zt;G.viewport=new pt;let S=[I,G],w=new Xl,V=null,j=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(ee){let ue=b[ee];return ue===void 0&&(ue=new fa,b[ee]=ue),ue.getTargetRaySpace()},this.getControllerGrip=function(ee){let ue=b[ee];return ue===void 0&&(ue=new fa,b[ee]=ue),ue.getGripSpace()},this.getHand=function(ee){let ue=b[ee];return ue===void 0&&(ue=new fa,b[ee]=ue),ue.getHandSpace()};function $(ee){let ue=M.indexOf(ee.inputSource);if(ue===-1)return;let Pe=b[ue];Pe!==void 0&&(Pe.update(ee.inputSource,ee.frame,h||r),Pe.dispatchEvent({type:ee.type,data:ee.inputSource}))}function J(){s.removeEventListener("select",$),s.removeEventListener("selectstart",$),s.removeEventListener("selectend",$),s.removeEventListener("squeeze",$),s.removeEventListener("squeezestart",$),s.removeEventListener("squeezeend",$),s.removeEventListener("end",J),s.removeEventListener("inputsourceschange",ae);for(let ee=0;ee<b.length;ee++){let ue=M[ee];ue!==null&&(M[ee]=null,b[ee].disconnect(ue))}V=null,j=null,_.reset(),e.setRenderTarget(p),g=null,f=null,d=null,s=null,E=null,Ye.stop(),i.isPresenting=!1,e.setPixelRatio(C),e.setSize(z.width,z.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(ee){a=ee,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(ee){l=ee,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return h||r},this.setReferenceSpace=function(ee){h=ee},this.getBaseLayer=function(){return f!==null?f:g},this.getBinding=function(){return d},this.getFrame=function(){return y},this.getSession=function(){return s},this.setSession=async function(ee){if(s=ee,s!==null){if(p=e.getRenderTarget(),s.addEventListener("select",$),s.addEventListener("selectstart",$),s.addEventListener("selectend",$),s.addEventListener("squeeze",$),s.addEventListener("squeezestart",$),s.addEventListener("squeezeend",$),s.addEventListener("end",J),s.addEventListener("inputsourceschange",ae),m.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(z),s.renderState.layers===void 0){let ue={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:a};g=new XRWebGLLayer(s,t,ue),s.updateRenderState({baseLayer:g}),e.setPixelRatio(1),e.setSize(g.framebufferWidth,g.framebufferHeight,!1),E=new Zn(g.framebufferWidth,g.framebufferHeight,{format:Mn,type:Xn,colorSpace:e.outputColorSpace,stencilBuffer:m.stencil})}else{let ue=null,Pe=null,ye=null;m.depth&&(ye=m.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ue=m.stencil?Ls:Ss,Pe=m.stencil?Ps:Ni);let Le={colorFormat:t.RGBA8,depthFormat:ye,scaleFactor:a};d=new XRWebGLBinding(s,t),f=d.createProjectionLayer(Le),s.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),E=new Zn(f.textureWidth,f.textureHeight,{format:Mn,type:Xn,depthTexture:new Lr(f.textureWidth,f.textureHeight,Pe,void 0,void 0,void 0,void 0,void 0,void 0,ue),stencilBuffer:m.stencil,colorSpace:e.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1})}E.isXRRenderTarget=!0,this.setFoveation(c),h=null,r=await s.requestReferenceSpace(l),Ye.setContext(s),Ye.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function ae(ee){for(let ue=0;ue<ee.removed.length;ue++){let Pe=ee.removed[ue],ye=M.indexOf(Pe);ye>=0&&(M[ye]=null,b[ye].disconnect(Pe))}for(let ue=0;ue<ee.added.length;ue++){let Pe=ee.added[ue],ye=M.indexOf(Pe);if(ye===-1){for(let He=0;He<b.length;He++)if(He>=M.length){M.push(Pe),ye=He;break}else if(M[He]===null){M[He]=Pe,ye=He;break}if(ye===-1)break}let Le=b[ye];Le&&Le.connect(Pe)}}let Y=new k,ce=new k;function Z(ee,ue,Pe){Y.setFromMatrixPosition(ue.matrixWorld),ce.setFromMatrixPosition(Pe.matrixWorld);let ye=Y.distanceTo(ce),Le=ue.projectionMatrix.elements,He=Pe.projectionMatrix.elements,$e=Le[14]/(Le[10]-1),gt=Le[14]/(Le[10]+1),et=(Le[9]+1)/Le[5],wt=(Le[9]-1)/Le[5],B=(Le[8]-1)/Le[0],Nt=(He[8]+1)/He[0],tt=$e*B,Ne=$e*Nt,ke=ye/(-B+Nt),yt=ke*-B;if(ue.matrixWorld.decompose(ee.position,ee.quaternion,ee.scale),ee.translateX(yt),ee.translateZ(ke),ee.matrixWorld.compose(ee.position,ee.quaternion,ee.scale),ee.matrixWorldInverse.copy(ee.matrixWorld).invert(),Le[10]===-1)ee.projectionMatrix.copy(ue.projectionMatrix),ee.projectionMatrixInverse.copy(ue.projectionMatrixInverse);else{let Ue=$e+ke,T=gt+ke,x=tt-yt,q=Ne+(ye-yt),ie=et*gt/T*Ue,re=wt*gt/T*Ue;ee.projectionMatrix.makePerspective(x,q,ie,re,Ue,T),ee.projectionMatrixInverse.copy(ee.projectionMatrix).invert()}}function de(ee,ue){ue===null?ee.matrixWorld.copy(ee.matrix):ee.matrixWorld.multiplyMatrices(ue.matrixWorld,ee.matrix),ee.matrixWorldInverse.copy(ee.matrixWorld).invert()}this.updateCamera=function(ee){if(s===null)return;let ue=ee.near,Pe=ee.far;_.texture!==null&&(_.depthNear>0&&(ue=_.depthNear),_.depthFar>0&&(Pe=_.depthFar)),w.near=G.near=I.near=ue,w.far=G.far=I.far=Pe,(V!==w.near||j!==w.far)&&(s.updateRenderState({depthNear:w.near,depthFar:w.far}),V=w.near,j=w.far),I.layers.mask=ee.layers.mask|2,G.layers.mask=ee.layers.mask|4,w.layers.mask=I.layers.mask|G.layers.mask;let ye=ee.parent,Le=w.cameras;de(w,ye);for(let He=0;He<Le.length;He++)de(Le[He],ye);Le.length===2?Z(w,I,G):w.projectionMatrix.copy(I.projectionMatrix),Me(ee,w,ye)};function Me(ee,ue,Pe){Pe===null?ee.matrix.copy(ue.matrixWorld):(ee.matrix.copy(Pe.matrixWorld),ee.matrix.invert(),ee.matrix.multiply(ue.matrixWorld)),ee.matrix.decompose(ee.position,ee.quaternion,ee.scale),ee.updateMatrixWorld(!0),ee.projectionMatrix.copy(ue.projectionMatrix),ee.projectionMatrixInverse.copy(ue.projectionMatrixInverse),ee.isPerspectiveCamera&&(ee.fov=va*2*Math.atan(1/ee.projectionMatrix.elements[5]),ee.zoom=1)}this.getCamera=function(){return w},this.getFoveation=function(){if(!(f===null&&g===null))return c},this.setFoveation=function(ee){c=ee,f!==null&&(f.fixedFoveation=ee),g!==null&&g.fixedFoveation!==void 0&&(g.fixedFoveation=ee)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(w)};let Ie=null;function We(ee,ue){if(u=ue.getViewerPose(h||r),y=ue,u!==null){let Pe=u.views;g!==null&&(e.setRenderTargetFramebuffer(E,g.framebuffer),e.setRenderTarget(E));let ye=!1;Pe.length!==w.cameras.length&&(w.cameras.length=0,ye=!0);for(let He=0;He<Pe.length;He++){let $e=Pe[He],gt=null;if(g!==null)gt=g.getViewport($e);else{let wt=d.getViewSubImage(f,$e);gt=wt.viewport,He===0&&(e.setRenderTargetTextures(E,wt.colorTexture,f.ignoreDepthValues?void 0:wt.depthStencilTexture),e.setRenderTarget(E))}let et=S[He];et===void 0&&(et=new zt,et.layers.enable(He),et.viewport=new pt,S[He]=et),et.matrix.fromArray($e.transform.matrix),et.matrix.decompose(et.position,et.quaternion,et.scale),et.projectionMatrix.fromArray($e.projectionMatrix),et.projectionMatrixInverse.copy(et.projectionMatrix).invert(),et.viewport.set(gt.x,gt.y,gt.width,gt.height),He===0&&(w.matrix.copy(et.matrix),w.matrix.decompose(w.position,w.quaternion,w.scale)),ye===!0&&w.cameras.push(et)}let Le=s.enabledFeatures;if(Le&&Le.includes("depth-sensing")){let He=d.getDepthInformation(Pe[0]);He&&He.isValid&&He.texture&&_.init(e,He,s.renderState)}}for(let Pe=0;Pe<b.length;Pe++){let ye=M[Pe],Le=b[Pe];ye!==null&&Le!==void 0&&Le.update(ye,ue,h||r)}Ie&&Ie(ee,ue),ue.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:ue}),y=null}let Ye=new Uu;Ye.setAnimationLoop(We),this.setAnimationLoop=function(ee){Ie=ee},this.dispose=function(){}}},Li=new Pn,ky=new Mt;function Oy(n,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function i(m,p){p.color.getRGB(m.fogColor.value,Ou(n)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,E,b,M){p.isMeshBasicMaterial||p.isMeshLambertMaterial?a(m,p):p.isMeshToonMaterial?(a(m,p),d(m,p)):p.isMeshPhongMaterial?(a(m,p),u(m,p)):p.isMeshStandardMaterial?(a(m,p),f(m,p),p.isMeshPhysicalMaterial&&g(m,p,M)):p.isMeshMatcapMaterial?(a(m,p),y(m,p)):p.isMeshDepthMaterial?a(m,p):p.isMeshDistanceMaterial?(a(m,p),_(m,p)):p.isMeshNormalMaterial?a(m,p):p.isLineBasicMaterial?(r(m,p),p.isLineDashedMaterial&&l(m,p)):p.isPointsMaterial?c(m,p,E,b):p.isSpriteMaterial?h(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function a(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Jt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Jt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let E=e.get(p),b=E.envMap,M=E.envMapRotation;b&&(m.envMap.value=b,Li.copy(M),Li.x*=-1,Li.y*=-1,Li.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(Li.y*=-1,Li.z*=-1),m.envMapRotation.value.setFromMatrix4(ky.makeRotationFromEuler(Li)),m.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function r(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function l(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function c(m,p,E,b){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*E,m.scale.value=b*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function u(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function d(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function f(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function g(m,p,E){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Jt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=E.texture,m.transmissionSamplerSize.value.set(E.width,E.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function y(m,p){p.matcap&&(m.matcap.value=p.matcap)}function _(m,p){let E=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(E.matrixWorld),m.nearDistance.value=E.shadow.camera.near,m.farDistance.value=E.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function Uy(n,e,t,i){let s={},a={},r=[],l=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function c(E,b){let M=b.program;i.uniformBlockBinding(E,M)}function h(E,b){let M=s[E.id];M===void 0&&(y(E),M=u(E),s[E.id]=M,E.addEventListener("dispose",m));let z=b.program;i.updateUBOMapping(E,z);let C=e.render.frame;a[E.id]!==C&&(f(E),a[E.id]=C)}function u(E){let b=d();E.__bindingPointIndex=b;let M=n.createBuffer(),z=E.__size,C=E.usage;return n.bindBuffer(n.UNIFORM_BUFFER,M),n.bufferData(n.UNIFORM_BUFFER,z,C),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,b,M),M}function d(){for(let E=0;E<l;E++)if(r.indexOf(E)===-1)return r.push(E),E;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(E){let b=s[E.id],M=E.uniforms,z=E.__cache;n.bindBuffer(n.UNIFORM_BUFFER,b);for(let C=0,I=M.length;C<I;C++){let G=Array.isArray(M[C])?M[C]:[M[C]];for(let S=0,w=G.length;S<w;S++){let V=G[S];if(g(V,C,S,z)===!0){let j=V.__offset,$=Array.isArray(V.value)?V.value:[V.value],J=0;for(let ae=0;ae<$.length;ae++){let Y=$[ae],ce=_(Y);typeof Y=="number"||typeof Y=="boolean"?(V.__data[0]=Y,n.bufferSubData(n.UNIFORM_BUFFER,j+J,V.__data)):Y.isMatrix3?(V.__data[0]=Y.elements[0],V.__data[1]=Y.elements[1],V.__data[2]=Y.elements[2],V.__data[3]=0,V.__data[4]=Y.elements[3],V.__data[5]=Y.elements[4],V.__data[6]=Y.elements[5],V.__data[7]=0,V.__data[8]=Y.elements[6],V.__data[9]=Y.elements[7],V.__data[10]=Y.elements[8],V.__data[11]=0):(Y.toArray(V.__data,J),J+=ce.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,j,V.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function g(E,b,M,z){let C=E.value,I=b+"_"+M;if(z[I]===void 0)return typeof C=="number"||typeof C=="boolean"?z[I]=C:z[I]=C.clone(),!0;{let G=z[I];if(typeof C=="number"||typeof C=="boolean"){if(G!==C)return z[I]=C,!0}else if(G.equals(C)===!1)return G.copy(C),!0}return!1}function y(E){let b=E.uniforms,M=0,z=16;for(let I=0,G=b.length;I<G;I++){let S=Array.isArray(b[I])?b[I]:[b[I]];for(let w=0,V=S.length;w<V;w++){let j=S[w],$=Array.isArray(j.value)?j.value:[j.value];for(let J=0,ae=$.length;J<ae;J++){let Y=$[J],ce=_(Y),Z=M%z,de=Z%ce.boundary,Me=Z+de;M+=de,Me!==0&&z-Me<ce.storage&&(M+=z-Me),j.__data=new Float32Array(ce.storage/Float32Array.BYTES_PER_ELEMENT),j.__offset=M,M+=ce.storage}}}let C=M%z;return C>0&&(M+=z-C),E.__size=M,E.__cache={},this}function _(E){let b={boundary:0,storage:0};return typeof E=="number"||typeof E=="boolean"?(b.boundary=4,b.storage=4):E.isVector2?(b.boundary=8,b.storage=8):E.isVector3||E.isColor?(b.boundary=16,b.storage=12):E.isVector4?(b.boundary=16,b.storage=16):E.isMatrix3?(b.boundary=48,b.storage=48):E.isMatrix4?(b.boundary=64,b.storage=64):E.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",E),b}function m(E){let b=E.target;b.removeEventListener("dispose",m);let M=r.indexOf(b.__bindingPointIndex);r.splice(M,1),n.deleteBuffer(s[b.id]),delete s[b.id],delete a[b.id]}function p(){for(let E in s)n.deleteBuffer(s[E]);r=[],s={},a={}}return{bind:c,update:h,dispose:p}}var Ir=class{constructor(e={}){let{canvas:t=Fp(),context:i=null,depth:s=!0,stencil:a=!1,alpha:r=!1,antialias:l=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:h=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:d=!1,reverseDepthBuffer:f=!1}=e;this.isWebGLRenderer=!0;let g;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=i.getContextAttributes().alpha}else g=r;let y=new Uint32Array(4),_=new Int32Array(4),m=null,p=null,E=[],b=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Zt,this.toneMapping=fi,this.toneMappingExposure=1;let M=this,z=!1,C=0,I=0,G=null,S=-1,w=null,V=new pt,j=new pt,$=null,J=new Qe(0),ae=0,Y=t.width,ce=t.height,Z=1,de=null,Me=null,Ie=new pt(0,0,Y,ce),We=new pt(0,0,Y,ce),Ye=!1,ee=new ba,ue=!1,Pe=!1,ye=new Mt,Le=new Mt,He=new k,$e=new pt,gt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},et=!1;function wt(){return G===null?Z:1}let B=i;function Nt(v,R){return t.getContext(v,R)}try{let v={alpha:!0,depth:s,stencil:a,antialias:l,premultipliedAlpha:c,preserveDrawingBuffer:h,powerPreference:u,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${vc}`),t.addEventListener("webglcontextlost",te,!1),t.addEventListener("webglcontextrestored",be,!1),t.addEventListener("webglcontextcreationerror",xe,!1),B===null){let R="webgl2";if(B=Nt(R,v),B===null)throw Nt(R)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(v){throw console.error("THREE.WebGLRenderer: "+v.message),v}let tt,Ne,ke,yt,Ue,T,x,q,ie,re,K,Te,ve,Se,nt,he,Ee,Fe,Be,pe,Ze,qe,ht,F;function _e(){tt=new Kg(B),tt.init(),qe=new Py(B,tt),Ne=new $g(B,tt,e,qe),ke=new Ey(B,tt),Ne.reverseDepthBuffer&&f&&ke.buffers.depth.setReversed(!0),yt=new t0(B),Ue=new fy,T=new Ry(B,tt,ke,Ue,Ne,qe,yt),x=new Xg(M),q=new Jg(M),ie=new lf(B),ht=new Wg(B,ie),re=new Qg(B,ie,yt,ht),K=new i0(B,re,ie,yt),Be=new n0(B,Ne,T),he=new jg(Ue),Te=new py(M,x,q,tt,Ne,ht,he),ve=new Oy(M,Ue),Se=new gy,nt=new My(tt),Fe=new Gg(M,x,q,ke,K,g,c),Ee=new Ay(M,K,Ne),F=new Uy(B,yt,Ne,ke),pe=new qg(B,tt,yt),Ze=new e0(B,tt,yt),yt.programs=Te.programs,M.capabilities=Ne,M.extensions=tt,M.properties=Ue,M.renderLists=Se,M.shadowMap=Ee,M.state=ke,M.info=yt}_e();let X=new Zl(M,B);this.xr=X,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){let v=tt.get("WEBGL_lose_context");v&&v.loseContext()},this.forceContextRestore=function(){let v=tt.get("WEBGL_lose_context");v&&v.restoreContext()},this.getPixelRatio=function(){return Z},this.setPixelRatio=function(v){v!==void 0&&(Z=v,this.setSize(Y,ce,!1))},this.getSize=function(v){return v.set(Y,ce)},this.setSize=function(v,R,U=!0){if(X.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}Y=v,ce=R,t.width=Math.floor(v*Z),t.height=Math.floor(R*Z),U===!0&&(t.style.width=v+"px",t.style.height=R+"px"),this.setViewport(0,0,v,R)},this.getDrawingBufferSize=function(v){return v.set(Y*Z,ce*Z).floor()},this.setDrawingBufferSize=function(v,R,U){Y=v,ce=R,Z=U,t.width=Math.floor(v*U),t.height=Math.floor(R*U),this.setViewport(0,0,v,R)},this.getCurrentViewport=function(v){return v.copy(V)},this.getViewport=function(v){return v.copy(Ie)},this.setViewport=function(v,R,U,N){v.isVector4?Ie.set(v.x,v.y,v.z,v.w):Ie.set(v,R,U,N),ke.viewport(V.copy(Ie).multiplyScalar(Z).round())},this.getScissor=function(v){return v.copy(We)},this.setScissor=function(v,R,U,N){v.isVector4?We.set(v.x,v.y,v.z,v.w):We.set(v,R,U,N),ke.scissor(j.copy(We).multiplyScalar(Z).round())},this.getScissorTest=function(){return Ye},this.setScissorTest=function(v){ke.setScissorTest(Ye=v)},this.setOpaqueSort=function(v){de=v},this.setTransparentSort=function(v){Me=v},this.getClearColor=function(v){return v.copy(Fe.getClearColor())},this.setClearColor=function(){Fe.setClearColor.apply(Fe,arguments)},this.getClearAlpha=function(){return Fe.getClearAlpha()},this.setClearAlpha=function(){Fe.setClearAlpha.apply(Fe,arguments)},this.clear=function(v=!0,R=!0,U=!0){let N=0;if(v){let O=!1;if(G!==null){let ne=G.texture.format;O=ne===Ac||ne===Sc||ne===wc}if(O){let ne=G.texture.type,se=ne===Xn||ne===Ni||ne===ya||ne===Ps||ne===bc||ne===Mc,fe=Fe.getClearColor(),me=Fe.getClearAlpha(),Re=fe.r,Ve=fe.g,Ce=fe.b;se?(y[0]=Re,y[1]=Ve,y[2]=Ce,y[3]=me,B.clearBufferuiv(B.COLOR,0,y)):(_[0]=Re,_[1]=Ve,_[2]=Ce,_[3]=me,B.clearBufferiv(B.COLOR,0,_))}else N|=B.COLOR_BUFFER_BIT}R&&(N|=B.DEPTH_BUFFER_BIT),U&&(N|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),B.clear(N)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",te,!1),t.removeEventListener("webglcontextrestored",be,!1),t.removeEventListener("webglcontextcreationerror",xe,!1),Se.dispose(),nt.dispose(),Ue.dispose(),x.dispose(),q.dispose(),K.dispose(),ht.dispose(),F.dispose(),Te.dispose(),X.dispose(),X.removeEventListener("sessionstart",_i),X.removeEventListener("sessionend",Oa),Tn.stop()};function te(v){v.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),z=!0}function be(){console.log("THREE.WebGLRenderer: Context Restored."),z=!1;let v=yt.autoReset,R=Ee.enabled,U=Ee.autoUpdate,N=Ee.needsUpdate,O=Ee.type;_e(),yt.autoReset=v,Ee.enabled=R,Ee.autoUpdate=U,Ee.needsUpdate=N,Ee.type=O}function xe(v){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",v.statusMessage)}function Ge(v){let R=v.target;R.removeEventListener("dispose",Ge),ut(R)}function ut(v){it(v),Ue.remove(v)}function it(v){let R=Ue.get(v).programs;R!==void 0&&(R.forEach(function(U){Te.releaseProgram(U)}),v.isShaderMaterial&&Te.releaseShaderCache(v))}this.renderBufferDirect=function(v,R,U,N,O,ne){R===null&&(R=gt);let se=O.isMesh&&O.matrixWorld.determinant()<0,fe=H(v,R,U,N,O);ke.setMaterial(N,se);let me=U.index,Re=1;if(N.wireframe===!0){if(me=re.getWireframeAttribute(U),me===void 0)return;Re=2}let Ve=U.drawRange,Ce=U.attributes.position,st=Ve.start*Re,vt=(Ve.start+Ve.count)*Re;ne!==null&&(st=Math.max(st,ne.start*Re),vt=Math.min(vt,(ne.start+ne.count)*Re)),me!==null?(st=Math.max(st,0),vt=Math.min(vt,me.count)):Ce!=null&&(st=Math.max(st,0),vt=Math.min(vt,Ce.count));let xt=vt-st;if(xt<0||xt===1/0)return;ht.setup(O,N,fe,U,me);let Xt,ot=pe;if(me!==null&&(Xt=ie.get(me),ot=Ze,ot.setIndex(Xt)),O.isMesh)N.wireframe===!0?(ke.setLineWidth(N.wireframeLinewidth*wt()),ot.setMode(B.LINES)):ot.setMode(B.TRIANGLES);else if(O.isLine){let De=N.linewidth;De===void 0&&(De=1),ke.setLineWidth(De*wt()),O.isLineSegments?ot.setMode(B.LINES):O.isLineLoop?ot.setMode(B.LINE_LOOP):ot.setMode(B.LINE_STRIP)}else O.isPoints?ot.setMode(B.POINTS):O.isSprite&&ot.setMode(B.TRIANGLES);if(O.isBatchedMesh)if(O._multiDrawInstances!==null)ot.renderMultiDrawInstances(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount,O._multiDrawInstances);else if(tt.get("WEBGL_multi_draw"))ot.renderMultiDraw(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount);else{let De=O._multiDrawStarts,In=O._multiDrawCounts,lt=O._multiDrawCount,gn=me?ie.get(me).bytesPerElement:1,Ki=Ue.get(N).currentProgram.getUniforms();for(let tn=0;tn<lt;tn++)Ki.setValue(B,"_gl_DrawID",tn),ot.render(De[tn]/gn,In[tn])}else if(O.isInstancedMesh)ot.renderInstances(st,xt,O.count);else if(U.isInstancedBufferGeometry){let De=U._maxInstanceCount!==void 0?U._maxInstanceCount:1/0,In=Math.min(U.instanceCount,De);ot.renderInstances(st,xt,In)}else ot.render(st,xt)};function Ae(v,R,U){v.transparent===!0&&v.side===Gn&&v.forceSinglePass===!1?(v.side=Jt,v.needsUpdate=!0,Ji(v,R,U),v.side=mi,v.needsUpdate=!0,Ji(v,R,U),v.side=Gn):Ji(v,R,U)}this.compile=function(v,R,U=null){U===null&&(U=v),p=nt.get(U),p.init(R),b.push(p),U.traverseVisible(function(O){O.isLight&&O.layers.test(R.layers)&&(p.pushLight(O),O.castShadow&&p.pushShadow(O))}),v!==U&&v.traverseVisible(function(O){O.isLight&&O.layers.test(R.layers)&&(p.pushLight(O),O.castShadow&&p.pushShadow(O))}),p.setupLights();let N=new Set;return v.traverse(function(O){if(!(O.isMesh||O.isPoints||O.isLine||O.isSprite))return;let ne=O.material;if(ne)if(Array.isArray(ne))for(let se=0;se<ne.length;se++){let fe=ne[se];Ae(fe,U,O),N.add(fe)}else Ae(ne,U,O),N.add(ne)}),b.pop(),p=null,N},this.compileAsync=function(v,R,U=null){let N=this.compile(v,R,U);return new Promise(O=>{function ne(){if(N.forEach(function(se){Ue.get(se).currentProgram.isReady()&&N.delete(se)}),N.size===0){O(v);return}setTimeout(ne,10)}tt.get("KHR_parallel_shader_compile")!==null?ne():setTimeout(ne,10)})};let Vt=null;function jt(v){Vt&&Vt(v)}function _i(){Tn.stop()}function Oa(){Tn.start()}let Tn=new Uu;Tn.setAnimationLoop(jt),typeof self<"u"&&Tn.setContext(self),this.setAnimationLoop=function(v){Vt=v,X.setAnimationLoop(v),v===null?Tn.stop():Tn.start()},X.addEventListener("sessionstart",_i),X.addEventListener("sessionend",Oa),this.render=function(v,R){if(R!==void 0&&R.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(z===!0)return;if(v.matrixWorldAutoUpdate===!0&&v.updateMatrixWorld(),R.parent===null&&R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),X.enabled===!0&&X.isPresenting===!0&&(X.cameraAutoUpdate===!0&&X.updateCamera(R),R=X.getCamera()),v.isScene===!0&&v.onBeforeRender(M,v,R,G),p=nt.get(v,b.length),p.init(R),b.push(p),Le.multiplyMatrices(R.projectionMatrix,R.matrixWorldInverse),ee.setFromProjectionMatrix(Le),Pe=this.localClippingEnabled,ue=he.init(this.clippingPlanes,Pe),m=Se.get(v,E.length),m.init(),E.push(m),X.enabled===!0&&X.isPresenting===!0){let ne=M.xr.getDepthSensingMesh();ne!==null&&xi(ne,R,-1/0,M.sortObjects)}xi(v,R,0,M.sortObjects),m.finish(),M.sortObjects===!0&&m.sort(de,Me),et=X.enabled===!1||X.isPresenting===!1||X.hasDepthSensing()===!1,et&&Fe.addToRenderList(m,v),this.info.render.frame++,ue===!0&&he.beginShadows();let U=p.state.shadowsArray;Ee.render(U,v,R),ue===!0&&he.endShadows(),this.info.autoReset===!0&&this.info.reset();let N=m.opaque,O=m.transmissive;if(p.setupLights(),R.isArrayCamera){let ne=R.cameras;if(O.length>0)for(let se=0,fe=ne.length;se<fe;se++){let me=ne[se];Yi(N,O,v,me)}et&&Fe.render(v);for(let se=0,fe=ne.length;se<fe;se++){let me=ne[se];bi(m,v,me,me.viewport)}}else O.length>0&&Yi(N,O,v,R),et&&Fe.render(v),bi(m,v,R);G!==null&&(T.updateMultisampleRenderTarget(G),T.updateRenderTargetMipmap(G)),v.isScene===!0&&v.onAfterRender(M,v,R),ht.resetDefaultState(),S=-1,w=null,b.pop(),b.length>0?(p=b[b.length-1],ue===!0&&he.setGlobalState(M.clippingPlanes,p.state.camera)):p=null,E.pop(),E.length>0?m=E[E.length-1]:m=null};function xi(v,R,U,N){if(v.visible===!1)return;if(v.layers.test(R.layers)){if(v.isGroup)U=v.renderOrder;else if(v.isLOD)v.autoUpdate===!0&&v.update(R);else if(v.isLight)p.pushLight(v),v.castShadow&&p.pushShadow(v);else if(v.isSprite){if(!v.frustumCulled||ee.intersectsSprite(v)){N&&$e.setFromMatrixPosition(v.matrixWorld).applyMatrix4(Le);let se=K.update(v),fe=v.material;fe.visible&&m.push(v,se,fe,U,$e.z,null)}}else if((v.isMesh||v.isLine||v.isPoints)&&(!v.frustumCulled||ee.intersectsObject(v))){let se=K.update(v),fe=v.material;if(N&&(v.boundingSphere!==void 0?(v.boundingSphere===null&&v.computeBoundingSphere(),$e.copy(v.boundingSphere.center)):(se.boundingSphere===null&&se.computeBoundingSphere(),$e.copy(se.boundingSphere.center)),$e.applyMatrix4(v.matrixWorld).applyMatrix4(Le)),Array.isArray(fe)){let me=se.groups;for(let Re=0,Ve=me.length;Re<Ve;Re++){let Ce=me[Re],st=fe[Ce.materialIndex];st&&st.visible&&m.push(v,se,st,U,$e.z,Ce)}}else fe.visible&&m.push(v,se,fe,U,$e.z,null)}}let ne=v.children;for(let se=0,fe=ne.length;se<fe;se++)xi(ne[se],R,U,N)}function bi(v,R,U,N){let O=v.opaque,ne=v.transmissive,se=v.transparent;p.setupLightsView(U),ue===!0&&he.setGlobalState(M.clippingPlanes,U),N&&ke.viewport(V.copy(N)),O.length>0&&Zi(O,R,U),ne.length>0&&Zi(ne,R,U),se.length>0&&Zi(se,R,U),ke.buffers.depth.setTest(!0),ke.buffers.depth.setMask(!0),ke.buffers.color.setMask(!0),ke.setPolygonOffset(!1)}function Yi(v,R,U,N){if((U.isScene===!0?U.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[N.id]===void 0&&(p.state.transmissionRenderTarget[N.id]=new Zn(1,1,{generateMipmaps:!0,type:tt.has("EXT_color_buffer_half_float")||tt.has("EXT_color_buffer_float")?Ra:Xn,minFilter:Ui,samples:4,stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:at.workingColorSpace}));let ne=p.state.transmissionRenderTarget[N.id],se=N.viewport||V;ne.setSize(se.z,se.w);let fe=M.getRenderTarget();M.setRenderTarget(ne),M.getClearColor(J),ae=M.getClearAlpha(),ae<1&&M.setClearColor(16777215,.5),M.clear(),et&&Fe.render(U);let me=M.toneMapping;M.toneMapping=fi;let Re=N.viewport;if(N.viewport!==void 0&&(N.viewport=void 0),p.setupLightsView(N),ue===!0&&he.setGlobalState(M.clippingPlanes,N),Zi(v,U,N),T.updateMultisampleRenderTarget(ne),T.updateRenderTargetMipmap(ne),tt.has("WEBGL_multisampled_render_to_texture")===!1){let Ve=!1;for(let Ce=0,st=R.length;Ce<st;Ce++){let vt=R[Ce],xt=vt.object,Xt=vt.geometry,ot=vt.material,De=vt.group;if(ot.side===Gn&&xt.layers.test(N.layers)){let In=ot.side;ot.side=Jt,ot.needsUpdate=!0,$s(xt,U,N,Xt,ot,De),ot.side=In,ot.needsUpdate=!0,Ve=!0}}Ve===!0&&(T.updateMultisampleRenderTarget(ne),T.updateRenderTargetMipmap(ne))}M.setRenderTarget(fe),M.setClearColor(J,ae),Re!==void 0&&(N.viewport=Re),M.toneMapping=me}function Zi(v,R,U){let N=R.isScene===!0?R.overrideMaterial:null;for(let O=0,ne=v.length;O<ne;O++){let se=v[O],fe=se.object,me=se.geometry,Re=N===null?se.material:N,Ve=se.group;fe.layers.test(U.layers)&&$s(fe,R,U,me,Re,Ve)}}function $s(v,R,U,N,O,ne){v.onBeforeRender(M,R,U,N,O,ne),v.modelViewMatrix.multiplyMatrices(U.matrixWorldInverse,v.matrixWorld),v.normalMatrix.getNormalMatrix(v.modelViewMatrix),O.onBeforeRender(M,R,U,N,v,ne),O.transparent===!0&&O.side===Gn&&O.forceSinglePass===!1?(O.side=Jt,O.needsUpdate=!0,M.renderBufferDirect(U,R,N,O,v,ne),O.side=mi,O.needsUpdate=!0,M.renderBufferDirect(U,R,N,O,v,ne),O.side=Gn):M.renderBufferDirect(U,R,N,O,v,ne),v.onAfterRender(M,R,U,N,O,ne)}function Ji(v,R,U){R.isScene!==!0&&(R=gt);let N=Ue.get(v),O=p.state.lights,ne=p.state.shadowsArray,se=O.state.version,fe=Te.getParameters(v,O.state,ne,R,U),me=Te.getProgramCacheKey(fe),Re=N.programs;N.environment=v.isMeshStandardMaterial?R.environment:null,N.fog=R.fog,N.envMap=(v.isMeshStandardMaterial?q:x).get(v.envMap||N.environment),N.envMapRotation=N.environment!==null&&v.envMap===null?R.environmentRotation:v.envMapRotation,Re===void 0&&(v.addEventListener("dispose",Ge),Re=new Map,N.programs=Re);let Ve=Re.get(me);if(Ve!==void 0){if(N.currentProgram===Ve&&N.lightsStateVersion===se)return W(v,fe),Ve}else fe.uniforms=Te.getUniforms(v),v.onBeforeCompile(fe,M),Ve=Te.acquireProgram(fe,me),Re.set(me,Ve),N.uniforms=fe.uniforms;let Ce=N.uniforms;return(!v.isShaderMaterial&&!v.isRawShaderMaterial||v.clipping===!0)&&(Ce.clippingPlanes=he.uniform),W(v,fe),N.needsLights=le(v),N.lightsStateVersion=se,N.needsLights&&(Ce.ambientLightColor.value=O.state.ambient,Ce.lightProbe.value=O.state.probe,Ce.directionalLights.value=O.state.directional,Ce.directionalLightShadows.value=O.state.directionalShadow,Ce.spotLights.value=O.state.spot,Ce.spotLightShadows.value=O.state.spotShadow,Ce.rectAreaLights.value=O.state.rectArea,Ce.ltc_1.value=O.state.rectAreaLTC1,Ce.ltc_2.value=O.state.rectAreaLTC2,Ce.pointLights.value=O.state.point,Ce.pointLightShadows.value=O.state.pointShadow,Ce.hemisphereLights.value=O.state.hemi,Ce.directionalShadowMap.value=O.state.directionalShadowMap,Ce.directionalShadowMatrix.value=O.state.directionalShadowMatrix,Ce.spotShadowMap.value=O.state.spotShadowMap,Ce.spotLightMatrix.value=O.state.spotLightMatrix,Ce.spotLightMap.value=O.state.spotLightMap,Ce.pointShadowMap.value=O.state.pointShadowMap,Ce.pointShadowMatrix.value=O.state.pointShadowMatrix),N.currentProgram=Ve,N.uniformsList=null,Ve}function D(v){if(v.uniformsList===null){let R=v.currentProgram.getUniforms();v.uniformsList=Ts.seqWithValue(R.seq,v.uniforms)}return v.uniformsList}function W(v,R){let U=Ue.get(v);U.outputColorSpace=R.outputColorSpace,U.batching=R.batching,U.batchingColor=R.batchingColor,U.instancing=R.instancing,U.instancingColor=R.instancingColor,U.instancingMorph=R.instancingMorph,U.skinning=R.skinning,U.morphTargets=R.morphTargets,U.morphNormals=R.morphNormals,U.morphColors=R.morphColors,U.morphTargetsCount=R.morphTargetsCount,U.numClippingPlanes=R.numClippingPlanes,U.numIntersection=R.numClipIntersection,U.vertexAlphas=R.vertexAlphas,U.vertexTangents=R.vertexTangents,U.toneMapping=R.toneMapping}function H(v,R,U,N,O){R.isScene!==!0&&(R=gt),T.resetTextureUnits();let ne=R.fog,se=N.isMeshStandardMaterial?R.environment:null,fe=G===null?M.outputColorSpace:G.isXRRenderTarget===!0?G.texture.colorSpace:Us,me=(N.isMeshStandardMaterial?q:x).get(N.envMap||se),Re=N.vertexColors===!0&&!!U.attributes.color&&U.attributes.color.itemSize===4,Ve=!!U.attributes.tangent&&(!!N.normalMap||N.anisotropy>0),Ce=!!U.morphAttributes.position,st=!!U.morphAttributes.normal,vt=!!U.morphAttributes.color,xt=fi;N.toneMapped&&(G===null||G.isXRRenderTarget===!0)&&(xt=M.toneMapping);let Xt=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,ot=Xt!==void 0?Xt.length:0,De=Ue.get(N),In=p.state.lights;if(ue===!0&&(Pe===!0||v!==w)){let dn=v===w&&N.id===S;he.setState(N,v,dn)}let lt=!1;N.version===De.__version?(De.needsLights&&De.lightsStateVersion!==In.state.version||De.outputColorSpace!==fe||O.isBatchedMesh&&De.batching===!1||!O.isBatchedMesh&&De.batching===!0||O.isBatchedMesh&&De.batchingColor===!0&&O.colorTexture===null||O.isBatchedMesh&&De.batchingColor===!1&&O.colorTexture!==null||O.isInstancedMesh&&De.instancing===!1||!O.isInstancedMesh&&De.instancing===!0||O.isSkinnedMesh&&De.skinning===!1||!O.isSkinnedMesh&&De.skinning===!0||O.isInstancedMesh&&De.instancingColor===!0&&O.instanceColor===null||O.isInstancedMesh&&De.instancingColor===!1&&O.instanceColor!==null||O.isInstancedMesh&&De.instancingMorph===!0&&O.morphTexture===null||O.isInstancedMesh&&De.instancingMorph===!1&&O.morphTexture!==null||De.envMap!==me||N.fog===!0&&De.fog!==ne||De.numClippingPlanes!==void 0&&(De.numClippingPlanes!==he.numPlanes||De.numIntersection!==he.numIntersection)||De.vertexAlphas!==Re||De.vertexTangents!==Ve||De.morphTargets!==Ce||De.morphNormals!==st||De.morphColors!==vt||De.toneMapping!==xt||De.morphTargetsCount!==ot)&&(lt=!0):(lt=!0,De.__version=N.version);let gn=De.currentProgram;lt===!0&&(gn=Ji(N,R,O));let Ki=!1,tn=!1,js=!1,bt=gn.getUniforms(),En=De.uniforms;if(ke.useProgram(gn.program)&&(Ki=!0,tn=!0,js=!0),N.id!==S&&(S=N.id,tn=!0),Ki||w!==v){ke.buffers.depth.getReversed()?(ye.copy(v.projectionMatrix),zp(ye),Hp(ye),bt.setValue(B,"projectionMatrix",ye)):bt.setValue(B,"projectionMatrix",v.projectionMatrix),bt.setValue(B,"viewMatrix",v.matrixWorldInverse);let ti=bt.map.cameraPosition;ti!==void 0&&ti.setValue(B,He.setFromMatrixPosition(v.matrixWorld)),Ne.logarithmicDepthBuffer&&bt.setValue(B,"logDepthBufFC",2/(Math.log(v.far+1)/Math.LN2)),(N.isMeshPhongMaterial||N.isMeshToonMaterial||N.isMeshLambertMaterial||N.isMeshBasicMaterial||N.isMeshStandardMaterial||N.isShaderMaterial)&&bt.setValue(B,"isOrthographic",v.isOrthographicCamera===!0),w!==v&&(w=v,tn=!0,js=!0)}if(O.isSkinnedMesh){bt.setOptional(B,O,"bindMatrix"),bt.setOptional(B,O,"bindMatrixInverse");let dn=O.skeleton;dn&&(dn.boneTexture===null&&dn.computeBoneTexture(),bt.setValue(B,"boneTexture",dn.boneTexture,T))}O.isBatchedMesh&&(bt.setOptional(B,O,"batchingTexture"),bt.setValue(B,"batchingTexture",O._matricesTexture,T),bt.setOptional(B,O,"batchingIdTexture"),bt.setValue(B,"batchingIdTexture",O._indirectTexture,T),bt.setOptional(B,O,"batchingColorTexture"),O._colorsTexture!==null&&bt.setValue(B,"batchingColorTexture",O._colorsTexture,T));let Xs=U.morphAttributes;if((Xs.position!==void 0||Xs.normal!==void 0||Xs.color!==void 0)&&Be.update(O,U,gn),(tn||De.receiveShadow!==O.receiveShadow)&&(De.receiveShadow=O.receiveShadow,bt.setValue(B,"receiveShadow",O.receiveShadow)),N.isMeshGouraudMaterial&&N.envMap!==null&&(En.envMap.value=me,En.flipEnvMap.value=me.isCubeTexture&&me.isRenderTargetTexture===!1?-1:1),N.isMeshStandardMaterial&&N.envMap===null&&R.environment!==null&&(En.envMapIntensity.value=R.environmentIntensity),tn&&(bt.setValue(B,"toneMappingExposure",M.toneMappingExposure),De.needsLights&&oe(En,js),ne&&N.fog===!0&&ve.refreshFogUniforms(En,ne),ve.refreshMaterialUniforms(En,N,Z,ce,p.state.transmissionRenderTarget[v.id]),Ts.upload(B,D(De),En,T)),N.isShaderMaterial&&N.uniformsNeedUpdate===!0&&(Ts.upload(B,D(De),En,T),N.uniformsNeedUpdate=!1),N.isSpriteMaterial&&bt.setValue(B,"center",O.center),bt.setValue(B,"modelViewMatrix",O.modelViewMatrix),bt.setValue(B,"normalMatrix",O.normalMatrix),bt.setValue(B,"modelMatrix",O.matrixWorld),N.isShaderMaterial||N.isRawShaderMaterial){let dn=N.uniformsGroups;for(let ti=0,ni=dn.length;ti<ni;ti++){let Zc=dn[ti];F.update(Zc,gn),F.bind(Zc,gn)}}return gn}function oe(v,R){v.ambientLightColor.needsUpdate=R,v.lightProbe.needsUpdate=R,v.directionalLights.needsUpdate=R,v.directionalLightShadows.needsUpdate=R,v.pointLights.needsUpdate=R,v.pointLightShadows.needsUpdate=R,v.spotLights.needsUpdate=R,v.spotLightShadows.needsUpdate=R,v.rectAreaLights.needsUpdate=R,v.hemisphereLights.needsUpdate=R}function le(v){return v.isMeshLambertMaterial||v.isMeshToonMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isShadowMaterial||v.isShaderMaterial&&v.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return I},this.getRenderTarget=function(){return G},this.setRenderTargetTextures=function(v,R,U){Ue.get(v.texture).__webglTexture=R,Ue.get(v.depthTexture).__webglTexture=U;let N=Ue.get(v);N.__hasExternalTextures=!0,N.__autoAllocateDepthBuffer=U===void 0,N.__autoAllocateDepthBuffer||tt.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),N.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(v,R){let U=Ue.get(v);U.__webglFramebuffer=R,U.__useDefaultFramebuffer=R===void 0},this.setRenderTarget=function(v,R=0,U=0){G=v,C=R,I=U;let N=!0,O=null,ne=!1,se=!1;if(v){let me=Ue.get(v);if(me.__useDefaultFramebuffer!==void 0)ke.bindFramebuffer(B.FRAMEBUFFER,null),N=!1;else if(me.__webglFramebuffer===void 0)T.setupRenderTarget(v);else if(me.__hasExternalTextures)T.rebindTextures(v,Ue.get(v.texture).__webglTexture,Ue.get(v.depthTexture).__webglTexture);else if(v.depthBuffer){let Ce=v.depthTexture;if(me.__boundDepthTexture!==Ce){if(Ce!==null&&Ue.has(Ce)&&(v.width!==Ce.image.width||v.height!==Ce.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");T.setupDepthRenderbuffer(v)}}let Re=v.texture;(Re.isData3DTexture||Re.isDataArrayTexture||Re.isCompressedArrayTexture)&&(se=!0);let Ve=Ue.get(v).__webglFramebuffer;v.isWebGLCubeRenderTarget?(Array.isArray(Ve[R])?O=Ve[R][U]:O=Ve[R],ne=!0):v.samples>0&&T.useMultisampledRTT(v)===!1?O=Ue.get(v).__webglMultisampledFramebuffer:Array.isArray(Ve)?O=Ve[U]:O=Ve,V.copy(v.viewport),j.copy(v.scissor),$=v.scissorTest}else V.copy(Ie).multiplyScalar(Z).floor(),j.copy(We).multiplyScalar(Z).floor(),$=Ye;if(ke.bindFramebuffer(B.FRAMEBUFFER,O)&&N&&ke.drawBuffers(v,O),ke.viewport(V),ke.scissor(j),ke.setScissorTest($),ne){let me=Ue.get(v.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+R,me.__webglTexture,U)}else if(se){let me=Ue.get(v.texture),Re=R||0;B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,me.__webglTexture,U||0,Re)}S=-1},this.readRenderTargetPixels=function(v,R,U,N,O,ne,se){if(!(v&&v.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let fe=Ue.get(v).__webglFramebuffer;if(v.isWebGLCubeRenderTarget&&se!==void 0&&(fe=fe[se]),fe){ke.bindFramebuffer(B.FRAMEBUFFER,fe);try{let me=v.texture,Re=me.format,Ve=me.type;if(!Ne.textureFormatReadable(Re)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ne.textureTypeReadable(Ve)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}R>=0&&R<=v.width-N&&U>=0&&U<=v.height-O&&B.readPixels(R,U,N,O,qe.convert(Re),qe.convert(Ve),ne)}finally{let me=G!==null?Ue.get(G).__webglFramebuffer:null;ke.bindFramebuffer(B.FRAMEBUFFER,me)}}},this.readRenderTargetPixelsAsync=async function(v,R,U,N,O,ne,se){if(!(v&&v.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let fe=Ue.get(v).__webglFramebuffer;if(v.isWebGLCubeRenderTarget&&se!==void 0&&(fe=fe[se]),fe){let me=v.texture,Re=me.format,Ve=me.type;if(!Ne.textureFormatReadable(Re))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ne.textureTypeReadable(Ve))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(R>=0&&R<=v.width-N&&U>=0&&U<=v.height-O){ke.bindFramebuffer(B.FRAMEBUFFER,fe);let Ce=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,Ce),B.bufferData(B.PIXEL_PACK_BUFFER,ne.byteLength,B.STREAM_READ),B.readPixels(R,U,N,O,qe.convert(Re),qe.convert(Ve),0);let st=G!==null?Ue.get(G).__webglFramebuffer:null;ke.bindFramebuffer(B.FRAMEBUFFER,st);let vt=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await Bp(B,vt,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,Ce),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,ne),B.deleteBuffer(Ce),B.deleteSync(vt),ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(v,R=null,U=0){v.isTexture!==!0&&(ha("WebGLRenderer: copyFramebufferToTexture function signature has changed."),R=arguments[0]||null,v=arguments[1]);let N=Math.pow(2,-U),O=Math.floor(v.image.width*N),ne=Math.floor(v.image.height*N),se=R!==null?R.x:0,fe=R!==null?R.y:0;T.setTexture2D(v,0),B.copyTexSubImage2D(B.TEXTURE_2D,U,0,0,se,fe,O,ne),ke.unbindTexture()},this.copyTextureToTexture=function(v,R,U=null,N=null,O=0){v.isTexture!==!0&&(ha("WebGLRenderer: copyTextureToTexture function signature has changed."),N=arguments[0]||null,v=arguments[1],R=arguments[2],O=arguments[3]||0,U=null);let ne,se,fe,me,Re,Ve,Ce,st,vt,xt=v.isCompressedTexture?v.mipmaps[O]:v.image;U!==null?(ne=U.max.x-U.min.x,se=U.max.y-U.min.y,fe=U.isBox3?U.max.z-U.min.z:1,me=U.min.x,Re=U.min.y,Ve=U.isBox3?U.min.z:0):(ne=xt.width,se=xt.height,fe=xt.depth||1,me=0,Re=0,Ve=0),N!==null?(Ce=N.x,st=N.y,vt=N.z):(Ce=0,st=0,vt=0);let Xt=qe.convert(R.format),ot=qe.convert(R.type),De;R.isData3DTexture?(T.setTexture3D(R,0),De=B.TEXTURE_3D):R.isDataArrayTexture||R.isCompressedArrayTexture?(T.setTexture2DArray(R,0),De=B.TEXTURE_2D_ARRAY):(T.setTexture2D(R,0),De=B.TEXTURE_2D),B.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,R.flipY),B.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),B.pixelStorei(B.UNPACK_ALIGNMENT,R.unpackAlignment);let In=B.getParameter(B.UNPACK_ROW_LENGTH),lt=B.getParameter(B.UNPACK_IMAGE_HEIGHT),gn=B.getParameter(B.UNPACK_SKIP_PIXELS),Ki=B.getParameter(B.UNPACK_SKIP_ROWS),tn=B.getParameter(B.UNPACK_SKIP_IMAGES);B.pixelStorei(B.UNPACK_ROW_LENGTH,xt.width),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,xt.height),B.pixelStorei(B.UNPACK_SKIP_PIXELS,me),B.pixelStorei(B.UNPACK_SKIP_ROWS,Re),B.pixelStorei(B.UNPACK_SKIP_IMAGES,Ve);let js=v.isDataArrayTexture||v.isData3DTexture,bt=R.isDataArrayTexture||R.isData3DTexture;if(v.isRenderTargetTexture||v.isDepthTexture){let En=Ue.get(v),Xs=Ue.get(R),dn=Ue.get(En.__renderTarget),ti=Ue.get(Xs.__renderTarget);ke.bindFramebuffer(B.READ_FRAMEBUFFER,dn.__webglFramebuffer),ke.bindFramebuffer(B.DRAW_FRAMEBUFFER,ti.__webglFramebuffer);for(let ni=0;ni<fe;ni++)js&&B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Ue.get(v).__webglTexture,O,Ve+ni),v.isDepthTexture?(bt&&B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Ue.get(R).__webglTexture,O,vt+ni),B.blitFramebuffer(me,Re,ne,se,Ce,st,ne,se,B.DEPTH_BUFFER_BIT,B.NEAREST)):bt?B.copyTexSubImage3D(De,O,Ce,st,vt+ni,me,Re,ne,se):B.copyTexSubImage2D(De,O,Ce,st,vt+ni,me,Re,ne,se);ke.bindFramebuffer(B.READ_FRAMEBUFFER,null),ke.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else bt?v.isDataTexture||v.isData3DTexture?B.texSubImage3D(De,O,Ce,st,vt,ne,se,fe,Xt,ot,xt.data):R.isCompressedArrayTexture?B.compressedTexSubImage3D(De,O,Ce,st,vt,ne,se,fe,Xt,xt.data):B.texSubImage3D(De,O,Ce,st,vt,ne,se,fe,Xt,ot,xt):v.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,O,Ce,st,ne,se,Xt,ot,xt.data):v.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,O,Ce,st,xt.width,xt.height,Xt,xt.data):B.texSubImage2D(B.TEXTURE_2D,O,Ce,st,ne,se,Xt,ot,xt);B.pixelStorei(B.UNPACK_ROW_LENGTH,In),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,lt),B.pixelStorei(B.UNPACK_SKIP_PIXELS,gn),B.pixelStorei(B.UNPACK_SKIP_ROWS,Ki),B.pixelStorei(B.UNPACK_SKIP_IMAGES,tn),O===0&&R.generateMipmaps&&B.generateMipmap(De),ke.unbindTexture()},this.copyTextureToTexture3D=function(v,R,U=null,N=null,O=0){return v.isTexture!==!0&&(ha("WebGLRenderer: copyTextureToTexture3D function signature has changed."),U=arguments[0]||null,N=arguments[1]||null,v=arguments[2],R=arguments[3],O=arguments[4]||0),ha('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(v,R,U,N,O)},this.initRenderTarget=function(v){Ue.get(v).__webglFramebuffer===void 0&&T.setupRenderTarget(v)},this.initTexture=function(v){v.isCubeTexture?T.setTextureCube(v,0):v.isData3DTexture?T.setTexture3D(v,0):v.isDataArrayTexture||v.isCompressedArrayTexture?T.setTexture2DArray(v,0):T.setTexture2D(v,0),ke.unbindTexture()},this.resetState=function(){C=0,I=0,G=null,ke.reset(),ht.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return qn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorspace=at._getDrawingBufferColorSpace(e),t.unpackColorSpace=at._getUnpackColorSpace()}};var Dr=class extends Ht{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Pn,this.environmentIntensity=1,this.environmentRotation=new Pn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Jl=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=kl,this.updateRanges=[],this.version=0,this.uuid=$n()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,i){e*=this.stride,i*=t.stride;for(let s=0,a=this.stride;s<a;s++)this.array[e+s]=t.array[i+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=$n()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(t,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=$n()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},qt=new k,kr=class n{constructor(e,t,i,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=i,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,i=this.data.count;t<i;t++)qt.fromBufferAttribute(this,t),qt.applyMatrix4(e),this.setXYZ(t,qt.x,qt.y,qt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)qt.fromBufferAttribute(this,t),qt.applyNormalMatrix(e),this.setXYZ(t,qt.x,qt.y,qt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)qt.fromBufferAttribute(this,t),qt.transformDirection(e),this.setXYZ(t,qt.x,qt.y,qt.z);return this}getComponent(e,t){let i=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(i=bn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=ct(i,this.array)),this.data.array[e*this.data.stride+this.offset+t]=i,this}setX(e,t){return this.normalized&&(t=ct(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=ct(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=ct(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=ct(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=bn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=bn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=bn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=bn(t,this.array)),t}setXY(e,t,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=ct(t,this.array),i=ct(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this}setXYZ(e,t,i,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=ct(t,this.array),i=ct(i,this.array),s=ct(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this}setXYZW(e,t,i,s,a){return e=e*this.data.stride+this.offset,this.normalized&&(t=ct(t,this.array),i=ct(i,this.array),s=ct(s,this.array),a=ct(a,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this.data.array[e+3]=a,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let i=0;i<this.count;i++){let s=i*this.data.stride+this.offset;for(let a=0;a<this.itemSize;a++)t.push(this.data.array[s+a])}return new cn(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new n(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let i=0;i<this.count;i++){let s=i*this.data.stride+this.offset;for(let a=0;a<this.itemSize;a++)t.push(this.data.array[s+a])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},zi=class extends gi{static get type(){return"SpriteMaterial"}constructor(e){super(),this.isSpriteMaterial=!0,this.color=new Qe(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},vs,ra=new k,_s=new k,xs=new k,bs=new we,oa=new we,zu=new Mt,hr=new k,la=new k,ur=new k,cu=new we,Ho=new we,hu=new we,ks=class extends Ht{constructor(e=new zi){if(super(),this.isSprite=!0,this.type="Sprite",vs===void 0){vs=new Kt;let t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new Jl(t,5);vs.setIndex([0,1,2,0,2,3]),vs.setAttribute("position",new kr(i,3,0,!1)),vs.setAttribute("uv",new kr(i,2,3,!1))}this.geometry=vs,this.material=e,this.center=new we(.5,.5)}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),_s.setFromMatrixScale(this.matrixWorld),zu.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),xs.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&_s.multiplyScalar(-xs.z);let i=this.material.rotation,s,a;i!==0&&(a=Math.cos(i),s=Math.sin(i));let r=this.center;dr(hr.set(-.5,-.5,0),xs,r,_s,s,a),dr(la.set(.5,-.5,0),xs,r,_s,s,a),dr(ur.set(.5,.5,0),xs,r,_s,s,a),cu.set(0,0),Ho.set(1,0),hu.set(1,1);let l=e.ray.intersectTriangle(hr,la,ur,!1,ra);if(l===null&&(dr(la.set(-.5,.5,0),xs,r,_s,s,a),Ho.set(0,1),l=e.ray.intersectTriangle(hr,ur,la,!1,ra),l===null))return;let c=e.ray.origin.distanceTo(ra);c<e.near||c>e.far||t.push({distance:c,point:ra.clone(),uv:di.getInterpolation(ra,hr,la,ur,cu,Ho,hu,new we),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}};function dr(n,e,t,i,s,a){bs.subVectors(n,t).addScalar(.5).multiply(i),s!==void 0?(oa.x=a*bs.x-s*bs.y,oa.y=s*bs.x+a*bs.y):oa.copy(bs),n.copy(e),n.x+=oa.x,n.y+=oa.y,n.applyMatrix4(zu)}var Or=class extends hn{constructor(e,t,i,s,a,r,l,c,h){super(e,t,i,s,a,r,l,c,h),this.isCanvasTexture=!0,this.needsUpdate=!0}},Sn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){let i=this.getUtoTmapping(e);return this.getPoint(i,t)}getPoints(e=5){let t=[];for(let i=0;i<=e;i++)t.push(this.getPoint(i/e));return t}getSpacedPoints(e=5){let t=[];for(let i=0;i<=e;i++)t.push(this.getPointAt(i/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],i,s=this.getPoint(0),a=0;t.push(0);for(let r=1;r<=e;r++)i=this.getPoint(r/e),a+=i.distanceTo(s),t.push(a),s=i;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){let i=this.getLengths(),s=0,a=i.length,r;t?r=t:r=e*i[a-1];let l=0,c=a-1,h;for(;l<=c;)if(s=Math.floor(l+(c-l)/2),h=i[s]-r,h<0)l=s+1;else if(h>0)c=s-1;else{c=s;break}if(s=c,i[s]===r)return s/(a-1);let u=i[s],f=i[s+1]-u,g=(r-u)/f;return(s+g)/(a-1)}getTangent(e,t){let s=e-1e-4,a=e+1e-4;s<0&&(s=0),a>1&&(a=1);let r=this.getPoint(s),l=this.getPoint(a),c=t||(r.isVector2?new we:new k);return c.copy(l).sub(r).normalize(),c}getTangentAt(e,t){let i=this.getUtoTmapping(e);return this.getTangent(i,t)}computeFrenetFrames(e,t){let i=new k,s=[],a=[],r=[],l=new k,c=new Mt;for(let g=0;g<=e;g++){let y=g/e;s[g]=this.getTangentAt(y,new k)}a[0]=new k,r[0]=new k;let h=Number.MAX_VALUE,u=Math.abs(s[0].x),d=Math.abs(s[0].y),f=Math.abs(s[0].z);u<=h&&(h=u,i.set(1,0,0)),d<=h&&(h=d,i.set(0,1,0)),f<=h&&i.set(0,0,1),l.crossVectors(s[0],i).normalize(),a[0].crossVectors(s[0],l),r[0].crossVectors(s[0],a[0]);for(let g=1;g<=e;g++){if(a[g]=a[g-1].clone(),r[g]=r[g-1].clone(),l.crossVectors(s[g-1],s[g]),l.length()>Number.EPSILON){l.normalize();let y=Math.acos(kt(s[g-1].dot(s[g]),-1,1));a[g].applyMatrix4(c.makeRotationAxis(l,y))}r[g].crossVectors(s[g],a[g])}if(t===!0){let g=Math.acos(kt(a[0].dot(a[e]),-1,1));g/=e,s[0].dot(l.crossVectors(a[0],a[e]))>0&&(g=-g);for(let y=1;y<=e;y++)a[y].applyMatrix4(c.makeRotationAxis(s[y],g*y)),r[y].crossVectors(s[y],a[y])}return{tangents:s,normals:a,binormals:r}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Ur=class extends Sn{constructor(e=0,t=0,i=1,s=1,a=0,r=Math.PI*2,l=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=i,this.yRadius=s,this.aStartAngle=a,this.aEndAngle=r,this.aClockwise=l,this.aRotation=c}getPoint(e,t=new we){let i=t,s=Math.PI*2,a=this.aEndAngle-this.aStartAngle,r=Math.abs(a)<Number.EPSILON;for(;a<0;)a+=s;for(;a>s;)a-=s;a<Number.EPSILON&&(r?a=0:a=s),this.aClockwise===!0&&!r&&(a===s?a=-s:a=a-s);let l=this.aStartAngle+e*a,c=this.aX+this.xRadius*Math.cos(l),h=this.aY+this.yRadius*Math.sin(l);if(this.aRotation!==0){let u=Math.cos(this.aRotation),d=Math.sin(this.aRotation),f=c-this.aX,g=h-this.aY;c=f*u-g*d+this.aX,h=f*d+g*u+this.aY}return i.set(c,h)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Kl=class extends Ur{constructor(e,t,i,s,a,r){super(e,t,i,i,s,a,r),this.isArcCurve=!0,this.type="ArcCurve"}};function Cc(){let n=0,e=0,t=0,i=0;function s(a,r,l,c){n=a,e=l,t=-3*a+3*r-2*l-c,i=2*a-2*r+l+c}return{initCatmullRom:function(a,r,l,c,h){s(r,l,h*(l-a),h*(c-r))},initNonuniformCatmullRom:function(a,r,l,c,h,u,d){let f=(r-a)/h-(l-a)/(h+u)+(l-r)/u,g=(l-r)/u-(c-r)/(u+d)+(c-l)/d;f*=u,g*=u,s(r,l,f,g)},calc:function(a){let r=a*a,l=r*a;return n+e*a+t*r+i*l}}}var pr=new k,Go=new Cc,Wo=new Cc,qo=new Cc,Hi=class extends Sn{constructor(e=[],t=!1,i="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=i,this.tension=s}getPoint(e,t=new k){let i=t,s=this.points,a=s.length,r=(a-(this.closed?0:1))*e,l=Math.floor(r),c=r-l;this.closed?l+=l>0?0:(Math.floor(Math.abs(l)/a)+1)*a:c===0&&l===a-1&&(l=a-2,c=1);let h,u;this.closed||l>0?h=s[(l-1)%a]:(pr.subVectors(s[0],s[1]).add(s[0]),h=pr);let d=s[l%a],f=s[(l+1)%a];if(this.closed||l+2<a?u=s[(l+2)%a]:(pr.subVectors(s[a-1],s[a-2]).add(s[a-1]),u=pr),this.curveType==="centripetal"||this.curveType==="chordal"){let g=this.curveType==="chordal"?.5:.25,y=Math.pow(h.distanceToSquared(d),g),_=Math.pow(d.distanceToSquared(f),g),m=Math.pow(f.distanceToSquared(u),g);_<1e-4&&(_=1),y<1e-4&&(y=_),m<1e-4&&(m=_),Go.initNonuniformCatmullRom(h.x,d.x,f.x,u.x,y,_,m),Wo.initNonuniformCatmullRom(h.y,d.y,f.y,u.y,y,_,m),qo.initNonuniformCatmullRom(h.z,d.z,f.z,u.z,y,_,m)}else this.curveType==="catmullrom"&&(Go.initCatmullRom(h.x,d.x,f.x,u.x,this.tension),Wo.initCatmullRom(h.y,d.y,f.y,u.y,this.tension),qo.initCatmullRom(h.z,d.z,f.z,u.z,this.tension));return i.set(Go.calc(c),Wo.calc(c),qo.calc(c)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){let s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let s=e.points[t];this.points.push(new k().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function uu(n,e,t,i,s){let a=(i-e)*.5,r=(s-t)*.5,l=n*n,c=n*l;return(2*t-2*i+a+r)*c+(-3*t+3*i-2*a-r)*l+a*n+t}function Ny(n,e){let t=1-n;return t*t*e}function Vy(n,e){return 2*(1-n)*n*e}function Fy(n,e){return n*n*e}function ma(n,e,t,i){return Ny(n,e)+Vy(n,t)+Fy(n,i)}function By(n,e){let t=1-n;return t*t*t*e}function zy(n,e){let t=1-n;return 3*t*t*n*e}function Hy(n,e){return 3*(1-n)*n*n*e}function Gy(n,e){return n*n*n*e}function ga(n,e,t,i,s){return By(n,e)+zy(n,t)+Hy(n,i)+Gy(n,s)}var Ql=class extends Sn{constructor(e=new we,t=new we,i=new we,s=new we){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=i,this.v3=s}getPoint(e,t=new we){let i=t,s=this.v0,a=this.v1,r=this.v2,l=this.v3;return i.set(ga(e,s.x,a.x,r.x,l.x),ga(e,s.y,a.y,r.y,l.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},ec=class extends Sn{constructor(e=new k,t=new k,i=new k,s=new k){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=i,this.v3=s}getPoint(e,t=new k){let i=t,s=this.v0,a=this.v1,r=this.v2,l=this.v3;return i.set(ga(e,s.x,a.x,r.x,l.x),ga(e,s.y,a.y,r.y,l.y),ga(e,s.z,a.z,r.z,l.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},tc=class extends Sn{constructor(e=new we,t=new we){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new we){let i=t;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new we){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},nc=class extends Sn{constructor(e=new k,t=new k){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new k){let i=t;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new k){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ic=class extends Sn{constructor(e=new we,t=new we,i=new we){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=i}getPoint(e,t=new we){let i=t,s=this.v0,a=this.v1,r=this.v2;return i.set(ma(e,s.x,a.x,r.x),ma(e,s.y,a.y,r.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Nr=class extends Sn{constructor(e=new k,t=new k,i=new k){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=i}getPoint(e,t=new k){let i=t,s=this.v0,a=this.v1,r=this.v2;return i.set(ma(e,s.x,a.x,r.x),ma(e,s.y,a.y,r.y),ma(e,s.z,a.z,r.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},sc=class extends Sn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new we){let i=t,s=this.points,a=(s.length-1)*e,r=Math.floor(a),l=a-r,c=s[r===0?r:r-1],h=s[r],u=s[r>s.length-2?s.length-1:r+1],d=s[r>s.length-3?s.length-1:r+2];return i.set(uu(l,c.x,h.x,u.x,d.x),uu(l,c.y,h.y,u.y,d.y)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let s=e.points[t];this.points.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){let s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let s=e.points[t];this.points.push(new we().fromArray(s))}return this}},Wy=Object.freeze({__proto__:null,ArcCurve:Kl,CatmullRomCurve3:Hi,CubicBezierCurve:Ql,CubicBezierCurve3:ec,EllipseCurve:Ur,LineCurve:tc,LineCurve3:nc,QuadraticBezierCurve:ic,QuadraticBezierCurve3:Nr,SplineCurve:sc});var Vr=class n extends Kt{constructor(e=1,t=1,i=1,s=32,a=1,r=!1,l=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:s,heightSegments:a,openEnded:r,thetaStart:l,thetaLength:c};let h=this;s=Math.floor(s),a=Math.floor(a);let u=[],d=[],f=[],g=[],y=0,_=[],m=i/2,p=0;E(),r===!1&&(e>0&&b(!0),t>0&&b(!1)),this.setIndex(u),this.setAttribute("position",new Et(d,3)),this.setAttribute("normal",new Et(f,3)),this.setAttribute("uv",new Et(g,2));function E(){let M=new k,z=new k,C=0,I=(t-e)/i;for(let G=0;G<=a;G++){let S=[],w=G/a,V=w*(t-e)+e;for(let j=0;j<=s;j++){let $=j/s,J=$*c+l,ae=Math.sin(J),Y=Math.cos(J);z.x=V*ae,z.y=-w*i+m,z.z=V*Y,d.push(z.x,z.y,z.z),M.set(ae,I,Y).normalize(),f.push(M.x,M.y,M.z),g.push($,1-w),S.push(y++)}_.push(S)}for(let G=0;G<s;G++)for(let S=0;S<a;S++){let w=_[S][G],V=_[S+1][G],j=_[S+1][G+1],$=_[S][G+1];(e>0||S!==0)&&(u.push(w,V,$),C+=3),(t>0||S!==a-1)&&(u.push(V,j,$),C+=3)}h.addGroup(p,C,0),p+=C}function b(M){let z=y,C=new we,I=new k,G=0,S=M===!0?e:t,w=M===!0?1:-1;for(let j=1;j<=s;j++)d.push(0,m*w,0),f.push(0,w,0),g.push(.5,.5),y++;let V=y;for(let j=0;j<=s;j++){let J=j/s*c+l,ae=Math.cos(J),Y=Math.sin(J);I.x=S*Y,I.y=m*w,I.z=S*ae,d.push(I.x,I.y,I.z),f.push(0,w,0),C.x=ae*.5+.5,C.y=Y*.5*w+.5,g.push(C.x,C.y),y++}for(let j=0;j<s;j++){let $=z+j,J=V+j;M===!0?u.push(J,J+1,$):u.push(J+1,J,$),G+=3}h.addGroup(p,G,M===!0?1:2),p+=G}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var Ma=class n extends Kt{constructor(e=1,t=32,i=16,s=0,a=Math.PI*2,r=0,l=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:s,phiLength:a,thetaStart:r,thetaLength:l},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));let c=Math.min(r+l,Math.PI),h=0,u=[],d=new k,f=new k,g=[],y=[],_=[],m=[];for(let p=0;p<=i;p++){let E=[],b=p/i,M=0;p===0&&r===0?M=.5/t:p===i&&c===Math.PI&&(M=-.5/t);for(let z=0;z<=t;z++){let C=z/t;d.x=-e*Math.cos(s+C*a)*Math.sin(r+b*l),d.y=e*Math.cos(r+b*l),d.z=e*Math.sin(s+C*a)*Math.sin(r+b*l),y.push(d.x,d.y,d.z),f.copy(d).normalize(),_.push(f.x,f.y,f.z),m.push(C+M,1-b),E.push(h++)}u.push(E)}for(let p=0;p<i;p++)for(let E=0;E<t;E++){let b=u[p][E+1],M=u[p][E],z=u[p+1][E],C=u[p+1][E+1];(p!==0||r>0)&&g.push(b,M,C),(p!==i-1||c<Math.PI)&&g.push(M,z,C)}this.setIndex(g),this.setAttribute("position",new Et(y,3)),this.setAttribute("normal",new Et(_,3)),this.setAttribute("uv",new Et(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var wa=class n extends Kt{constructor(e=1,t=.4,i=12,s=48,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:i,tubularSegments:s,arc:a},i=Math.floor(i),s=Math.floor(s);let r=[],l=[],c=[],h=[],u=new k,d=new k,f=new k;for(let g=0;g<=i;g++)for(let y=0;y<=s;y++){let _=y/s*a,m=g/i*Math.PI*2;d.x=(e+t*Math.cos(m))*Math.cos(_),d.y=(e+t*Math.cos(m))*Math.sin(_),d.z=t*Math.sin(m),l.push(d.x,d.y,d.z),u.x=e*Math.cos(_),u.y=e*Math.sin(_),f.subVectors(d,u).normalize(),c.push(f.x,f.y,f.z),h.push(y/s),h.push(g/i)}for(let g=1;g<=i;g++)for(let y=1;y<=s;y++){let _=(s+1)*g+y-1,m=(s+1)*(g-1)+y-1,p=(s+1)*(g-1)+y,E=(s+1)*g+y;r.push(_,m,E),r.push(m,p,E)}this.setIndex(r),this.setAttribute("position",new Et(l,3)),this.setAttribute("normal",new Et(c,3)),this.setAttribute("uv",new Et(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}};var Sa=class n extends Kt{constructor(e=new Nr(new k(-1,-1,0),new k(-1,1,0),new k(1,1,0)),t=64,i=1,s=8,a=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:i,radialSegments:s,closed:a};let r=e.computeFrenetFrames(t,a);this.tangents=r.tangents,this.normals=r.normals,this.binormals=r.binormals;let l=new k,c=new k,h=new we,u=new k,d=[],f=[],g=[],y=[];_(),this.setIndex(y),this.setAttribute("position",new Et(d,3)),this.setAttribute("normal",new Et(f,3)),this.setAttribute("uv",new Et(g,2));function _(){for(let b=0;b<t;b++)m(b);m(a===!1?t:0),E(),p()}function m(b){u=e.getPointAt(b/t,u);let M=r.normals[b],z=r.binormals[b];for(let C=0;C<=s;C++){let I=C/s*Math.PI*2,G=Math.sin(I),S=-Math.cos(I);c.x=S*M.x+G*z.x,c.y=S*M.y+G*z.y,c.z=S*M.z+G*z.z,c.normalize(),f.push(c.x,c.y,c.z),l.x=u.x+i*c.x,l.y=u.y+i*c.y,l.z=u.z+i*c.z,d.push(l.x,l.y,l.z)}}function p(){for(let b=1;b<=t;b++)for(let M=1;M<=s;M++){let z=(s+1)*(b-1)+(M-1),C=(s+1)*b+(M-1),I=(s+1)*b+M,G=(s+1)*(b-1)+M;y.push(z,C,G),y.push(C,I,G)}}function E(){for(let b=0;b<=t;b++)for(let M=0;M<=s;M++)h.x=b/t,h.y=M/s,g.push(h.x,h.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new n(new Wy[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}};var Aa=class extends gi{static get type(){return"MeshStandardMaterial"}constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new Qe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Qe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Pu,this.normalScale=new we(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}};function fr(n,e,t){return!n||!t&&n.constructor===e?n:typeof e.BYTES_PER_ELEMENT=="number"?new e(n):Array.prototype.slice.call(n)}function qy(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}var Os=class{constructor(e,t,i,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(i),this.sampleValues=t,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,i=this._cachedIndex,s=t[i],a=t[i-1];n:{e:{let r;t:{i:if(!(e<s)){for(let l=i+2;;){if(s===void 0){if(e<a)break i;return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===l)break;if(a=s,s=t[++i],e<s)break e}r=t.length;break t}if(!(e>=a)){let l=t[1];e<l&&(i=2,a=l);for(let c=i-2;;){if(a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===c)break;if(s=a,a=t[--i-1],e>=a)break e}r=i,i=0;break t}break n}for(;i<r;){let l=i+r>>>1;e<t[l]?r=l:i=l+1}if(s=t[i],a=t[i-1],a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,a,s)}return this.interpolate_(i,a,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,i=this.sampleValues,s=this.valueSize,a=e*s;for(let r=0;r!==s;++r)t[r]=i[a+r];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},ac=class extends Os{constructor(e,t,i,s){super(e,t,i,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:ph,endingEnd:ph}}intervalChanged_(e,t,i){let s=this.parameterPositions,a=e-2,r=e+1,l=s[a],c=s[r];if(l===void 0)switch(this.getSettings_().endingStart){case fh:a=e,l=2*t-i;break;case mh:a=s.length-2,l=t+s[a]-s[a+1];break;default:a=e,l=i}if(c===void 0)switch(this.getSettings_().endingEnd){case fh:r=e,c=2*i-t;break;case mh:r=1,c=i+s[1]-s[0];break;default:r=e-1,c=t}let h=(i-t)*.5,u=this.valueSize;this._weightPrev=h/(t-l),this._weightNext=h/(c-i),this._offsetPrev=a*u,this._offsetNext=r*u}interpolate_(e,t,i,s){let a=this.resultBuffer,r=this.sampleValues,l=this.valueSize,c=e*l,h=c-l,u=this._offsetPrev,d=this._offsetNext,f=this._weightPrev,g=this._weightNext,y=(i-t)/(s-t),_=y*y,m=_*y,p=-f*m+2*f*_-f*y,E=(1+f)*m+(-1.5-2*f)*_+(-.5+f)*y+1,b=(-1-g)*m+(1.5+g)*_+.5*y,M=g*m-g*_;for(let z=0;z!==l;++z)a[z]=p*r[u+z]+E*r[h+z]+b*r[c+z]+M*r[d+z];return a}},rc=class extends Os{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){let a=this.resultBuffer,r=this.sampleValues,l=this.valueSize,c=e*l,h=c-l,u=(i-t)/(s-t),d=1-u;for(let f=0;f!==l;++f)a[f]=r[h+f]*d+r[c+f]*u;return a}},oc=class extends Os{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e){return this.copySampleValue_(e-1)}},An=class{constructor(e,t,i,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=fr(t,this.TimeBufferType),this.values=fr(i,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,i;if(t.toJSON!==this.toJSON)i=t.toJSON(e);else{i={name:e.name,times:fr(e.times,Array),values:fr(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(i.interpolation=s)}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new oc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new rc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new ac(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case xr:t=this.InterpolantFactoryMethodDiscrete;break;case Dl:t=this.InterpolantFactoryMethodLinear;break;case mo:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return console.warn("THREE.KeyframeTrack:",i),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return xr;case this.InterpolantFactoryMethodLinear:return Dl;case this.InterpolantFactoryMethodSmooth:return mo}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]*=e}return this}trim(e,t){let i=this.times,s=i.length,a=0,r=s-1;for(;a!==s&&i[a]<e;)++a;for(;r!==-1&&i[r]>t;)--r;if(++r,a!==0||r!==s){a>=r&&(r=Math.max(r,1),a=r-1);let l=this.getValueSize();this.times=i.slice(a,r),this.values=this.values.slice(a*l,r*l)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let i=this.times,s=this.values,a=i.length;a===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let r=null;for(let l=0;l!==a;l++){let c=i[l];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,l,c),e=!1;break}if(r!==null&&r>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,l,c,r),e=!1;break}r=c}if(s!==void 0&&qy(s))for(let l=0,c=s.length;l!==c;++l){let h=s[l];if(isNaN(h)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,l,h),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),i=this.getValueSize(),s=this.getInterpolation()===mo,a=e.length-1,r=1;for(let l=1;l<a;++l){let c=!1,h=e[l],u=e[l+1];if(h!==u&&(l!==1||h!==e[0]))if(s)c=!0;else{let d=l*i,f=d-i,g=d+i;for(let y=0;y!==i;++y){let _=t[d+y];if(_!==t[f+y]||_!==t[g+y]){c=!0;break}}}if(c){if(l!==r){e[r]=e[l];let d=l*i,f=r*i;for(let g=0;g!==i;++g)t[f+g]=t[d+g]}++r}}if(a>0){e[r]=e[a];for(let l=a*i,c=r*i,h=0;h!==i;++h)t[c+h]=t[l+h];++r}return r!==e.length?(this.times=e.slice(0,r),this.values=t.slice(0,r*i)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),i=this.constructor,s=new i(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};An.prototype.TimeBufferType=Float32Array;An.prototype.ValueBufferType=Float32Array;An.prototype.DefaultInterpolation=Dl;var Gi=class extends An{constructor(e,t,i){super(e,t,i)}};Gi.prototype.ValueTypeName="bool";Gi.prototype.ValueBufferType=Array;Gi.prototype.DefaultInterpolation=xr;Gi.prototype.InterpolantFactoryMethodLinear=void 0;Gi.prototype.InterpolantFactoryMethodSmooth=void 0;var lc=class extends An{};lc.prototype.ValueTypeName="color";var cc=class extends An{};cc.prototype.ValueTypeName="number";var hc=class extends Os{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){let a=this.resultBuffer,r=this.sampleValues,l=this.valueSize,c=(i-t)/(s-t),h=e*l;for(let u=h+l;h!==u;h+=4)un.slerpFlat(a,0,r,h-l,r,h,c);return a}},Fr=class extends An{InterpolantFactoryMethodLinear(e){return new hc(this.times,this.values,this.getValueSize(),e)}};Fr.prototype.ValueTypeName="quaternion";Fr.prototype.InterpolantFactoryMethodSmooth=void 0;var Wi=class extends An{constructor(e,t,i){super(e,t,i)}};Wi.prototype.ValueTypeName="string";Wi.prototype.ValueBufferType=Array;Wi.prototype.DefaultInterpolation=xr;Wi.prototype.InterpolantFactoryMethodLinear=void 0;Wi.prototype.InterpolantFactoryMethodSmooth=void 0;var uc=class extends An{};uc.prototype.ValueTypeName="vector";var dc=class{constructor(e,t,i){let s=this,a=!1,r=0,l=0,c,h=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this.itemStart=function(u){l++,a===!1&&s.onStart!==void 0&&s.onStart(u,r,l),a=!0},this.itemEnd=function(u){r++,s.onProgress!==void 0&&s.onProgress(u,r,l),r===l&&(a=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(u){s.onError!==void 0&&s.onError(u)},this.resolveURL=function(u){return c?c(u):u},this.setURLModifier=function(u){return c=u,this},this.addHandler=function(u,d){return h.push(u,d),this},this.removeHandler=function(u){let d=h.indexOf(u);return d!==-1&&h.splice(d,2),this},this.getHandler=function(u){for(let d=0,f=h.length;d<f;d+=2){let g=h[d],y=h[d+1];if(g.global&&(g.lastIndex=0),g.test(u))return y}return null}}},$y=new dc,pc=class{constructor(e){this.manager=e!==void 0?e:$y,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let i=this;return new Promise(function(s,a){i.load(e,s,t,a)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}};pc.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ta=class extends Ht{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Qe(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}},Br=class extends Ta{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Ht.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Qe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}},$o=new Mt,du=new k,pu=new k,zr=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new we(512,512),this.map=null,this.mapPass=null,this.matrix=new Mt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ba,this._frameExtents=new we(1,1),this._viewportCount=1,this._viewports=[new pt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,i=this.matrix;du.setFromMatrixPosition(e.matrixWorld),t.position.copy(du),pu.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(pu),t.updateMatrixWorld(),$o.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix($o),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply($o)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}};var fu=new Mt,ca=new k,jo=new k,fc=class extends zr{constructor(){super(new zt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new we(4,2),this._viewportCount=6,this._viewports=[new pt(2,1,1,1),new pt(0,1,1,1),new pt(3,1,1,1),new pt(1,1,1,1),new pt(3,0,1,1),new pt(1,0,1,1)],this._cubeDirections=[new k(1,0,0),new k(-1,0,0),new k(0,0,1),new k(0,0,-1),new k(0,1,0),new k(0,-1,0)],this._cubeUps=[new k(0,1,0),new k(0,1,0),new k(0,1,0),new k(0,1,0),new k(0,0,1),new k(0,0,-1)]}updateMatrices(e,t=0){let i=this.camera,s=this.matrix,a=e.distance||i.far;a!==i.far&&(i.far=a,i.updateProjectionMatrix()),ca.setFromMatrixPosition(e.matrixWorld),i.position.copy(ca),jo.copy(i.position),jo.add(this._cubeDirections[t]),i.up.copy(this._cubeUps[t]),i.lookAt(jo),i.updateMatrixWorld(),s.makeTranslation(-ca.x,-ca.y,-ca.z),fu.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._frustum.setFromProjectionMatrix(fu)}},Hr=class extends Ta{constructor(e,t,i=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=s,this.shadow=new fc}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}},mc=class extends zr{constructor(){super(new Rr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ea=class extends Ta{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ht.DEFAULT_UP),this.updateMatrix(),this.target=new Ht,this.shadow=new mc}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}};var Rc="\\[\\]\\.:\\/",jy=new RegExp("["+Rc+"]","g"),Pc="[^"+Rc+"]",Xy="[^"+Rc.replace("\\.","")+"]",Yy=/((?:WC+[\/:])*)/.source.replace("WC",Pc),Zy=/(WCOD+)?/.source.replace("WCOD",Xy),Jy=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Pc),Ky=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Pc),Qy=new RegExp("^"+Yy+Zy+Jy+Ky+"$"),ev=["material","materials","bones","map"],gc=class{constructor(e,t,i){let s=i||St.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let i=this._targetGroup.nCachedObjects_,s=this._bindings[i];s!==void 0&&s.getValue(e,t)}setValue(e,t){let i=this._bindings;for(let s=this._targetGroup.nCachedObjects_,a=i.length;s!==a;++s)i[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}},St=class n{constructor(e,t,i){this.path=t,this.parsedPath=i||n.parseTrackName(t),this.node=n.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,i){return e&&e.isAnimationObjectGroup?new n.Composite(e,t,i):new n(e,t,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(jy,"")}static parseTrackName(e){let t=Qy.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let i={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=i.nodeName&&i.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let a=i.nodeName.substring(s+1);ev.indexOf(a)!==-1&&(i.nodeName=i.nodeName.substring(0,s),i.objectName=a)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let i=e.skeleton.getBoneByName(t);if(i!==void 0)return i}if(e.children){let i=function(a){for(let r=0;r<a.length;r++){let l=a[r];if(l.name===t||l.uuid===t)return l;let c=i(l.children);if(c)return c}return null},s=i(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)e[t++]=i[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)i[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)i[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)i[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,i=t.objectName,s=t.propertyName,a=t.propertyIndex;if(e||(e=n.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let h=t.objectIndex;switch(i){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===h){h=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(h!==void 0){if(e[h]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[h]}}let r=e[s];if(r===void 0){let h=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+h+"."+s+" but it wasn't found.",e);return}let l=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?l=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(l=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[a]!==void 0&&(a=e.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=r,this.propertyIndex=a}else r.fromArray!==void 0&&r.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=r):Array.isArray(r)?(c=this.BindingType.EntireArray,this.resolvedProperty=r):this.propertyName=s;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][l]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};St.Composite=gc;St.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};St.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};St.prototype.GetterByBindingType=[St.prototype._getValue_direct,St.prototype._getValue_array,St.prototype._getValue_arrayElement,St.prototype._getValue_toArray];St.prototype.SetterByBindingTypeAndVersioning=[[St.prototype._setValue_direct,St.prototype._setValue_direct_setNeedsUpdate,St.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[St.prototype._setValue_array,St.prototype._setValue_array_setNeedsUpdate,St.prototype._setValue_array_setMatrixWorldNeedsUpdate],[St.prototype._setValue_arrayElement,St.prototype._setValue_arrayElement_setNeedsUpdate,St.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[St.prototype._setValue_fromArray,St.prototype._setValue_fromArray_setNeedsUpdate,St.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var s_=new Float32Array(1);var mu=new Mt,Gr=class{constructor(e,t,i=0,s=1/0){this.ray=new Is(e,t),this.near=i,this.far=s,this.camera=null,this.layers=new xa,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return mu.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(mu),this}intersectObject(e,t=!0,i=[]){return yc(e,this,i,t),i.sort(gu),i}intersectObjects(e,t=!0,i=[]){for(let s=0,a=e.length;s<a;s++)yc(e[s],this,i,t);return i.sort(gu),i}};function gu(n,e){return n.distance-e.distance}function yc(n,e,t,i){let s=!0;if(n.layers.test(e.layers)&&n.raycast(e,t)===!1&&(s=!1),s===!0&&i===!0){let a=n.children;for(let r=0,l=a.length;r<l;r++)yc(a[r],e,t,!0)}}var Ca=class{constructor(e=1,t=0,i=0){return this.radius=e,this.phi=t,this.theta=i,this}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(kt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Wr=class extends Yn{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(){}disconnect(){}dispose(){}update(){}};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:vc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=vc);var Hu={type:"change"},Ic={type:"start"},Wu={type:"end"},Xr=new Is,Gu=new ln,nv=Math.cos(70*Iu.DEG2RAD),Lt=new k,Qt=2*Math.PI,ft={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Lc=1e-6,Yr=class extends Wr{constructor(e,t=null){super(e,t),this.state=ft.NONE,this.enabled=!0,this.target=new k,this.cursor=new k,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:qi.ROTATE,MIDDLE:qi.DOLLY,RIGHT:qi.PAN},this.touches={ONE:$i.ROTATE,TWO:$i.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new k,this._lastQuaternion=new un,this._lastTargetPosition=new k,this._quat=new un().setFromUnitVectors(e.up,new k(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Ca,this._sphericalDelta=new Ca,this._scale=1,this._panOffset=new k,this._rotateStart=new we,this._rotateEnd=new we,this._rotateDelta=new we,this._panStart=new we,this._panEnd=new we,this._panDelta=new we,this._dollyStart=new we,this._dollyEnd=new we,this._dollyDelta=new we,this._dollyDirection=new k,this._mouse=new we,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=sv.bind(this),this._onPointerDown=iv.bind(this),this._onPointerUp=av.bind(this),this._onContextMenu=dv.bind(this),this._onMouseWheel=lv.bind(this),this._onKeyDown=cv.bind(this),this._onTouchStart=hv.bind(this),this._onTouchMove=uv.bind(this),this._onMouseDown=rv.bind(this),this._onMouseMove=ov.bind(this),this._interceptControlDown=pv.bind(this),this._interceptControlUp=fv.bind(this),this.domElement!==null&&this.connect(),this.update()}connect(){this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Hu),this.update(),this.state=ft.NONE}update(e=null){let t=this.object.position;Lt.copy(t).sub(this.target),Lt.applyQuaternion(this._quat),this._spherical.setFromVector3(Lt),this.autoRotate&&this.state===ft.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(i)&&isFinite(s)&&(i<-Math.PI?i+=Qt:i>Math.PI&&(i-=Qt),s<-Math.PI?s+=Qt:s>Math.PI&&(s-=Qt),i<=s?this._spherical.theta=Math.max(i,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+s)/2?Math.max(i,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let a=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let r=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),a=r!=this._spherical.radius}if(Lt.setFromSpherical(this._spherical),Lt.applyQuaternion(this._quatInverse),t.copy(this.target).add(Lt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let r=null;if(this.object.isPerspectiveCamera){let l=Lt.length();r=this._clampDistance(l*this._scale);let c=l-r;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),a=!!c}else if(this.object.isOrthographicCamera){let l=new k(this._mouse.x,this._mouse.y,0);l.unproject(this.object);let c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),a=c!==this.object.zoom;let h=new k(this._mouse.x,this._mouse.y,0);h.unproject(this.object),this.object.position.sub(h).add(l),this.object.updateMatrixWorld(),r=Lt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;r!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(r).add(this.object.position):(Xr.origin.copy(this.object.position),Xr.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Xr.direction))<nv?this.object.lookAt(this.target):(Gu.setFromNormalAndCoplanarPoint(this.object.up,this.target),Xr.intersectPlane(Gu,this.target))))}else if(this.object.isOrthographicCamera){let r=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),r!==this.object.zoom&&(this.object.updateProjectionMatrix(),a=!0)}return this._scale=1,this._performCursorZoom=!1,a||this._lastPosition.distanceToSquared(this.object.position)>Lc||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Lc||this._lastTargetPosition.distanceToSquared(this.target)>Lc?(this.dispatchEvent(Hu),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?Qt/60*this.autoRotateSpeed*e:Qt/60/60*this.autoRotateSpeed}_getZoomScale(e){let t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Lt.setFromMatrixColumn(t,0),Lt.multiplyScalar(-e),this._panOffset.add(Lt)}_panUp(e,t){this.screenSpacePanning===!0?Lt.setFromMatrixColumn(t,1):(Lt.setFromMatrixColumn(t,0),Lt.crossVectors(this.object.up,Lt)),Lt.multiplyScalar(e),this._panOffset.add(Lt)}_pan(e,t){let i=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;Lt.copy(s).sub(this.target);let a=Lt.length();a*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*a/i.clientHeight,this.object.matrix),this._panUp(2*t*a/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let i=this.domElement.getBoundingClientRect(),s=e-i.left,a=t-i.top,r=i.width,l=i.height;this._mouse.x=s/r*2-1,this._mouse.y=-(a/l)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Qt*this._rotateDelta.x/t.clientHeight),this._rotateUp(Qt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateUp(Qt*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateUp(-Qt*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateLeft(Qt*this.rotateSpeed/this.domElement.clientHeight):this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateLeft(-Qt*this.rotateSpeed/this.domElement.clientHeight):this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._rotateStart.set(i,s)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panStart.set(i,s)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),i=e.pageX-t.x,s=e.pageY-t.y,a=Math.sqrt(i*i+s*s);this._dollyStart.set(0,a)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let i=this._getSecondPointerPosition(e),s=.5*(e.pageX+i.x),a=.5*(e.pageY+i.y);this._rotateEnd.set(s,a)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Qt*this._rotateDelta.x/t.clientHeight),this._rotateUp(Qt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panEnd.set(i,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),i=e.pageX-t.x,s=e.pageY-t.y,a=Math.sqrt(i*i+s*s);this._dollyEnd.set(0,a),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let r=(e.pageX+t.x)*.5,l=(e.pageY+t.y)*.5;this._updateZoomParameters(r,l)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new we,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}};function iv(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n)))}function sv(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function av(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Wu),this.state=ft.NONE;break;case 1:let e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function rv(n){let e;switch(n.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case qi.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=ft.DOLLY;break;case qi.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=ft.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=ft.ROTATE}break;case qi.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=ft.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=ft.PAN}break;default:this.state=ft.NONE}this.state!==ft.NONE&&this.dispatchEvent(Ic)}function ov(n){switch(this.state){case ft.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case ft.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case ft.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function lv(n){this.enabled===!1||this.enableZoom===!1||this.state!==ft.NONE||(n.preventDefault(),this.dispatchEvent(Ic),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(Wu))}function cv(n){this.enabled===!1||this.enablePan===!1||this._handleKeyDown(n)}function hv(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case $i.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(n),this.state=ft.TOUCH_ROTATE;break;case $i.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(n),this.state=ft.TOUCH_PAN;break;default:this.state=ft.NONE}break;case 2:switch(this.touches.TWO){case $i.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=ft.TOUCH_DOLLY_PAN;break;case $i.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=ft.TOUCH_DOLLY_ROTATE;break;default:this.state=ft.NONE}break;default:this.state=ft.NONE}this.state!==ft.NONE&&this.dispatchEvent(Ic)}function uv(n){switch(this._trackPointer(n),this.state){case ft.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case ft.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case ft.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case ft.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=ft.NONE}}function dv(n){this.enabled!==!1&&n.preventDefault()}function pv(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function fv(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var Oe=(n,e,t)=>new k(n,e,t),Dc=Oe(0,1,0),kc={OFF:-100,VDC:-50,VAC:0,OHM:50,A:100},Pa=-.75,Zr={A:-1.2,mA:-.4,COM:.4,V:1.2},Vs=-2.7,mv={red:14037291,black:1909029},Fs={home:{black:Oe(-3.45,.14,1.5),red:Oe(-2.75,.14,1.5),dir:Oe(0,.05,1)},center:{black:Oe(.2,.14,1.1),red:Oe(.2,.14,1.9),dir:Oe(1,.05,0)},right:{black:Oe(6.2,.14,1.1),red:Oe(6.2,.14,1.9),dir:Oe(1,.05,0)}},Oc={black:Oe(-6.6,.17,4.5),red:Oe(-5.2,.17,4.5)},qu={meter:{t:[-5.9,1.7,1.2],p:[-5.9,8.6,10.2]},aa:{t:[.5,.3,2.7],p:[.5,6.4,10.6]},b9:{t:[2.5,.8,2.8],p:[2.5,6.8,10.8]},lamp9:{t:[1.2,.2,-.5],p:[1.2,10.2,7.6]},panel24:{t:[7.9,.2,-.5],p:[7.9,10.2,7.6]},ac12:{t:[7.5,.5,2.6],p:[7.5,6.8,10.6]}};function $u(n,e,t,i,s,a){n.beginPath(),n.moveTo(e+a,t),n.arcTo(e+i,t,e+i,t+s,a),n.arcTo(e+i,t+s,e,t+s,a),n.arcTo(e,t+s,e,t,a),n.arcTo(e,t,e+i,t,a),n.closePath()}function ju(n,e,t,i,s,a="center"){let r=e.split("\u2393"),l=s*.62,c=0;r.forEach((u,d)=>{c+=n.measureText(u).width,d<r.length-1&&(c+=l)});let h=a==="center"?t-c/2:a==="right"?t-c:t;return n.textAlign="left",r.forEach((u,d)=>{if(n.fillText(u,h,i),h+=n.measureText(u).width,d<r.length-1){let f=Math.max(2,s*.09);n.save(),n.lineWidth=f,n.strokeStyle=n.fillStyle,n.lineCap="butt";let g=i-s*.5,y=i-s*.22,_=h+s*.06,m=h+l-s*.06;n.beginPath(),n.moveTo(_,g),n.lineTo(m,g),n.stroke();let p=(m-_)/5;for(let E=0;E<3;E++)n.beginPath(),n.moveTo(_+E*2*p,y),n.lineTo(_+E*2*p+p,y),n.stroke();n.restore(),h+=l}}),c}function Xu(n,{px:e=56,bg:t="#10222c",fg:i="#ffffff",pad:s=20,radius:a=16,border:r=null,weight:l=700}={}){let c=document.createElement("canvas"),h=c.getContext("2d"),u=`${l} ${e}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;h.font=u;let d=n.split("\u2393"),f=d.reduce((g,y)=>g+h.measureText(y).width,0)+(d.length-1)*e*.62;return c.width=Math.ceil(f+s*2),c.height=Math.ceil(e*1.45),h=c.getContext("2d"),h.font=u,t&&(h.fillStyle=t,$u(h,0,0,c.width,c.height,a),h.fill()),r&&(h.strokeStyle=r,h.lineWidth=6,$u(h,3,3,c.width-6,c.height-6,a),h.stroke()),h.fillStyle=i,h.textBaseline="alphabetic",ju(h,n,c.width/2,c.height/2+e*.34,e),c}function La(n){let e=new Or(n);return e.colorSpace=Zt,e.anisotropy=4,e}function Bs(n,e={}){let t=new zi({transparent:!0,depthTest:!1,depthWrite:!1}),i=new ks(t);return i.renderOrder=20,i.userData.h=e.h||.42,i.userData.set=(s,a={})=>{let r=s+JSON.stringify(a);if(i.userData.key===r)return;i.userData.key=r;let l=Xu(s,{...e,...a});t.map&&t.map.dispose(),t.map=La(l),t.needsUpdate=!0,i.scale.set(i.userData.h*l.width/l.height,i.userData.h,1)},i.userData.set(n),i}function ji(n,e,t={}){let i=new Jn({transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}),s=new Ot(new Bi(1,1),i);return s.userData.set=a=>{if(s.userData.key===a)return;s.userData.key=a;let r=Xu(a,{bg:null,fg:"#13242e",pad:6,...t});i.map&&i.map.dispose(),i.map=La(r),i.needsUpdate=!0,s.scale.set(e*r.width/r.height,e,1)},s.userData.set(n),s}function Yu(n,e,t){let i;try{i=new Ir({antialias:!0,powerPreference:"high-performance"})}catch{return null}i.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),i.shadowMap.enabled=!0,i.shadowMap.type=_c;let s=i.domElement;s.className="stage-canvas",s.setAttribute("aria-label",L(P.stageHelp)),n.prepend(s);let a=new Dr;a.background=new Qe(15265522);let r=new zt(38,1,.1,200),l=new Yr(r,s);l.enableDamping=!0,l.dampingFactor=.12,l.minDistance=3,l.maxDistance=40,l.maxPolarAngle=Math.PI*.47,l.screenSpacePanning=!1,a.add(new Br(16777215,12109004,1.5));let c=new Ea(16777215,2.2);c.position.set(5,16,9),c.castShadow=!0,c.shadow.mapSize.set(2048,2048),Object.assign(c.shadow.camera,{left:-14,right:14,top:10,bottom:-10,near:1,far:40}),c.shadow.bias=-5e-4,a.add(c);let h=new Ea(16777215,.6);h.position.set(-8,6,10),a.add(h);let u=[],d=(D,W={})=>new Aa({color:D,roughness:.6,metalness:.05,...W}),f=new Jn({transparent:!0,opacity:0,depthWrite:!1}),g=d(13214796,{metalness:.7,roughness:.35}),y=d(14278371,{metalness:.9,roughness:.25}),_=d(12088115,{metalness:.5,roughness:.45});function m(D,W,H,oe,le){let v=new Ot(D,W);return oe&&v.position.set(oe[0],oe[1],oe[2]),W!==f&&(v.castShadow=!0,v.receiveShadow=!0),le&&(v.userData.part=le,u.push(v)),H.add(v),v}let p=(D,W,H)=>new Fi(D,W,H),E=(D,W,H,oe=24)=>new Vr(D,W,H,oe);m(p(22.4,.5,11.6),d(14207406,{roughness:.8}),a,[1.3,-.26,1.2],{type:"bench"}),m(p(21.6,.03,10.8),d(11123137,{roughness:.95}),a,[1.3,0,1.2],{type:"bench"});let b={},M=[],z={},C=new Ut;C.position.set(-5.9,2.3,.6),C.rotation.x=-.96,a.add(C),m(p(3,1.9,.5),d(4871520),a,[-5.9,.95,-1.15]),m(p(3.7,6.7,.9),d(15774761,{roughness:.5}),C,[0,0,0],{type:"meter"}),m(p(3.25,6.25,.06),d(2042675),C,[0,0,.46],{type:"meter"}),m(p(2.95,1.5,.06),d(725011),C,[0,2.3,.5],{type:"display"});let I=document.createElement("canvas");I.width=660,I.height=312;let G=La(I),S=m(new Bi(2.75,1.3),new Jn({map:G}),C,[0,2.3,.535],{type:"display"});S.castShadow=!1;let w=(D,W,H,oe,le,v)=>{let R=ji(D,W,{fg:"#f4f7f9",...v});return R.position.set(H,oe,.5),le&&(R.userData.part=le,u.push(R)),C.add(R),R};[["hold",-.8,"HOLD"],["range",.8,"RANGE"]].forEach(([D,W,H])=>{m(p(1.05,.44,.14),d(5070699),C,[W,1.25,.52],{type:"btn",id:D});let oe=w(H,.24,W,1.25,{type:"btn",id:D});oe.position.z=.6,b[`btn:${D}`]=()=>C.localToWorld(Oe(W,1.25,.6))});let V=m(E(1.02,1.02,.06,48),d(857112),C,[0,Pa,.5],{type:"dialknob"});V.rotation.x=Math.PI/2;let j=new Ut;j.position.set(0,Pa,.53),C.add(j);let $=m(E(.72,.8,.34,40),d(3359309,{roughness:.45}),j,[0,0,.17],{type:"dialknob"});$.rotation.x=Math.PI/2,m(p(.16,.74,.1),d(16777215),j,[0,.4,.37],{type:"dialknob"}),m(p(.34,.2,.1),d(16777215),j,[0,.7,.37],{type:"dialknob"});let J={OFF:"OFF",VDC:"V\u2393",VAC:"V~",OHM:"\u03A9",A:"A"};Zs.forEach(D=>{let W=kc[D]*Math.PI/180,H=1.34*Math.sin(W),oe=Pa+1.34*Math.cos(W);w(J[D],.36,H,oe,{type:"dialpos",id:D},{bg:"#33424d",pad:14,radius:14}),b[`dialpos:${D}`]=()=>C.localToWorld(Oe(H,oe,.55))});let ae={A:"A",mA:"mA",COM:"COM",V:"V/\u03A9"};Object.keys(Zr).forEach(D=>{let W=Zr[D],H=m(E(.27,.27,.08,28),d(D==="COM"?1382684:11809323),C,[W,Vs,.5],{type:"jack",id:D});H.rotation.x=Math.PI/2;let oe=m(E(.14,.14,.1,20),d(329223),C,[W,Vs,.51],{type:"jack",id:D});oe.rotation.x=Math.PI/2;let le=m(E(.38,.38,.3,12),f,C,[W,Vs,.6],{type:"jack",id:D});le.rotation.x=Math.PI/2,w(ae[D],.27,W,Vs+.52,{type:"jack",id:D}),b[`jack:${D}`]=()=>C.localToWorld(Oe(W,Vs,.6))}),b.meter=()=>C.localToWorld(Oe(0,1.25,.5)),b.display=()=>C.localToWorld(Oe(0,2.3,.6)),b.dial=()=>C.localToWorld(Oe(0,Pa,.9)),C.updateMatrixWorld(!0);let Y=Oe(0,0,1).applyQuaternion(C.quaternion).normalize(),ce={};Object.keys(Zr).forEach(D=>{ce[D]=C.localToWorld(Oe(Zr[D],Vs,.5))});function Z(){let D=e.display,W=JSON.stringify(D);if(W===Z.sig)return;Z.sig=W;let H=I.getContext("2d"),oe=I.width,le=I.height;H.fillStyle=D.on?"#c9d8b6":"#8f9c86",H.fillRect(0,0,oe,le),D.on&&(H.fillStyle="#10180f",H.textBaseline="alphabetic",H.font="700 44px system-ui, Arial, sans-serif",D.mode==="DC"?ju(H,"DC \u2393",22,54,44,"left"):D.mode==="AC"?(H.textAlign="left",H.fillText("AC ~",22,54)):(H.textAlign="left",H.fillText(D.mode==="OHM"?"\u03A9":"A",22,54)),D.unit==="V"&&(H.textAlign="right",H.fillText(D.rangeSel==="AUTO"?"AUTO":`MANUAL ${D.rangeSel} V`,oe-22,54)),D.hold&&(H.fillRect(oe/2-150,14,132,52),H.fillStyle="#c9d8b6",H.textAlign="center",H.fillText("HOLD",oe/2-84,56),H.fillStyle="#10180f"),H.font='700 158px ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace',H.textAlign="right",H.fillText(D.digits,oe-104,258),D.neg&&H.fillRect(20,186,62,20),H.font="700 96px system-ui, Arial, sans-serif",H.fillText(D.unit,oe-18,258)),G.needsUpdate=!0}function de(D,W,H,oe,le,v,R,U,N,O=.34){let ne=Tt[D],se=m(new Ma(O,12,8),f,W,[H,oe,le],{type:"term",id:D});W.updateMatrixWorld(!0);let fe=W.localToWorld(Oe(H,oe,le)),me={id:D,pos:fe,hit:se};if(!ne.bridge){let Re=Bs(v,{h:.4});Re.position.copy(W.localToWorld(Oe(R,U,N))),a.add(Re),me.label=Re,me.text=v;let Ve=new Ot(new wa(.26,.035,8,32),new Jn({color:16777215,depthTest:!1}));Ve.rotation.x=Math.PI/2,Ve.position.copy(fe).add(Oe(0,.02,0)),Ve.renderOrder=15,Ve.visible=!1,a.add(Ve),me.ring=Ve}z[D]=me,b[`term:${D}`]=()=>fe}let Me=(D,W,H,oe,le=.13,v=.2)=>m(E(le,le,v,16),g,D,[W,H,oe]),Ie=(D,W,H,oe,le,v=.155)=>{let R=Math.hypot(oe-W,le-H)+.14,U=m(p(R,.03,.14),_,D,[(W+oe)/2,v,(H+le)/2]);return U.rotation.y=-Math.atan2(le-H,oe-W),U.castShadow=!1,U},We=(D,W,H,oe=.4)=>{let le=ji(L(P[D]),oe);le.rotation.x=-Math.PI/2,le.position.set(W,.03,H),a.add(le),M.push(()=>le.userData.set(L(P[D])))},Ye=new Ut;Ye.position.set(0,0,3.6),a.add(Ye),m(p(3.3,.25,1),d(3885138),Ye,[0,.125,0]);let ee=m(E(.36,.36,2,28),d(3104080,{roughness:.4}),Ye,[-.2,.62,0]);ee.rotation.z=Math.PI/2;let ue=m(E(.365,.365,.5,28),d(13214247,{metalness:.5,roughness:.4}),Ye,[1.03,.62,0]);ue.rotation.z=Math.PI/2;let Pe=m(E(.13,.13,.14,16),y,Ye,[1.33,.62,0]);Pe.rotation.z=Math.PI/2,m(p(.1,.95,.62),g,Ye,[1.47,.5,0]),m(p(.1,.95,.62),g,Ye,[-1.27,.5,0]);let ye=ji("AA  1.5 V",.26,{fg:"#ffffff"});ye.position.set(-.2,.62,.37),Ye.add(ye),de("aa+",Ye,1.47,.98,0,"AA +",1.75,1.6,0),de("aa-",Ye,-1.27,.98,0,"AA \u2212",-1.55,1.6,0),We("stAA",0,4.55);let Le=new Ut;Le.position.set(3.3,0,3.6),a.add(Le),m(p(1.3,1.9,.85),d(3817301,{roughness:.45}),Le,[0,.95,0]),m(p(1.32,.5,.87),d(13214247,{metalness:.4}),Le,[0,1.55,0]);let He=ji("9 V",.4,{fg:"#ffffff"});He.position.set(0,.8,.43),Le.add(He),m(E(.15,.15,.16,20),y,Le,[.34,1.98,0]),m(E(.2,.2,.16,6),y,Le,[-.34,1.98,0]),de("b9+",Le,.36,2.06,0,"9V +",.95,2.6,0,.2),de("b9-",Le,-.36,2.06,0,"9V \u2212",-.95,2.6,0,.2),de("b9x",Le,0,2.06,0,"",0,0,0,.1),We("stB9",3.3,4.55);let $e={},gt={};function et(D,W,H,oe,le,v,R=0){let U=oe-H;m(p(U+.5,.1,.5),d(6253429),W,[(H+oe)/2,.2,le]),Me(W,H,.36,le,.1,.3),Me(W,oe,.3,le,.1,.2);let N=new Ut;N.position.set(H,.47,le),W.add(N),m(p(U+.1,.07,.16),g,N,[U/2,0,0]),m(E(.11,.11,.36,14),d(1382684),N,[U+.1,.16,0]),m(p(U*.9,1.1,.9),f,W,[(H+oe)/2,.7,le],{type:"switch",id:D});let O=Bs("",{h:.36,bg:"#ffffff",fg:"#10222c",border:"#10222c"});W.updateMatrixWorld(!0),O.position.copy(W.localToWorld(Oe((H+oe)/2+R,v,le+.85))),a.add(O);let ne=D==="panel24"?"S1":L(P.swLabel);M.push(()=>O.userData.set(`${D==="panel24"?"S1":L(P.swLabel)}: ${L(e.state.switches[D]?P.closed:P.open)}`)),$e[D]={lever:N,name:ne},b[`switch:${D}`]=()=>W.localToWorld(Oe((H+oe)/2,.6,le))}function wt(D,W,H,oe,le){m(E(.42,.5,.35,24),d(4739674),W,[H,.33,oe]);let v=new Aa({color:16774869,emissive:16761395,emissiveIntensity:0,roughness:.2,transparent:!0,opacity:.92}),R=m(new Ma(.42,24,16),v,W,[H,.85,oe]);R.castShadow=!1;let U=new Hr(16762976,0,7,1.6);U.position.set(H,1.3,oe),W.add(U);let N=Bs("",{h:.36,bg:"#ffffff",fg:"#10222c",border:"#10222c"});W.updateMatrixWorld(!0),N.position.copy(W.localToWorld(Oe(H-1.35,.3,oe+.7))),a.add(N),M.push(()=>N.userData.set(`${le}${L(e.lampOn(D)?P.lampOn:P.lampOff)}`)),gt[D]={bulbMat:v,light:U,level:0}}let B=new Ut;B.position.set(1.2,0,-1.4),a.add(B),m(p(7,.14,3.8),d(15986658,{roughness:.85}),B,[0,.07,0]),m(p(.9,.6,1.7),d(3817301),B,[-2.9,.44,0]),m(p(.92,.61,.4),d(13214247,{metalness:.4}),B,[-2.9,.44,-.66]);let Nt=ji("+   9 V   \u2212",.26,{fg:"#ffffff"});Nt.rotation.set(-Math.PI/2,0,-Math.PI/2),Nt.position.set(-2.9,.75,0),B.add(Nt),[[-2.9,-1.3,-1.15,-1.3],[-1.15,-1.3,-.8,-1.3],[.8,-1.3,1.15,-1.3],[1.15,-1.3,2.9,-1.3],[2.9,-1.3,2.9,-.5],[2.9,.5,2.9,1.3],[2.9,1.3,-2.9,1.3],[-2.9,1.3,-2.9,.85],[-2.9,-.85,-2.9,-1.3]].forEach(D=>Ie(B,...D)),et("lamp9",B,-.8,.8,-1.3,.45),wt("lamp9",B,2.9,0,""),Object.entries({tp1:[-2.9,-1.3],tp2:[-1.15,-1.3],tp3:[1.15,-1.3],tp4:[2.9,-1.3],tp5:[2.9,1.3],tp6:[-2.9,1.3]}).forEach(([D,[W,H]])=>{Me(B,W,.25,H),de(D,B,W,.36,H,Tt[D].label,W,H<0?.95:.6,H<0?H-.5:H+.5)}),We("stLamp9",1.2,.8,.36);let Ne=new Ut;Ne.position.set(7.9,0,-1.4),a.add(Ne),m(p(5.8,.14,3.8),d(14936558,{roughness:.85}),Ne,[0,.07,0]),m(p(.9,.7,1.5),d(3098712),Ne,[-2.4,.49,0]);let ke=ji("24 V\u2393",.3,{fg:"#ffffff"});ke.rotation.set(-Math.PI/2,0,-Math.PI/2),ke.position.set(-2.4,.85,0),Ne.add(ke),m(p(.5,.16,1.25),d(8096404),Ne,[-1.7,.22,0]),[[-2,-.34,-1.7,-.34],[-2,.34,-1.7,.34],[-1.7,-.34,-1.7,-1.3],[-1.7,-1.3,-.9,-1.3],[-.9,-1.3,-.6,-1.3],[.2,-1.3,.5,-1.3],[1.9,-1.3,1.9,-.5],[1.9,.5,1.9,1.3],[1.9,1.3,-1.7,1.3],[-1.7,1.3,-1.7,.34]].forEach(D=>Ie(Ne,...D)),et("panel24",Ne,-.6,.2,-1.3,.45,-.45),wt("panel24",Ne,1.9,0,"H1: "),Object.entries({x1:[-1.7,-.34,.5],x2:[-1.7,.34,.5],x3:[-.9,-1.3,.36],x4:[.5,-1.3,.36],x5:[1.9,-1.3,.36],x6:[1.9,1.3,.36]}).forEach(([D,[W,H,oe]])=>{Me(Ne,W,oe-.11,H);let le=[W,H<0?.95:.6,H<0?H-.5:H+.5];D==="x1"&&(le=[W-1,1.35,H-.3]),D==="x2"&&(le=[W-.9,.75,H+.9]),de(D,Ne,W,oe,H,Tt[D].label,...le,D==="x1"||D==="x2"?.2:.34)}),de("x12",Ne,-1.7,.5,0,"",0,0,0,.1);let Ue=new Hi([Oe(.5,.4,-1.3),Oe(.8,.75,-1.3),Oe(1.2,.85,-1.3),Oe(1.6,.75,-1.3),Oe(1.9,.4,-1.3)]),T=d(2973608,{roughness:.5}),x=Ue.getPoints(40),q=(D,W)=>m(new Sa(new Hi(x.slice(D,W+1)),16,.06,8),T,Ne);q(0,17);let ie=q(17,23);q(23,40);let re=Bs("W2",{h:.3,bg:"#ffffff",fg:"#10222c",border:"#10222c"});Ne.updateMatrixWorld(!0),re.position.copy(Ne.localToWorld(Oe(1.2,1.3,-1.55))),a.add(re);let K=Bs("",{h:.34,bg:"#ffffff",fg:"#8f1d16",border:"#8f1d16"});K.position.copy(Ne.localToWorld(Oe(1.45,.3,-.45))),K.visible=!1,a.add(K),M.push(()=>{let D=e.state.faults.w2open&&e.state.faultRevealed;ie.visible=!D,K.visible=D,K.userData.set(`\u2716 W2: ${L(P.faultOpen)}`)}),We("stPanel",7.9,.8,.3);let Te=new Ut;Te.position.set(7.6,0,3.7),a.add(Te),m(p(2.6,1.1,1.5),d(14673642,{roughness:.5}),Te,[0,.55,0]),m(p(2.4,.7,.04),d(3098712),Te,[0,.55,.76]);let ve=ji("12 V~",.4,{fg:"#ffffff"});ve.position.set(0,.55,.79),Te.add(ve),Me(Te,-.6,1.2,.1),Me(Te,.6,1.2,.1),de("ac1",Te,-.6,1.31,.1,"AC 1",-.95,1.95,.1),de("ac2",Te,.6,1.31,.1,"AC 2",.95,1.95,.1),We("stAC",7.6,4.9,.3);let Se={};["black","red"].forEach(D=>{let W=mv[D],H=d(W,{roughness:.45}),oe=se=>({type:"probe",lead:D,part:se}),le=new Ut;a.add(le),m(E(.02,.04,.5,12),y,le,[0,.25,0],oe("tip")),m(E(.12,.12,.52,8),f,le,[0,.26,0],oe("tip")),m(E(.12,.05,.25,16),H,le,[0,.62,0],oe("guard")),m(E(.28,.28,.07,24),H,le,[0,.78,0],oe("guard")),m(E(.3,.3,.16,10),f,le,[0,.78,0],oe("guard")),m(E(.16,.14,1.75,20),H,le,[0,1.7,0],oe("handle")),m(E(.27,.27,1.75,10),f,le,[0,1.72,0],oe("handle")),m(E(.08,.13,.2,12),H,le,[0,2.67,0],oe("handle")),D==="red"&&[1.15,1.32].forEach(se=>m(E(.175,.175,.06,20),d(16777215),le,[0,se,0],oe("handle")));let v=new Ut;a.add(v),m(E(.07,.07,.3,12),y,v,[0,-.1,0],{type:"plug",lead:D}),m(E(.17,.2,.75,16),H,v,[0,.4,0],{type:"plug",lead:D}),m(E(.3,.3,.95,10),f,v,[0,.4,0],{type:"plug",lead:D});let R=d(W,{roughness:.6}),U=new Ot(new Kt,R);U.castShadow=!0,U.userData.part={type:"lead",lead:D},u.push(U),a.add(U);let N=new Ot(new wa(.075,.035,8,16),_);N.visible=!1,a.add(N);let O=Bs("",{h:.27,bg:D==="red"?"#b3261e":"#15191c",border:"#ffffff"});a.add(O),M.push(()=>{let se=e.state.damaged[D]&&e.state.inspected[D];O.userData.set(`${L(D==="red"?P.RED:P.BLACK)}${D==="red"?" \u25AE\u25AE":""}${se?` \u26A0 ${L(P.damagedTag)}`:""}`)});let ne={probe:le,plug:v,wire:U,nick:N,tag:O,tip:Fs.home[D].clone(),dir:Fs.home.dir.clone().normalize(),plugPos:Oc[D].clone(),plugDir:Oe(0,0,1),wireKey:""};Se[D]=ne,b[`probe:${D}`]=()=>ne.tip.clone().addScaledVector(ne.dir,1.7),b[`plug:${D}`]=()=>ne.plugPos.clone().addScaledVector(ne.plugDir,.4),b[`lead:${D}`]=()=>ne.mid||ne.tip});let nt=(()=>{let D=document.createElement("canvas");D.width=D.height=128;let W=D.getContext("2d");return W.lineWidth=12,W.strokeStyle="#ffffff",W.beginPath(),W.arc(64,64,50,0,Math.PI*2),W.stroke(),W.lineWidth=6,W.strokeStyle="#0b3d91",W.setLineDash([14,10]),W.beginPath(),W.arc(64,64,50,0,Math.PI*2),W.stroke(),D})(),he=(()=>{let D=document.createElement("canvas");D.width=96,D.height=128;let W=D.getContext("2d");return W.fillStyle="#0b3d91",W.strokeStyle="#ffffff",W.lineWidth=8,W.lineJoin="round",W.beginPath(),W.moveTo(48,120),W.lineTo(8,62),W.lineTo(32,62),W.lineTo(32,8),W.lineTo(64,8),W.lineTo(64,62),W.lineTo(88,62),W.closePath(),W.stroke(),W.fill(),D})(),Ee=La(nt),Fe=La(he),Be=[];for(let D=0;D<6;D++){let W=new ks(new zi({map:Ee,depthTest:!1,transparent:!0})),H=new ks(new zi({map:Fe,depthTest:!1,transparent:!0}));W.renderOrder=30,H.renderOrder=31,W.visible=H.visible=!1,a.add(W),a.add(H),Be.push({r:W,a:H})}let pe=null,Ze=()=>Math.max(1,1.45/r.aspect);function qe(){let D=Oe(1.3,.3,.9),W=10.2,H=Math.atan(Math.tan(r.fov*Math.PI/360)*r.aspect),oe=Math.max(13,W/Math.tan(H));return{t:D,p:D.clone().add(Oe(0,.66,.75).normalize().multiplyScalar(oe))}}function ht(D){if(D==="front"||!D)return qe();if(D==="display"||D==="dial"||D==="jacks"){let oe=D==="display"?2.1:D==="dial"?-.6:-2.2,le=(D==="display"?5.4:D==="dial"?6.4:6.6)*Ze(),v=C.localToWorld(Oe(0,oe,.5)),R=v.clone().addScaledVector(Y,le).add(Oe(0,D==="jacks"?1.2:.4,D==="jacks"?2.2:.6));return{t:v,p:R}}if(D==="tips"){let oe=["red","black"].map(v=>e.state.probes[v]).filter(Boolean),le=oe.length?oe.map(v=>z[v].pos).reduce((v,R)=>v.clone().add(R)).multiplyScalar(1/oe.length):Se.red.tip.clone().add(Se.black.tip).multiplyScalar(.5);return{t:le,p:le.clone().add(Oe(0,3.6,4.6).multiplyScalar(Ze()))}}if(D==="probes"){let oe=Fs[t.ui.rest]||Fs.home,le=oe.red.clone().add(oe.black).multiplyScalar(.5).addScaledVector(oe.dir,1.3);return{t:le,p:le.clone().add(Oe(0,4.6,5.4).multiplyScalar(Ze()))}}let W=qu[D]||qu.meter,H=Oe(...W.t);return{t:H,p:H.clone().add(Oe(...W.p).sub(H).multiplyScalar(Ze()))}}function F(D,W){let{t:H,p:oe}=ht(D);if(W){r.position.copy(oe),l.target.copy(H),l.update(),pe=null;return}pe={p0:r.position.clone(),t0:l.target.clone(),p1:oe,t1:H,k:0}}l.addEventListener("start",()=>{pe=null});function _e(D){let W=r.position.clone().sub(l.target).multiplyScalar(D);pe={p0:r.position.clone(),t0:l.target.clone(),p1:l.target.clone().add(W),t1:l.target.clone(),k:.4}}function X(){let D=n.clientWidth||1,W=n.clientHeight||1;i.setSize(D,W,!1),r.aspect=D/W,r.updateProjectionMatrix()}new ResizeObserver(X).observe(n),X(),F("front",!0);let te=new Gr,be=new we,xe=D=>{let W=s.getBoundingClientRect();return be.set((D.clientX-W.left)/W.width*2-1,-((D.clientY-W.top)/W.height)*2+1),te.setFromCamera(be,r),W};function Ge(D){xe(D);let W=te.intersectObjects(u,!1).filter(N=>N.object.visible);if(!W.length)return null;let H=t.ui.selected,oe=H&&H.kind==="probe"?"term":H&&H.kind==="plug"?"jack":null;if(oe){let N=W.find(O=>O.object.userData.part.type===oe);if(N)return N}let le=W.find(N=>N.object.userData.part.type!=="bench")||W[0],v=N=>N.object.userData.part,R=W.filter(N=>N.distance-le.distance<(v(le).type==="lead"?2.2:1.2)),U=R.find(N=>v(N).type==="plug"||v(N).type==="probe"&&v(N).part==="handle");if(U&&["jack","term","meter","lead"].includes(v(le).type))return U;if(v(le).type==="probe"&&v(le).part!=="handle"){let N=R.find(O=>v(O).type==="term");if(N)return N}return le}let ut=(D,W)=>{let H=D.clone().project(r);return{x:(H.x+1)/2*W.width,y:(1-H.y)/2*W.height}},it=null,Ae=null,Vt=new ln,jt=Oe(0,0,0);function _i(D){return Oe(D==="red"?.3:-.3,1,.8).normalize()}function Oa(D){let W=xe(D),H=D.clientX-W.left,oe=D.clientY-W.top;if(Ae.kind==="probe"){let le=_i(Ae.lead);if(Vt.set(Dc,-(.55+Ae.grab*le.y)),!te.ray.intersectPlane(Vt,jt))return;let v=jt.clone().addScaledVector(le,-Ae.grab),R=ut(v,W),U=null,N=1e9;Object.values(z).forEach(ne=>{let se=ut(ne.pos,W),fe=Math.hypot(se.x-R.x,se.y-R.y);fe<N&&(N=fe,U=ne.id)});let O=Math.max(26,Math.min(46,W.height/14));if(N>=O){let ne=null,se=1e9;Object.values(z).forEach(fe=>{let me=ut(fe.pos,W),Re=Math.hypot(me.x-H,me.y-oe);Re<se&&(se=Re,ne=fe.id)}),se<O*.8&&(U=ne,N=se)}Ae.snap=N<O?U:null,Ae.near=!Ae.snap&&N<O*2.1&&!Tt[U].bridge?U:null,Ae.tip=Ae.snap?z[Ae.snap].pos.clone():v,t.hover(Ae.snap?{type:"term",id:Ae.snap}:null)}else if(Ae.kind==="plug"){if(Vt.setFromNormalAndCoplanarPoint(Y,ce.COM.clone().addScaledVector(Y,.7)),!te.ray.intersectPlane(Vt,jt))return;let le=null,v=1e9;Object.keys(ce).forEach(R=>{let U=ut(ce[R],W),N=Math.hypot(U.x-H,U.y-oe);N<v&&(v=N,le=R)}),Ae.snap=v<Math.max(30,W.height/13)?le:null,Ae.pos=Ae.snap?ce[Ae.snap].clone().addScaledVector(Y,.35):jt.clone()}else if(Ae.kind==="dial"){let le=C.matrixWorld.clone().invert(),v=te.ray.origin.clone().applyMatrix4(le),R=te.ray.direction.clone().transformDirection(le),U=(.5-v.z)/R.z,N=v.x+R.x*U,O=v.y+R.y*U-Pa;if(Math.hypot(N,O)<.25)return;let ne=Math.atan2(N,O)*180/Math.PI,se=null,fe=40;Zs.forEach(me=>{let Re=Math.abs(kc[me]-ne);Re<fe&&(fe=Re,se=me)}),se&&se!==Ae.last&&se!==e.state.dial&&(Ae.last=se,t.setDial(se)),se===e.state.dial&&(Ae.last=se)}}s.addEventListener("pointerdown",D=>{if(D.pointerType==="mouse"&&D.button!==0)return;let W=Ge(D),H=W?W.object.userData.part:null;if(it={x:D.clientX,y:D.clientY,part:H,cand:null,id:D.pointerId},H&&H.type==="probe"&&H.part==="handle"){let oe=Se[H.lead];it.cand={kind:"probe",lead:H.lead,grab:Math.min(2.5,Math.max(.9,W.point.clone().sub(oe.tip).dot(oe.dir)))}}else H&&H.type==="plug"?it.cand={kind:"plug",lead:H.lead}:H&&H.type==="dialknob"&&(it.cand={kind:"dial"});if(it.cand){l.enabled=!1;try{s.setPointerCapture(D.pointerId)}catch{}}}),s.addEventListener("pointermove",D=>{if(it&&it.cand){if(!Ae&&Math.hypot(D.clientX-it.x,D.clientY-it.y)>7){let le=it.cand;if(le.kind==="dial"||t.beginDrag(le.kind,le.lead))Ae={...le};else{it.cand=null,it.cancelled=!0,l.enabled=!0;return}}Ae&&Oa(D);return}if(it||D.pointerType!=="mouse")return;let W=Ge(D),H=W?W.object.userData.part:null,oe=H&&H.type!=="bench";s.style.cursor=oe?"pointer":"grab",t.hover(oe?H:null,D)});let Tn=D=>{if(!it)return;let W=it;if(it=null,l.enabled=!0,Ae){let H=Ae;Ae=null,t.hover(null),H.kind==="probe"&&t.endDrag("probe",H.lead,H.snap,H.near),H.kind==="plug"&&t.endDrag("plug",H.lead,H.snap);return}W.cancelled||D.type==="pointercancel"||Math.hypot(D.clientX-W.x,D.clientY-W.y)<7&&t.clickPart(W.part||{type:"none"})};s.addEventListener("pointerup",Tn),s.addEventListener("pointercancel",Tn),s.addEventListener("pointerleave",()=>{it||t.hover(null)});let xi=new un,bi=1,Yi=0;function Zi(D){let W=e.state,H=t.ui.selected,oe=Fs[t.ui.rest]||Fs.home,le,v;Ae&&Ae.kind==="probe"&&Ae.lead===D&&Ae.tip?(le=Ae.tip,v=_i(D)):W.probes[D]?(le=z[W.probes[D]].pos,v=_i(D)):W.near[D]?(le=z[W.near[D]].pos.clone().add(Oe(D==="red"?.42:-.42,.3,.3)),v=_i(D)):H&&H.kind==="probe"&&H.lead===D?(le=oe[D].clone().add(Oe(0,.9,0)),v=oe.dir.clone().add(Oe(0,.55,0)).normalize()):(le=oe[D],v=oe.dir.clone().normalize());let R,U;return Ae&&Ae.kind==="plug"&&Ae.lead===D&&Ae.pos?(R=Ae.pos,U=Y):W.plugs[D]?(R=ce[W.plugs[D]].clone().addScaledVector(Y,.12),U=Y):H&&H.kind==="plug"&&H.lead===D?(R=Oc[D].clone().add(Oe(0,.6,0)),U=Oe(0,.4,1).normalize()):(R=Oc[D],U=Oe(0,0,1)),{tip:le,dir:v,pp:R,pd:U}}function $s(D,W){let H=Se[D],{tip:oe,dir:le,pp:v,pd:R}=Zi(D),U=1-Math.exp(-W*12);H.tip.lerp(oe,U),H.dir.lerp(le,U).normalize(),H.plugPos.lerp(v,U),H.plugDir.lerp(R,U).normalize(),H.probe.position.copy(H.tip),H.probe.quaternion.copy(xi.setFromUnitVectors(Dc,H.dir)),H.plug.position.copy(H.plugPos),H.plug.quaternion.copy(xi.setFromUnitVectors(Dc,H.plugDir));let N=H.plugPos.clone().addScaledVector(H.plugDir,.78),O=H.tip.clone().addScaledVector(H.dir,2.78),ne=[N.x,N.y,N.z,O.x,O.y,O.z].map(fe=>fe.toFixed(2)).join(",");if(ne!==H.wireKey){H.wireKey=ne;let fe=N.clone().addScaledVector(H.plugDir,.7),me=O.clone().addScaledVector(H.dir,.8);fe.y=Math.max(fe.y,.1),me.y=Math.max(me.y,.1);let Re=fe.clone().lerp(me,.5);Re.y=.09,Re.z=Math.min(6.2,Math.max(fe.z,me.z)+(D==="red"?.9:.5));let Ve=fe.clone().lerp(Re,.5);Ve.y=.09;let Ce=me.clone().lerp(Re,.5);Ce.y=Math.max(.09,me.y*.35);let st=new Hi([N,fe,Ve,Re,Ce,me,O],!1,"catmullrom",.5);H.wire.geometry.dispose(),H.wire.geometry=new Sa(st,48,.055,6),H.mid=Ce,H.nick.position.copy(O.clone().lerp(me,.55)),H.nick.quaternion.copy(xi.setFromUnitVectors(Oe(0,0,1),H.dir))}H.nick.visible=e.state.damaged[D];let se=e.state.probes[D]||e.state.near[D]||Ae&&Ae.lead===D;H.tag.position.copy(H.tip).addScaledVector(H.dir,se?2.75:D==="red"?2.5:1.5).add(Oe(0,se?.3:.5,0))}function Ji(D){Yi+=D;let W=e.state;if(pe){pe.k=Math.min(1,pe.k+D/.7);let R=pe.k*pe.k*(3-2*pe.k);r.position.lerpVectors(pe.p0,pe.p1,R),l.target.lerpVectors(pe.t0,pe.t1,R),pe.k>=1&&(pe=null)}l.target.x=Math.max(-9,Math.min(11.5,l.target.x)),l.target.z=Math.max(-4,Math.min(6,l.target.z)),l.target.y=Math.max(0,Math.min(3,l.target.y)),l.update();let H=1-Math.exp(-D*12);j.rotation.z+=(-kc[W.dial]*Math.PI/180-j.rotation.z)*H,Object.keys($e).forEach(R=>{let U=$e[R];U.lever.rotation.z+=((W.switches[R]?0:.6)-U.lever.rotation.z)*H}),Object.keys(gt).forEach(R=>{let U=gt[R],N=Math.min(1,e.lampLevel(R))>.5?1:0;U.level+=(N-U.level)*H,U.bulbMat.emissiveIntensity=U.level*2.4,U.light.intensity=U.level*14}),$s("black",D),$s("red",D),Z(),bi+=D,bi>.15&&(bi=0,M.forEach(R=>R()),Object.values(z).forEach(R=>{if(!R.label)return;let U=W.intended.includes(R.id),N=t.ui.hoverTerm===R.id;R.ring.visible=U||N,R.label.userData.set(`${U?"\u2714 ":""}${R.text}`,U?{bg:"#ffffff",fg:"#10222c",border:"#10222c"}:N?{bg:"#0b3d91"}:{})}));let oe=(t.ui.highlights||[]).filter(R=>b[R]),le=t.ui.selected,v=1+.12*Math.sin(Yi*5);Be.forEach((R,U)=>{let N=oe[U];if(!N){R.r.visible=R.a.visible=!1;return}let O=b[N](),ne=r.position.distanceTo(O),se=Math.max(.5,ne*.055);R.r.visible=R.a.visible=!0,R.r.position.copy(O),R.r.scale.setScalar(se*1.5*v),R.a.position.copy(O).add(Oe(0,se*1.6+.12*Math.sin(Yi*5),0)),R.a.scale.set(se*.75,se,1)}),i.render(a,r)}return{update:Ji,focus:F,zoom:_e,canvas:s,refreshLabels:()=>{bi=1,s.setAttribute("aria-label",L(P.stageHelp))},screenOf:D=>{let W=s.getBoundingClientRect(),H=b[D]?b[D]():null;if(!H)return null;let oe=ut(H,W);return{x:oe.x+W.left,y:oe.y+W.top}}}}var rt=n=>document.getElementById(n),Zu=n=>new Promise(e=>setTimeout(e,window.__voltageLabFast?Math.min(n,25):n)),gv={l0:"home",l1:"center",l2:"center",l3:"center",l4:"center",l5:"center",l6:"right",l7:"right"},yv=["predict_first","jack_taken","range_na","meter_off_btn","floating","damaged_lead"],Hc={inspect:P.ckInspect,jacks:P.ckJacks,func:P.ckFunc,range:P.ckRange,points:P.ckPoints,guards:P.ckGuards,bridge:P.ckBridge},Q=new Na,Xi=(()=>{try{return JSON.parse(localStorage.getItem("voltage-lab")||"{}")}catch{return{}}})(),Hs=()=>{try{localStorage.setItem("voltage-lab",JSON.stringify({lang:At(),mode:A.mode,narration:A.narration,captions:A.captions,completed:A.completed}))}catch{}},A={mode:["guided","practice","assess"].includes(Xi.mode)?Xi.mode:"guided",narration:!!Xi.narration,captions:Xi.captions!==!1,completed:Xi.completed||{},lessonIdx:0,stepIdx:0,finished:!1,ctx:null,snapshots:{},log:[],started:0,ui:{selected:null,hoverTerm:null,highlights:[],rest:"home"},coach:null,info:null,inspMsg:null,demo:!1,caption:null,flash:null,errors:{},as:{started:!1,idx:0,results:{},submitted:!1,feedback:null,notes:new Set,report:!1}};ao(Xi.lang||((navigator.language||"en").toLowerCase().startsWith("es")?"es":"en"));var no=()=>({events:[],clicked:new Set,form:{}}),ei=()=>Un[A.lessonIdx],Gt=()=>A.mode==="assess"?null:ei().steps[A.stepIdx],Gs=()=>A.mode==="assess"&&A.as.started&&!A.as.report?Wt[A.as.idx]:null,en=n=>n&&Tt[n]&&Tt[n].label||"\u2014",vi=n=>L(n==="red"?P.red:P.black),Ia=n=>L(n==="meter"?P.meterBody:n==="red"?P.redLead:P.blackLead),Qr="speechSynthesis"in window&&typeof SpeechSynthesisUtterance<"u";function Ws(n){if(!(!A.narration||!Qr))try{speechSynthesis.cancel();let e=new SpeechSynthesisUtterance(n),t=At();e.lang=t==="es"?"es-ES":"en-US";let i=speechSynthesis.getVoices().find(s=>s.lang&&s.lang.toLowerCase().startsWith(t));i&&(e.voice=i),e.rate=.96,speechSynthesis.speak(e)}catch{}}function Gc(){let n=Gt();n&&Ws([n.title,n.goal,n.why,n.action].filter(Boolean).map(e=>Dn(e)).join(". "))}function eo(n,e){A.caption=n?{text:n,until:e?performance.now()+e:1/0}:null}var Jr={unsafe_jack:()=>Q.jacksOK(),wrong_jack:()=>!Q.currentJackUsed(),swapped_jacks:()=>Q.jacksOK(),lead_unplugged:()=>Q.jacksOK(),precheck:()=>Q.checklistComplete(),func_not_voltage:()=>Q.isVMode(),meter_off:()=>Q.state.dial!=="OFF",mode_mismatch:()=>{let n=Q.reading();return n.valid&&!n.mismatch&&Q.settled},range_low:()=>!Q.cond.range_low,hold_stale:()=>!Q.state.hold,no_contact:()=>Q.reading().valid,reversed:()=>!Q.cond.reversed,same_node:()=>!Q.cond.same_node,remove_order:()=>!Q.anyContact()&&!(A.ctx&&A.ctx.badOrder),damaged_lead:()=>!Q.state.damaged.red&&!Q.state.damaged.black,predict_first:()=>A.ctx&&A.ctx.predicted!==void 0,range_na:()=>Q.isVMode(),meter_off_btn:()=>Q.state.dial!=="OFF"},Kr={change_connected:n=>["dial","plug","replace"].includes(n.type),bridge:n=>n.type==="contact",tip_grip:n=>n.type==="grip"&&n.part==="handle",unplanned_point:n=>n.type==="contact",func_block:n=>n.type==="contact",jack_taken:n=>n.type==="plug"},vv={unsafe_jack:["plug:red","jack:V"],wrong_jack:["jack:COM","jack:V"],swapped_jacks:["jack:COM","jack:V"],change_connected:["probe:red","probe:black"],tip_grip:["probe:red","probe:black"],func_block:["dialpos:VDC","dialpos:VAC"],meter_off:["dialpos:VDC"],lead_unplugged:["plug:black","plug:red"],range_low:["btn:range"],hold_stale:["btn:hold"],range_na:["dialpos:VDC"],func_not_voltage:["dialpos:VDC","dialpos:VAC"]};function Wc(n,e){let t=Q.state;if(n==="precheck")return{missing:(e.missing||Q.missingChecklist()).map(i=>L(Hc[i])).join("; ")};if(n==="unplanned_point")return{term:en(e.term),intended:t.intended.map(en).join(", ")||L(P.none)};if(n==="mode_mismatch"){let s=Q.reading().kind==="ac";return{have:Js[t.dial],kind:s?At()==="es"?"CA":"AC":At()==="es"?"CC":"DC",want:s?"V~":"V\u2393"}}return n==="range_low"?{range:t.range}:n==="no_contact"?{lead:vi(e.lead)}:{}}function Nc(n,e={}){let t=nn[n];if(!t)return;let i=Gt(),s=A.mode!=="assess"&&!!(i&&i.expect&&i.expect.includes(n));if(n==="floating")return;let a=Gs();if(!(a&&a.expect&&a.expect.includes(n))){if(!s&&!yv.includes(n)&&!A.demo){let r=A.errors[n]||(A.errors[n]={count:0,corrected:!1});r.count+=1,r.corrected=!1}if(A.mode==="assess"&&e.type==="detect"&&!A.as.submitted){A.as.notes.add(n);return}A.coach={code:n,vars:Wc(n,e),expected:s,level:t.level},A.info=null,Ws(`${Dn(t.title)}. ${Dn(t.fix,A.coach.vars)}`),t.level==="block"&&eo(L(t.title),5e3)}}function nd(n){if(Object.keys(A.errors).forEach(e=>{let t=A.errors[e];t.corrected||(Kr[e]?n&&Kr[e](n)&&(t.corrected=!0):Jr[e]&&Jr[e]()&&(t.corrected=!0))}),A.coach){let e=A.coach.code;(n&&Kr[e]&&Kr[e](n)||Jr[e]&&Jr[e]())&&performance.now()-(A.coach.t||0)>600&&(A.coach=null)}}function _v(){let n=A.coach;if(!n)return;let e=nn[n.code];n.code==="remove_order"?to():e.level!=="block"&&e.level!=="note"&&(Q.state.hold&&n.code==="hold_stale"?Q.toggleHold():n.code==="wrong_jack"?["red","black"].forEach(t=>{["A","mA"].includes(Q.state.plugs[t])&&Q.plug(t,null)}):n.code!=="range_low"&&n.code!=="damaged_lead"&&(Q.lift("red"),Q.lift("black"))),A.flash={keys:vv[n.code]||[],until:performance.now()+4e3},A.coach=null}function yi(n){A.ctx&&A.ctx.clicked.add(n)}function Qn(n){A.info={key:n},A.coach&&nn[A.coach.code].level!=="block"&&(A.coach=null),yi(n)}function Da(n){let e=Q.inspect(n);A.inspMsg={item:n,damaged:e.damaged},e.damaged&&Nc("damaged_lead")}function id(n){Q.replaceLead(n).ok&&(A.inspMsg={item:n,replaced:!0})}function io(n){let e=A.ui.selected;if(e&&e.kind==="probe"&&e.lead===n){A.ui.selected=null,Q.lift(n);return}Q.grip(n,"handle"),(Q.state.probes[n]||Q.state.near[n])&&Q.lift(n),A.ui.selected={kind:"probe",lead:n}}function ka(n){let e=A.ui.selected;e&&e.kind==="probe"?Q.touch(e.lead,n).ok&&(A.ui.selected=null):e||Q.identify(n)}function sd(n,e){Q.plug(n,e),A.ui.selected=null}function qc(n,e){if(A.demo&&!e)return;let t=A.ui.selected;switch(n.type){case"none":case"bench":t&&(A.ui.selected=null);break;case"meter":Qn("meter"),Da("meter");break;case"display":Qn("display");break;case"dialknob":Qn("dial");break;case"dialpos":yi("dial"),Q.setDial(n.id);break;case"btn":n.id==="range"?Q.cycleRange():Q.toggleHold(),yi(`btn:${n.id}`);break;case"jack":t&&t.kind==="plug"?sd(t.lead,n.id):Qn(`jack:${n.id}`);break;case"plug":A.ui.selected=t&&t.kind==="plug"&&t.lead===n.lead?null:{kind:"plug",lead:n.lead};break;case"lead":Da(n.lead);break;case"probe":n.part==="tip"?(Qn("probe:tip"),Q.grip(n.lead,"tip")):n.part==="guard"?(Qn("probe:guard"),Q.grip(n.lead,"guard")):(yi("probe:handle"),io(n.lead));break;case"term":ka(n.id);break;case"switch":Q.toggleSwitch(n.id);break;default:}mt=!0}var xv={ui:A.ui,clickPart:n=>qc(n),setDial:n=>{A.demo||(yi("dial"),Q.setDial(n))},beginDrag:(n,e)=>A.demo?!1:(A.ui.selected=null,n==="probe"?(yi("probe:handle"),Q.grip(e,"handle"),(Q.state.probes[e]||Q.state.near[e])&&Q.lift(e),!0):Q.anyContact()?(Q.fail("change_connected",{what:"jack"}),!1):!0),endDrag:(n,e,t,i)=>{n==="probe"?t?Q.touch(e,t):i?Q.nearMiss(e,i):Q.lift(e):Q.plug(e,t||null),mt=!0},hover:(n,e)=>{let t=n&&n.type==="term"&&!Tt[n.id].bridge?n.id:null;A.ui.hoverTerm!==t&&(A.ui.hoverTerm=t,mt=!0);let i=rt("tip"),s=n&&e?bv(n):"";if(!s){i.hidden=!0;return}let a=rt("stage").getBoundingClientRect();i.hidden=!1,i.textContent=s,i.style.left=`${Math.min(a.width-160,e.clientX-a.left)}px`,i.style.top=`${e.clientY-a.top}px`}};function bv(n){switch(n.type){case"term":return Tt[n.id].bridge?"":en(n.id);case"jack":return L(Yt[`jack:${n.id}`].name);case"display":return L(Yt.display.name);case"dialknob":return L(Yt.dial.name);case"dialpos":return L(Fa[n.id]);case"btn":return L(Yt[`btn:${n.id}`].name);case"meter":return L(Yt.meter.name);case"plug":return`${L(Yt.plug.name)} (${vi(n.lead)})`;case"lead":return Ia(n.lead);case"probe":return`${L(Yt[`probe:${n.part}`].name)} (${vi(n.lead)})`;case"switch":return L(n.id==="lamp9"?P.swLamp9:P.swPanel);default:return""}}function zs(n){A.lessonIdx=n,A.finished=!1,A.snapshots={},A.log=[],A.started=performance.now(),A.ui.rest=gv[ei().id],ei().init(Q),$c(0)}function $c(n,e){let t=ei().steps;A.stepIdx=Math.max(0,Math.min(t.length-1,n));let i=t[A.stepIdx];A.ctx=no(),A.coach=null,A.info=null,A.flash=null,A.ui.selected=null,e&&A.snapshots[A.stepIdx]?Q.restore(A.snapshots[A.stepIdx]):(i.setup&&i.setup(Q),A.snapshots[A.stepIdx]=Q.snapshot()),eo(null),It&&i.focus&&It.focus(i.focus),Gc(),mt=!0;let s=rt("panel");s&&(s.scrollTop=0)}function to(){let n=A.snapshots[A.stepIdx];n&&Q.restore(n);let e=A.ctx&&A.ctx.again;A.ctx=no(),e&&(A.ctx.again=!0),A.coach=null,A.ui.selected=null,mt=!0}function ad(n){return(n.subs||[]).map(e=>({label:e.label,ok:!!e.ok(Q,A.ctx)}))}function Mv(n){let e=A.ctx;return n.kind==="ack"?!!e.acked:n.kind==="quiz"?!!e.quizOK:n.kind==="entry"?!!e.entryOK:n.kind==="summary"?!0:n.predict&&e.predicted===void 0?!1:n.check?!!n.check(Q,e):ad(n).every(t=>t.ok)}function rd(){let n=Gt();if(!n||A.finished)return;let e=A.ctx;!e.passed&&Mv(n)&&(e.passed=!0,(n.confirms||[]).forEach(t=>{Q.state.checklist[t]=!0}),n.record&&A.log.push({label:n.record,value:Q.displayText()}),n.kind==="do"&&!n.independent&&Ws(Dn(n.meaning)),mt=!0,n.independent&&!e.advancing&&(e.advancing=!0,setTimeout(()=>{Gt()===n&&Vc()},900)))}function Vc(){let n=ei().steps;if(A.stepIdx>=n.length-1){A.finished=!0,A.completed[ei().id]=!0,A.coach=null,A.ui.highlights=[],Hs(),mt=!0;return}$c(A.stepIdx+1)}var wv={meter:{type:"meter"},display:{type:"display"},dial:{type:"dialknob"},"probe:handle":{type:"probe",lead:"red",part:"handle"},"probe:guard":{type:"probe",lead:"red",part:"guard"},"probe:tip":{type:"probe",lead:"red",part:"tip"}};function Sv(n){let e=At()==="es",t=i=>vi(i);switch(n[0]){case"inspect":return`${L(P.inspect)}: ${Ia(n[1])}`;case"replace":return L(P.replaceLead);case"plug":return e?`Cable ${t(n[1])} al borne ${Qi[n[2]]}`:`${t(n[1])} lead into the ${Qi[n[2]]} jack`;case"dial":return e?`Selector a ${Js[n[1]]}`:`Selector to ${Js[n[1]]}`;case"range":return`${L(P.range)}: ${n[1]==="AUTO"?"AUTO":`${n[1]} V`}`;case"hold":return e?"Pulsar HOLD":"Press HOLD";case"identify":return`${L(P.ckPoints)}: ${n[1].map(en).join(", ")}`;case"grip":return e?`Tomar la punta ${t(n[1])} por el mango`:`Grip the ${t(n[1])} probe by its handle`;case"touch":return e?`Punta ${t(n[1])} sobre ${en(n[2])}`:`${t(n[1])} probe onto ${en(n[2])}`;case"lift":return e?`Retirar la punta ${t(n[1])}`:`Lift the ${t(n[1])} probe`;case"switch":return`${L(P.swLabel)}: ${L(n[2]?P.closed:P.open)}`;case"confirm":return`${L(P.confirm)}: ${L(Hc[n[1]])}`;case"predict":return L(P.yourPrediction);case"click":return L((Yt[n[1]]||Yt.meter).name);case"entry":return L(P.check);default:return L(P.stSettling)}}async function od(n){let e=A.ctx,t=Gt();switch(n[0]){case"inspect":Da(n[1]);break;case"replace":if(Q.state.damaged[n[1]])id(n[1]);else return!1;break;case"plug":Q.plug(n[1],n[2]);break;case"dial":Q.setDial(n[1]);break;case"range":Q.setRange(n[1]);break;case"hold":Q.toggleHold();break;case"identify":Q.setIntended(n[1]);break;case"grip":io(n[1]);break;case"touch":A.ui.selected=null,Q.touch(n[1],n[2]);break;case"lift":A.ui.selected=null,Q.lift(n[1]);break;case"switch":Q.toggleSwitch(n[1],n[2]);break;case"confirm":Q.confirm(n[1]);break;case"predict":e.predicted=t.predict.correct;break;case"click":qc(wv[n[1]]||{type:"jack",id:n[1].split(":")[1]},!0);break;case"entry":t.entry.type==="reading"?e.form={sign:Q.display.neg?"-":"+",num:Q.display.digits,unit:"V"}:e.form={num:String(t.entry.answer)},jc();break;case"wait":{let i=performance.now();for(;performance.now()-i<n[1]&&!(window.__voltageLabFast&&Q.settled&&performance.now()-i>250);)await new Promise(s=>setTimeout(s,60));break}default:}return!0}async function Av(){let n=Gt();if(!n||A.demo)return;if(n.kind==="quiz"){ld(n.quiz.correct);return}if(n.kind==="ack"){A.ctx.acked=!0,mt=!0;return}if(!n.demo)return;to(),A.demo=!0,mt=!0;let e=A.ctx;for(let t of n.demo){if(A.ctx!==e)break;eo(Sv(t)),mt=!0,await Zu(t[0]==="wait"?0:420);let i=await od(t);mt=!0,i!==!1&&await Zu(t[0]==="wait"?0:620)}A.ctx===e&&(e.demoDone=!0,A.ui.selected=null),A.demo=!1,eo(null),mt=!0}function ld(n){let e=Gt(),t=A.ctx;t.quizPick=n,n===e.quiz.correct&&(t.quizOK=!0,e.quiz.onCorrect&&e.quiz.onCorrect(Q),Ws(Dn(e.quiz.explain))),mt=!0}function cd(n,e){let t=Q.display,i=Q.reading();if(e&&!e(Q))return{ok:!1,msg:o("The probes are not where this step needs them, or the reading is not steady yet.","Las puntas no est\xE1n donde este paso las necesita, o la lectura a\xFAn no es estable.")};if(Q.state.hold)return{ok:!1,msg:o("HOLD is on, so the display is not a live reading.","HOLD est\xE1 activo, as\xED que la pantalla no es una lectura en vivo.")};if(!i.valid||!Q.settled)return{ok:!1,msg:o("There is no steady two-point reading on the display yet.","A\xFAn no hay una lectura estable entre dos puntos en la pantalla.")};if(t.ol)return{ok:!1,msg:o("The display shows overrange (OL), not a number. Choose a higher range.","La pantalla muestra sobrerrango (OL), no un n\xFAmero. Elige un rango mayor.")};let s=parseFloat(String(n.num||"").replace(",",".").replace("\u2212","-"));if(Number.isNaN(s))return{ok:!1,msg:o("Type the number you see on the display.","Escribe el n\xFAmero que ves en la pantalla.")};if(!n.sign)return{ok:!1,msg:o("Choose the sign: is there a minus sign on the display or not?","Elige el signo: \xBFhay un signo menos en la pantalla o no?")};if(!n.unit)return{ok:!1,msg:o("Choose the unit shown on the display.","Elige la unidad que muestra la pantalla.")};let a=parseFloat(t.digits),r=Mi[t.rangeActive].res;return Math.abs(Math.abs(s)-a)>r*1.5+1e-9?{ok:!1,msg:o("The number does not match the display. Read the digits again.","El n\xFAmero no coincide con la pantalla. Lee los d\xEDgitos otra vez.")}:(n.sign==="-"||s<0)!==t.neg?{ok:!1,msg:o("The sign does not match the display.","El signo no coincide con la pantalla.")}:n.unit!=="V"?{ok:!1,msg:o("The unit does not match: the display shows V.","La unidad no coincide: la pantalla muestra V.")}:{ok:!0}}function jc(){let n=Gt(),e=A.ctx,t;if(n.entry.type==="reading")t=cd(e.form,n.pre);else{let i=parseFloat(String(e.form.num||"").replace(/[\s,.](?=\d{3}\b)/g,"").replace(",","."));t=Math.abs(i-n.entry.answer)<1e-6?{ok:!0}:{ok:!1,msg:o("Not yet. To go from V to mV, multiply by 1,000.","A\xFAn no. Para pasar de V a mV, multiplica por 1000.")}}e.entryOK=t.ok,e.entryMsg=t.ok?null:t.msg,mt=!0}function Tv(){A.as={started:!0,idx:0,results:{},submitted:!1,feedback:null,notes:new Set,report:!1},A.errors={},Fc(0)}function Fc(n){A.as.idx=n,A.as.submitted=!1,A.as.feedback=null,A.as.notes=new Set;let e=Wt[n];A.ctx=no(),A.coach=null,A.info=null,A.ui.selected=null,A.ui.highlights=[],A.ui.rest=["aa","b9","lamp9"].includes(e.diagram)?"center":"home",e.setup(Q),It&&It.focus(e.focus),Ws(`${Dn(e.title)}. ${Dn(e.prompt)}`),mt=!0;let t=rt("panel");t&&(t.scrollTop=0)}function hd(){let n=Gs(),e=A.ctx,t=A.as,i=[];if(n.quiz&&e.quizPick===void 0){e.needAnswer=!0,mt=!0;return}if(n.quiz&&e.quizPick!==n.quiz.correct&&i.push(o("Your answer to the question is not the best one.","Tu respuesta a la pregunta no es la mejor.")),(n.fails||[]).forEach(r=>{r.ok(Q)||i.push(r.msg)}),n.entry&&!i.length){let r=cd(e.form);r.ok||i.push(r.msg)}let s=i.length===0,a=t.results[n.id]||(t.results[n.id]={attempts:0,first:null,passed:!1});a.attempts+=1,a.first===null&&(a.first=s),s&&(a.passed=!0),t.submitted=!0,t.feedback={pass:s,msgs:i,notes:[...t.notes]},mt=!0}var Ev=()=>Object.keys(A.errors).filter(n=>nn[n].critical&&!A.errors[n].corrected);function Cv(){let n=A.as,e=Wt.filter(a=>!(n.results[a.id]&&n.results[a.id].passed)),t=Wt.filter(a=>!(n.results[a.id]&&n.results[a.id].first)),i=Object.keys(A.errors).sort((a,r)=>A.errors[r].count-A.errors[a].count),s=[];return[...e,...t].forEach(a=>{s.includes(a.lesson)||s.push(a.lesson)}),i.forEach(a=>{let r=ih[a];r&&!s.includes(r)&&s.push(r)}),{topics:s,first:s[0]||null}}var mt=!0,Ju={};function Ku(n){if(!n||!n.dataset)return null;if(n.id)return`#${n.id}`;let e=n.dataset;return e.act?`${e.act}|${[e.i,e.item,e.term,e.lead,e.pos,e.r,e.id,e.key,e.v].join("|")}`:e.term?`term|${e.term}`:null}function Kn(n,e){if(Ju[n]===e)return;Ju[n]=e;let t=rt(n),i=document.activeElement,s=i&&t.contains(i),a=s?Ku(i):null,r=s&&i.selectionStart!=null?[i.selectionStart,i.selectionEnd]:null;if(t.innerHTML=e,a){let l=[...t.querySelectorAll("[data-act],[data-term],input,select")].find(c=>Ku(c)===a);if(l&&(l.focus({preventScroll:!0}),r&&l.setSelectionRange))try{l.setSelectionRange(r[0],r[1])}catch{}}}var ze=(n,e,t="",i="")=>`<button type="button" data-act="${n}" ${t} class="${i}">${e}</button>`,ud=n=>`<span class="mark${n?" ok":""}">${n?"\u2714 ":"\u25CB "}${L(n?P.done:P.todo)}</span>`;function qs(){document.documentElement.lang=At(),rt("t-title").textContent=L(P.appTitle),rt("t-sub").textContent=L(P.appSub),rt("t-badge").textContent=L(P.simBadge),document.title=L(P.appTitle),rt("l-mode").textContent=L(P.mode),rt("l-lang").textContent=L(P.language);let n=rt("sel-mode");n.options[0].textContent=L(P.guided),n.options[1].textContent=L(P.practice),n.options[2].textContent=L(P.assessment),n.value=A.mode,rt("sel-lang").value=At();let e=rt("btn-narr");e.textContent=`${L(P.narration)}: ${L(A.narration?P.on:P.off)}`,e.setAttribute("aria-pressed",String(A.narration)),e.disabled=!Qr,e.title=Qr?"":L(P.narrationNA);let t=rt("btn-cap");t.textContent=`${L(P.captions)}: ${L(A.captions?P.on:P.off)}`,t.setAttribute("aria-pressed",String(A.captions)),rt("btn-help").textContent=L(P.help),rt("help-title").textContent=L(P.helpTitle),rt("help-body").innerHTML=L(P.helpBody),rt("help-ok").textContent=L(P.helpStart),rt("stage-help").textContent=L(P.stageHelp),rt("stage-bar").innerHTML=`${ze("view",L(P.frontView),'data-v="front"')}<span class="sep"></span><span class="lbl">${L(P.closeups)}</span>`+[["display",P.vDisplay],["dial",P.vDial],["jacks",P.vJacks],["tips",P.vTips],["bench",P.vBench]].map(([i,s])=>ze("view",L(s),`data-v="${i}"`)).join("")+`<span class="sep"></span>${ze("zoom","+",`data-f="0.72" aria-label="${L(P.zoomIn)}"`)}${ze("zoom","\u2212",`data-f="1.38" aria-label="${L(P.zoomOut)}"`)}`,It||(rt("nogl").hidden=!1,rt("nogl").textContent=At()==="es"?"La vista 3D no est\xE1 disponible en este navegador (WebGL). Puedes usar el diagrama y los controles del panel.":"The 3D view is not available in this browser (WebGL). You can still use the diagram and the panel controls.")}function Rv(){if(A.mode==="assess"){let s=A.as,a=s.report?Wt.length:s.started?s.idx+(s.submitted?1:0):0;return`<div class="card nav"><h2>${L(P.asTitle)}</h2><div class="bar"><i style="width:${a/Wt.length*100}%"></i></div>
      <div class="meta"><span>${s.started&&!s.report?`${L(P.asTask)} ${s.idx+1} ${L(P.of)} ${Wt.length}`:""}</span></div></div>`}let n=ei(),e=Un.map((s,a)=>`<option value="${a}"${a===A.lessonIdx?" selected":""}>${a}. ${_t(L(s.title))}${A.completed[s.id]?" \u2714":""}</option>`).join(""),t=n.steps.length,i=A.finished?t:A.stepIdx+(A.ctx&&A.ctx.passed?1:0);return`<div class="card nav"><div class="nav-row"><select id="sel-lesson" aria-label="${L(P.lesson)}">${e}</select>${ze("restart",L(P.restartLesson))}</div>
    <small>${_t(L(n.blurb))}</small>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${t}" aria-valuenow="${i}"><i style="width:${i/t*100}%"></i></div>
    <div class="meta"><span>${L(P.step)} ${Math.min(t,A.stepIdx+1)} ${L(P.of)} ${t}</span><span>${L(P.estTime,{n:n.minutes})} \xB7 <span id="timer"></span> ${L(P.elapsed)}</span></div></div>`}function Pv(){let n=A.coach;if(n){let e=nn[n.code],t=n.expected?"expected":e.level,i=n.expected?At()==="es"?"Esperado en este paso":"Expected in this step":e.level==="block"?e.critical?At()==="es"?"Bloqueo de seguridad":"Safety block":At()==="es"?"A\xFAn no":"Not yet":e.level==="note"?At()==="es"?"Nota":"Note":At()==="es"?"Correcci\xF3n":"Coaching",s=At()==="es";return`<div class="card coach ${t}" role="alert"><h2><span class="kind">${i}</span><span>${Je(e.title)}</span></h2><dl>
      <div><dt>${s?"Qu\xE9 pas\xF3":"What happened"}</dt><dd>${Je(e.what,n.vars)}</dd></div>
      <div><dt>${s?"Por qu\xE9 importa":"Why it matters"}</dt><dd>${Je(e.why,n.vars)}</dd></div>
      <div><dt>${s?"C\xF3mo corregirlo":"How to fix it"}</dt><dd>${Je(e.fix,n.vars)}</dd></div></dl>
      <div class="btns">${ze("coach-retry",L(P.retry),"","primary")}${ze("coach-close",L(P.dismiss))}</div></div>`}if(A.info&&Yt[A.info.key]){let e=Yt[A.info.key];return`<div class="card coach info"><h2><span class="kind">${At()==="es"?"Parte":"Part"}</span><span>${Je(e.name)}</span></h2><p style="margin:0">${Je(e.info)}</p>
      <div class="btns">${ze("coach-close",L(P.dismiss))}</div></div>`}return""}function dd(n,e,t){let i=e.quizPick,s=e.quizOK;return`<div class="box"><p class="q">${Je(n.q)}</p><div class="opts">${n.opts.map((a,r)=>{let l="";return t?l=r===i?"picked":"":s&&r===n.correct?l="right":r===i&&!s&&(l="wrong"),ze("quiz",Je(a),`data-i="${r}" ${s&&!t?"disabled":""} aria-pressed="${r===i}"`,l)}).join("")}</div>
  ${!t&&s?`<p class="fb"><b>${L(P.correct)}</b> ${Je(n.explain)}</p>`:""}
  ${!t&&i!==void 0&&!s?`<p class="fb"><b>${L(P.notQuite)}</b> ${L(P.tryAgain)}.</p>`:""}</div>`}function Lv(n,e){let t=n.predict,i=e.predicted!==void 0,s=e.passed;return`<div class="box"><p class="q">${L(P.predictFirst)}: ${Je(t.q)}</p><div class="opts">${t.opts.map((a,r)=>ze("predict",Je(a),`data-i="${r}" aria-pressed="${e.predicted===r}" ${s?"disabled":""}`,e.predicted===r?"picked":"")).join("")}</div>
    ${s?`<p class="fb">${L(e.predicted===t.correct?P.predRight:P.predWrong)}</p>`:""}</div>`}function pd(n){let e=n.form,t=At()==="es",i=(s,a,r)=>`<option value="${s}"${a===s?" selected":""}>${r}</option>`;return`<div class="form">
    <label>${t?"Signo":"Sign"}<select id="f-sign">${i("",e.sign||"","\u2026")}${i("+",e.sign,t?"positivo (sin signo)":"positive (no sign)")}${i("-",e.sign,t?"negativo (\u2212)":"negative (\u2212)")}</select></label>
    <label>${t?"N\xFAmero":"Number"}<input type="text" id="f-num" inputmode="decimal" autocomplete="off" value="${_t(e.num||"")}"></label>
    <label>${t?"Unidad":"Unit"}<select id="f-unit">${i("",e.unit||"","\u2026")}${i("V",e.unit,"V")}${i("mV",e.unit,"mV")}</select></label>`}function Iv(n,e){let t;return n.entry.type==="reading"?t=`${pd(e)}${ze("entry-submit",L(P.check),"","primary")}</div>`:t=`<p class="q">${Je(n.entry.q)}</p><div class="form"><label>${n.entry.unit}<input type="text" id="f-num" inputmode="decimal" autocomplete="off" value="${_t(e.form.num||"")}"></label>${ze("entry-submit",L(P.check),"","primary")}</div>`,`<div class="box">${t}${e.entryOK?`<p class="fb"><b>${L(P.correct)}</b></p>`:e.entryMsg?`<p class="fb"><b>${L(P.notQuite)}</b> ${Je(e.entryMsg)}</p>`:""}</div>`}function Dv(n){let e=ad(n);return e.length?`<ul class="subs">${e.map(t=>`<li>${ud(t.ok)}<span>${Je(t.label)}</span></li>`).join("")}</ul>`:""}function kv(n){let e=A.ctx;if(!n.pair||e.passed||!Q.reading().valid||!Q.settled)return"";let t=Q.state.probes,i=[t.red,t.black];if(n.pair.includes(i[0])&&n.pair.includes(i[1])&&i[0]!==i[1])return"";let s=n.wantText?L(n.wantText):n.pair.map(en).join(" + ");return`<p class="state info">${L(P.wrongPair,{a:en(t.red),b:en(t.black),want:s})}</p>`}function Qu(){return A.log.length?`<div class="box"><h3>${L(P.results)}</h3><table class="log">${A.log.map(n=>`<tr><td>${Je(n.label)}</td><td>${_t(n.value)}</td></tr>`).join("")}</table></div>`:""}var Bc=()=>L(P.sequence).replace(/\.$/,"").split(" \u2192 ");function Ov(){if(A.mode==="assess")return Uv();let n=ei(),e=Gt(),t=A.ctx;if(A.finished){let f=A.lessonIdx===Un.length-1;return`<div class="card"><h2>\u2714 ${L(P.lessonComplete)}: ${_t(L(n.title))}</h2>
      <h3>${L(P.sequenceTitle)}</h3><ol class="seq">${Bc().map(g=>`<li>${_t(g)}</li>`).join("")}</ol>
      <div class="btns">${f?ze("go-assess",L(P.assessment),"","primary"):ze("next-lesson",L(P.nextLesson),"","primary")}${ze("restart",L(P.restartLesson))}</div></div>`}let i=A.mode==="guided"&&!e.independent,s=i||t.hint||t.passed||e.kind!=="do",a=i||t.explain||t.passed,r=(f,g,y)=>y?`<div class="${f}"><dt>${L(g)}</dt><dd>${Je(y)}</dd></div>`:"",l="";if(e.kind==="summary")l=`<p style="margin:0 0 4px">${L(P.sequenceTitle)}:</p><ol class="seq">${Bc().map(f=>`<li>${_t(f)}</li>`).join("")}</ol>
      <h3 style="margin-top:10px">${L(P.takeaways)}</h3><ul class="points">${e.points.map(f=>`<li>${Je(f)}</li>`).join("")}</ul>${Qu()}`;else{if(e.independent){let f=n.steps.filter(y=>y.independent),g=f.indexOf(e);l+=`<p class="state info" style="margin-top:0">${L(P.yourTurn)}</p><ol class="proc">${f.map((y,_)=>`<li class="${_<g||_===g&&t.passed?"done":_===g?"cur":""}"><span>${Je(y.title)}</span>${_<g||_===g&&t.passed?"<span>\u2714</span>":_===g?"<span>\u25C0</span>":"<span></span>"}</li>`).join("")}</ol>`}l+=`<dl class="five">${r("",P.goal,e.goal)}${r("",P.why,e.why)}${s?r("act",P.action,e.action):""}${a?r("",P.observe,e.observe)+r("",P.meaning,e.meaning):""}</dl>`,e.predict&&(l+=Lv(e,t)),l+=Dv(e),e.kind==="quiz"&&(l+=dd(e.quiz,t)),e.kind==="entry"&&(l+=Iv(e,t)),e.kind==="ack"&&(l+=`<div class="btns">${ze("ack",L(P.cont),t.acked?"disabled":"","primary")}</div>`),l+=kv(e),t.again&&(l+=`<div class="again"><b>${L(P.inShort)}:</b> ${Je(e.again||e.action)}${e.observe?`<br><b>${L(P.youShouldSee)}:</b> ${Je(e.observe)}`:""}</div>`),(e.kind==="do"||e.kind==="entry")&&(l+=`<p class="state${t.passed?" ok":""}" role="status">${A.demo?L(P.demoRunning):t.passed?t.demoDone?L(P.demoDone):`\u2714 ${L(P.stepDone)}`:L(P.stepWaiting)}</p>`),!e.record&&e.kind!=="summary"&&A.log.length&&(n.id==="l5"||n.id==="l7")&&(l+=Qu())}let c=!e.independent&&e.kind!=="summary"&&(e.demo||e.kind==="quiz"||e.kind==="ack"),h=e.kind==="summary"?"":`<div class="btns">
    ${c?ze("showme",L(P.showMe),A.demo?"disabled":""):""}
    ${e.independent?"":ze("tryit",L(P.letMeTry),A.demo?"disabled":"")}
    ${!i&&e.kind==="do"&&!t.hint?ze("hint",L(P.hint)):""}
    ${!i&&!t.explain&&!t.passed?ze("explain",L(P.explain)):""}
    ${ze("again",L(P.explainAgain))}${ze("reset",L(P.reset),A.demo?"disabled":"")}</div>`,u=A.stepIdx===n.steps.length-1,d=`<div class="btns navb">${ze("back",`\u2190 ${L(P.back)}`,A.stepIdx===0||A.demo?"disabled":"")}${ze("next",`${L(u?P.finish:P.next)} \u2192`,t.passed&&!A.demo?"":"disabled","primary")}</div>`;return`<div class="card"><h2>${Je(e.title)}</h2>${l}${h}${d}</div>`}function Uv(){let n=A.as;if(!n.started)return`<div class="card"><h2>${L(P.asTitle)}</h2><p>${L(P.asIntro)}</p><ol class="points">${Wt.map(s=>`<li>${Je(s.title)}</li>`).join("")}</ol>
      <div class="btns">${ze("as-start",L(P.asStart),"","primary")}</div></div>`;if(n.report)return Nv();let e=Gs(),t=A.ctx,i=`<p>${Je(e.prompt)}</p>`;if(e.quiz&&(i+=dd(e.quiz,{quizPick:t.quizPick},!0)),e.entry&&(i+=`<div class="box">${pd(t)}</div></div>`),t.needAnswer&&t.quizPick===void 0&&(i+=`<p class="state info">${At()==="es"?"Elige una respuesta antes de enviar.":"Choose an answer before you submit."}</p>`),!n.submitted)i+=`<div class="btns">${ze("as-submit",L(P.submit),"","primary")}</div>`;else{let s=n.feedback;i+=`<p class="state ${s.pass?"ok":"bad"}" role="status">${s.pass?`\u2714 ${L(P.asPass)}`:`\u2718 ${L(P.asFail)}`}</p>`,s.msgs.length&&(i+=`<ul class="points">${s.msgs.map(r=>`<li>${Je(r)}</li>`).join("")}</ul>`),s.notes.length&&(i+=`<ul class="points">${s.notes.map(r=>`<li><b>${Je(nn[r].title)}:</b> ${Je(nn[r].why,Wc(r,{}))}</li>`).join("")}</ul>`),i+=`<div class="again">${Je(e.explain)}</div>`;let a=n.idx===Wt.length-1;i+=`<div class="btns">${s.pass?"":ze("as-retry",L(P.asRetryTask))}${ze(a?"as-report":"as-next",L(a?P.asReport:P.asNextTask),"","primary")}</div>`}return`<div class="card"><h3>${L(P.asTask)} ${n.idx+1} ${L(P.of)} ${Wt.length}</h3><h2>${Je(e.title)}</h2>${i}</div>`}function Nv(){let n=A.as,e=Ev();if(e.length)return`<div class="card rep"><h2>${L(P.repBlocked)}</h2><p>${L(P.repBlockedHelp)}</p>
      <ul>${e.map(h=>`<li><span><b>${Je(nn[h].title)}</b><br>${Je(nn[h].fix,Wc(h,{}))}</span><span class="mark">${L(P.repOpen)}</span></li>`).join("")}</ul></div>`;let t=Cv(),i=h=>{let u=Un.findIndex(d=>d.id===h);return`${L(P.lesson)} ${u}: ${L(Un[u].title)}`},s=Wt.map(h=>{let u=n.results[h.id],d=u&&u.first?P.asFirstTry:u&&u.passed?P.asAfterRetry:P.asNotPassed;return`<li><span>${Je(h.title)}</span><span class="mark${u&&u.passed?" ok":""}">${u&&u.passed?"\u2714 ":"\u25CB "}${L(d)}</span></li>`}).join(""),a=Object.keys(A.errors),r=a.length?a.map(h=>`<li><span>${Je(nn[h].title)} ${L(P.repTimes,{n:A.errors[h].count})}</span><span class="mark${A.errors[h].corrected?" ok":""}">${A.errors[h].corrected?`\u2714 ${L(P.repCorrected)}`:`\u25CB ${L(P.repOpen)}`}</span></li>`).join(""):`<li><span>${L(P.repNoErrors)}</span><span></span></li>`,l=t.topics.length?t.topics.map(h=>`<li><span>${_t(i(h))}</span><span></span></li>`).join(""):`<li><span>${L(P.repNothing)}</span><span></span></li>`,c=Wt.filter(h=>n.results[h.id]&&n.results[h.id].passed).length;return`<div class="card rep"><h2>${L(P.repTitle)}</h2>
    <p><b>${c} / ${Wt.length}</b> \u2014 ${L(P.repSkills).toLowerCase()}</p>
    <h3>${L(P.repSkills)}</h3><ul>${s}</ul>
    <h3>${L(P.repErrors)}</h3><ul>${r}</ul>
    <h3>${L(P.repRepeat)}</h3><ul>${l}</ul>
    <h3>${L(P.repNext)}</h3><p class="rec">${t.first?_t(L(P.repPracticeLesson,{lesson:i(t.first)})):L(P.repAllGood)}</p>
    <h3>${L(P.sequenceTitle)}</h3><ol class="seq">${Bc().map(h=>`<li>${_t(h)}</li>`).join("")}</ol>
    <p class="small">${L(P.repDisclaimer)}</p>
    <div class="btns">${ze("as-practice",L(P.repGoPractice),`data-i="${t.first?Un.findIndex(h=>h.id===t.first):7}"`,"primary")}${ze("as-start",L(P.repAgain))}</div></div>`}function Vv(){let n=Q.state,e=Q.reading(),t=[],i;return e.power?e.reason==="not_voltage"?i=L(P.stNotV):e.reason==="leads"?i=L(P.stLeads):e.reason==="open"?i=e.openLeads.length===2?L(P.stOpenBoth):L(P.stOpenOne,{lead:vi(e.openLeads[0])}):e.reason==="separate"?i=L(P.stSeparate):(i=`${L(P.stValid,{r:en(n.probes.red),b:en(n.probes.black)})} ${L(Q.settled?P.stSettled:P.stSettling)}`,A.mode==="assess"&&!A.as.submitted||(e.mismatch&&t.push(L(P.stMismatch)),e.sameNode&&t.push(L(P.stSameNode))),Q.live.ol&&t.push(L(P.stOver))):i=L(P.stOff),Q.holdStale()&&!(A.mode==="assess"&&!A.as.submitted)&&t.unshift(L(P.stHoldStale)),{main:i,flags:t}}function Fv(){let n=Q.display,e=Vv(),t=n.unit==="V"?n.rangeSel==="AUTO"?`AUTO (${n.rangeActive} V)`:`${L(P.rangeManual)} ${n.rangeSel} V`:"",i=n.on?`${n.mode} ${n.neg?"\u2212":""}${n.digits} ${n.unit}${n.hold?" HOLD":""}`:L(P.meterOff);return`<div class="card"><h3>${L(P.meterTitle)}</h3>
    <div class="lcd${n.on?"":" off"}" aria-label="${_t(i)}">
      <div class="row"><span>${n.on?n.mode==="DC"?Je("DC \u2393"):n.mode==="AC"?"AC ~":n.mode==="OHM"?"\u03A9":"A":L(P.meterOff)}</span>${n.hold?`<span class="holdflag">${L(P.holdOn)}</span>`:""}<span>${t}</span></div>
      <div class="big"><span>${n.on?`${n.neg?"\u2212":""}${n.digits}`:""}</span><span class="unit">${n.on?n.unit:""}</span></div>
    </div>
    <p class="status"><b>${L(P.statusTitle)}</b>${_t(e.main)}${e.flags.map(s=>`<span class="flag">\u26A0 ${_t(s)}</span>`).join("")}</p></div>`}function Xc(){if(A.mode==="assess"){let e=Gs();return e?e.diagram:"none"}let n=Gt();return n&&n.diagram||ei().diagram}function Bv(){let n=Xc(),e=oh(n,Q,A.ui);if(!e)return"";let t=n==="lamp9"||n==="panel24"?`<div class="btns">${ze("switch",`${L(n==="lamp9"?P.swLamp9:P.swPanel)}: ${L(Q.state.switches[n]?P.closed:P.open)}`,`data-id="${n}" aria-pressed="${Q.state.switches[n]}"`)}</div>`:"",i=po(n).length>0,s=A.diagramOpen!==!1;return`<div class="card dg"><div class="dg-head"><h3>${L(P.diagram)}</h3>${ze("dg-toggle",s?"\u2013":"+",`aria-expanded="${s}" aria-label="${L(P.diagram)}"`)}</div>${s?`${e}${t}${i?`<p class="small">${L(P.diagramHelp)}</p>`:""}`:""}</div>`}function zv(){let n=Q.state,e=A.inspMsg,t="";e&&(t=`<div class="s">${L(e.replaced?P.inspReplaced:e.damaged?P.inspBad:P.inspOK,{item:Ia(e.item)})}</div>`);let i=["red","black"].filter(a=>n.damaged[a]&&n.inspected[a]),s=[["inspect",`${["meter","red","black"].map(a=>ze("inspect",`${n.inspected[a]?"\u2714 ":""}${Ia(a)}`,`data-item="${a}"`)).join("")}${i.map(a=>ze("replace",L(P.replaceLead),`data-lead="${a}"`,"primary")).join("")}`,t],["jacks",ze("confirm",L(P.confirm),'data-item="jacks"'),`<div class="s">${L(P.nowIs)}: ${L(P.black)} \u2192 ${n.plugs.black?Qi[n.plugs.black]:L(P.unplugged)}, ${L(P.red)} \u2192 ${n.plugs.red?Qi[n.plugs.red]:L(P.unplugged)}</div>`],["func",ze("confirm",L(P.confirm),'data-item="func"'),`<div class="s">${L(P.nowIs)}: ${Je(Fa[n.dial])}</div>`],["range",ze("confirm",L(P.confirm),'data-item="range"'),`<div class="s">${L(P.nowIs)}: ${Q.isVMode()?n.range==="AUTO"?"AUTO":`${L(P.rangeManual)} ${n.range} V`:"\u2014"}</div>`],["points",n.intended.length?ze("clear-points",L(P.clear)):"",`<div class="s">${L(P.intended)}: ${n.intended.length?n.intended.map(en).join(", "):L(P.none)}</div>`],["guards",ze("confirm",L(P.confirm),'data-item="guards"'),""],["bridge",ze("confirm",L(P.confirm),'data-item="bridge"'),""]];return`<div class="card"><h3>${L(P.checklist)}</h3><p class="small" style="margin:0 0 6px">${L(P.checklistNote)}</p><ul class="ck">${s.map(([a,r,l])=>{let c=Q.checkItem(a);return`<li>${ud(c)}<div><div class="t">${L(Hc[a])}</div>${l}${r&&!(c&&["jacks","func","range","guards","bridge"].includes(a))?`<div class="row">${r}</div>`:""}</div></li>`}).join("")}</ul></div>`}function Hv(){let n=Q.state,e=A.ui.selected,t=Xc(),i=po(t);i.length||(i=Object.keys(Tt).filter(l=>!Tt[l].bridge));let s=l=>`<label>${Ia(l)} <select data-plug="${l}" id="plug-${l}"><option value="">${L(P.unplugged)}</option>${Jc.map(c=>`<option value="${c}"${n.plugs[l]===c?" selected":""}>${Qi[c]}</option>`).join("")}</select></label>`,a=l=>{let c=e&&e.kind==="probe"&&e.lead===l,h=n.probes[l]?en(n.probes[l]):L(P.parked);return ze("pick",`${L(c?P.park:P.pickUp,{c:vi(l)})} \xB7 ${h}`,`data-lead="${l}" aria-pressed="${!!c}"`)},r=["meter","display","dial","jack:COM","jack:V","jack:A","jack:mA","probe:handle","probe:guard","probe:tip"];return`<details class="card" ${A.controlsOpen?"open":""} id="controls"><summary>${L(P.controls)}</summary><div class="ctl">
    <div><h4>${L(P.dial)}</h4><div class="row">${Zs.map(l=>ze("dial",Je(Js[l]),`data-pos="${l}" aria-pressed="${n.dial===l}" aria-label="${_t(L(Fa[l]))}"`)).join("")}</div></div>
    <div><h4>${L(P.range)} / ${L(P.hold)}</h4><div class="row">${Ys.map(l=>ze("range",l==="AUTO"?"AUTO":`${l} V`,`data-r="${l}" aria-pressed="${n.range===l}"`)).join("")}${ze("hold","HOLD",`aria-pressed="${n.hold}"`)}</div></div>
    <div><h4>${L(P.leadsJacks)}</h4><div class="row">${s("black")}${s("red")}</div></div>
    <div><h4>${L(P.probes)}</h4><div class="row">${a("black")}${a("red")}</div></div>
    <div><h4>${L(P.testPoints)}</h4><div class="row">${i.map(l=>ze("term",`${n.intended.includes(l)?"\u2714 ":""}${en(l)}`,`data-term="${l}"`)).join("")}</div><p class="small">${L(P.tpHelp)}</p></div>
    <div><h4>${L(P.switches)}</h4><div class="row">${["lamp9","panel24"].map(l=>ze("switch",`${L(l==="lamp9"?P.swLamp9:P.swPanel)}: ${L(n.switches[l]?P.closed:P.open)}`,`data-id="${l}" aria-pressed="${n.switches[l]}"`)).join("")}</div></div>
    <div><h4>${At()==="es"?"\xBFQu\xE9 es esto?":"What is this?"}</h4><div class="row">${r.map(l=>ze("part",Je(Yt[l].name),`data-key="${l}"`)).join("")}</div></div>
  </div></details>`}function Gv(){return`<details class="card" ${A.glossOpen?"open":""} id="gloss"><summary>${L(P.glossary)}</summary><dl class="gloss">${Kc.map(([n,e])=>`<div><dt>${Je(n)}</dt><dd>${Je(e)}</dd></div>`).join("")}</dl></details>`}function Wv(){if(A.flash&&performance.now()<A.flash.until)return A.flash.keys;if(A.mode==="assess"||A.finished)return[];let n=Gt(),e=A.ctx;return!n||e.passed||e.tryMode||A.demo?[]:A.mode==="practice"&&!e.hint?[]:n.independent&&!e.hint?[]:fd(n)}function fd(n){return(typeof n.hi=="function"?n.hi(Q):n.hi)||[]}function qv(){A.ui.highlights=Wv(),Kn("r-nav",Rv()),Kn("r-coach",Pv()),Kn("r-step",Ov()),Kn("r-meter",Fv());let n=Bv();Kn("r-diagram",n),Kn("s-diagram",n),Kn("r-check",zv()),Kn("r-controls",Hv()),Kn("r-gloss",Gv());let e=rt("timer");if(e){let l=Math.floor((performance.now()-A.started)/1e3),c=`${String(Math.floor(l/60)).padStart(2,"0")}:${String(l%60).padStart(2,"0")}`;e.textContent!==c&&(e.textContent=c)}let t=rt("caption"),i="";if(A.captions){if(A.caption&&performance.now()<A.caption.until)i=A.caption.text;else if(A.mode==="assess"){let l=Gs();i=l?L(l.title):""}else if(!A.finished){let l=Gt();i=A.mode==="guided"&&!l.independent||A.ctx.hint?ed(l.action):ed(l.goal)}}t.textContent!==i&&(t.textContent=i),t.hidden=!i;let s=rt("chip"),a=A.ui.selected,r=a?`${L(P.selected)}: ${a.kind==="probe"?L(P.holding,{c:vi(a.lead)}):`${L(Yt.plug.name)} (${vi(a.lead)})`}`:"";s.textContent!==r&&(s.textContent=r),s.hidden=!r}var ed=n=>L(n).replace(/<[^>]+>/g,"");Q.on(n=>{A.ctx&&A.ctx.events.push(n),(n.type==="error"||n.type==="detect")&&(Nc(n.code,n),A.coach&&A.coach.code===n.code&&(A.coach.t=performance.now()));let e=Gt();if(e&&e.onEvent&&A.ctx&&!A.ctx.passed){let t=e.onEvent(n,A.ctx,Q);t&&(Nc(t,n),A.coach&&(A.coach.t=performance.now()))}nd(n),mt=!0});Q.guards.push(n=>{let e=Gt();return n==="touch"&&e&&e.predict&&A.ctx&&A.ctx.predicted===void 0&&!A.finished?"predict_first":null});var zc={next:()=>Vc(),back:()=>$c(A.stepIdx-1,!0),showme:()=>Av(),tryit:()=>{to(),A.ctx.tryMode=!0},again:()=>{A.ctx.again=!0;let n=Gt();It&&n.focus&&It.focus(n.focus),A.flash={keys:fd(n),until:performance.now()+5e3},Ws([n.again||n.action,n.observe].filter(Boolean).map(e=>Dn(e)).join(". "))},reset:()=>to(),restart:()=>zs(A.lessonIdx),hint:()=>{A.ctx.hint=!0},"dg-toggle":()=>{A.diagramOpen=A.diagramOpen===!1},explain:()=>{A.ctx.explain=!0},ack:()=>{A.ctx.acked=!0,rd(),A.ctx.passed&&Vc()},quiz:n=>{A.mode==="assess"?A.as.submitted||(A.ctx.quizPick=Number(n.i)):ld(Number(n.i))},predict:n=>{A.ctx.predicted=Number(n.i)},"entry-submit":()=>jc(),"coach-retry":()=>_v(),"coach-close":()=>{A.coach=null,A.info=null},confirm:n=>Q.confirm(n.item),inspect:n=>Da(n.item),replace:n=>id(n.lead),"clear-points":()=>Q.setIntended([]),dial:n=>{yi("dial"),Q.setDial(n.pos)},range:n=>Q.setRange(n.r==="AUTO"?"AUTO":Number(n.r)),hold:()=>Q.toggleHold(),pick:n=>{yi("probe:handle"),io(n.lead)},term:n=>ka(n.term),switch:n=>Q.toggleSwitch(n.id),part:n=>{let e=n.key;e==="probe:tip"?(Qn(e),Q.grip("red","tip")):e==="meter"?(Qn(e),Da("meter")):Qn(e)},"next-lesson":()=>zs(Math.min(Un.length-1,A.lessonIdx+1)),"go-assess":()=>Yc("assess"),"as-start":()=>Tv(),"as-submit":()=>hd(),"as-retry":()=>Fc(A.as.idx),"as-next":()=>Fc(A.as.idx+1),"as-report":()=>{A.as.report=!0,A.coach=null,A.ui.highlights=[]},"as-practice":n=>{A.mode="practice",Hs(),qs(),zs(Number(n.i))},view:n=>{if(It)if(n.v==="bench"){let e=Gt(),t=Gs(),i=Xc();It.focus(i&&i!=="none"&&i!=="analogy"&&i!=="wave"?i:e&&e.focus||t&&t.focus||"front")}else It.focus(n.v)},zoom:n=>It&&It.zoom(Number(n.f))};function Yc(n){A.mode=n,Hs(),qs(),A.coach=null,A.info=null,n==="assess"?(A.as={started:!1,idx:0,results:{},submitted:!1,feedback:null,notes:new Set,report:!1},A.ctx=no(),Q.reset(),A.ui.rest="home",It&&It.focus("front")):zs(A.lessonIdx),mt=!0}function $v(n){let e=n.target.closest("[data-act]");if(e){if(e.disabled)return;!(A.demo&&!["again","view","zoom","coach-close","dg-toggle"].includes(e.dataset.act))&&zc[e.dataset.act]&&zc[e.dataset.act](e.dataset),mt=!0;return}let t=n.target.closest("[data-term]");t&&!A.demo&&(ka(t.dataset.term),mt=!0)}document.addEventListener("click",$v);document.addEventListener("keydown",n=>{n.key==="Escape"&&A.ui.selected&&(A.ui.selected=null,mt=!0);let e=n.target.closest&&n.target.closest("svg [data-term]");e&&(n.key==="Enter"||n.key===" ")&&!A.demo&&(n.preventDefault(),ka(e.dataset.term),mt=!0)});document.addEventListener("change",n=>{let e=n.target;e.id==="sel-lesson"?zs(Number(e.value)):e.id==="sel-mode"?Yc(e.value):e.id==="sel-lang"?(ao(e.value),Hs(),qs(),It&&It.refreshLabels(),Gc()):e.dataset.plug&&!A.demo?sd(e.dataset.plug,e.value||null):e.id==="f-sign"?A.ctx.form.sign=e.value:e.id==="f-unit"&&(A.ctx.form.unit=e.value),mt=!0});document.addEventListener("input",n=>{n.target.id==="f-num"&&A.ctx&&(A.ctx.form.num=n.target.value)});document.addEventListener("keydown",n=>{n.key==="Enter"&&n.target.id==="f-num"&&(A.mode==="assess"?A.as.submitted||hd():jc(),mt=!0)});document.addEventListener("toggle",n=>{n.target.id==="controls"&&(A.controlsOpen=n.target.open),n.target.id==="gloss"&&(A.glossOpen=n.target.open)},!0);rt("btn-narr").addEventListener("click",()=>{A.narration=!A.narration,!A.narration&&Qr&&speechSynthesis.cancel(),Hs(),qs(),A.narration&&Gc()});rt("btn-cap").addEventListener("click",()=>{A.captions=!A.captions,Hs(),qs(),mt=!0});rt("btn-help").addEventListener("click",()=>rt("help").showModal());var It=Yu(rt("stage"),Q,xv);qs();A.mode==="assess"?Yc("assess"):zs(0);if(!Xi.lang)try{rt("help").showModal()}catch{}var td=performance.now(),Uc=0;function md(n){let e=Math.min(.1,(n-td)/1e3);td=n,Q.tick(e),A.mode!=="assess"&&rd(),nd(null),Uc+=e,(mt||Uc>.12)&&(mt=!1,Uc=0,qv()),It&&It.update(e),document.querySelectorAll("canvas.wave").forEach(t=>lh(t,n/1e3)),requestAnimationFrame(md)}requestAnimationFrame(md);window.__voltageLab={sim:Q,app:A,scene:It,LESSONS:Un,TASKS:Wt,actions:zc,clickPart:qc,pickUp:io,chooseTerm:ka,perform:od};})();
/*! Bundled license information:

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2024 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
