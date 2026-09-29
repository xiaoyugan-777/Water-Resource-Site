(() => {
const script = document.currentScript.src;
const dataURL = new URL('../data/hawaii-coast.geojson', script);
const names = {Kauai:'Kauaʻi',Niihau:'Niʻihau',Oahu:'Oʻahu',Molokai:'Molokaʻi',Maui:'Maui',Lanai:'Lānaʻi',kahoolawe:'Kahoʻolawe',Hawaii:'Hawaiʻi'};
const places = [{name:'Honolulu',coords:[21.3069,-157.8583],topic:'Urban watershed',text:'Urban watershed and coastal resilience case cluster'}, {name:'Kāneʻohe',coords:[21.4097,-157.7989],topic:'Restoration',text:'Community stewardship and ecological restoration activity'}, {name:'Waimānalo',coords:[21.3347,-157.7003],topic:'Monitoring',text:'Place-based monitoring and cultural landscape efforts'}];
for(const root of document.querySelectorAll('[data-hawaii-explorer]')) {
const cases = root.dataset.hawaiiExplorer === 'cases';
root.innerHTML = `<header class="hx-header"><div><span class="hx-eyebrow">HAWAIʻI • NATURE-BASED SOLUTIONS</span><h2>${cases?'Explore places & case studies':'Explore the Hawaiian Islands'}</h2></div><div class="hx-actions"><button type="button" data-toggle aria-expanded="true">Filters & details</button><button type="button" data-expand aria-haspopup="dialog" aria-expanded="false">⛶ Expand map</button></div></header><div class="hx-body"><aside class="hx-sidebar"><p class="hx-eyebrow">EXPLORE THE MAP</p><label>Island<select data-island><option value="">All Hawaiian Islands</option>${Object.entries(names).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Example focus<select data-topic><option value="">All example locations</option>${places.map(p=>`<option>${p.topic}</option>`).join('')}</select></label><label>Basemap<select data-basemap><option value="coast">Ocean blue · clean map</option><option value="terrain">Terrain & roads</option></select></label><label class="hx-check"><input type="checkbox" data-points checked> Show example locations</label><label class="hx-check"><input type="checkbox" data-boundaries checked> Show island boundaries</label><button type="button" data-reset>Reset map</button><div class="hx-detail" aria-live="polite"></div><div class="hx-results" aria-live="polite"></div><p class="hx-disclaimer">Locations are illustrative entries from this site's prototype, not verified project records. Filters apply to these examples.</p></aside><div class="hx-stage"><div class="hx-canvas" aria-label="Interactive map of Hawaiʻi"></div><div class="hx-ocean">NORTH PACIFIC OCEAN</div><div class="hx-legend"><strong>Map key</strong><span><i class="hx-land"></i> Island · click to explore</span><span><i class="hx-dot"></i> Example location</span><small>Coastline: Hawaiʻi Statewide GIS / USGS</small></div><p class="hx-error" hidden role="alert"></p></div></div>`;
const $=s=>root.querySelector(s), island=$('[data-island]'), topic=$('[data-topic]'), points=$('[data-points]'), boundaries=$('[data-boundaries]');
if(!window.L){$('.hx-error').hidden=false;$('.hx-error').textContent='Map library could not load. Please check your connection and reload.';continue;}
const map=L.map($('.hx-canvas'),{scrollWheelZoom:false,minZoom:6,maxZoom:14,zoomControl:false});
L.control.zoom({position:'topright'}).addTo(map);L.control.scale({imperial:true,metric:true}).addTo(map);
map.attributionControl.addAttribution('<a href="https://planning.hawaii.gov/gis/">Hawaiʻi Statewide GIS</a> | USGS');
const basemap=$('[data-basemap]');
const dots=L.layerGroup().addTo(map),labels=L.layerGroup().addTo(map);let geo,features;
const overall=[[18.75,-160.5],[22.45,-154.65]];
function syncPlaceLabels(){dots.eachLayer(layer=>{if(map.getZoom()>=9)layer.openTooltip();else layer.closeTooltip();});}
map.on('zoomend',syncPlaceLabels);
const style={color:'#367d83',weight:1.3,fillColor:'#c4d8b3',fillOpacity:0.16};
const terrain=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:14,attribution:'Tiles © Esri — Esri, USGS, NOAA, © OpenStreetMap contributors'});
function coastStyle(){return {...style,color:basemap.value==='terrain'?'#367d83':'#89bdcb',weight:boundaries.checked?1.2:0,fillColor:basemap.value==='coast'?'#d5e4d7':style.fillColor,fillOpacity:basemap.value==='terrain'?0.12:1};}
function changeBasemap(){
 map.removeLayer(terrain);
 root.classList.toggle('hx-dark-ocean',basemap.value!=='terrain');
 $('.hx-error').hidden=true;
 if(basemap.value==='terrain')terrain.addTo(map);
 if(geo)geo.setStyle(coastStyle());
}
for(const layer of [terrain])layer.on('tileerror',()=>{if(map.hasLayer(layer)){basemap.value='coast';changeBasemap();$('.hx-error').hidden=false;$('.hx-error').textContent='Terrain is unavailable. Showing the ocean blue map.';}});
basemap.onchange=changeBasemap;changeBasemap();
function detail(name,text,extra=''){ $('.hx-detail').innerHTML=`<p class="hx-eyebrow">SELECTED AREA</p><h3>${name}</h3><p>${text}</p>${extra}`; }
function selectIsland(key){island.value=key;topic.value='';update();}
function update(){
if(!geo)return;
geo.clearLayers();labels.clearLayers();dots.clearLayers();
const selected=features.filter(f=>!island.value||f.properties.isle===island.value);
geo.addData({type:'FeatureCollection',features:selected});
geo.setStyle(coastStyle());
const visible=places.filter(p=>(!island.value||island.value==='Oahu')&&(!topic.value||topic.value===p.topic));
const shown=points.checked?visible:[];
shown.forEach(p=>L.circleMarker(p.coords,{radius:8,color:'#fff',weight:3,fillColor:'#19a9db',fillOpacity:1}).addTo(dots).bindTooltip(p.name,{permanent:false,direction:'right',offset:[12,0],className:'hx-place-label'}).on('click',()=>{detail(p.name,p.text,'<span class="hx-badge">Example location</span><p>Project measurements and verified case records are not yet available.</p>');map.panTo(p.coords);}));
const used=new Set();selected.filter(f=>f.properties.sqmi>40).forEach(f=>{const k=f.properties.isle;if(used.has(k))return;used.add(k);const b=L.geoJSON(f).getBounds();L.marker(b.getCenter(),{interactive:false,icon:L.divIcon({className:'hx-label',html:names[k],iconSize:[100,24],iconAnchor:[50,12]})}).addTo(labels);});
if(island.value){map.fitBounds(geo.getBounds(),{padding:[45,45],maxZoom:10});const f=selected[0];detail(names[island.value],'Official island coastline boundary.',`<dl><dt>Island area (source dataset)</dt><dd>${Number(f.properties.totsqmi).toLocaleString()} sq mi</dd><dt>Project metrics</dt><dd>Not yet available</dd></dl>`);}else{map.fitBounds(overall,{padding:[20,20]});detail('Hawaiian Islands','Choose an island or click its coastline to explore. Select a location to view its available description.');}
syncPlaceLabels();
$('.hx-results').innerHTML=`<strong>${shown.length} example locations shown</strong>${shown.map(p=>`<button type="button" data-place="${p.name}">${p.name}<small>${p.topic}</small></button>`).join('')}${!shown.length?'<p>No example locations match these filters.</p>':''}`;
$('.hx-results').querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{const p=places.find(p=>p.name===b.dataset.place);detail(p.name,p.text,'<span class="hx-badge">Example location · no verified metrics</span>');map.setView(p.coords,11);});
}
[island,topic,points,boundaries].forEach(el=>el.addEventListener('change',update));
$('[data-reset]').onclick=()=>{island.value='';topic.value='';points.checked=boundaries.checked=true;update();};
$('[data-toggle]').onclick=()=>{const closed=root.classList.toggle('hx-collapsed');$('[data-toggle]').setAttribute('aria-expanded',String(!closed));setTimeout(()=>map.invalidateSize(),50);};
// Use a native modal so keyboard focus remains within the expanded explorer.
const expandButton=$('[data-expand]');
const dialog=document.createElement('dialog');
dialog.className='hx-dialog';
dialog.setAttribute('aria-label',cases?'Expanded case study map':'Expanded Hawaiian Islands map');
document.body.append(dialog);
let anchor, previousOverflow, previousScroll;
function resizeExplorer(center,zoom){requestAnimationFrame(()=>{map.invalidateSize({pan:true,animate:false});if(center)map.setView(center,zoom,{animate:false});});}
function closeExplorer(){if(dialog.open)dialog.close();}
expandButton.onclick=()=>{
 if(dialog.open){closeExplorer();return;}
 const savedCenter=map.getCenter(),savedZoom=map.getZoom();
 previousScroll=window.scrollY;previousOverflow=document.body.style.overflow;
 anchor=document.createComment('Map original position');root.before(anchor);
 dialog.append(root);root.classList.add('hx-expanded');
 expandButton.textContent='✕ Back to page';expandButton.setAttribute('aria-expanded','true');
 document.body.style.overflow='hidden';dialog.showModal();map.scrollWheelZoom.enable();
 expandButton.focus();resizeExplorer(savedCenter,savedZoom);
};
dialog.addEventListener('close',()=>{
 anchor.replaceWith(root);root.classList.remove('hx-expanded');
 document.body.style.overflow=previousOverflow;
 expandButton.textContent='⛶ Expand map';expandButton.setAttribute('aria-expanded','false');
 map.scrollWheelZoom.disable();resizeExplorer();
 window.scrollTo(0,previousScroll);expandButton.focus({preventScroll:true});
});
new ResizeObserver(()=>map.invalidateSize({pan:true,animate:false})).observe($('.hx-stage'));

fetch(dataURL).then(r=>{if(!r.ok)throw Error('Unable to load boundaries');return r.json();}).then(data=>{features=data.features.filter(f=>f.properties.water===0);geo=L.geoJSON(null,{style,onEachFeature:(f,l)=>{l.bindTooltip(names[f.properties.isle]);l.on({click:()=>selectIsland(f.properties.isle),mouseover:()=>l.setStyle({fillColor:'#acd3c9',fillOpacity:basemap.value==='coast'?1:0.18,weight:2.5}),mouseout:()=>geo.setStyle(coastStyle())});}}).addTo(map);if(cases)island.value='Oahu';update();}).catch(()=>{$('.hx-error').hidden=false;$('.hx-error').textContent='Island boundaries could not load. Please reload to retry.';});
}
})();
