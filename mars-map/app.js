const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let objects=[],posts=[],markers=new Map(),selected=null,tab='map',metroOn=true,favorites=new Set(),map,metroLayer,objectLayer,stationDots=[];
try{favorites=new Set(JSON.parse(localStorage.getItem('mars-favorites')||'[]'))}catch{}
const date=s=>s?new Date(s).toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'}):'';
function toast(s){$('#toast').textContent=s;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,3500)}
function metroText(o){return o.metro?`<i style="background:#${esc(o.metro.color)}"></i>${esc(o.metro.name)} · ${o.metro.distance} км по прямой`:'Координаты в посте не указаны'}
function icon(o,active=false){return L.divIcon({html:`<div class="marker ${active?'selected':''} ${o.demolished?'demolished':''}">${esc(o.number)}</div>`,iconSize:[29,29],iconAnchor:[14,14]})}
function filtered(){let q=$('#search').value.trim().toLowerCase(),cat=$('#category').value;return objects.filter(o=>(!cat||o.category===cat)&&(tab!=='favorites'||favorites.has(o.id))&&(!q||(o.text+' '+o.title+' '+(o.metro?.name||'')).toLowerCase().includes(q))).sort((a,b)=>$('#sort').value==='old'?a.id-b.id:$('#sort').value==='metro'?(a.metro?.distance??Infinity)-(b.metro?.distance??Infinity):b.id-a.id)}
function render(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 $('#category').hidden=tab==='archive';$('#sort').hidden=tab==='archive';
 if(tab==='archive'){
  let q=$('#search').value.toLowerCase(),items=posts.filter(p=>!q||p.text.toLowerCase().includes(q)).slice().reverse();$('#resultCount').textContent=`${items.length} публикаций`;
  $('#list').innerHTML=items.map(p=>`<div class="archive-post"><time>${esc(date(p.date))} · #${p.id}</time>${p.text?`<p>${esc(p.text.length>350?p.text.slice(0,350)+'…':p.text)}</p>${p.text.length>350?`<details><summary>Полный текст</summary><p>${esc(p.text)}</p></details>`:''}`:`<p>Фото / видео${p.photos.length?' · '+p.photos.length+' фото':''}</p>`}<a href="${esc(p.url)}" target="_blank" rel="noopener">Открыть публикацию ↗</a></div>`).join('')||'<div class="empty">Ничего не найдено.</div>';return;
 }
 let list=filtered();$('#resultCount').textContent=`${list.length} мест`;$('#mapCount').textContent=`${list.filter(o=>o.location).length} точек`;
 $('#list').innerHTML=list.map(o=>`<button class="place ${selected?.id===o.id?'selected':''}" data-id="${o.id}">${o.cover?`<img class="thumb" src="${esc(o.cover)}" loading="lazy" alt="">`:'<span class="thumb placeholder">⌑</span>'}<span class="place-body"><span class="place-top"><span>№ ${esc(o.number)}</span><span>${esc(o.category)}</span>${favorites.has(o.id)?'<span>♥</span>':''}</span><h3>${esc(o.title)}</h3><span class="station">${metroText(o)}</span><div class="place-date">${o.demolished?'Снесено / утрачено · ':''}${esc(date(o.date))}</div></span></button>`).join('')||`<div class="empty">${tab==='favorites'?'Здесь будут избранные места. Открой карточку и нажми ♡.':'Мест не найдено. Попробуй другое название или сбрось фильтры.'}</div>`;
 objectLayer.clearLayers();markers.clear();list.forEach(o=>{if(!o.location)return;let m=L.marker(o.location,{icon:icon(o,selected?.id===o.id),zIndexOffset:selected?.id===o.id?1000:0}).bindTooltip(esc(o.title),{direction:'top',offset:[0,-12]}).on('click',()=>openPlace(o));objectLayer.addLayer(m);markers.set(o.id,m)});
}
function route(o){if(!o.location)return '#';let mode=$('#routeMode')?.value||'mt';return `https://yandex.ru/maps/?rtext=~${encodeURIComponent(o.location.join(','))}&rtt=${mode}`}
function openPlace(o,move=true){
 selected=o;document.body.classList.remove('list-open');$('#mobileList').textContent='☰ Список мест';
 let old=new URL(location.href);old.hash='place-'+o.id;history.replaceState(null,'',old);
 $('#detail').hidden=false;$('#detail').innerHTML=`<button class="close" aria-label="Закрыть карточку">×</button>${o.cover?`<img class="detail-cover" src="${esc(o.cover)}" alt="${esc(o.title)}">`:'<div class="detail-cover placeholder">✳</div>'}<div class="detail-content"><div class="detail-tag">№ ${esc(o.number)} / ${esc(o.category)}</div><h2>${esc(o.title)}</h2><div class="detail-meta">${esc(date(o.date))}<br><span class="station">${metroText(o)}</span>${o.location?`<br>${o.location.join(', ')}`:''}</div>${o.location?`<label class="route-label" for="routeMode">Маршрут от твоего местоположения</label><select id="routeMode"><option value="mt">Общественный транспорт</option><option value="pd">Пешком</option><option value="auto">На машине</option></select><div class="actions"><a class="route" id="routeLink" href="${route(o)}" target="_blank" rel="noopener">Маршрут в Яндекс Картах ↗</a><button class="favorite" aria-label="В избранное" aria-pressed="${favorites.has(o.id)}">${favorites.has(o.id)?'♥':'♡'}</button></div>`:`<div class="note">У этой публикации нет координат. Место сохранено в списке, но не отмечено на карте.</div><div class="actions"><button class="favorite" aria-label="В избранное" aria-pressed="${favorites.has(o.id)}">${favorites.has(o.id)?'♥':'♡'}</button></div>`}${o.demolished?'<div class="note">В публикации отмечено, что объект снесён или утрачен.</div>':''}<div class="note">Данные из поста от ${esc(date(o.date))}. Ближайшая станция рассчитана по прямой; путь и пересадки покажут Яндекс Карты.</div><div class="post-text">${esc(o.text)}</div><a class="source" href="${esc(o.url)}" target="_blank" rel="noopener">Оригинал поста · все фото и видео ↗</a></div>`;
 $('#detail').scrollTop=0;$('#detail .close').onclick=closePlace;
 if($('#routeMode'))$('#routeMode').onchange=()=>$('#routeLink').href=route(o);
 $('#detail .favorite').onclick=()=>{favorites.has(o.id)?favorites.delete(o.id):favorites.add(o.id);try{localStorage.setItem('mars-favorites',JSON.stringify([...favorites]))}catch{}openPlace(o,false);render()};
 if(move&&o.location){map.flyTo(o.location,Math.max(12,map.getZoom()),{duration:.6});if(innerWidth>800)setTimeout(()=>map.panBy([140,0]),650)}
 render();
}
function closePlace(){selected=null;$('#detail').hidden=true;history.replaceState(null,'',location.pathname+location.search);render()}
function fit(){let list=filtered().filter(o=>o.location);if(list.length)map.fitBounds(list.map(o=>o.location),{padding:[55,75],maxZoom:13});else toast('В этом списке нет мест с координатами')}
async function init(){
 if(!window.L)throw Error('Не загрузилась библиотека карты');
 map=L.map('map',{zoomControl:false}).setView([55.77,37.64],10);L.control.zoom({position:'bottomright'}).addTo(map);
 let tiles=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'}).addTo(map);let tileErrors=0;tiles.on('tileerror',()=>{if(++tileErrors===6){$('#mapNotice').textContent='Фоновая карта не загрузилась. Точки, метро и маршруты доступны; проверь подключение.';$('#mapNotice').hidden=false}});
 [objects,posts]=await Promise.all(['objects.json','posts.json'].map(async u=>{let r=await fetch(u);if(!r.ok)throw Error('Не удалось загрузить данные');return r.json()}));
 const [metro,meta]=await Promise.all(['metro.json','meta.json'].map(u=>fetch(u).then(r=>r.json())));
 $('#stats').innerHTML=`<span><b>${objects.length}</b> мест</span><span><b>${objects.filter(o=>o.location).length}</b> на карте</span><span><b>${posts.length}</b> постов</span>`;$('#updated').textContent='снимок '+meta.collectedAt.split('-').reverse().join('.');
 $('#category').insertAdjacentHTML('beforeend',[...new Set(objects.map(o=>o.category))].sort().map(c=>`<option>${esc(c)}</option>`).join(''));
 metroLayer=L.layerGroup().addTo(map);objectLayer=L.layerGroup().addTo(map);
 metro.lines.forEach(line=>{let stations=line.stations.slice().sort((a,b)=>a.order-b.order),points=stations.map(s=>[s.lat,s.lng]);if(/кольцевая|кольцо/i.test(line.name)&&points.length>2)points.push(points[0]);L.polyline(points,{color:'#'+line.hex_color,weight:3,opacity:.7,interactive:false}).addTo(metroLayer);stations.forEach(s=>{let c=L.circleMarker([s.lat,s.lng],{radius:3,color:'#'+line.hex_color,weight:2,fillColor:'#fff',fillOpacity:1}).bindTooltip(esc(s.name)+' · '+esc(line.name));stationDots.push(c)})});
 const updateStations=()=>stationDots.forEach(c=>{if(map.getZoom()>=11){if(!metroLayer.hasLayer(c))metroLayer.addLayer(c)}else metroLayer.removeLayer(c)});map.on('zoomend',updateStations);updateStations();
 $('#search').oninput=render;$('#category').onchange=render;$('#sort').onchange=render;
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
 $('#list').onclick=e=>{let b=e.target.closest('[data-id]');if(b)openPlace(objects.find(o=>o.id===Number(b.dataset.id)))};
 $('#metroToggle').onclick=()=>{metroOn=!metroOn;metroOn?metroLayer.addTo(map):map.removeLayer(metroLayer);$('#metroToggle').classList.toggle('on',metroOn);$('#metroToggle').setAttribute('aria-pressed',metroOn)};
 $('#fit').onclick=()=>{closePlace();fit()};
 $('#locate').onclick=()=>{if(!navigator.geolocation)return toast('Браузер не поддерживает определение местоположения');navigator.geolocation.getCurrentPosition(p=>{let loc=[p.coords.latitude,p.coords.longitude];L.circleMarker(loc,{color:'#3479c0',radius:8,fillOpacity:.8}).addTo(map).bindTooltip('Ты здесь').openTooltip();map.setView(loc,13)},()=>toast('Геопозиция недоступна. Маршрут можно построить в Яндекс Картах.'),{timeout:15000})};
 $('#mobileList').onclick=()=>{document.body.classList.toggle('list-open');$('#mobileList').textContent=document.body.classList.contains('list-open')?'⌖ Вернуться к карте':'☰ Список мест'};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePlace();document.body.classList.remove('list-open')}if(e.key==='/'&&e.target.tagName!=='INPUT'){e.preventDefault();document.body.classList.add('list-open');$('#search').focus()}});
 render();let initial=objects.find(o=>'#place-'+o.id===location.hash);if(initial)openPlace(initial);else fit();
}
init().catch(e=>{$('#stats').textContent='Не удалось загрузить атлас';$('#list').innerHTML='<div class="empty">'+esc(e.message)+'. Обнови страницу или <a href="https://t.me/MarsikzbMsK">открой канал</a>.</div>';console.error(e)});
