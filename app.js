/* مِخبار — منطق واجهة المحاكاة. بيانات الكيمياء موجودة في chemistry-data.js */
'use strict';

let selectedAcid = null;
let selectedSalt = null;
let lastReaction = null;
let currentMode = 'primary';
let activeTestId = null;
let activeSimulationTitle = 'التفاعل الأساسي';
const $ = id => document.getElementById(id);

function norm(s){
  return String(s||'').toLowerCase()
    .replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/[ىي]/g,'ي')
    .replace(/[ًٌٍَُِّْـ]/g,'').replace(/₂/g,'2').replace(/₃/g,'3')
    .replace(/₄/g,'4').replace(/₅/g,'5').replace(/₆/g,'6')
    .replace(/₇/g,'7').replace(/₈/g,'8').replace(/₉/g,'9')
    .replace(/₀/g,'0').replace(/⁺/g,'+').replace(/⁻/g,'-')
    .replace(/\s+/g,' ').trim();
}
function matches(item, query){
  const q=norm(query); if(!q)return true;
  return norm([item.name,item.formula,item.aliases||''].join(' ')).includes(q);
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function gasMetaFor(r){
  const s=norm([r?.gasName,r?.gasKey].join(' '));
  if(s.includes('بروم')&&s.includes('ثاني اكسيد الكبريت'))return null;
  if(s.includes('h2s')||s.includes('كبريتيد الهيدروجين')) return gasProperties.h2s;
  if(s.includes('so2')||s.includes('ثاني اكسيد الكبريت')) return gasProperties.so2;
  if(s.includes('co2')||s.includes('ثاني اكسيد الكربون')) return gasProperties.co2;
  if(s.includes('no2')||s.includes('ثاني اكسيد النيتروجين')) return gasProperties.no2;
  if(s.includes('no')||s.includes('اكسيد النيتريك')) return gasProperties.no;
  if(s.includes('br2')||s.includes('بروم')) return gasProperties.br2;
  if(s.includes('i2')||s.includes('يود')) return gasProperties.i2;
  if(s.includes('hcl')||s.includes('كلوريد الهيدروجين')) return gasProperties.hcl;
  if(s.includes('cl2')||s.includes('كلور')) return gasProperties.cl2;
  return null;
}
function renderLists(){
  const sq=$('saltSearch').value, aq=$('acidSearch').value;
  const foundSalts=salts.filter(x=>matches(x,sq));
  const foundAcids=acids.filter(x=>matches(x,aq));
  $('saltCount').textContent=foundSalts.length+' أملاح';
  $('acidCount').textContent=foundAcids.length+' أحماض';
  $('saltList').innerHTML=foundSalts.length?foundSalts.map(s=>`<button type="button" class="item ${selectedSalt?.id===s.id?'selected':''}" data-salt="${esc(s.id)}" aria-pressed="${selectedSalt?.id===s.id}"><span class="formula">${esc(s.formula)}</span><span class="name">${esc(s.name)}</span><span class="category">ملح</span></button>`).join(''):'<div class="emptyList">مفيش ملح مطابق للبحث.</div>';
  $('acidList').innerHTML=foundAcids.length?foundAcids.map(a=>`<button type="button" class="item ${selectedAcid?.id===a.id?'selected':''}" data-acid="${esc(a.id)}" aria-pressed="${selectedAcid?.id===a.id}"><span class="formula">${esc(a.formula)}</span><span class="name">${esc(a.name)}</span><span class="category">${esc(a.strength||'حمض')}</span></button>`).join(''):'<div class="emptyList">مفيش حمض مطابق للبحث.</div>';
  $('selectedSaltName').textContent=selectedSalt?.name||'لم تختَر ملحًا';
  $('selectedSaltFormula').textContent=selectedSalt?.formula||'—';
  $('selectedAcidName').textContent=selectedAcid?.name||'لم تختَر حمضًا';
  $('selectedAcidFormula').textContent=selectedAcid?.formula||'—';
}
function resetVisual(message='اختار ملحًا وحمضًا ثم اختر نوع التفاعل.'){
  const stage=$('tubeStage');
  stage.classList.remove('gas','solid','mixing','hasOutput','paperTest');
  $('liquidFill').setAttribute('fill','#75cce8');
  $('liquidFill').setAttribute('fill-opacity','0.23');
  $('liquidSurface').setAttribute('stroke','#c2f3ff');
  $('sedimentBed').setAttribute('fill','#e5e7eb');
  $('precipitate').style.opacity='0';
  $('testPaperReagent').setAttribute('fill','#e49b34');
  if($('solidCalloutLabel'))$('solidCalloutLabel').textContent='الراسب في القاع';
  if($('solutionCalloutLabel'))$('solutionCalloutLabel').textContent='لون المحلول';
  ['gasCallout','solidCallout','solutionCallout'].forEach(id=>$(id).classList.remove('visible'));
  $('tubeStateLabel').textContent='جاهز للتفاعل';
  $('tubeCaption').textContent=message;
  $('resultArea').className='resultArea empty';
  $('resultArea').textContent=message;
}
function chooseAcid(id){
  activeTestId=null;
  selectedAcid=acids.find(a=>a.id===id)||null;
  renderLists();
  resetVisual(selectedSalt&&selectedAcid?'اضغط «التفاعل الأساسي» لعرض النتيجة الجديدة.':'اختار حمضًا وملحًا لبدء المحاكاة.');
  if(currentMode==='confirmatory')renderConfirmatoryPicker();
}
function chooseSalt(id){
  activeTestId=null;
  selectedSalt=salts.find(s=>s.id===id)||null;
  renderLists();
  resetVisual(selectedSalt&&selectedAcid?'اضغط «التفاعل الأساسي» لعرض النتيجة الجديدة.':'اختار حمضًا وملحًا لبدء المحاكاة.');
  renderConfirmatoryPicker();
}
function setMode(mode){
  currentMode=mode;
  const primary=mode==='primary';
  $('primaryModeButton').classList.toggle('active',primary);
  $('confirmModeButton').classList.toggle('active',!primary);
  $('primaryModeButton').setAttribute('aria-pressed',String(primary));
  $('confirmModeButton').setAttribute('aria-pressed',String(!primary));
  $('primaryModeInfo').hidden=!primary;
  $('confirmModeInfo').hidden=primary;
  if(primary){
    if(selectedAcid&&selectedSalt)runReaction();
    else resetVisual('اختار حمضًا وملحًا أولًا، ثم اضغط «التفاعل الأساسي».');
  } else {
    renderConfirmatoryPicker();
    if(!selectedSalt)resetVisual('اختار الملح/الأيون أولًا عشان تظهر اختبارات التأكيد المتاحة.');
    else if(!activeTestId)resetVisual('اختار الاختبار التأكيدي من القائمة الظاهرة فوق المخبار.');
  }
}
function setCallout(id, show, name, color, colorLabel, swatch){
  const box=$(id); if(!box)return;
  box.classList.toggle('visible',!!show);
  const names={gasCallout:'gasCalloutName',solidCallout:'solidCalloutName',solutionCallout:'solutionCalloutName'};
  const labels={gasCallout:'gasCalloutColor',solidCallout:'solidCalloutColor',solutionCallout:'solutionCalloutColor'};
  const swatches={gasCallout:'gasSwatch',solidCallout:'solidSwatch',solutionCallout:'solutionSwatch'};
  if(name)$(names[id]).textContent=name;
  if(colorLabel)$(labels[id]).textContent=colorLabel;
  const sw=$(swatches[id]);
  if(sw&&color)sw.style.background=color;
  if(sw&&swatch)sw.style.setProperty('--swatch',swatch);
}
function applyVisual(r, title){
  const stage=$('tubeStage');
  stage.classList.remove('gas','solid','mixing','hasOutput','paperTest');
  void stage.offsetWidth;
  stage.classList.add('mixing');
  const meta=r.gas?gasMetaFor(r):null;
  const paperTest=r.visualType==='paper';
  stage.classList.toggle('paperTest',paperTest);
  const liquidColor=paperTest?(r.liquidColor||'#75cce8'):(r.solutionColor||'#75cce8');
  $('liquidFill').setAttribute('fill',liquidColor);
  $('liquidFill').setAttribute('fill-opacity',r.kind==='none'?'0.2':(!paperTest&&r.solutionColor?'0.58':'0.42'));
  if(paperTest)$('testPaperReagent').setAttribute('fill',r.paperColor||r.solutionColor||'#e49b34');
  $('liquidSurface').setAttribute('stroke',r.solutionColor||'#dcfbff');
  stage.style.setProperty('--gas-color',r.gasColor||meta?.color||'#d8f4fb');
  stage.style.setProperty('--gas-stroke',r.gasStroke||'#8ed7f4');
  $('sedimentBed').setAttribute('fill',r.precipColor||'#e5e7eb');
  $('precipitate').querySelectorAll('circle').forEach((c,i)=>c.setAttribute('fill',i%2?'#ffffff78':(r.precipParticleColor||'#c7c8c8')));
  $('precipitate').style.opacity='0';
  if(r.gas||r.kind==='gasSolid')stage.classList.add('gas');
  if(r.precipitate&&!paperTest){stage.classList.add('solid');$('precipitate').style.opacity='1';}
  else $('precipitate').style.opacity='0';
  if(r.kind==='none'&&!r.solutionColor){$('liquidFill').setAttribute('fill','#9ad8d0');$('liquidFill').setAttribute('fill-opacity','0.2');}
  const gasDisplayColor=r.gasColor||meta?.color||'#d8f4fb';
  const gasDisplayLabel=r.gasColorLabel||meta?.appearance||'اللون غير محدد في البيانات المضافة';
  setCallout('gasCallout',!!r.gas,r.gasName||meta?.name||'غاز ناتج',gasDisplayColor,gasDisplayLabel,gasDisplayColor);
  setCallout('solidCallout',!!r.precipitate,r.solidName||'راسب ناتج',r.precipColor||'#f1f0e8',r.solidColorLabel||r.precipLabel||'لون الراسب غير محدد',r.precipColor||'#f1f0e8');
  setCallout('solutionCallout',!!r.solutionColor,r.solutionName||'المحلول/الكاشف بعد الاختبار',r.solutionColor,r.solutionColorLabel||'تغيّر لون المحلول',r.solutionColor);
  if($('solidCalloutLabel'))$('solidCalloutLabel').textContent=r.solidLocation||(paperTest&&r.precipitate?'لون/راسب على ورقة الاختبار':'الراسب في القاع');
  if($('solutionCalloutLabel'))$('solutionCalloutLabel').textContent=paperTest?'لون ورقة الاختبار':'لون المحلول';
  stage.classList.toggle('hasOutput',!!(r.gas||r.precipitate||r.solutionColor));
  const label=paperTest?(r.paperLabel||'تغيّر لون ورقة الاختبار'):r.precipitate&&r.gas?'غاز + راسب':r.precipitate?'راسب في القاع':r.gas?'فقاعات الغاز':r.solutionColor?'تغيّر لون المحلول':r.kind==='none'?'لا تغير مرئي':'المشهد التفاعلي';
  $('tubeStateLabel').textContent=label;
  $('tubeCaption').textContent=title+(r.obs?' — '+r.obs:'');
  $('tubeCaption').title=r.obs||'';
}
function detailSwatch(color,label){return `<span class="miniSwatch" style="background:${esc(color||'#d8f4fb')}"></span><span>${esc(label||'غير مذكور')}</span>`;}
function equationBlock(title, equation, subtitle=''){
  return `<div class="resultSection"><h4>${esc(title)}</h4><div class="eq">${esc(equation||'لم تتم إضافة معادلة موثوقة لهذه الحالة بعد.')}${subtitle?`<small>${esc(subtitle)}</small>`:''}</div></div>`;
}
function resultHTML(r, mode='primary', title=''){
  const meta=r.gas?gasMetaFor(r):null;
  const isConfirmation=mode==='confirmatory';
  let kindTitle='نتيجة التفاعل';
  if(r.visualType==='paper')kindTitle='اختبار لوني على ورقة الكاشف';
  else if(r.kind==='gas')kindTitle='تصاعد غاز';
  else if(r.kind==='precipitate')kindTitle='تكوّن راسب';
  else if(r.kind==='gasSolid')kindTitle='تصاعد غاز وتكوّن راسب';
  else if(r.kind==='none')kindTitle='لا تغيّر مرئي متوقع';
  else if(r.kind==='solution')kindTitle='تغيّر لون الكاشف/المحلول';
  else if(r.kind==='unknown')kindTitle='البيانات غير مكتملة لهذا الزوج';
  const tags=(r.tags||[]).map(t=>`<span class="count">${esc(t)}</span>`).join(' ');
  let html=`<div class="simState">${esc(title||activeSimulationTitle)}</div><div class="resultTitle"><span class="resultIcon">${isConfirmation?'✓':'⚗'}</span><span>${kindTitle}</span></div>`;
  if(isConfirmation){
    html+=`<div class="selectedBar"><span>العينة:</span><b>${esc(selectedSalt?.name||'غير محددة')}</b><span class="value">${esc(selectedSalt?.formula||'—')}</span><span>· اختبار تأكيدي</span></div>`;
  } else {
    html+=`<div class="selectedBar"><span>الملح:</span><b>${esc(selectedSalt?.name||'—')}</b><span class="value">${esc(selectedSalt?.formula||'—')}</span><span>+</span><b>${esc(selectedAcid?.name||'—')}</b><span class="value">${esc(selectedAcid?.formula||'—')}</span></div>`;
  }
  html+='<div class="outputDetails">';
  if(r.gas){
    const appearance=r.gasColorLabel||meta?.appearance||'لم يحدد اللون في قاعدة البيانات';
    html+=`<div class="outputDetail"><span class="label">الغاز الناتج ومظهره الحقيقي</span><span class="name">${detailSwatch(r.gasColor||meta?.color||'#d8f4fb',appearance)}</span><p>${esc(r.gasName||meta?.name||'غاز ناتج')}</p></div>`;
    const test=r.gasTest||meta?.test;
    if(test)html+=`<div class="outputDetail gasFact"><span class="label">معلومة عن اختبار الغاز</span><p>${esc(test)}</p><p class="reagentNote">لون الغاز يختلف عن لون ورقة/محلول الكاشف.</p></div>`;
  }
  if(r.precipitate)html+=`<div class="outputDetail"><span class="label">${r.solidLocation?'موضع تكوّن الناتج':'الراسب المتكوّن'}</span><span class="name">${detailSwatch(r.precipColor||'#f1f0e8',r.solidColorLabel||r.precipLabel||'لون الراسب')}</span><p>${esc(r.solidName||'راسب غير محدد')}${r.solidLocation?` — ${esc(r.solidLocation)}`:''}</p></div>`;
  if(r.solutionColor)html+=`<div class="outputDetail"><span class="label">${r.visualType==='paper'?'ورقة الاختبار بعد التفاعل':'المحلول/الكاشف بعد الاختبار'}</span><span class="name">${detailSwatch(r.paperColor||r.solutionColor,r.solutionColorLabel||'تغيّر اللون')}</span><p>${esc(r.solutionName||'المحلول بعد التفاعل')}</p></div>`;
  html+='</div>';
  html+=`<div class="resultSection"><h4>👁 المشاهدة</h4><p>${esc(r.obs||'لم تُوثق الملاحظة لهذه الحالة بعد.')}</p></div>`;
  html+=`<div class="resultSection"><h4>🧠 الاستنتاج</h4><p>${esc(r.conclusion||'لا تستنتج عدم حدوث تفاعل من غياب البيانات؛ هذه الحالة تحتاج مراجعة.')}</p></div>`;
  html+=equationBlock('⚖ المعادلة الجزيئية الموزونة',r.equation);
  html+=equationBlock('🔬 المعادلة الأيونية الصافية',r.ionic);
  if(r.explain)html+=`<div class="resultSection"><h4>لماذا حدث التفاعل؟</h4><p>${esc(r.explain)}</p></div>`;
  if(r.danger||meta&&['h2s','so2','no2','no','hcl','cl2'].includes(Object.keys(gasProperties).find(k=>gasProperties[k]===meta))){
    html+=`<div class="warning"><b>للمذاكرة فقط:</b> بعض هذه الغازات أو الكواشف سامة أو مهيّجة. المحاكاة لا تعني تنفيذ التفاعل عمليًا، ولا تُشمّ الغازات ولا تُحضّر خارج مختبر مجهّز وتحت إشراف مدرس.</div>`;
  }
  if(tags)html+=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${tags}</div>`;
  return html;
}
function renderConfirmatoryPicker(){
  const area=$('confirmPicker');
  if(!selectedSalt){area.innerHTML='<div class="emptyList">اختار الملح أولًا لعرض الاختبارات التأكيدية المتاحة.</div>';return;}
  const tests=confirmatoryTests[selectedSalt.id]||[];
  if(!tests.length){area.innerHTML='<div class="emptyList">لسه ما أضفناش اختبارًا تأكيديًا موثوقًا لهذا الملح. ده مش معناه إنه مفيش اختبار؛ ابعت صورة الجزئية من مذكرتك ونضيفه بدقة.</div>';return;}
  area.innerHTML=tests.map((t,i)=>`<button type="button" class="confirmOption ${activeTestId===t.id?'active':''}" data-confirm-index="${i}" aria-pressed="${activeTestId===t.id}"><strong>${i+1}. ${esc(t.title)}</strong><span class="pill">${esc(t.badge||'تأكيد')}</span><small>${esc(t.obs||'اختبار تأكيدي مسجل في قاعدة البيانات.')}</small><span class="chemPreview">${esc(t.equation||'المعادلة غير مضافة')}</span></button>`).join('');
}
function runReaction(){
  if(!selectedAcid||!selectedSalt){resetVisual('اختار ملحًا وحمضًا أولًا، ثم اضغط «التفاعل الأساسي».');toast('اختار الحمض والملح الأول.');return;}
  setModeVisualOnly('primary');
  const key=selectedAcid.id+'|'+selectedSalt.id;
  const r=reactions[key];
  lastReaction=r||null;
  activeTestId=null;
  activeSimulationTitle='التفاعل الأساسي';
  if(!r){
    const unknown={kind:'unknown',obs:'قاعدة البيانات الحالية لا تحتوي على نتيجة موثقة لهذا الحمض مع هذا الملح.',conclusion:'ده مش معناه إن مفيش تفاعل؛ لا نحكم قبل مراجعة ظروف الكشف الصحيحة من المنهج.',equation:'لم تُضف المعادلة بعد.',ionic:'غير متاحة حاليًا.',explain:'يمكن إضافة الحالة بعد مراجعتها من الكتاب أو المذكرة.'};
    applyVisual(unknown,'بيانات الزوج غير مضافة');
    $('resultArea').className='resultArea';$('resultArea').innerHTML=resultHTML(unknown,'primary','التفاعل الأساسي — حالة غير مضافة');
    return;
  }
  applyVisual(r,activeSimulationTitle);
  $('resultArea').className='resultArea';
  $('resultArea').innerHTML=resultHTML(r,'primary',activeSimulationTitle);
}
function setModeVisualOnly(mode){
  currentMode=mode;
  const primary=mode==='primary';
  $('primaryModeButton').classList.toggle('active',primary);
  $('confirmModeButton').classList.toggle('active',!primary);
  $('primaryModeButton').setAttribute('aria-pressed',String(primary));
  $('confirmModeButton').setAttribute('aria-pressed',String(!primary));
  $('primaryModeInfo').hidden=!primary;
  $('confirmModeInfo').hidden=primary;
}
function runConfirmatory(index){
  if(!selectedSalt){toast('اختار الملح أولًا.');return;}
  const tests=confirmatoryTests[selectedSalt.id]||[];
  const t=tests[index];
  if(!t)return;
  setModeVisualOnly('confirmatory');
  activeTestId=t.id;
  activeSimulationTitle='الاختبار التأكيدي: '+t.title;
  renderConfirmatoryPicker();
  applyVisual(t,activeSimulationTitle);
  $('resultArea').className='resultArea';
  $('resultArea').innerHTML=resultHTML(t,'confirmatory',activeSimulationTitle);
  toast('تم عرض الاختبار التأكيدي ومعادلته.');
}
function toast(message){
  const t=$('toast'); if(!t)return;
  t.textContent=message;t.classList.add('show');
  window.clearTimeout(toast.timer);
  toast.timer=window.setTimeout(()=>t.classList.remove('show'),2600);
}

$('saltList').addEventListener('click',e=>{const b=e.target.closest('[data-salt]');if(b)chooseSalt(b.dataset.salt);});
$('acidList').addEventListener('click',e=>{const b=e.target.closest('[data-acid]');if(b)chooseAcid(b.dataset.acid);});
$('saltSearch').addEventListener('input',renderLists);
$('acidSearch').addEventListener('input',renderLists);
$('primaryModeButton').addEventListener('click',()=>{setMode('primary');});
$('confirmModeButton').addEventListener('click',()=>{setMode('confirmatory');});
$('confirmPicker').addEventListener('click',e=>{const b=e.target.closest('[data-confirm-index]');if(b)runConfirmatory(Number(b.dataset.confirmIndex));});

renderLists();
renderConfirmatoryPicker();
resetVisual('اختار الملح والحمض من القائمتين، ثم اضغط «التفاعل الأساسي».');
