(() => {
 const root=document.querySelector('[data-hawaii-explorer="cases"]');
 if(!root||!window.caseStudyRecords)return;
 const records=window.caseStudyRecords;
 const sidebar=root.querySelector('.hx-sidebar');
 const panel=document.createElement('section');panel.className='hx-research';
 panel.innerHTML='<h3>Research data filters</h3><p>Browse all 294 field definitions. Combine filters to narrow the list.</p><label>Search fields<input type="search" data-field-search placeholder="Search name, definition or question"></label><div data-field-controls></div><button type="button" data-clear-fields>Clear research filters</button><p class="hx-field-note">These filters describe research fields, not regional survey responses. They do not change geographic coverage.</p><p data-field-count role="status"></p><div data-field-results></div><button type="button" data-more-fields>Show more fields</button>';
 sidebar.querySelector('.hx-detail').before(panel);
 const filters=[['FieldName','Field category',r=>getFieldNameCategory(r.FieldName||'')],['DataType','Data type',r=>normalizeDataTypeLabel(r.DataType)],['AnswerType','Answer type',r=>normalizeAnswerTypeLabel(r.AnswerType)],['Question','Question',r=>r.Question||''],['Definition','Definition',r=>normalizeDefinitionGroupLabel(r.Definition)]];
 const controls=panel.querySelector('[data-field-controls]');
 for(const [key,title,value] of filters){
 const label=document.createElement('label');label.textContent=title;
 const select=document.createElement('select');select.dataset.fieldFilter=key;
 const counts=new Map();records.forEach(r=>{const v=value(r);if(v)counts.set(v,(counts.get(v)||0)+1);});
 select.add(new Option(key==='FieldName'?'All field categories':'All '+title.toLowerCase()+'s',''));
 [...counts].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([v,count])=>select.add(new Option(`${v} (${count})`,v)));
 label.append(select);controls.append(label);
 }
 let limit=12;
 function render(){
 const query=panel.querySelector('[data-field-search]').value.trim().toLowerCase();
 const matches=records.filter(r=>(!query||Object.values(r).join(' ').toLowerCase().includes(query))&&filters.every(([key,title,value])=>{const selected=panel.querySelector(`[data-field-filter="${key}"]`).value;return !selected||value(r)===selected;}));
 panel.querySelector('[data-field-count]').textContent=`${matches.length} of ${records.length} fields · showing ${Math.min(matches.length,limit)}`;
 const target=panel.querySelector('[data-field-results]');target.replaceChildren();
 if(!matches.length){const message=document.createElement('p');message.textContent='No fields match. Clear a filter or try another search.';target.append(message);}
 matches.slice(0,limit).forEach(r=>{
 const card=document.createElement('details');card.className='hx-field-card';
 const title=document.createElement('summary');title.textContent=r.FieldName;card.append(title);
 for(const key of ['Definition','Question','DataType','AnswerType']){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=key+': ';p.append(strong,document.createTextNode(r[key]||'—'));card.append(p);}
 target.append(card);
 });
 panel.querySelector('[data-more-fields]').hidden=matches.length<=limit;
 }
 panel.querySelectorAll('select').forEach(s=>s.onchange=()=>{limit=12;render();});
 panel.querySelector('[data-field-search]').oninput=()=>{limit=12;render();};
 panel.querySelector('[data-clear-fields]').onclick=()=>{panel.querySelectorAll('select,input').forEach(el=>el.value='');limit=12;render();};
 panel.querySelector('[data-more-fields]').onclick=()=>{limit+=24;render();};
 render();
 root.addEventListener('region-selected',()=>{const detail=root.querySelector('.hx-detail');sidebar.scrollTop+=detail.getBoundingClientRect().top-sidebar.getBoundingClientRect().top-16;});
 // Retain the source scripts but replace their detached dictionary UI.
 const legacy=document.querySelector('.evaluate-cases-layout');if(legacy)legacy.closest('details').remove();
})();
