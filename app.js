const appView = document.getElementById('appView');
const currentSection = document.getElementById('currentSection');
const toastRegion = document.getElementById('toastRegion');
const sidebar = document.getElementById('sidebar');
const mobileScrim = document.getElementById('mobileScrim');

const pageLabels = {
  overview: '통합 관제', cctv: 'CCTV 감시', incident: '사고 초동대응', workers: '작업자', robots: '로봇',
  rules: '도면 · 규칙', settings: '설정', reports: '보고서'
};
let activePage = 'overview';
let incidentApproved = false;
let incidentResolved = false;
let incidentStartedAt = '14:32:06';
let injectedCount = 0;
let logEntries = [
  {time:'14:32:41', text:'관제 담당자가 도장실 화재 의심 이벤트를 확인했습니다.'},
  {time:'14:32:29', text:'스마트폰 1차 추론 결과, 연기 가능성이 감지되었습니다.'},
  {time:'14:32:06', text:'W-07 헬멧 영상에서 연기 패턴을 감지했습니다.'}
];
let settingsState = { blur:true, eventOnly:true, speaker:true, plc:false, cloud:true, notifications:true };
let ruleState = { paint:true, geofence:true, ppe:true, forklift:true, gas:true };
let events = [
  {id:1, level:'Critical', className:'critical', time:'14:32:06', title:'도장실 화재 의심', location:'도장실 · 작업자 W-07 헬멧 영상', description:'연기 패턴 감지 · 스마트폰 1차 판정 완료', ago:'방금', action:'초동대응 열기', acknowledged:false},
  {id:2, level:'Warning', className:'warning', time:'14:31:52', title:'가스(VOC) 수치 계속 오르는 중', location:'도장실 · 작업자 W-07 헬멧 센서', description:'센서 기준치 초과 · 로봇 2차 확인 필요', ago:'1분 전', action:'이벤트 확인', acknowledged:false},
  {id:3, level:'Caution', className:'caution', time:'14:29:10', title:'안전모를 쓰지 않은 작업자', location:'생산라인 A · W-11 헬멧 카메라', description:'보호구 착용 규칙 위반 가능성', ago:'3분 전', action:'상세 보기', acknowledged:false},
  {id:4, level:'Caution', className:'caution', time:'14:21:44', title:'비상구 앞에 물건이 쌓여 있음', location:'출입구 B-1 · 로봇 R-2 순찰 영상', description:'비상구 통로 장애물 후보 감지', ago:'11분 전', action:'상세 보기', acknowledged:true}
];
let reportFilter = '전체';
let reportSearch = '';

// CCTV and digital-floor-map prototype state. These values are local demo data only.
const cameraList = [
 {id:'CAM-01', name:'정문 출입구', zone:'외곽 · 출입 통로', scene:'scene-gate', status:'온라인', angle:'광각 110°'},
 {id:'CAM-02', name:'생산라인 A', zone:'실내 · 생산 구역', scene:'scene-production', status:'온라인', angle:'표준 78°'},
 {id:'CAM-03', name:'도장실 입구', zone:'실내 · 고위험 구역', scene:'scene-paint', status:'온라인', angle:'광각 105°'},
 {id:'CAM-04', name:'비상구 B', zone:'실내 · 대피 통로', scene:'scene-exit', status:'온라인', angle:'표준 82°'}
];
let selectedCameraId = 'CAM-03';
let cameraAlerts = {'CAM-03': {level:'Critical', type:'경계구역 진입', time:'14:32:06', note:'가상 경계선 안쪽에서 움직임 후보가 감지됨'}};
let cctvEventLog = [
 {id:1, time:'14:32:06', cameraId:'CAM-03', level:'Critical', type:'경계구역 진입', note:'가상 경계선 안쪽에서 움직임 후보 감지 · 자동 확대'},
 {id:2, time:'14:29:18', cameraId:'CAM-01', level:'Warning', type:'움직임 감지', note:'출입구 통로 움직임 후보 · 확인 완료'}
];
let autoDetectEnabled = false;
let autoDetectionTimer = null;
let cctvEventSeq = 2;
let mapPlacementMode = 'CCTV';
let uploadedMapURL = null;
let uploadedMapName = '';
let mapMarkers = loadMapMarkers();

function loadMapMarkers(){
 try { const saved=JSON.parse(localStorage.getItem('dgc-map-markers-v2')||'null'); if(Array.isArray(saved)) return saved; } catch(e) {}
 return [
  {id:1,type:'CCTV',label:'CAM-01',x:16,y:22},
  {id:2,type:'CCTV',label:'CAM-02',x:54,y:39},
  {id:3,type:'CCTV',label:'CAM-03',x:47,y:21},
  {id:4,type:'CCTV',label:'CAM-04',x:83,y:74},
  {id:5,type:'위험구역',label:'ZONE-A',x:64,y:55}
 ];
}


function icon(name){
 const paths = {
  pulse:'<path d="M3 12h4l3-8 4 16 3-8h4"/>', helmet:'<path d="M3 13a9 9 0 0 1 18 0"/><path d="M2 13h20M12 4v4"/>', alert:'<path d="m12 3 9 16H3L12 3Z"/><path d="M12 9v4m0 3h.01"/>', people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>', robot:'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8"/>', map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/>', layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>', file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>', check:'<path d="m5 12 4 4L19 6"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', shield:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>', radio:'<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4m-8.4 0a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>', pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>', settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.3a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.3a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.3 2.9Z"/>'
 };
 return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.pulse}</svg>`;
}
function tag(level){const cls={Critical:'tag-critical',Warning:'tag-warning',Caution:'tag-caution',정상:'tag-normal',정보:'tag-info'}[level]||'tag-info';return `<span class="tag ${cls}">${level}</span>`;}
function heading(eyebrow,title,desc,actions=''){return `<div class="page-heading"><div><div class="page-eyebrow"><span class="status-dot blue"></span>${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`;}
function floorMap(mode='overview'){
 const incident = mode==='incident';
 return `<svg class="floor-map" viewBox="0 0 800 430" role="img" aria-label="공장 도면 위 작업자, 로봇, 위험구역 및 대피 경로">
  <defs>
   <pattern id="dotGrid" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" fill="#263a58"/></pattern>
   <pattern id="dangerHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="10" height="10" fill="rgba(255,90,95,.08)"/><line x1="0" y1="0" x2="0" y2="10" stroke="#ff5a5f" stroke-width="4" opacity=".5"/></pattern>
   <filter id="softGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect x="0" y="0" width="800" height="430" rx="8" class="map-grid-bg"/><rect x="0" y="0" width="800" height="430" rx="8" class="map-grid-dots"/>
  <rect x="30" y="32" width="285" height="156" rx="3" class="map-room"/><rect x="324" y="32" width="168" height="156" rx="3" class="map-room alt"/><rect x="501" y="32" width="269" height="156" rx="3" class="map-room"/>
  <rect x="30" y="198" width="285" height="194" rx="3" class="map-room alt"/><rect x="324" y="198" width="168" height="194" rx="3" class="map-room"/><rect x="501" y="198" width="269" height="194" rx="3" class="map-room alt"/>
  <path d="M315 32v360 M324 188h448 M492 32v360 M30 193h740" class="map-wall" opacity=".45"/>
  <text x="46" y="53" class="map-room-name">생산라인 A</text><text x="340" y="53" class="map-room-name">도장실</text><text x="518" y="53" class="map-room-name">위험물 저장</text>
  <text x="46" y="220" class="map-room-name">생산라인 B</text><text x="340" y="220" class="map-room-name">사무 · 휴게</text><text x="518" y="220" class="map-room-name">출입구 · 비상구</text>
  <path d="M354 77h105M354 85h65M45 80h105M45 89h85M526 84h90M526 92h55M45 246h100M45 254h75M526 254h120M526 262h72" stroke="#263b58" stroke-width="2" stroke-linecap="round"/>
  <path d="M530 329h93v-49h84" fill="none" stroke="#304461" stroke-width="1.5" stroke-dasharray="4 5"/>
  ${incident?`<rect x="347" y="62" width="126" height="112" rx="4" class="hazard-zone"/><circle cx="410" cy="117" r="88" class="hazard-ring critical"/><circle cx="410" cy="117" r="54" class="hazard-ring critical"/><path d="M410 117L410 240L582 240L582 322L698 322" class="route-line"/><rect x="662" y="299" width="73" height="43" rx="4" fill="#153b32" stroke="#3dbb7e"/><text x="698" y="317" text-anchor="middle" fill="#7ee0ae" font-size="10" font-weight="700">비상구 B</text><text x="698" y="330" text-anchor="middle" fill="#64b78e" font-size="8">SAFE ROUTE</text>`:`<circle cx="407" cy="112" r="46" class="hazard-ring"/><circle cx="407" cy="112" r="5" fill="#ff9f2e" filter="url(#softGlow)"/>`}
  <g transform="translate(115 118)"><circle r="7" fill="#3dbb7e" class="map-worker"/><circle r="2" fill="#c5ffdc"/><text x="13" y="3" class="map-marker-label">W-02</text></g>
  <g transform="translate(248 157)"><circle r="7" fill="${incident?'#ff5a5f':'#f5c542'}" class="map-worker"/><circle r="2" fill="#fff1b4"/><text x="13" y="3" class="map-marker-label">W-11</text></g>
  <g transform="translate(407 112)"><circle r="9" fill="${incident?'#ff5a5f':'#ff9f2e'}" stroke="#3c202c" stroke-width="4"/><circle r="3" fill="#ffe0e0"/><text x="15" y="-9" class="map-marker-label">W-07</text></g>
  <g transform="translate(205 306)"><circle r="7" fill="#3dbb7e" class="map-worker"/><circle r="2" fill="#c5ffdc"/><text x="13" y="3" class="map-marker-label">W-05</text></g>
  <g transform="translate(604 330)"><circle r="7" fill="#3dbb7e" class="map-worker"/><circle r="2" fill="#c5ffdc"/><text x="13" y="3" class="map-marker-label">W-14</text></g>
  <g transform="translate(474 191)"><path d="M0 -9 9 0 0 9 -9 0Z" fill="#4c8dff" stroke="#101a2a" stroke-width="2"/><text x="14" y="3" class="map-marker-label">R-1</text></g>
  <g transform="translate(478 284)"><path d="M0 -9 9 0 0 9 -9 0Z" fill="#4c8dff" stroke="#101a2a" stroke-width="2"/><text x="14" y="3" class="map-marker-label">R-2</text></g>
  <g transform="translate(54 414)"><circle r="4" fill="#3dbb7e"/><text x="10" y="3" class="map-small-label">작업자</text><path d="M75 0h10" stroke="#4c8dff" stroke-width="5"/><text x="91" y="3" class="map-small-label">로봇</text><circle cx="151" r="4" fill="#ff9f2e"/><text x="161" y="3" class="map-small-label">위험구역</text></g>
  <text x="752" y="414" text-anchor="end" class="map-small-label">FLOOR MAP · 1F</text>
 </svg>`;
}
function metricCard(label,value,unit,cls,iconName,foot){return `<div class="metric-card ${cls}"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon(iconName)}</span></div><div class="metric-value">${value}<small>${unit||''}</small></div><div class="metric-bottom">${foot}</div></div>`;}
function eventMarkup(e){return `<div class="event-item"><div class="event-row-top">${tag(e.level)}<span class="event-time">${e.time}</span><span class="event-ago">${e.acknowledged?'확인됨':e.ago}</span></div><div class="event-title">${escapeHTML(e.title)}</div><div class="event-location">${escapeHTML(e.location)}<br>${escapeHTML(e.description)}</div><div class="event-actions"><span class="tiny muted">이벤트 #${String(e.id).padStart(3,'0')}</span>${e.level==='Critical'?`<button class="button button-primary button-sm" data-action="open-incident">초동대응 열기 <span>→</span></button>`:`<button class="text-button" data-action="ack-event" data-event-id="${e.id}">${e.acknowledged?'확인 완료':'이벤트 확인'} →</button>`}</div></div>`;}
function renderOverview(){
 const openEvents=events.filter(e=>!e.acknowledged).length;
 const critical=incidentResolved?0:events.filter(e=>e.level==='Critical'&&!e.acknowledged).length;
 const warning=events.filter(e=>e.level==='Warning'&&!e.acknowledged).length;
 const caution=events.filter(e=>e.level==='Caution'&&!e.acknowledged).length;
 return `${heading('LIVE OPERATIONS','현장 위험을 한눈에 확인하세요','작업자 · 로봇 · 위험구역 데이터를 하나의 도면에서 모니터링합니다.',`<button class="button button-ghost" data-action="refresh"><span>${icon('pulse')}</span> 화면 새로고침</button><button class="button button-primary" data-action="open-incident">사고 대응 화면 →</button>`)}
 <div class="metrics-grid">${metricCard('헬멧 연결','42','/ 42','metric-normal','helmet','<span class="positive">●</span> 모든 장치 연결됨')}${metricCard('Critical',critical,'건','metric-critical','alert',critical?'즉시 대응 필요':'활성 Critical 없음')}${metricCard('Warning',warning,'건','metric-warning','pulse','센서 · 장비 이상 징후')}${metricCard('Caution',caution,'건','metric-caution','shield','작업 규칙 확인 필요')}${metricCard('미확인 이벤트',openEvents,'건','metric-reports','file','<span class="positive">실시간</span> 이벤트 목록 기준')}</div>
 <div class="overview-layout">
  <section class="card map-card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('map')}</span><div>실시간 위치 지도<span class="subtitle">공장 1층 · 작업자와 로봇 위치를 도면 위에 표시</span></div></div><div class="map-toolbar"><span class="legend-chip"><span class="status-dot green"></span> 작업자</span><span class="legend-chip"><span class="status-dot blue"></span> 로봇</span><span class="legend-chip"><span class="status-dot orange"></span> 위험구역</span><button class="button button-ghost button-sm" data-action="go-rules">도면 설정 ↗</button></div></div><div class="floor-map-wrap">${floorMap('overview')}</div><div class="map-footnote"><span>UWB 앵커 4개로 계산한 위치를 표시합니다. 실제 장비 연결 전에는 예시 위치가 표시됩니다.</span><span>마지막 업데이트 <strong>방금 전</strong></span></div></section>
  <section class="card event-card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('pulse')}</span><div>실시간 이벤트<span class="subtitle">위험 등급순 · 최근 1시간</span></div></div><button class="button button-ghost button-sm" data-action="ack-all">모두 확인</button></div><div class="event-list">${events.filter(e=>!e.acknowledged).length?events.filter(e=>!e.acknowledged).map(eventMarkup).join(''):`<div class="event-empty">확인이 필요한 이벤트가 없습니다.</div>`}</div><div class="divider"></div><div class="map-footnote"><span>이벤트는 데모용 예시 데이터입니다.</span><button class="text-button" data-action="add-demo-event">＋ 이벤트 추가</button></div></section>
 </div>
 <div class="tier-grid">${[['1','헬멧 단말','센서 42대 연결 · 배터리 정상','정상'],['2','스마트폰 엣지','1차 판정 · 비식별화','정상'],['3','4족 보행 로봇','R-1 순찰 중 · R-2 대기','주의'],['4','코어 클라우드','기록 저장 · 이벤트 동기화','정상']].map(t=>`<div class="tier-card"><div class="tier-symbol">T${t[0]}</div><div class="tier-copy"><strong>${t[1]}</strong><span>${t[2]}</span></div><span class="tier-state ${t[3]==='주의'?'warn':''}">● ${t[3]}</span></div>`).join('')}</div>`;
}
function currentClockString(){return new Date().toLocaleTimeString('ko-KR',{hour12:false});}
function getCamera(id){return cameraList.find(c=>c.id===id)||cameraList[0];}
function cameraFeedMarkup(cam,large=false){
 const alert=cameraAlerts[cam.id];
 return `<div class="cctv-screen ${large?'cctv-screen-large':''} ${alert?'has-camera-alert':''}">
   <div class="cctv-scene ${cam.scene} ${large&&alert?'zoom-active':''}">
    <div class="scene-grid"></div><div class="scene-back-wall"></div><div class="scene-floor"></div><div class="scene-object object-a"></div><div class="scene-object object-b"></div><div class="scene-person"><i></i><b></b></div>
    <span class="scene-label scene-label-a">${cam.id==='CAM-01'?'GATE':cam.id==='CAM-02'?'LINE A':cam.id==='CAM-03'?'PAINT ZONE':'EXIT B'}</span>
    ${alert?`<span class="detection-box ${alert.level==='Critical'?'critical-box':''}"><b>감지 대상</b></span><span class="detection-crosshair"></span>`:''}
   </div>
   <div class="cctv-scanline"></div><div class="cctv-osd cctv-osd-top"><span><i></i> ${cam.id} · LIVE DEMO</span><span>${currentClockString()}</span></div>
   <div class="cctv-osd cctv-osd-bottom"><span>${cam.name}</span><span>${cam.angle}</span></div>
   ${alert?`<div class="camera-alert-chip ${alert.level==='Critical'?'critical':'warning'}">${alert.level==='Critical'?'경계 발동':'움직임 감지'} · 자동 확대</div>`:''}
  </div>`;
}
function renderCCTV(){
 const selected=getCamera(selectedCameraId), alert=cameraAlerts[selected.id];
 const criticalCount=Object.values(cameraAlerts).filter(a=>a.level==='Critical').length;
 const warningCount=Object.values(cameraAlerts).filter(a=>a.level!=='Critical').length;
 return `${heading('MULTI-CAMERA WATCH','CCTV 움직임 · 경계 감시','여러 카메라의 움직임 또는 가상 경계 침범 이벤트가 발생하면 해당 카메라를 자동 선택하고 확대하는 화면 초안입니다.',`<button class="button button-ghost" data-action="reset-camera-view">전체 보기</button><button class="button ${autoDetectEnabled?'button-danger':'button-primary'}" data-action="toggle-auto-detect">${autoDetectEnabled?'자동 감지 끄기':'자동 감지 켜기'}</button>`)}
 <div class="cctv-status-strip"><div class="cctv-status-copy"><span class="live-dot ${autoDetectEnabled?'':'demo-dot-muted'}"></span><div><strong>${autoDetectEnabled?'자동 감지 시뮬레이션 실행 중':'감시 화면 준비됨'}</strong><span>${autoDetectEnabled?'일정 간격으로 가상 움직임·경계 이벤트를 생성합니다.':'테스트 버튼으로 감지와 자동 확대 동작을 확인하세요.'}</span></div></div><div class="cctv-status-stats"><span><b>04</b> 카메라</span><span><b>${criticalCount}</b> 경계 발동</span><span><b>${warningCount}</b> 움직임</span></div></div>
 <div class="cctv-main-grid">
  <section class="card cctv-focus-card"><div class="card-header"><div class="card-title"><span class="header-marker">◉</span><div>자동 포커스 카메라<span class="subtitle">감지 이벤트가 발생하면 이 영역에서 확대 화면을 보여줍니다.</span></div></div><div class="cctv-header-tags">${alert?tag(alert.level):tag('정상')}<span class="tag tag-info">${selected.id}</span></div></div>
   ${cameraFeedMarkup(selected,true)}
   <div class="cctv-focus-meta"><div><strong>${selected.name}</strong><span>${selected.zone} · ${selected.angle}</span></div><div class="zoom-indicator ${alert?'active':''}"><span>⌕</span><div><b>${alert?'AUTO ZOOM':'1.0×'}</b><small>${alert?'이벤트 카메라 추적 중':'감지 이벤트 대기'}</small></div></div></div>
   <div class="cctv-action-bar"><button class="button button-primary" data-action="simulate-motion">움직임 감지 테스트</button><button class="button button-danger" data-action="simulate-boundary">경계 발동 테스트</button><button class="button button-ghost" data-action="clear-camera-alert">감지 표시 해제</button></div>
   <div class="cctv-prototype-note"><strong>동작 개념</strong><span>이벤트 → 카메라 ID 확인 → 해당 화면 선택 → 디지털 줌/팝업 강조 → 이벤트 이력 추가. 현재는 가상 이벤트로만 시연합니다.</span></div>
  </section>
  <section class="card cctv-list-card"><div class="card-header"><div class="card-title"><span class="header-marker">▦</span><div>멀티 CCTV 모니터링<span class="subtitle">카메라 카드를 누르면 해당 카메라가 메인 화면으로 전환됩니다.</span></div></div><span class="tag tag-info">4 CH</span></div>
   <div class="camera-grid">${cameraList.map(cam=>{const ca=cameraAlerts[cam.id];return `<button class="camera-tile ${selectedCameraId===cam.id?'selected':''} ${ca?'tile-alert':''}" data-action="select-camera" data-camera="${cam.id}"><div class="camera-tile-feed">${cameraFeedMarkup(cam,false)}<span class="camera-channel">${cam.id}</span></div><div class="camera-tile-meta"><span><strong>${cam.name}</strong><small>${cam.zone}</small></span><span class="camera-state ${ca?'alert-state':'online-state'}"><i></i>${ca?(ca.level==='Critical'?'경계':'움직임'):'온라인'}</span></div></button>`;}).join('')}</div>
   <div class="cctv-mini-note"><span class="status-dot blue"></span> 데모 피드 4채널 · 실제 RTSP/ONVIF 연결 없음</div>
  </section>
 </div>
 <div class="content-grid-2 cctv-lower-grid"><section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('pulse')}</span><div>최근 감지 이벤트<span class="subtitle">새 이벤트가 발생하면 맨 위에 추가됩니다.</span></div></div><button class="text-button" data-action="clear-camera-alert">감지 상태 초기화</button></div><div class="cctv-event-list">${cctvEventLog.slice(0,7).map(ev=>`<button class="cctv-event-row" data-action="select-camera" data-camera="${ev.cameraId}"><span class="cctv-event-level ${ev.level==='Critical'?'critical':'warning'}">${ev.level==='Critical'?'경계':'움직임'}</span><span class="cctv-event-main"><strong>${ev.cameraId} · ${ev.type}</strong><small>${ev.note}</small></span><span class="cctv-event-time">${ev.time}</span><span class="cctv-event-arrow">↗</span></button>`).join('')}</div></section>
  <section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">⌖</span><div>감지 규칙 설명<span class="subtitle">화면 설계에서 가정한 규칙</span></div></div></div><div class="cctv-rule-explain"><div><span class="rule-token blue-token">01</span><p><strong>움직임 후보 감지</strong><small>프레임 차이 또는 객체 추적 결과를 이벤트 후보로 기록합니다.</small></p></div><div><span class="rule-token red-token">02</span><p><strong>가상 경계선 침범</strong><small>객체가 지도에 설정한 경계 구역 안으로 들어오면 높은 우선순위로 표시합니다.</small></p></div><div><span class="rule-token purple-token">03</span><p><strong>자동 확대와 확인</strong><small>이벤트가 난 카메라를 메인 화면으로 전환하고 박스로 강조합니다. 실제 환경에서는 오탐 검토와 권한 정책이 필요합니다.</small></p></div></div></section></div>`;
}
function mapMarkerMarkup(m){
 const cls=m.type==='CCTV'?'camera-pin':m.type==='작업자'?'worker-pin':'hazard-pin';
 const glyph=m.type==='CCTV'?'◉':m.type==='작업자'?'♙':'!';
 return `<button class="map-marker ${cls}" style="left:${m.x}%;top:${m.y}%" data-action="map-marker-detail" data-marker-id="${m.id}" title="${escapeHTML(m.label)}"><span>${glyph}</span><b>${escapeHTML(m.label)}</b></button>`;
}
function digitalMapPanel(){
 let base;
 if(uploadedMapURL){
  if(/\.pdf($|[?#])/i.test(uploadedMapName)){base=`<iframe class="uploaded-map-pdf" src="${uploadedMapURL}#toolbar=0&navpanes=0&view=FitH" title="업로드한 PDF 도면 미리보기"></iframe>`;}
  else {base=`<img class="uploaded-map-image" src="${uploadedMapURL}" alt="업로드한 디지털 도면"/>`;}
 } else {base=`<div class="sample-map-base">${floorMap('overview')}</div><div class="map-empty-caption"><strong>샘플 평면도</strong><span>실제 도면을 업로드하면 이 영역에 표시됩니다.</span></div>`;}
 return `<div class="digital-map-stage" id="digitalMapStage"><div class="digital-map-base-layer">${base}</div><div class="map-click-layer" data-action="place-map-marker" title="선택한 유형의 마커를 놓으려면 도면을 클릭하세요."></div>${mapMarkers.map(mapMarkerMarkup).join('')}</div>`;
}
function renderDigitalMapTools(){
 return `<div class="digital-map-toolbar"><div class="map-mode-group"><button class="map-mode ${mapPlacementMode==='CCTV'?'active':''}" data-action="set-map-mode" data-mode="CCTV">◉ CCTV 배치</button><button class="map-mode ${mapPlacementMode==='작업자'?'active':''}" data-action="set-map-mode" data-mode="작업자">♙ 작업자 위치</button><button class="map-mode ${mapPlacementMode==='위험구역'?'active':''}" data-action="set-map-mode" data-mode="위험구역">! 위험구역</button></div><div class="map-upload-tools"><span class="map-file-label" title="${escapeHTML(uploadedMapName||'도면 파일을 아직 올리지 않았습니다.')}">${uploadedMapName?`파일: ${escapeHTML(uploadedMapName)}`:'도면 파일 미등록'}</span><button class="button button-ghost button-sm" data-action="upload-map">도면 업로드</button></div></div>`;
}
function renderIncident(){
 const resolved=incidentResolved;
 const bannerText=resolved?'오경보 처리 완료':'도장실 화재 의심';
 return `${heading('INCIDENT RESPONSE','사고 초동대응','사고 발생 시 필요한 판단과 조치를 한 화면에서 확인합니다.',`<button class="button button-ghost" data-action="open-overview">← 통합 관제로</button>`)}
 <div class="incident-banner" style="${resolved?'border-color:rgba(61,187,126,.35);background:linear-gradient(100deg,rgba(61,187,126,.12),rgba(61,187,126,.04))':''}"><span class="incident-pulse" style="${resolved?'background:var(--green);box-shadow:0 0 0 6px rgba(61,187,126,.11)':''}"></span><div class="incident-banner-title"><strong>${resolved?'정상 상태로 복구':bannerText}</strong><span>${resolved?'담당자가 데모 이벤트를 오경보로 분류했습니다.':`도장실 · 작업자 W-07 · 이벤트 발생 ${incidentStartedAt}`}</span></div><span class="incident-banner-time">${resolved?'처리 완료':'경과 00:42'}</span>${!resolved?`<button class="button button-danger" data-action="approve-response">${incidentApproved?'대응 승인됨':'대응 단계 승인'}</button><button class="button button-ghost" data-action="resolve-false">오경보 처리</button>`:`<button class="button button-ghost" data-action="reset-incident">데모 초기화</button>`}</div>
 <div class="incident-layout"><div class="incident-left">
  <div class="judgement-grid"><div class="judgement-step"><span class="step-number">1</span><div><strong>헬멧 1차 판단</strong><span>연기 패턴 감지<br>가스 센서 경고</span></div></div><div class="judgement-step"><span class="step-number">2</span><div><strong>로봇 2차 확인</strong><span>열화상 · RGB-D 확인<br>현장 접근 경로 점검</span></div></div><div class="judgement-step ${incidentApproved?'':'active'}"><span class="step-number">3</span><div><strong>${incidentApproved?'담당자 승인 완료':'최종 판단'}</strong><span>${incidentApproved?'시뮬레이션 승인 기록됨':'담당자 확인 대기'}<br>위험 신호 확인 필요</span></div></div></div>
  <section class="card incident-map-card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('map')}</span><div>위험구역과 대피 경로<span class="subtitle">도면 위에 위험 구역 · 확산 예측 · 안전 경로를 표시</span></div></div><span class="tag tag-critical">위험 반경 18m</span></div><div class="floor-map-wrap">${floorMap('incident')}</div><div class="map-footnote"><span>녹색 점선은 예시 대피 경로입니다. 실제 대피 지시는 현장 절차와 확인을 따르세요.</span><span>지도 1F</span></div></section>
  <section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('file')}</span><div>자동 작성 보고서<span class="subtitle">사고 중 타임라인을 기록합니다.</span></div></div><button class="text-button" data-action="go-reports">보고서 열기 →</button></div><div class="report-log">${logEntries.map(l=>`<div class="log-row"><span class="log-time">${l.time}</span><span class="log-bullet"></span><span>${escapeHTML(l.text)}</span></div>`).join('')}</div></section>
 </div><div class="incident-right">
  <section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">AI</span><div>AI 상황 요약<span class="subtitle">데모 문구 · 센서 근거 기반 요약 예시</span></div></div><span class="tag tag-warning">높음</span></div><div class="ai-summary"><p>${resolved?'해당 이벤트는 오경보로 분류되어 데모 상태가 종료되었습니다. 실제 환경에서는 현장 확인과 기록 검토를 거쳐 분류해야 합니다.':'도장실 구역에서 연기 패턴과 VOC 상승 신호가 함께 관측된 상황을 가정합니다. 작업자 W-07 위치 주변의 현장 확인을 우선하고, 안전한 경로 및 담당자 승인 절차를 확인해야 합니다.'}</p><div class="evidence-tags"><span class="evidence-tag">연기 패턴</span><span class="evidence-tag">VOC 상승</span><span class="evidence-tag">W-07 인접</span></div></div><div class="risk-score"><div class="risk-score-head"><span>위험 가능성 (예시 지표)</span><strong>${resolved?'0':'87'}%</strong></div><div class="risk-track"><span style="width:${resolved?0:87}%;background:${resolved?'var(--green)':''}"></span></div></div></section>
  <section class="card action-card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('check')}</span><div>대응 가이드<span class="subtitle">자동 완료 단계와 승인 필요 단계를 구분합니다.</span></div></div><span class="tag ${incidentApproved?'tag-normal':'tag-info'}">${incidentApproved?'승인됨':'5단계'}</span></div><div class="action-list">${[
    ['1','관제 경보와 현장 알림 전송','데모 · 화면 상태만 변경','자동 완료',true],
    ['2','W-07, W-03 대피 경로 안내','실제 알림 전송은 연결되지 않음','자동 완료',true],
    ['3','소방 시스템 연동 호출','현장 절차 및 담당자 승인 필요','승인 필요',incidentApproved],
    ['4','도장실 전원과 설비 상태 확인','시설 담당자 확인 단계','시설 확인',incidentApproved],
    ['5','로봇 현장 영상 및 구역 재확인','2차 확인 후 종료 판단','진행 중',incidentApproved]
   ].map((a,i)=>`<div class="action-row ${a[4]?'completed':''}"><span class="action-index">${a[0]}</span><div class="action-copy"><strong>${a[1]}</strong><span>${a[2]}</span></div>${i===2&&!incidentApproved?`<button class="button button-ghost" data-action="approve-response">승인</button>`:`<span class="action-state ${i===2&&!incidentApproved?'approval':''}">${incidentApproved&&i>=2?'승인 후 진행':a[3]}</span>`}</div>`).join('')}</div><div class="section-pad"><div class="callout"><span>ⓘ</span><span><strong>안전 확인:</strong> 실제 방송·소방 호출·설비 정지는 연결되어 있지 않습니다. 현장 안전 절차에 따라 담당자가 판단해야 합니다.</span></div></div></section>
 </div></div>`;
}
function renderWorkers(){
 const rows=[['W-02','김○○','생산라인 A','정상','07:42','98%'],['W-07','박○○','도장실','위험 근접','00:42','76%'],['W-11','이○○','생산라인 A','보호구 확인','03:20','84%'],['W-05','최○○','생산라인 B','정상','05:18','91%'],['W-14','정○○','출입구 B','정상','02:54','89%']];
 return `${heading('WORKER SAFETY','작업자 모니터링','작업자 위치와 장치 상태를 확인합니다. 개인별 화면에는 본인에게 필요한 경고만 표시하도록 설계했습니다.',`<button class="button button-primary" data-action="send-worker-alert">작업자 경고 시뮬레이션</button>`)}
 <div class="worker-layout"><section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('people')}</span><div>작업자 상태 목록<span class="subtitle">마스킹된 예시 데이터 · 총 42대 연결</span></div></div><span class="tag tag-normal">42 / 42 연결</span></div><div class="inline-stat-row"><div class="inline-stat"><span>작업 중</span><strong>38<small>명</small></strong></div><div class="inline-stat"><span>확인 필요</span><strong style="color:var(--orange)">2<small>명</small></strong></div><div class="inline-stat"><span>통신 끊김</span><strong>0<small>명</small></strong></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>작업자 ID</th><th>이름</th><th>마지막 위치</th><th>상태</th><th>최근 신호</th><th>배터리</th><th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td class="table-primary">${r[0]}<span class="table-secondary">헬멧 연결됨</span></td><td>${r[1]}</td><td>${r[2]}</td><td>${i===1?tag('Critical'):i===2?tag('Caution'):tag('정상')}</td><td>${r[4]} 전</td><td>${r[5]}</td><td><button class="text-button" data-action="worker-detail" data-worker="${r[0]}">보기 →</button></td></tr>`).join('')}</tbody></table></div></section>
 <section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('radio')}</span><div>작업자 앱 미리보기<span class="subtitle">큰 글자 · 필요한 행동 하나 · 버튼 두 개</span></div></div><span class="tag tag-info">MOBILE</span></div><div class="section-pad"><div class="worker-app-shell"><div class="phone-notch"></div><div class="worker-app-screen"><div class="worker-app-top"><strong>DGC 안전 안내</strong><span><span class="status-dot green"></span> 연결됨</span></div><div class="worker-app-alert"><span class="tag tag-critical">긴급 안내</span><h3>안전한 경로로<br>이동하세요.</h3><p>현재 위치: 도장실 인근<br>지정된 대피 경로를 따라 이동하세요.</p></div><div class="worker-route-card"><strong>이동 순서</strong><div class="route-step"><span class="number">1</span><p>작업을 멈추고 주변을 확인하세요.</p></div><div class="route-step"><span class="number">2</span><p>표시된 안전 경로를 따라 이동하세요.</p></div><div class="route-step"><span class="number">3</span><p>안전 구역에서 안내를 기다리세요.</p></div></div><div class="worker-app-buttons"><button class="button button-primary" data-action="worker-confirm">확인했습니다</button><button class="button button-outline-danger" data-action="worker-help">도움이 필요합니다</button></div><div class="worker-app-foot">안내가 실제 전송되는 데모는 아닙니다.</div></div></div></div></section></div>`;
}
function renderRobots(){
 const robots=[{id:'R-1',name:'정찰 로봇 01',mode:'열화상 확인',battery:'82%',signal:'우수',cls:'thermal',temp:'36.8°C',place:'도장실 외곽'},{id:'R-2',name:'정찰 로봇 02',mode:'대기 · 순찰 가능',battery:'94%',signal:'우수',cls:'lidar',temp:'정상',place:'출입구 B'},{id:'R-3',name:'정찰 로봇 03',mode:'충전 스테이션',battery:'34%',signal:'양호',cls:'',temp:'대기',place:'충전 구역'}];
 return `${heading('ROBOT FLEET','로봇 · 2차 현장 확인','LiDAR · RGB-D · 열화상 · 음향 센서로 현장 정보를 보강하는 화면입니다.',`<button class="button button-ghost" data-action="robot-patrol">순찰 상태 갱신</button><button class="button button-primary" data-action="robot-scan">2차 확인 시뮬레이션</button>`)}
 <div class="robot-grid">${robots.map((r,i)=>`<section class="card robot-card"><div class="robot-card-head"><div class="robot-avatar">${icon('robot')}</div><div class="robot-name"><strong>${r.name}</strong><span>${r.id} · ${r.mode}</span></div><span class="robot-battery">◉ ${r.battery}</span></div><div class="feed-visual ${r.cls}"><span class="feed-label">${i===0?'THERMAL CAMERA':i===1?'LIDAR POINT CLOUD':'ROBOT STATUS'}</span><span class="feed-center"></span><div class="feed-overlay"><span>${r.place}</span><span>${i===2?'STANDBY':'LIVE DEMO'}</span></div></div><div class="robot-stats"><div class="robot-stat"><span>센서 상태</span><strong>${r.signal}</strong></div><div class="robot-stat"><span>온도 / 환경</span><strong>${r.temp}</strong></div><div class="robot-stat"><span>통신 지연</span><strong>${i===2?'—':'58 ms'}</strong></div><div class="robot-stat"><span>현장 위치</span><strong>${r.place}</strong></div></div><div class="robot-foot"><span><span class="status-dot ${i===2?'yellow':'green'}"></span> ${i===2?'대기 중':'연결 상태 정상'}</span><button class="text-button" data-action="robot-detail" data-robot="${r.id}">상세 확인 →</button></div></section>`).join('')}</div>
 <div class="content-grid-2"><section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('layers')}</span><div>로봇 작업 큐<span class="subtitle">작업 우선순위와 확인 요청</span></div></div><span class="tag tag-info">3 TASKS</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>작업 ID</th><th>로봇</th><th>요청</th><th>우선순위</th><th>상태</th></tr></thead><tbody><tr><td class="table-primary">TASK-018</td><td>R-1</td><td>도장실 열화상 스캔</td><td>${tag('Critical')}</td><td><span class="report-status">진행 중</span></td></tr><tr><td class="table-primary">TASK-019</td><td>R-2</td><td>비상구 통로 확인</td><td>${tag('Warning')}</td><td>대기</td></tr><tr><td class="table-primary">TASK-020</td><td>R-3</td><td>정기 순찰</td><td>${tag('Caution')}</td><td>예약됨</td></tr></tbody></table></div></section><section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('shield')}</span><div>로봇 안전 가드레일<span class="subtitle">현장 작업 전 확인 항목</span></div></div></div><div class="rule-list"><div class="rule-row"><span class="rule-symbol">01</span><div class="rule-main"><strong>위험 구역 접근 제한</strong><span>지오펜스와 현장 출입 조건 확인</span></div><span class="tag tag-normal">적용</span></div><div class="rule-row"><span class="rule-symbol">02</span><div class="rule-main"><strong>원격 정지 확인</strong><span>실제 장비 연결 전에 모의 테스트 필요</span></div><span class="tag tag-caution">점검 필요</span></div><div class="rule-row"><span class="rule-symbol">03</span><div class="rule-main"><strong>센서 불일치 처리</strong><span>헬멧 신호와 로봇 추론이 다르면 담당자 확인</span></div><span class="tag tag-normal">적용</span></div></div></section></div>`;
}
function renderRules(){
 const rules=[['paint','◉','도장실 화재 · 연기 감지','연기 패턴 + VOC 상승 시 Warning, 복수 신호 결합 시 Critical 후보','Critical'],['geofence','⌖','위험 구역 지오펜스','작업자 위치가 통제 구역 경계에 접근하면 웨어러블 경고','Warning'],['ppe','♙','보호구 착용 확인','헬멧 카메라에서 안전모 미착용 후보를 감지해 목록에 기록','Caution'],['forklift','↔','장비 이동 · 충돌 위험','장비 움직임과 작업자 위치가 가까워지면 경고','Warning'],['gas','◎','가스 · 환경 센서 기준','구역별 센서 기준 초과 및 지속 시간 규칙을 평가','Critical']];
 return `${heading('MAP & RULES','디지털 도면 · 위험 규칙','공장 도면을 업로드한 뒤 지도 좌표에 CCTV·작업자·위험구역 마커를 배치하는 화면 초안입니다.',`<button class="button button-ghost" data-action="remove-last-marker">마지막 마커 삭제</button><button class="button button-ghost" data-action="reset-rules">규칙 기본값</button><button class="button button-primary" data-action="save-map-layout">도면 배치 저장</button>`)}
 <div class="digital-map-layout"><section class="card digital-map-card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('map')}</span><div>디지털 도면 매핑<span class="subtitle">선택한 유형을 고르고 도면을 클릭하면 위치 마커가 추가됩니다.</span></div></div><span class="tag tag-info">${uploadedMapURL?'CUSTOM MAP':'SAMPLE MAP'}</span></div>
 ${renderDigitalMapTools()}${digitalMapPanel()}
 <div class="map-footnote"><span>${uploadedMapURL?'업로드한 도면 위에 마커를 배치할 수 있습니다.':'도면을 업로드하지 않은 상태라 샘플 공장 도면을 표시합니다.'}</span><span>${mapMarkers.length}개 마커</span></div>
 <div class="map-marker-summary">${mapMarkers.slice(0,8).map(m=>`<span class="map-summary-chip ${m.type==='위험구역'?'hazard-chip':m.type==='작업자'?'worker-chip':'camera-chip'}">${escapeHTML(m.label)} <small>${m.type}</small></span>`).join('')}</div>
 <div class="section-pad"><div class="callout"><span>ⓘ</span><span><strong>도면 입력 참고:</strong> 초안에서는 PNG/JPG/WebP/SVG 이미지와 PDF를 미리 볼 수 있습니다. CAD 원본(DWG/DXF)은 먼저 PDF 또는 이미지로 내보내야 하며, 축척 보정·좌표 정합·자동 객체 인식은 실제 개발 단계에서 추가해야 합니다.</span></div></div>
 </section><section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('shield')}</span><div>구역별 위험 규칙<span class="subtitle">담당자가 규칙을 활성화하거나 비활성화합니다.</span></div></div><span class="tag tag-info">${Object.values(ruleState).filter(Boolean).length} ACTIVE</span></div><div class="rule-list">${rules.map(r=>`<div class="rule-row"><span class="rule-symbol">${r[1]}</span><div class="rule-main"><strong>${r[2]}</strong><span>${r[3]}</span><div style="margin-top:7px">${tag(r[4])}</div></div><button class="switch" role="switch" aria-checked="${!!ruleState[r[0]]}" aria-label="${r[2]} 규칙 활성화" data-action="toggle-rule" data-rule="${r[0]}"></button></div>`).join('')}</div>
 <div class="section-pad"><div class="callout"><span>ⓘ</span><span><strong>매핑 후 연결 예시:</strong> 도면의 카메라 위치와 감지 구역을 같은 좌표계로 맞추면 이벤트 목록에서 발생 위치와 관련 카메라를 함께 보여줄 수 있습니다. 현재 마커는 브라우저 화면용 예시 데이터입니다.</span></div></div></section></div>`;
}
function renderSettings(){
 const rows=[['blur','◌','영상 비식별화','얼굴 등 개인 식별 정보를 현장 단말에서 마스킹하는 설정입니다.','ON'],['eventOnly','▤','이벤트만 클라우드 전송','원본 영상 대신 이벤트 메타데이터 중심으로 전송하도록 설계합니다.','ON'],['speaker','◖','스피커 · 경광등 연동','담당자 승인 정책에 따라 설비 연동 여부를 제어합니다.','ON'],['plc','↯','PLC 설비 정지 연동','실제 연결 전에는 비활성 상태로 두고 별도 승인·안전 검증이 필요합니다.','OFF'],['cloud','☁','클라우드 이벤트 저장','이벤트 기록, 보고서, 규칙 버전 저장에 사용합니다.','ON'],['notifications','♢','관제 알림','Critical과 Warning 이벤트를 관제 담당자에게 표시합니다.','ON']];
 return `${heading('CONFIGURATION','플랫폼 설정','비식별화 · 설비 연동 · 알림 정책을 관리합니다. 실제 연동 여부와 권한 정책은 별도 검토가 필요합니다.',`<button class="button button-primary" data-action="save-settings">설정 저장</button>`)}
 <div class="content-grid-2"><div class="content-stack"><section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('shield')}</span><div>개인정보 · 데이터 처리<span class="subtitle">현장 영상과 이벤트 기록의 기본 정책</span></div></div></div><div class="settings-group">${rows.slice(0,2).map(r=>settingRow(r)).join('')}</div><div class="section-pad"><div class="callout"><span>ⓘ</span><span><strong>운영 전 결정:</strong> 얼굴 블러 방식, 원본 영상 보존 기간, 작업자 사전 동의 절차를 확정해야 합니다.</span></div></div></section><section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('radio')}</span><div>알림 · 연동 정책<span class="subtitle">실제 설비 제어 기능은 현재 연결되어 있지 않습니다.</span></div></div></div><div class="settings-group">${rows.slice(2).map(r=>settingRow(r)).join('')}</div></section></div>
 <div class="content-stack"><section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('layers')}</span><div>시스템 연결 상태<span class="subtitle">데모 환경의 연결 모형</span></div></div></div><div class="settings-group"><div class="setting-row"><span class="setting-icon">H</span><div class="setting-copy"><strong>헬멧 · 웨어러블</strong><span>42개 예시 단말 · 외부 장치 연결 없음</span></div><span class="tag tag-info">DEMO</span></div><div class="setting-row"><span class="setting-icon">R</span><div class="setting-copy"><strong>로봇 관제</strong><span>R-1 · R-2 · R-3 상태 시뮬레이션</span></div><span class="tag tag-info">DEMO</span></div><div class="setting-row"><span class="setting-icon">SC</span><div class="setting-copy"><strong>SCADA / PLC</strong><span>연동 전 · 담당자 승인 정책 확인 필요</span></div><span class="tag tag-caution">미연결</span></div><div class="setting-row"><span class="setting-icon">E</span><div class="setting-copy"><strong>EHS · 메신저</strong><span>보고서 및 외부 시스템 API 미연결</span></div><span class="tag tag-caution">미연결</span></div></div></section><section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('shield')}</span><div>보안 기본 정보</div></div></div><div class="settings-group"><div class="setting-row"><div class="setting-copy"><strong>접근 권한</strong><span>관제 담당자 · 안전관리자 · 작업자 · 감사/경영진 역할 분리</span></div><span class="tag tag-info">설계 항목</span></div><div class="setting-row"><div class="setting-copy"><strong>보안 인증 목표</strong><span>ISO/IEC 27001 등 인증 범위 검토 필요</span></div><span class="tag tag-caution">협의 필요</span></div></div></section></div></div>`;
}
function settingRow(r){return `<div class="setting-row"><span class="setting-icon">${r[1]}</span><div class="setting-copy"><strong>${r[2]}</strong><span>${r[3]}</span></div><button class="switch" role="switch" aria-checked="${!!settingsState[r[0]]}" aria-label="${r[2]} 설정" data-action="toggle-setting" data-setting="${r[0]}"></button></div>`;}
function renderReports(){
 const reportData=[{id:'RPT-1024',date:'2026.10.16 14:32',title:'도장실 화재 의심 이벤트',level:'Critical',status:'작성 중',location:'도장실'},{id:'RPT-1023',date:'2026.10.16 14:29',title:'보호구 착용 규칙 위반 후보',level:'Caution',status:'검토 대기',location:'생산라인 A'},{id:'RPT-1022',date:'2026.10.16 14:21',title:'비상구 통로 장애물 후보',level:'Caution',status:'조치 기록됨',location:'출입구 B-1'},{id:'RPT-1021',date:'2026.10.16 13:55',title:'VOC 센서 기준치 접근',level:'Warning',status:'종료',location:'도장실'},{id:'RPT-1020',date:'2026.10.16 13:34',title:'로봇 R-1 정기 순찰',level:'정보',status:'종료',location:'전체'}];
 const shown=reportData.filter(r=>(reportFilter==='전체'||r.level===reportFilter)&&(`${r.id} ${r.title} ${r.location}`.toLowerCase().includes(reportSearch.toLowerCase())));
 return `${heading('REPORT CENTER','보고서 · 이벤트 이력','시각별 이벤트를 검색하고 일일·사고 보고서로 내보낼 수 있습니다.',`<button class="button button-primary" data-action="export-report">CSV 내보내기 ↓</button>`)}
 <div class="report-summary-grid"><div class="summary-mini"><span>오늘 이벤트</span><strong>24<small>건</small></strong></div><div class="summary-mini"><span>Critical</span><strong style="color:var(--red)">1<small>건</small></strong></div><div class="summary-mini"><span>조치 완료</span><strong style="color:var(--green)">18<small>건</small></strong></div><div class="summary-mini"><span>검토 대기</span><strong style="color:var(--orange)">3<small>건</small></strong></div></div>
 <section class="card"><div class="card-header"><div class="card-title"><span class="header-marker">${icon('file')}</span><div>최근 보고서 목록<span class="subtitle">이 화면의 값은 초안 시연용 예시입니다.</span></div></div><span class="tag tag-info">오늘 · 2026.10.16</span></div><div class="filter-bar"><input class="search-input" id="reportSearch" type="search" placeholder="보고서 ID, 제목, 위치 검색" value="${escapeHTML(reportSearch)}"/><select class="filter-select" id="reportFilter" aria-label="위험 등급 필터">${['전체','Critical','Warning','Caution','정보'].map(f=>`<option ${reportFilter===f?'selected':''}>${f}</option>`).join('')}</select><span class="tiny muted">${shown.length}개 항목</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>보고서 ID</th><th>일시</th><th>제목</th><th>등급</th><th>위치</th><th>상태</th><th></th></tr></thead><tbody>${shown.map(r=>`<tr><td class="table-primary">${r.id}</td><td>${r.date}</td><td class="table-primary">${r.title}</td><td>${tag(r.level)}</td><td>${r.location}</td><td><span class="${r.status==='종료'||r.status==='조치 기록됨'?'report-status':''}">${r.status}</span></td><td><button class="text-button" data-action="report-detail" data-report="${r.id}">열기 →</button></td></tr>`).join('')||`<tr><td colspan="7"><div class="empty-state">검색 결과가 없습니다.</div></td></tr>`}</tbody></table></div><div class="map-footnote"><span>보고서 열기는 데모 확인용 알림을 표시합니다.</span><span>마지막 생성 <strong>방금 전</strong></span></div></section>
 <div class="callout" style="margin-top:15px"><span>ⓘ</span><span><strong>보고서 설계 메모:</strong> AI 상황 요약, 근거 이벤트, 담당자 승인 이력, 시각별 타임라인을 결합하는 구조입니다. 외부 EHS·메신저 연동은 미구현입니다.</span></div>`;
}
function renderPage(page){activePage=page;currentSection.textContent=pageLabels[page]||'통합 관제';document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));const renderers={overview:renderOverview,cctv:renderCCTV,incident:renderIncident,workers:renderWorkers,robots:renderRobots,rules:renderRules,settings:renderSettings,reports:renderReports};appView.innerHTML=(renderers[page]||renderOverview)();sidebar.classList.remove('open');mobileScrim.classList.remove('visible');window.scrollTo({top:0,behavior:'smooth'});}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(title,message,symbol='✓'){const node=document.createElement('div');node.className='toast';node.innerHTML=`<span class="toast-symbol">${symbol}</span><div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span></div>`;toastRegion.appendChild(node);window.setTimeout(()=>{node.style.opacity='0';node.style.transform='translateY(6px)';window.setTimeout(()=>node.remove(),220);},3600);}
function currentTime(){const d=new Date();document.getElementById('clock').textContent=d.toLocaleTimeString('ko-KR',{hour12:false});document.getElementById('dateStamp').textContent=d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');}
function addDemoEvent(){injectedCount++;const id=Math.max(...events.map(e=>e.id))+1;events.unshift({id,level:'Warning',className:'warning',time:new Date().toLocaleTimeString('ko-KR',{hour12:false}),title:`데모 센서 이벤트 #${injectedCount}`,location:'생산라인 B · 가상 센서',description:'사용자가 생성한 테스트 이벤트 · 실제 장비 신호가 아님',ago:'방금',action:'이벤트 확인',acknowledged:false});toast('데모 이벤트가 추가되었습니다.','실제 센서나 장비에서 발생한 알림이 아닙니다.','＋');renderPage(activePage);}
function triggerCameraAlert(cameraId, boundary=false, quiet=false){
 const cam=getCamera(cameraId), level=boundary?'Critical':'Warning';
 const alert={level,type:boundary?'경계구역 진입':'움직임 감지',time:currentClockString(),note:boundary?'가상 경계선 안쪽에서 움직임 후보가 감지됨':'영상 프레임에서 움직임 후보가 감지됨'};
 cameraAlerts[cameraId]=alert;selectedCameraId=cameraId;cctvEventSeq++;
 cctvEventLog.unshift({id:cctvEventSeq,time:alert.time,cameraId,level,type:alert.type,note:alert.note+' · 감지 카메라 자동 선택'});cctvEventLog=cctvEventLog.slice(0,20);
 const id=Math.max(0,...events.map(x=>x.id))+1;
 events.unshift({id,level,className:boundary?'critical':'warning',time:alert.time,title:`${cam.name} ${boundary?'경계구역 침범':'움직임 감지'}`,location:`${cam.id} · ${cam.zone}`,description:`${alert.note} · 카메라 자동 확대(시뮬레이션)`,ago:'방금',action:'상세 보기',acknowledged:false});events=events.slice(0,40);
 if(!quiet)toast(boundary?'경계 발동 감지':'움직임 감지',`${cam.id} ${cam.name} 카메라를 메인 화면으로 전환하고 확대했습니다. 데모 이벤트이며 실제 CCTV 분석 결과가 아닙니다.`,boundary?'!':'⌕');
 if(activePage==='cctv') renderPage('cctv');
}
function setAutoDetection(on){
 autoDetectEnabled=!!on;
 if(autoDetectionTimer){clearInterval(autoDetectionTimer);autoDetectionTimer=null;}
 if(autoDetectEnabled){
  autoDetectionTimer=window.setInterval(()=>{
   if(!autoDetectEnabled)return;
   const cam=cameraList[Math.floor(Math.random()*cameraList.length)];
   triggerCameraAlert(cam.id,Math.random()<0.33,true);
   if(activePage==='cctv')renderPage('cctv');
   toast('자동 감지 이벤트',`${cam.id}에서 가상 이벤트를 만들고 메인 화면 포커스를 전환했습니다.`,'◉');
  },18000);
 }
}
function showActionInfo(action, el){
 const mode=el?.dataset?.mode;
 const key=action==='toggle-rule'?`rule:${el?.dataset?.rule}`:action==='toggle-setting'?`setting:${el?.dataset?.setting}`:action==='select-camera'?`camera:${el?.dataset?.camera}`:action==='map-marker-detail'?`marker:${el?.dataset?.markerId}`:action==='set-map-mode'?`mapmode:${mode}`:action;
 let data=actionHelp[key]||actionHelp[action];
 if(!data){const label=(el?.innerText||action||'기능').replace(/\s+/g,' ').trim();data={title:label||'기능 설명',body:'이 버튼은 해당 화면의 선택 항목을 조작하는 데모 컨트롤입니다.',steps:['초안에서는 브라우저 내부 상태만 바뀝니다.','실제 시스템 연결이 필요하면 서버 API, 접근 권한, 이벤트 기록을 추가해야 합니다.'],note:'실제 CCTV·센서·설비에는 연결되어 있지 않습니다.'};}
 document.getElementById('detailEyebrow').textContent=data.eyebrow||'기능 상세 설명';
 document.getElementById('detailTitle').textContent=data.title;
 const body=document.getElementById('detailBody');
 body.innerHTML=`<p class="detail-intro">${escapeHTML(data.body||'')}</p>${data.steps?.length?`<div class="detail-steps">${data.steps.map((x,i)=>`<div class="detail-step"><span>${String(i+1).padStart(2,'0')}</span><p>${escapeHTML(x)}</p></div>`).join('')}</div>`:''}${data.note?`<div class="detail-note"><strong>참고</strong><span>${escapeHTML(data.note)}</span></div>`:''}`;
 const modal=document.getElementById('detailModal');modal.hidden=false;document.body.classList.add('modal-open');
}
function showPageInfo(page){
 const info=pageHelp[page];if(!info)return;
 document.getElementById('detailEyebrow').textContent='화면 이용 안내';document.getElementById('detailTitle').textContent=info.title;
 document.getElementById('detailBody').innerHTML=`<p class="detail-intro">${escapeHTML(info.body)}</p><div class="detail-steps">${info.steps.map((x,i)=>`<div class="detail-step"><span>${String(i+1).padStart(2,'0')}</span><p>${escapeHTML(x)}</p></div>`).join('')}</div><div class="detail-note"><strong>초안 범위</strong><span>${escapeHTML(info.note||'화면의 수치와 이벤트는 테스트용 예시입니다.')}</span></div>`;
 document.getElementById('detailModal').hidden=false;document.body.classList.add('modal-open');
}
function closeDetailModal(){document.getElementById('detailModal').hidden=true;document.body.classList.remove('modal-open');}

const pageHelp={
 overview:{title:'통합 관제 · 화면 안내',body:'작업자, 로봇, 위험 등급, 이벤트 목록을 한 화면에서 확인하는 시작 화면입니다.',steps:['상단 숫자는 센서·위험 이벤트의 요약입니다.','중앙 도면은 작업자·로봇·위험 위치를 함께 보여주는 예시입니다.','CCTV 감시 메뉴에서 여러 카메라의 자동 확대 동작을 시연할 수 있습니다.'],note:'모든 수치는 정적 데모 데이터입니다.'},
 cctv:{title:'CCTV 감시 · 화면 안내',body:'멀티 카메라 피드의 가상 움직임/경계 이벤트를 만들고, 감지된 카메라를 메인 포커스로 자동 전환하는 화면입니다.',steps:['움직임 감지 테스트는 Warning 후보 이벤트를 만듭니다.','경계 발동 테스트는 Critical 경계 침범 예시를 만들고 카메라 화면을 확대합니다.','자동 감지 켜기는 18초 간격으로 가상 이벤트를 만들어 동작을 보여줍니다.','실제 제품에서는 CCTV 스트림, 객체 분석, 경계 영역 좌표와 이벤트 서버를 연결해야 합니다.'],note:'실제 CCTV나 AI 영상 분석과 연결되어 있지 않습니다.'},
 incident:{title:'사고 초동대응 · 화면 안내',body:'사고 발생 직후 판단 근거, 대응 절차, 지도와 승인 단계를 보여주는 화면입니다.',steps:['1차 센서 및 헬멧 감지 내용을 확인합니다.','2차 로봇 확인 결과와 지도 위치를 함께 검토합니다.','소방·설비 관련 단계는 실제 환경에서 반드시 권한과 승인 절차를 거쳐야 합니다.'],note:'승인/오경보 버튼은 브라우저의 데모 상태만 변경합니다.'},
 workers:{title:'작업자 · 화면 안내',body:'마스킹된 작업자 ID, 마지막 위치, 상태와 단말 상태를 요약합니다.',steps:['작업자 상세를 열어 상태 확인 흐름을 시연합니다.','작업자 앱 미리보기에서 확인/도움 요청 버튼을 시험할 수 있습니다.','실서비스에서는 위치 공유 목적, 보존 기간, 접근 권한을 정의해야 합니다.'],note:'개인정보와 위치 데이터는 예시 값입니다.'},
 robots:{title:'로봇 · 화면 안내',body:'4족 보행 로봇의 순찰 작업, 열화상·LiDAR 계열 센서 화면을 설명하는 영역입니다.',steps:['각 로봇 카드의 센서 상태와 가상 배터리 값을 확인합니다.','2차 확인 버튼은 현장 검증 동작을 흉내 냅니다.','실제 로봇 API와 비상 정지 정책은 별도로 구현해야 합니다.'],note:'실제 로봇 센서나 이동 명령은 연결되어 있지 않습니다.'},
 rules:{title:'디지털 도면 · 화면 안내',body:'도면 업로드, 마커 유형 선택, 지도 클릭을 통한 CCTV·작업자·위험구역 위치 배치를 할 수 있습니다.',steps:['도면 업로드에서 PNG/JPG/WebP/SVG 또는 PDF를 선택합니다.','CCTV 배치/작업자 위치/위험구역 중 유형을 선택합니다.','도면을 클릭해 마커를 추가하고, 마커를 선택하면 상세 설명을 볼 수 있습니다.','도면 배치 저장은 현재 브라우저에 마커 좌표를 저장하는 데모 동작입니다.'],note:'CAD(DWG/DXF) 자동 변환, 축척 보정, 좌표 정합은 구현 전입니다.'},
 settings:{title:'설정 · 화면 안내',body:'비식별화, 클라우드 전송, 알림, 설비 연동 정책의 설계 위치입니다.',steps:['스위치를 눌러 화면상 설정을 변경합니다.','설정 저장은 실제 서버가 아닌 데모 동작입니다.','실제 설비 정지·방송 연동은 운영 정책과 승인 조건을 먼저 확정해야 합니다.'],note:'화면에서 ON/OFF가 바뀌어도 외부 장치에 명령하지 않습니다.'},
 reports:{title:'보고서 · 화면 안내',body:'이벤트 이력을 검색·필터링하고 CSV 형태의 예시 보고서를 내보냅니다.',steps:['검색창에서 ID, 제목, 위치로 항목을 찾습니다.','등급 필터로 Critical, Warning, Caution을 좁혀 봅니다.','CSV 내보내기로 현재 데모 이력을 다운로드합니다.'],note:'실제 운영용 감사 로그나 서버 저장소가 아닙니다.'}
};
const actionHelp={
 'refresh':{title:'화면 새로고침',body:'현재 화면을 다시 그려 브라우저 내 최신 데모 상태를 반영합니다.',steps:['변경된 데모 상태를 기준으로 구성 요소를 다시 렌더링합니다.','서버에서 실제 센서값을 가져오는 동작은 포함하지 않습니다.']},
 'add-demo-event':{title:'데모 이벤트 추가',body:'테스트용 이벤트 한 건을 목록 맨 위에 추가해 화면 업데이트와 확인 처리를 시험합니다.',steps:['이벤트 ID와 현재 시각을 가진 가상 항목이 생성됩니다.','실제 센서나 CCTV 신호가 발생한 것은 아닙니다.']},
 'open-incident':{title:'사고 초동대응 화면 열기',body:'감지 이벤트에 대한 위험 요약, 지도, 1·2차 확인과 대응 가이드를 한 화면에서 검토합니다.',steps:['위험 등급과 발생 위치를 확인합니다.','대응 승인은 화면에만 기록되며 실제 소방·PLC 호출은 이루어지지 않습니다.']},
 'open-overview':{title:'통합 관제로 돌아가기',body:'관제 대시보드로 돌아가 전체 이벤트와 위치 요약을 확인합니다.',steps:['미확인 이벤트와 위험 등급을 요약합니다.','위험 상세는 사고 초동대응 또는 CCTV 감시 화면에서 이어서 확인합니다.']},
 'go-rules':{title:'도면 설정 열기',body:'지도 파일, 위치 마커, 구역 규칙을 관리하는 화면으로 이동합니다.',steps:['도면 파일은 이 브라우저 세션에서 미리 볼 수 있습니다.','지도 위 마커와 규칙은 데모 상태입니다.']},
 'go-reports':{title:'보고서 열기',body:'시간순 이벤트 이력과 예시 보고서를 검색할 수 있는 화면으로 이동합니다.',steps:['등급 필터와 검색을 사용해 관심 이벤트를 찾습니다.','CSV는 예시 데이터 내보내기입니다.']},
 'ack-all':{title:'이벤트 모두 확인',body:'현재 이벤트 목록의 모든 데모 항목을 확인 완료 상태로 표시합니다.',steps:['읽음 상태만 변경됩니다.','확인 기록을 서버에 전송하거나 담당자에게 알림을 보내지는 않습니다.']},
 'ack-event':{title:'이벤트 확인',body:'선택한 데모 이벤트의 확인 상태를 변경합니다.',steps:['목록상 상태가 확인됨으로 바뀝니다.','현장 위험 자체를 해제하거나 센서를 제어하지는 않습니다.']},
 'approve-response':{title:'대응 단계 승인',body:'대응 가이드의 승인 필요 단계를 승인 완료로 표시하는 시연 버튼입니다.',steps:['현재 브라우저에서 승인 상태와 타임라인이 바뀝니다.','실제 소방 신고, PLC 정지, 경광등 호출은 발생하지 않습니다.'],note:'실서비스 승인 흐름은 사용자 권한, 2차 확인, 감사 로그가 필요합니다.'},
 'resolve-false':{title:'오경보 처리',body:'현재 사고 예시를 오경보 상태로 정리하는 버튼입니다.',steps:['데모 이벤트의 확인 상태와 사고 화면 요약을 변경합니다.','실제 현장에서는 담당자의 확인 증거와 판단 이력을 남겨야 합니다.']},
 'reset-incident':{title:'사고 데모 초기화',body:'사고 초동대응 화면의 예시 상태와 타임라인을 초기 상태로 되돌립니다.',steps:['승인/오경보 상태를 초기화합니다.','실제 사고 데이터나 외부 시스템 기록은 건드리지 않습니다.']},
 'send-worker-alert':{title:'작업자 경고 시뮬레이션',body:'작업자 앱에 표시될 경고 흐름을 미리 보는 컨트롤입니다.',steps:['데모 안내만 표시합니다.','실제 헬멧 진동이나 작업자 스마트폰으로 알림이 전송되지 않습니다.']},
 'worker-confirm':{title:'작업자 확인 응답',body:'작업자가 안내를 확인한 것으로 화면상 기록하는 버튼입니다.',steps:['확인 응답 안내를 표시합니다.','운영 백엔드나 작업자 관리 시스템에 응답을 기록하지 않습니다.']},
 'worker-help':{title:'작업자 도움 요청',body:'작업자 앱에서 도움 요청을 누를 때의 관제 알림 흐름을 보여줍니다.',steps:['도움 요청 UI를 시연합니다.','실제 관제센터나 구조 담당자에게 연락되지 않습니다.']},
 'worker-detail':{title:'작업자 상세 정보',body:'선택한 작업자 ID의 가상 프로필과 단말 상태를 확인하는 기능입니다.',steps:['마스킹된 ID와 마지막 위치를 보여주는 화면 흐름을 설명합니다.','실제 개인 데이터나 위치 추적 API는 연결되어 있지 않습니다.']},
 'robot-patrol':{title:'로봇 순찰 상태 갱신',body:'로봇 순찰 작업 큐의 상태를 확인하는 시연 버튼입니다.',steps:['현재 정적 데모 상태를 갱신합니다.','로봇에 실제 이동 명령을 전송하지 않습니다.']},
 'robot-scan':{title:'로봇 2차 확인',body:'감지 후 로봇의 열화상/RGB-D/LiDAR 확인 단계가 실행되는 흐름을 보여줍니다.',steps:['2차 확인 중이라는 데모 상태를 보여줍니다.','현장 센서 스트림이나 자율주행 시스템은 연결되어 있지 않습니다.']},
 'robot-detail':{title:'로봇 상세 정보',body:'선택한 로봇의 역할, 센서 상태, 순찰 장소를 설명하는 기능입니다.',steps:['각 로봇 카드에서 정적 가상 상태를 확인합니다.','실제 위치·배터리·센서 값은 읽어오지 않습니다.']},
 'save-settings':{title:'설정 저장',body:'현재 설정 화면에서 선택한 옵션을 저장하는 흐름을 시연합니다.',steps:['현재 버전은 서버에 값을 전송하지 않습니다.','실제 서비스에서는 변경 권한과 감사 이력을 저장해야 합니다.']},
 'save-rules':{title:'규칙 저장',body:'구역별 위험 규칙 설정을 저장하는 흐름을 설명합니다.',steps:['스위치 변경은 이 브라우저 화면에만 반영됩니다.','실제 감지 엔진에 규칙을 배포하지 않습니다.']},
 'reset-rules':{title:'규칙 기본값 복원',body:'도장실 화재, 지오펜스, 보호구, 장비 이동, 가스 규칙을 기본 상태로 돌립니다.',steps:['규칙 스위치를 초안 기본값으로 되돌립니다.','실제 현장 규칙이나 장비 설정에는 영향을 주지 않습니다.']},
 'toggle-rule':{title:'위험 규칙 켜기/끄기',body:'선택한 위험 규칙을 화면상 활성/비활성으로 전환합니다.',steps:['예: 지오펜스 규칙을 끄면 화면상 비활성으로 표시됩니다.','감지 파이프라인 또는 현장 센서에는 변경 사항이 전달되지 않습니다.']},
 'toggle-setting':{title:'플랫폼 설정 켜기/끄기',body:'선택한 비식별화, 이벤트 전송 또는 연동 옵션을 화면에서 전환합니다.',steps:['바뀐 값은 데모 UI에만 반영됩니다.','실제 적용 전 개인정보·보안·안전 정책 검토가 필요합니다.']},
 'upload-map':{title:'디지털 도면 업로드',body:'공장 또는 시설의 도면 파일을 웹 화면에 불러옵니다.',steps:['PNG, JPG, WebP, SVG 이미지 또는 PDF 파일을 선택합니다.','업로드한 파일은 현재 브라우저 세션의 미리보기로 표시됩니다.','CAD 원본은 PDF/이미지로 내보내서 사용하세요.'],note:'실제 축척·좌표 정합이나 CAD 자동변환은 아직 구현되어 있지 않습니다.'},
 'export-report':{title:'CSV 보고서 내보내기',body:'보고서 표와 데모 이벤트 데이터를 CSV 파일로 다운로드합니다.',steps:['스프레드시트에서 열 수 있는 UTF-8 CSV 파일을 생성합니다.','실제 서버 데이터나 감사 로그를 내려받는 기능은 아닙니다.']},
 'report-detail':{title:'보고서 상세 열기',body:'선택한 보고서에 해당하는 세부 이벤트와 조치 기록을 검토하는 흐름을 시연합니다.',steps:['현재는 확인 알림을 표시합니다.','실제 서비스에서는 원본 이벤트, 근거 영상, 승인자, 시각별 조치가 포함되어야 합니다.']},
 'toggle-auto-detect':{title:'자동 감지 시뮬레이션',body:'멀티 CCTV 화면에 주기적으로 가상 움직임/경계 이벤트를 발생시켜 자동 확대 기능을 확인합니다.',steps:['켜면 약 18초 간격으로 카메라 하나를 선택해 가상 이벤트를 생성합니다.','이벤트 카메라가 메인 화면으로 전환되고 피드가 확대됩니다.','다시 끄면 자동 이벤트 생성 타이머가 종료됩니다.'],note:'실제 영상 분석 모델이 아니라 프런트엔드 테스트 이벤트입니다.'},
 'simulate-motion':{title:'움직임 감지 테스트',body:'선택한 카메라에서 움직임 후보 이벤트가 난 것처럼 시뮬레이션합니다.',steps:['해당 카메라에 Warning 이벤트가 추가됩니다.','카메라가 메인 포커스가 되고 확대 박스가 표시됩니다.','이벤트 목록과 통합 관제 이벤트에도 데모 항목이 추가됩니다.']},
 'simulate-boundary':{title:'경계 발동 테스트',body:'선택한 카메라의 가상 경계구역을 침범한 것처럼 높은 우선순위 이벤트를 만듭니다.',steps:['해당 카메라에 Critical 경계구역 진입 이벤트가 추가됩니다.','메인 피드에 경계 발동 표시와 감지 박스가 나타납니다.','실제 경보 설비나 외부 시스템 신호는 발생하지 않습니다.']},
 'clear-camera-alert':{title:'감지 표시 해제',body:'카메라의 강조 박스와 현재 경계/움직임 상태를 화면에서 지웁니다.',steps:['저장된 이벤트 이력은 남아 있습니다.','실제 현장의 경계 조건을 해제하거나 카메라 분석을 끄는 기능은 아닙니다.']},
 'reset-camera-view':{title:'멀티 카메라 전체 보기',body:'자동 확대 상태 대신 기본 카메라 화면으로 돌아갑니다.',steps:['메인 화면을 CAM-01로 전환합니다.','이전에 발생한 감지 이벤트 이력은 유지합니다.']},
 'select-camera':{title:'카메라 채널 선택',body:'선택한 CCTV 채널을 메인 화면에 표시합니다.',steps:['해당 카메라 이름과 구역을 보여줍니다.','감지 상태가 있는 카메라는 자동 확대 표시를 유지합니다.']},
 'set-map-mode':{title:'도면 마커 유형 선택',body:'도면을 클릭했을 때 추가할 위치 마커 종류를 지정합니다.',steps:['CCTV 배치는 카메라 채널 위치를 표시합니다.','작업자 위치는 현장 위치 예시를 표시합니다.','위험구역은 위험 영역 중심점의 예시를 표시합니다.']},
 'place-map-marker':{title:'도면 위치 마커 추가',body:'선택한 마커 유형을 도면 클릭 위치에 추가합니다.',steps:['마커 좌표를 현재 도면 영역의 백분율(x/y)로 계산합니다.','배치 저장 버튼을 누르면 마커 위치를 이 브라우저의 로컬 저장소에 저장합니다.'],note:'실제 도면 좌표계와 현장 좌표(UWB/GIS) 정합은 추가 개발이 필요합니다.'},
 'remove-last-marker':{title:'마지막 도면 마커 삭제',body:'가장 최근에 추가한 마커 하나를 도면에서 제거합니다.',steps:['잘못 배치한 마커를 되돌릴 때 사용합니다.','이미 저장한 배치값은 다시 저장하기 전까지 별도로 남을 수 있으니 최종 저장 상태를 확인하세요.']},
 'save-map-layout':{title:'도면 배치 저장',body:'현재 지도 마커 위치를 이 브라우저의 로컬 저장소에 저장합니다.',steps:['페이지를 다시 열어도 이 브라우저에서는 마커 위치가 유지됩니다.','업로드한 도면 파일 자체는 세션이 끝나면 유지되지 않습니다.'],note:'서버 저장, 계정 간 공유 및 변경 이력은 구현 전입니다.'}
};

function navigate(page){renderPage(page);}
function pushLog(text){logEntries.unshift({time:new Date().toLocaleTimeString('ko-KR',{hour12:false}),text});logEntries=logEntries.slice(0,6);}
function downloadCSV(){const rows=[['보고서 ID','일시','제목','등급','위치','상태'],['RPT-1024','2026.10.16 14:32','도장실 화재 의심 이벤트','Critical','도장실','작성 중'],['RPT-1023','2026.10.16 14:29','보호구 착용 규칙 위반 후보','Caution','생산라인 A','검토 대기'],['RPT-1022','2026.10.16 14:21','비상구 통로 장애물 후보','Caution','출입구 B-1','조치 기록됨'],...events.map(e=>[`EVT-${e.id}`,`2026.10.16 ${e.time}`,e.title,e.level,e.location,e.acknowledged?'확인됨':'미확인'])];const csv='\uFEFF'+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='DGC_이벤트_보고서.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('CSV 내보내기 완료','브라우저 다운로드 폴더에 예시 보고서를 저장했습니다.');}

document.addEventListener('click',e=>{
 const closeButton=e.target.closest('[data-modal-close]');
 if(closeButton || (e.target.id==='detailModal')){closeDetailModal();return;}
 const nav=e.target.closest('[data-page]');if(nav){navigate(nav.dataset.page);showPageInfo(nav.dataset.page);return;}
 const actionEl=e.target.closest('[data-action]');if(!actionEl)return;const action=actionEl.dataset.action;
 switch(action){
  case 'select-camera': selectedCameraId=actionEl.dataset.camera||'CAM-01';renderPage('cctv');break;
  case 'simulate-motion': triggerCameraAlert(selectedCameraId,false);break;
  case 'simulate-boundary': triggerCameraAlert(selectedCameraId,true);break;
  case 'toggle-auto-detect': setAutoDetection(!autoDetectEnabled);renderPage('cctv');toast(autoDetectEnabled?'자동 감지 시뮬레이션 시작':'자동 감지 시뮬레이션 종료',autoDetectEnabled?'18초 간격으로 가상 이벤트를 생성합니다.':'자동 생성 타이머를 종료했습니다.');break;
  case 'reset-camera-view': selectedCameraId='CAM-01';renderPage('cctv');break;
  case 'clear-camera-alert': cameraAlerts={};renderPage(activePage);toast('감지 표시를 해제했습니다.','기존 이벤트 이력은 유지됩니다. 실제 카메라/경계 설정에는 영향을 주지 않습니다.');break;
  case 'set-map-mode': mapPlacementMode=actionEl.dataset.mode||'CCTV';renderPage('rules');toast('마커 유형 선택',`${mapPlacementMode} 유형이 선택되었습니다. 도면을 클릭해 위치를 추가하세요.`);break;
  case 'place-map-marker': {
   const stage=document.getElementById('digitalMapStage');if(!stage)break;const r=stage.getBoundingClientRect();const x=Math.max(4,Math.min(96,((e.clientX-r.left)/r.width)*100));const y=Math.max(5,Math.min(95,((e.clientY-r.top)/r.height)*100));
   const seq=mapMarkers.filter(m=>m.type===mapPlacementMode).length+1;const prefix=mapPlacementMode==='CCTV'?'CAM':mapPlacementMode==='작업자'?'W':'ZONE';
   mapMarkers.push({id:Date.now(),type:mapPlacementMode,label:`${prefix}-${String(seq).padStart(2,'0')}`,x:Number(x.toFixed(1)),y:Number(y.toFixed(1))});renderPage('rules');toast('도면 마커 추가',`${mapPlacementMode} 마커를 ${x.toFixed(1)}%, ${y.toFixed(1)}% 위치에 추가했습니다.`,'+');break;
  }
  case 'map-marker-detail': {const m=mapMarkers.find(x=>String(x.id)===String(actionEl.dataset.markerId));if(m){const title=`${m.label} · ${m.type}`;actionHelp[`marker:${m.id}`]={title,body:`도면 위 ${m.type} 위치 마커입니다.`,steps:[`상대 좌표: X ${m.x}%, Y ${m.y}%`,'이 좌표는 현재 도면 표시 영역 기준입니다. 실제 현장 좌표계와는 별도 정합이 필요합니다.'],note:'이 마커는 초안 데모 데이터입니다.'};}break;}
  case 'remove-last-marker': if(mapMarkers.length){const removed=mapMarkers.pop();renderPage('rules');toast('마지막 마커 삭제',`${removed.label} 마커를 제거했습니다.`);}else toast('삭제할 마커가 없습니다.','도면에 추가된 마커가 없습니다.');break;
  case 'save-map-layout': try{localStorage.setItem('dgc-map-markers-v2',JSON.stringify(mapMarkers));toast('도면 배치 저장 완료','마커 위치가 이 브라우저의 로컬 저장소에 저장되었습니다.');}catch(err){toast('도면 배치 저장 실패','브라우저 저장소에 접근할 수 없습니다.');}break;
  case 'open-incident': navigate('incident');break;
  case 'open-overview': navigate('overview');break;
  case 'go-rules': navigate('rules');break;
  case 'go-reports': navigate('reports');break;
  case 'refresh': toast('화면이 갱신되었습니다.','현재 브라우저 내 데모 데이터를 다시 표시했습니다.');renderPage(activePage);break;
  case 'add-demo-event': addDemoEvent();break;
  case 'ack-event': {const item=events.find(x=>x.id===Number(actionEl.dataset.eventId));if(item){item.acknowledged=true;toast('이벤트를 확인했습니다.',item.title);renderPage(activePage);}break;}
  case 'ack-all': events.forEach(x=>x.acknowledged=true);toast('이벤트 확인 완료','현재 표시된 데모 이벤트를 모두 확인 처리했습니다.');renderPage(activePage);break;
  case 'approve-response': if(!incidentApproved){incidentApproved=true;pushLog('관제 담당자가 대응 단계를 승인했습니다. (시뮬레이션)');toast('대응 단계가 승인되었습니다.','화면 내 상태만 변경되었습니다. 실제 소방·PLC 신호는 전송되지 않았습니다.');}else{toast('이미 승인된 단계입니다.','데모 기록이 유지됩니다.');}renderPage('incident');break;
  case 'resolve-false': incidentResolved=true;incidentApproved=false;events=events.map(x=>x.level==='Critical'?{...x,acknowledged:true}:x);pushLog('관제 담당자가 이벤트를 오경보로 분류했습니다. (시뮬레이션)');toast('오경보 처리 완료','데모 화면 상태를 변경했습니다. 실제 사고 판단에 사용하지 마세요.');renderPage('incident');break;
  case 'reset-incident': incidentResolved=false;incidentApproved=false;events=events.map(x=>x.id===1?{...x,acknowledged:false}:x);logEntries=[{time:'14:32:41',text:'관제 담당자가 도장실 화재 의심 이벤트를 확인했습니다.'},{time:'14:32:29',text:'스마트폰 1차 추론 결과, 연기 가능성이 감지되었습니다.'},{time:'14:32:06',text:'W-07 헬멧 영상에서 연기 패턴을 감지했습니다.'}];toast('사고 데모가 초기화되었습니다.','예시 상태로 되돌렸습니다.');renderPage('incident');break;
  case 'send-worker-alert': toast('경고 미리보기를 준비했습니다.','작업자에게 실제 알림이 전송되지는 않았습니다.');break;
  case 'worker-confirm': toast('확인 응답이 기록되었습니다.','작업자 앱 화면의 시뮬레이션 상태입니다.','✓');break;
  case 'worker-help': toast('도움 요청 미리보기','실제 관제센터로 요청이 전송되지는 않았습니다.','!');break;
  case 'worker-detail': toast(`${actionEl.dataset.worker} 작업자`,`예시 프로필 · 위치와 센서 상세 데이터는 연결되지 않았습니다.`);break;
  case 'robot-patrol': toast('순찰 상태 갱신','로봇 목록은 시뮬레이션 값으로 유지됩니다.');break;
  case 'robot-scan': toast('2차 확인 시뮬레이션 시작','열화상·LiDAR 실제 센서는 연결되어 있지 않습니다.');break;
  case 'robot-detail': toast(`${actionEl.dataset.robot} 상세 정보`,'센서 스트림이 아닌 정적 화면 예시입니다.');break;
  case 'toggle-setting': {const key=actionEl.dataset.setting;settingsState[key]=!settingsState[key];renderPage('settings');toast('설정 값이 변경되었습니다.','저장 전 브라우저 화면에만 반영된 상태입니다.');break;}
  case 'save-settings': toast('설정 저장 (시뮬레이션)','현재 설정 값은 서버에 저장되지 않습니다.');break;
  case 'toggle-rule': {const key=actionEl.dataset.rule;ruleState[key]=!ruleState[key];renderPage('rules');toast('규칙 상태 변경','서버나 센서에 실제로 적용되지는 않았습니다.');break;}
  case 'reset-rules': ruleState={paint:true,geofence:true,ppe:true,forklift:true,gas:true};renderPage('rules');toast('기본 규칙으로 복원했습니다.','현재 화면의 데모 상태만 변경되었습니다.');break;
  case 'save-rules': toast('규칙 저장 (시뮬레이션)','실제 운영 규칙 엔진에는 반영되지 않습니다.');break;
  case 'upload-map': document.getElementById('mapFileInput').click();break;
  case 'export-report': downloadCSV();break;
  case 'report-detail': toast(`${actionEl.dataset.report} 보고서`,'보고서 상세 화면은 초안 데모 단계입니다.');break;
 }
 if(action==='map-marker-detail'){const m=mapMarkers.find(x=>String(x.id)===String(actionEl.dataset.markerId));if(m)showActionInfo(`marker:${m.id}`,actionEl);}
 else if(action==='select-camera')showActionInfo(`camera:${actionEl.dataset.camera}`,actionEl);
 else if(action==='set-map-mode')showActionInfo(`mapmode:${actionEl.dataset.mode}`,actionEl);
 else showActionInfo(action,actionEl);
});

document.getElementById('mapFileInput').addEventListener('change',e=>{
 const file=e.target.files&&e.target.files[0];if(!file)return;
 const allowed=/\.(png|jpe?g|webp|svg|pdf)$/i.test(file.name);
 if(!allowed){toast('지원하지 않는 파일','PNG, JPG, WebP, SVG 또는 PDF 파일을 선택하세요.','!');e.target.value='';return;}
 if(uploadedMapURL&&uploadedMapURL.startsWith('blob:'))URL.revokeObjectURL(uploadedMapURL);
 uploadedMapURL=URL.createObjectURL(file);uploadedMapName=file.name;mapMarkers=mapMarkers||[];
 renderPage('rules');toast('도면 미리보기 준비 완료',`${file.name} 파일을 현재 브라우저에서 미리 봅니다. CAD 좌표 자동 정합은 구현 전입니다.`);
 document.getElementById('detailEyebrow').textContent='도면 업로드 완료';document.getElementById('detailTitle').textContent='도면 파일이 등록되었습니다';document.getElementById('detailBody').innerHTML=`<p class="detail-intro">${escapeHTML(file.name)} 파일을 도면 미리보기 영역에 표시했습니다.</p><div class="detail-steps"><div class="detail-step"><span>01</span><p>상단의 CCTV 배치, 작업자 위치 또는 위험구역 유형을 선택합니다.</p></div><div class="detail-step"><span>02</span><p>도면 위 원하는 위치를 클릭해 마커를 추가합니다.</p></div><div class="detail-step"><span>03</span><p>도면 배치 저장을 눌러 브라우저에 좌표를 저장합니다.</p></div></div><div class="detail-note"><strong>범위 안내</strong><span>PDF/이미지 미리보기만 지원합니다. CAD 자동 변환, 축척 보정과 실제 위치 센서 연동은 추가 개발이 필요합니다.</span></div>`;document.getElementById('detailModal').hidden=false;document.body.classList.add('modal-open');e.target.value='';
});

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetailModal();});

document.addEventListener('change',e=>{
 if(e.target.id==='reportFilter'){reportFilter=e.target.value;renderPage('reports');}
});
document.addEventListener('input',e=>{
 if(e.target.id==='reportSearch'){const pos=e.target.selectionStart;reportSearch=e.target.value;const scroll=window.scrollY;renderPage('reports');const field=document.getElementById('reportSearch');if(field){field.focus();field.setSelectionRange(pos,pos);}window.scrollTo(0,scroll);}
});
document.getElementById('mobileMenu').addEventListener('click',()=>{sidebar.classList.add('open');mobileScrim.classList.add('visible');});
document.getElementById('sidebarClose').addEventListener('click',()=>{sidebar.classList.remove('open');mobileScrim.classList.remove('visible');});
mobileScrim.addEventListener('click',()=>{sidebar.classList.remove('open');mobileScrim.classList.remove('visible');});
currentTime();window.setInterval(currentTime,1000);renderPage('overview');
