/**
 * A single neutral figure for the existing appearance editor.
 * Purely presentational: never reads or writes appearance tags, NSFW descriptions,
 * prompts or library data. The same SVG is updated in-place for every preset.
 */
const AREA = Object.freeze({
 base:{
  always:['long','pants',['head','torso','hips','arm-left','arm-right','leg-left','leg-right'],'Общие постоянные особенности внешности.'],
  face:['long','pants',['head'],'Черты лица крупным планом.'],
  head:['long','pants',['head'],'Голова, волосы и её полный силуэт.'],
  upper_front:['long','pants',['head','torso','arm-left','arm-right'],'Передняя часть фигуры по пояс.'],
  upper_back:['long','pants',['head','torso','arm-left','arm-right'],'Спина, плечи, руки и затылок.'],
  full_front:['long','pants',['head','torso','hips','arm-left','arm-right','leg-left','leg-right'],'Полная фигура спереди.'],
  full_back:['long','pants',['head','torso','hips','arm-left','arm-right','leg-left','leg-right'],'Полная фигура со спины.'],
  arms:['long','pants',['arm-left','arm-right'],'Форма рук, предплечий и кистей.'],
  legs:['long','pants',['leg-left','leg-right'],'Форма ног и стоп.']
 },
 skin:{
  always:['sleeveless','shorts',['arm-left','arm-right','leg-left','leg-right'],'Общие отметины на открытой коже.'],
  upper_front:['bare','pants',['torso'],'Шрамы, родинки и отметины на передней части корпуса.'],
  upper_back:['bare','pants',['torso'],'Отметины на открытой спине и плечах.'],
  lower_front:['long','none',['hips','leg-left','leg-right'],'Особенности открытой нижней части тела спереди.'],
  lower_back:['long','none',['hips','leg-left','leg-right'],'Особенности открытой нижней части тела сзади.'],
  arms:['sleeveless','pants',['arm-left','arm-right'],'Отметины открытых плеч, рук и кистей.'],
  legs:['long','shorts',['leg-left','leg-right'],'Отметины открытых ног.']
 },
 nsfw:{
  nsfwChest:['bare','pants',['torso'],'Постоянные анатомические особенности груди.'],
  nsfwLowerFront:['long','none',['hips'],'Нижняя передняя анатомия.'],
  nsfwLowerBack:['long','none',['hips'],'Нижняя задняя анатомия.']
 }
});

const DRAWING=[
 '<svg class="ness-figure-svg" viewBox="0 0 190 325" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Схема взрослого человека">',
 '<title>Схематичный нейтральный силуэт с подсветкой выбранного участка</title>',
 '<ellipse cx="95" cy="312" rx="44" ry="4" class="figure-shadow"/>',
 '<g class="figure-body">',
 '<path d="M65 177Q79 182 92 178L89 251L86 295Q84 304 76 306L66 306Q60 301 62 293L62 251Z"/>',
 '<path d="M98 178Q111 182 125 177L128 251L130 293Q132 302 125 306L114 306Q106 304 105 295L101 251Z"/>',
 '<path d="M58 89Q49 88 45 99L35 149L27 189L24 205Q24 214 31 213L36 207L41 188L52 155L65 105Z"/>',
 '<path d="M132 89Q141 88 145 99L155 149L163 189L166 205Q166 214 159 213L154 207L149 188L138 155L125 105Z"/>',
 '<path d="M75 79Q95 74 115 79L130 93L125 157Q120 167 127 178Q116 190 95 190Q74 190 63 178Q70 167 65 157L60 93Z"/>',
 '<path d="M87 65L86 84Q95 90 104 84L103 65Z"/>',
 '<ellipse cx="95" cy="42" rx="23" ry="27"/>',
 '</g>',
 '<g data-cloth="shirt" class="figure-cloth figure-shirt">',
 '<path d="M74 82L85 81Q95 87 105 81L116 82L130 92L125 155Q95 161 65 155L60 92Z"/>',
 '<path class="figure-seam" d="M84 83Q95 100 106 83M66 150Q95 155 124 150"/>',
 '<path class="figure-seam figure-front" d="M110 112h8v10h-8Z"/>',
 '<path class="figure-seam figure-rear" d="M82 92Q95 97 108 92"/>',
 '</g>',
 '<g data-cloth="sleeves" class="figure-cloth figure-sleeves">',
 '<path d="M61 91L52 91L43 103L34 150L27 188L39 192L46 157L61 117Z"/>',
 '<path d="M129 91L138 91L147 103L156 150L163 188L151 192L144 157L129 117Z"/>',
 '<path class="figure-seam" d="M28 182L40 185M150 185L162 182"/>',
 '</g>',
 '<g data-cloth="tank" class="figure-cloth figure-tank">',
 '<path d="M79 82L84 83Q95 93 106 83L111 82L124 96L120 154Q95 161 70 154L66 96Z"/>',
 '<path class="figure-seam" d="M83 83Q95 109 107 83M73 150Q95 154 117 150"/>',
 '</g>',
 '<g data-cloth="pants" class="figure-cloth figure-pants">',
 '<path d="M65 163Q95 169 125 163L128 230L131 288L110 288L100 228L95 198L90 228L80 288L59 288L62 230Z"/>',
 '<path class="figure-seam" d="M64 173Q95 177 126 173M95 174v22M67 188L76 191L80 181M123 188L114 191L110 181M75 200L77 278M115 200L113 278"/>',
 '</g>',
 '<g data-cloth="shorts" class="figure-cloth figure-shorts">',
 '<path d="M65 163Q95 169 125 163L129 213L106 216L95 191L84 216L61 213Z"/>',
 '<path class="figure-seam" d="M64 173Q95 178 126 173M95 172v19M62 208l22 2M106 210l22 -2"/>',
 '</g>',
 '<g class="figure-zones">',
 '<ellipse data-zone="head" cx="95" cy="42" rx="25" ry="28"/>',
 '<path data-zone="torso" d="M76 79Q95 73 114 79L132 92L125 156Q95 167 65 156L58 92Z"/>',
 '<path data-zone="hips" d="M64 151Q95 162 126 151L127 179Q95 196 63 179Z"/>',
 '<path data-zone="arm-left" d="M56 89Q46 87 43 100L33 150L24 190L20 208Q22 220 33 214L40 189L49 155L65 106Z"/>',
 '<path data-zone="arm-right" d="M134 89Q144 87 147 100L157 150L166 190L170 208Q168 220 157 214L150 189L141 155L125 106Z"/>',
 '<path data-zone="leg-left" d="M63 179Q78 184 92 179L89 252L86 297Q84 308 74 309L64 308L59 296L60 252Z"/>',
 '<path data-zone="leg-right" d="M98 179Q112 184 127 179L130 252L132 296L126 308L116 309Q106 308 104 297L101 252Z"/>',
 '</g>',
 '<g class="figure-front figure-face">',
 '<circle cx="86.5" cy="40" r="2.1"/><circle cx="103.5" cy="40" r="2.1"/>',
 '<path d="M95 44v5M89 54Q95 57 101 54" fill="none"/>',
 '</g>',
 '<g class="figure-rear figure-head-back"><path d="M82 57Q95 65 108 57M95 66v6" fill="none"/></g>',
 '<g data-anatomy="chest" class="figure-front figure-anatomy">',
 '<circle cx="81" cy="119" r="3"/><circle cx="109" cy="119" r="3"/>',
 '</g>',
 '<g data-anatomy="rear" class="figure-rear figure-anatomy">',
 '<path d="M95 174v20" fill="none" stroke-width="3.8" stroke-linecap="round"/>',
 '</g>',
 '</svg>'
].join('');

export function describeAppearanceFigure(mode,preset){
 const selection=AREA[mode]?.[preset]||AREA.base.face;
 const [top,bottom,zones,description]=selection;
 const rear=preset.endsWith('_back')||preset==='nsfwLowerBack';
 return {top,bottom,zones,description,rear,anatomy:mode==='nsfw'?(preset==='nsfwChest'?'chest':preset==='nsfwLowerBack'?'rear':'none'):'none'};
}

/**
 * The card is mounted exactly once per appearance editor, with one SVG. The
 * original mode and camera buttons are moved into pickerHost when pinned.
 */
export function createAppearanceFigure(ui,parent,onClose=()=>{}){
 const {el,button}=ui;
 const root=el('aside',undefined,parent,'ness-figure-hint');
 root.setAttribute('aria-label','Визуальная подсказка для описания внешности');
 root.hidden=true;
 const head=el('div',undefined,root,'ness-figure-head');
 const heading=el('div',undefined,head);
 el('small','✦ ВИЗУАЛЬНАЯ ПОДСКАЗКА',heading);
 el('strong','Что описывать здесь',heading);
 const close=button('×',head,onClose,'quiet ness-figure-close');
 close.title='Свернуть визуальную подсказку';
 close.setAttribute('aria-label',close.title);
 const pickerHost=el('div',undefined,root,'ness-figure-pickers');
 const figure=el('div',undefined,root,'ness-figure-diagram');
 const orientation=el('span','● СПЕРЕДИ',figure,'ness-figure-orientation');
 const area=el('span','✦ ВЫБРАННАЯ ОБЛАСТЬ',figure,'ness-figure-area');
 const canvas=el('div',undefined,figure,'ness-figure-canvas');
 canvas.innerHTML=DRAWING;
 const svg=canvas.querySelector?.('svg');
 const name=el('strong','',root,'ness-figure-name');
 const details=el('p','',root,'ness-figure-details');
 el('p','✧ Подсвеченная область соответствует текущему ракурсу или участку.',root,'ness-figure-legend');
 function update(mode,preset,label=''){
  const plan=describeAppearanceFigure(mode,preset);
  orientation.textContent=plan.rear?'↶ СО СПИНЫ':'● СПЕРЕДИ';
  area.textContent=preset==='always'?'✦ ВСЁ ТЕЛО':'✦ ЗОНА: '+(label||preset).toUpperCase();
  name.textContent=label||preset;
  details.textContent=plan.description;
  if(!svg)return;
  svg.setAttribute('aria-label','Схематичный человек '+(plan.rear?'со спины':'спереди')+', выделена область: '+(label||preset));
  svg.setAttribute('data-mode',mode);
  svg.classList.toggle('is-rear',plan.rear);
  for(const piece of svg.querySelectorAll('[data-zone]'))piece.classList.toggle('is-lit',plan.zones.includes(piece.getAttribute('data-zone')));
  const clothes={shirt:plan.top==='long',sleeves:plan.top==='long',tank:plan.top==='sleeveless',pants:plan.bottom==='pants',shorts:plan.bottom==='shorts'};
  for(const piece of svg.querySelectorAll('[data-cloth]'))piece.classList.toggle('is-off',!clothes[piece.getAttribute('data-cloth')]);
  for(const mark of svg.querySelectorAll('[data-anatomy]'))mark.classList.toggle('is-visible',plan.anatomy===mark.getAttribute('data-anatomy'));
 }
 return {element:root,pickerHost,update};
}
