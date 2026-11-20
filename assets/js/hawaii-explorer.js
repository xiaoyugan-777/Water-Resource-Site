(() => {
const dataURL = new URL('/assets/data/hawaii-coast.geojson?v=2', window.location.origin);
const regionURL = new URL('/assets/data/hawaii-place-regions.geojson?v=2', window.location.origin);
async function fetchJSONWithRetry(url, attempts=3){
 let lastError;
 for(let attempt=0;attempt<attempts;attempt+=1){
  try{
   const response=await fetch(url,{cache:'no-store'});
   if(!response.ok)throw Error(`Unable to load ${url.pathname} (${response.status})`);
   return await response.json();
  }catch(error){
   lastError=error;
   if(attempt<attempts-1)await new Promise(resolve=>setTimeout(resolve,350*(attempt+1)));
  }
 }
 throw lastError;
}
const regionKeys={'Honolulu':'Urban Honolulu','Kāneʻohe':'Kaneohe','Waimānalo':'Waimanalo'};
const regionColors={'Honolulu':'#46d8ff','Kāneʻohe':'#45e0ba','Waimānalo':'#b7e978'};
const names = {Kauai:'Kauaʻi',Niihau:'Niʻihau',Oahu:'Oʻahu',Molokai:'Molokaʻi',Maui:'Maui',Lanai:'Lānaʻi',kahoolawe:'Kahoʻolawe',Hawaii:'Hawaiʻi'};
const places = [{name:'Honolulu',coords:[21.3069,-157.8583],topic:'Urban watershed',text:'Urban watershed and coastal resilience case cluster'}, {name:'Kāneʻohe',coords:[21.4097,-157.7989],topic:'Restoration',text:'Community stewardship and ecological restoration activity'}, {name:'Waimānalo',coords:[21.3347,-157.7003],topic:'Monitoring',text:'Place-based monitoring and cultural landscape efforts'}];
for(const root of document.querySelectorAll('[data-hawaii-explorer]')) {
const cases = root.dataset.hawaiiExplorer === 'cases';
root.innerHTML = `<header class="hx-header"><div><span class="hx-eyebrow">HAWAIʻI • NATURE-BASED SOLUTIONS</span><h2>${cases?'Explore places & case studies':'Explore the Hawaiian Islands'}</h2></div><div class="hx-actions"><button type="button" data-toggle aria-expanded="true">Filters & details</button></div></header><div class="hx-body"><aside class="hx-sidebar"><p class="hx-eyebrow">EXPLORE THE MAP</p><label>Island<select data-island><option value="">All Hawaiian Islands</option>${Object.entries(names).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Example focus<select data-topic><option value="">All example themes</option>${places.map(p=>`<option>${p.topic}</option>`).join('')}</select></label><label>Basemap<select data-basemap><option value="satellite">Ocean & satellite imagery</option><option value="coast">Ocean blue · clean map</option><option value="terrain">Terrain & roads</option></select></label><label class="hx-check"><input type="checkbox" data-points checked> Show place regions</label><label class="hx-check"><input type="checkbox" data-boundaries checked> Show island boundaries</label><button type="button" data-reset>Reset map</button><div class="hx-detail" aria-live="polite"></div><div class="hx-results" aria-live="polite"></div><p class="hx-disclaimer">Boundaries and population: 2020 Census designated places, via Hawaiʻi Statewide GIS. Themes are prototype examples, not verified project coverage.</p></aside><div class="hx-stage"><div class="hx-canvas" aria-label="Interactive map of Hawaiʻi"></div><div class="hx-ocean">NORTH PACIFIC OCEAN</div><div class="hx-legend"><strong>Map key</strong><span><i class="hx-land"></i> Island · click to explore</span><div data-region-legend></div><small>Coastline: Hawaiʻi Statewide GIS / USGS</small></div><p class="hx-error" hidden role="alert"></p></div></div>`;
if (root.closest('.island-map-page')) {
 root.classList.add('hx-workspace');
 const sidebar = root.querySelector('.hx-sidebar');
 const rail = document.createElement('nav');
 rail.className = 'hx-tool-rail';
 rail.setAttribute('aria-label', 'Map tools');
 const icon = path => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${path}</svg>`;
 rail.innerHTML = `<a class="map-rail-brand" href="../index.html" aria-label="Hawaiʻi NbS Hub home">HAWAIʻI<br>NBS<br>HUB</a><button type="button" data-workspace-view="explore">${icon('<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4Z"/>')}<span>Explore</span></button><button type="button" data-workspace-view="layers">${icon('<path d="m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>')}<span>Layers</span></button><button type="button" data-workspace-view="details">${icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>')}<span>Details</span></button><button type="button" data-workspace-reset>${icon('<path d="M4 10a8 8 0 1 1 2 8M4 4v6h6"/>')}<span>Reset</span></button>`;
 root.querySelector('.hx-body').prepend(rail);
 const contents = [...sidebar.children];
 const tabs = document.createElement('div');
 tabs.className = 'hx-panel-tabs';
 tabs.innerHTML = `<button type="button" data-workspace-tab="explore">Explore</button><button type="button" data-workspace-tab="layers">Layers</button><button type="button" data-workspace-tab="details">Details</button><button type="button" data-workspace-close aria-label="Close map panel">×</button>`;
 sidebar.prepend(tabs);
 const panels = {};
 for (const name of ['explore','layers','details']) {
  const panel = document.createElement('div'); panel.className='hx-panel-content';
  panel.dataset.workspaceContent=name; sidebar.append(panel); panels[name]=panel;
 }
 contents.forEach(el => {
  const name = el.matches('.hx-detail') ? 'details' : el.matches('.hx-results') ? 'explore' : el.matches('label') && el.querySelector('[data-basemap], [data-points], [data-boundaries]') ? 'layers' : 'explore';
  panels[name].append(el);
 });
 panels.layers.append(root.querySelector('.hx-legend'));
 const hint=document.createElement('p');hint.className='hx-selection-hint';hint.textContent='Select an island or place on the map to view its details.';panels.details.prepend(hint);
 root.showWorkspacePanel = name => {
  root.classList.remove('hx-panel-hidden');
  Object.entries(panels).forEach(([key,panel])=>panel.hidden=key!==name);
  rail.querySelectorAll('[data-workspace-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.workspaceView===name)));
  tabs.querySelectorAll('[data-workspace-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.workspaceTab===name)));
 };
 rail.querySelectorAll('[data-workspace-view]').forEach(button=>button.onclick=()=>root.showWorkspacePanel(button.dataset.workspaceView));
 tabs.querySelectorAll('[data-workspace-tab]').forEach(button=>button.onclick=()=>root.showWorkspacePanel(button.dataset.workspaceTab));
 tabs.querySelector('[data-workspace-close]').onclick=()=>{root.classList.add('hx-panel-hidden');rail.querySelectorAll('[data-workspace-view]').forEach(button=>button.setAttribute('aria-pressed','false'));};
 rail.querySelector('[data-workspace-reset]').onclick=()=>root.querySelector('[data-reset]').click();
 if (window.matchMedia('(max-width: 760px)').matches) {
  root.classList.add('hx-panel-hidden');
 } else {
  root.showWorkspacePanel('details');
 }
 const chrome=document.querySelector('.map-site-chrome');
 if(chrome) new ResizeObserver(()=>root.style.setProperty('--map-chrome-height',`${chrome.getBoundingClientRect().height}px`)).observe(chrome);
}
const $=s=>root.querySelector(s), island=$('[data-island]'), topic=$('[data-topic]'), points=$('[data-points]'), boundaries=$('[data-boundaries]');
if(!window.L){$('.hx-error').hidden=false;$('.hx-error').textContent='Map library could not load. Please check your connection and reload.';continue;}
const map=L.map($('.hx-canvas'),{scrollWheelZoom:true,minZoom:6,maxZoom:14,zoomControl:false});
L.control.zoom({position:'topright'}).addTo(map);L.control.scale({imperial:true,metric:true}).addTo(map);
map.attributionControl.addAttribution('<a href="https://planning.hawaii.gov/gis/">Hawaiʻi Statewide GIS</a> | USGS');
const basemap=$('[data-basemap]');
const dots=L.layerGroup().addTo(map),labels=L.layerGroup().addTo(map);let geo,features,regionFeatures;
map.createPane("placeRegions");map.getPane("placeRegions").style.zIndex=450;
const overall=[[18.75,-160.5],[22.45,-154.65]];
function syncPlaceLabels(){dots.eachLayer(group=>group.eachLayer(layer=>{if(map.getZoom()>=9)layer.openTooltip();else layer.closeTooltip();}));}
map.on('zoomend',syncPlaceLabels);
const style={color:'#367d83',weight:1.3,fillColor:'#c4d8b3',fillOpacity:0.16};
const satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:14,attribution:'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'});
const terrain=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:14,attribution:'Tiles © Esri — Esri, USGS, NOAA, © OpenStreetMap contributors'});
function coastStyle(feature){
 const light=document.documentElement.dataset.mapTheme==='light';
 const imagery=basemap.value==='satellite';
 const selected=island.value && feature?.properties.isle===island.value;
 if(light && basemap.value==='coast')return {...style,color:selected?'#287fae':'#8c9eab',weight:boundaries.checked?(selected?2.5:1):0,fillColor:selected?'#d5e8f4':'#fafbfc',fillOpacity:1};
 return {...style,color:imagery?(selected?'#b9f5ff':'#46d8ff'):basemap.value==='terrain'?'#249ab5':'#67dff4',weight:boundaries.checked?(imagery?(selected?3.4:2.1):1.2):0,fillColor:basemap.value==='coast'?'#173947':style.fillColor,fillOpacity:imagery?0:basemap.value==='terrain'?0.12:1};
}
function changeBasemap(){
 map.removeLayer(terrain);map.removeLayer(satellite);
 root.classList.toggle('hx-dark-ocean',basemap.value!=='terrain');
 root.classList.toggle('hx-satellite',basemap.value==='satellite');
 $('.hx-error').hidden=true;
 if(basemap.value==='terrain')terrain.addTo(map);
 if(basemap.value==='satellite')satellite.addTo(map);
 if(geo)geo.setStyle(coastStyle);
}
for(const layer of [terrain,satellite])layer.on('tileerror',()=>{if(map.hasLayer(layer)){basemap.value='coast';changeBasemap();$('.hx-error').hidden=false;$('.hx-error').textContent='Imagery is unavailable. Showing the simplified ocean map. Choose a basemap to retry.';}});
basemap.onchange=changeBasemap;
let darkBasemap = basemap.value;
const syncMapTheme = () => {
 if(!root.classList.contains('hx-workspace'))return;
 if(document.documentElement.dataset.mapTheme==='light'){darkBasemap=basemap.value==='coast'?darkBasemap:basemap.value;basemap.value='coast';}
 else basemap.value=darkBasemap;
 changeBasemap();
};
document.addEventListener('nbs-map-theme-change',syncMapTheme);
syncMapTheme();changeBasemap();
function detail(name,text,extra='',openPanel=true){ if(root.showWorkspacePanel){if(openPanel)root.showWorkspacePanel('details');root.querySelector('.hx-selection-hint').hidden=true;} $('.hx-detail').innerHTML=`<p class="hx-eyebrow">SELECTED AREA</p><h3>${name}</h3><p>${text}</p>${extra}`; }
function selectRegion(p){
 const feature=regionFeatures.find(f=>f.properties.name20===regionKeys[p.name]);if(!feature)return;
 const data=feature.properties;
 detail(p.name,`${data.name20} · 2020 Census designated place`, `<span class="hx-badge" style="border-left:4px solid ${regionColors[p.name]}">Selected region</span><dl><dt>Population · 2020 Census</dt><dd>${Number(data.pop20).toLocaleString()}</dd><dt>Land area</dt><dd>${(data.aland20/1e6).toFixed(1)} km²</dd></dl><p>Example theme: ${p.topic}. Project metrics are not yet available.</p>`);
 map.fitBounds(L.geoJSON(feature).getBounds(),{padding:[55,55],maxZoom:12});
 root.dispatchEvent(new Event('region-selected'));
 $('.hx-results').querySelectorAll('[data-place]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.place===p.name)));
}
function selectIsland(key){island.value=key;topic.value='';update(true);}
function update(openDetails=false){
if(!geo)return;
geo.clearLayers();labels.clearLayers();dots.clearLayers();
const selected=features.filter(f=>!island.value||f.properties.isle===island.value);
geo.addData({type:'FeatureCollection',features:selected});
geo.setStyle(coastStyle);
const visible=places.filter(p=>(!island.value||island.value==='Oahu')&&(!topic.value||topic.value===p.topic));
const shown=points.checked?visible:[];
shown.forEach(p=>{
 const feature=regionFeatures.find(f=>f.properties.name20===regionKeys[p.name]);
 if(!feature)return;
 L.geoJSON(feature,{pane:'placeRegions',style:{color:regionColors[p.name],weight:1.8,fillColor:regionColors[p.name],fillOpacity:0.22},onEachFeature:(f,l)=>{
 l.bindTooltip(p.name,{direction:'center',className:'hx-place-label'});
 l.on('click',event=>{L.DomEvent.stopPropagation(event);selectRegion(p);});
 }}).addTo(dots);
});
$('[data-region-legend]').innerHTML=shown.map(p=>`<span><i style="background:${regionColors[p.name]};opacity:.65;border:1px solid ${regionColors[p.name]}"></i>${p.name}</span>`).join('');
const used=new Set();selected.filter(f=>f.properties.sqmi>40).forEach(f=>{const k=f.properties.isle;if(used.has(k))return;used.add(k);const b=L.geoJSON(f).getBounds();L.marker(b.getCenter(),{interactive:false,icon:L.divIcon({className:'hx-label',html:names[k],iconSize:[100,24],iconAnchor:[50,12]})}).addTo(labels);});
if(island.value){map.fitBounds(geo.getBounds(),{padding:[45,45],maxZoom:10});const f=selected[0];detail(names[island.value],'Official island coastline boundary.',`<dl><dt>Island area (source dataset)</dt><dd>${Number(f.properties.totsqmi).toLocaleString()} sq mi</dd><dt>Project metrics</dt><dd>Not yet available</dd></dl>`,openDetails);}else{map.fitBounds(overall,{padding:[20,20]});detail('Hawaiian Islands','Choose an island or click its coastline to explore. Click a colored place region to view its census data.','',openDetails);}
syncPlaceLabels();
$('.hx-results').innerHTML=`<strong>${shown.length} place regions shown</strong>${shown.map(p=>`<button type="button" data-place="${p.name}"><i class="hx-region-swatch" style="background:${regionColors[p.name]}"></i>${p.name}<small>${p.topic}</small></button>`).join('')}${!shown.length?'<p>No place regions match these filters.</p>':''}`;
$('.hx-results').querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>selectRegion(places.find(p=>p.name===b.dataset.place)));
}
[island,topic,points,boundaries].forEach(el=>el.addEventListener('change',()=>update(el===island)));
$('[data-reset]').onclick=()=>{island.value='';topic.value='';points.checked=boundaries.checked=true;update();};
$('[data-toggle]').onclick=()=>{const closed=root.classList.toggle('hx-collapsed');$('[data-toggle]').setAttribute('aria-expanded',String(!closed));setTimeout(()=>map.invalidateSize(),50);};
new ResizeObserver(()=>map.invalidateSize({pan:true,animate:false})).observe($('.hx-stage'));

const mapDataPromise=window.HAWAII_MAP_DATA
 ? Promise.resolve([window.HAWAII_MAP_DATA.coast,window.HAWAII_MAP_DATA.regions])
 : Promise.all([dataURL,regionURL].map(url=>fetchJSONWithRetry(url)));
mapDataPromise.then(([data,regions])=>{regionFeatures=regions.features;features=data.features.filter(f=>f.properties.water===0);geo=L.geoJSON(null,{style,onEachFeature:(f,l)=>{l.bindTooltip(names[f.properties.isle]);l.on({click:()=>selectIsland(f.properties.isle),mouseover:()=>l.setStyle({color:'#b9f5ff',fillColor:'#46d8ff',fillOpacity:basemap.value==='coast'?0.28:0.12,weight:boundaries.checked?3.4:0}),mouseout:()=>geo.setStyle(coastStyle)});}}).addTo(map);if(cases)island.value='Oahu';update();}).catch(()=>{$('.hx-error').hidden=false;$('.hx-error').textContent='Island boundaries could not load. Please reload to retry.';});
}
})();
