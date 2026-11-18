// SP Imagen's own beginner guide and field reference. No external extensions.
import { getVisibleViewport, mountViewportOverlay } from './viewport-overlay.js';

export const IMAGEN_GLOSSARY = Object.freeze({
    'API': 'Способ, которым SP Imagen связывается с выбранным сервисом. Обычно подключение настраивают один раз.',
    'API-ключ': 'Личный секретный код доступа к сервису. Бери его в своём аккаунте провайдера. Не публикуй и не отправляй другим людям.',
    'Endpoint': 'Адрес сервера, куда отправляется запрос. Заполняй только при прямом подключении и копируй из инструкции своего провайдера.',
    'JSON': 'Обычный текстовый файл с данными и настройками. Удобен, чтобы сохранить копию или перенести библиотеку.',
    'HTML': 'Способ оформлять текст с помощью тегов. Например, <b>слово</b> делает слово жирным. Обычному пользователю писать HTML не нужно.',
    'Regex': 'Шаблон для поиска повторяющихся кусочков текста. Если название пугает, используй «Помогатор»: он подготовит правило по примеру.',
    'Флаги': 'Маленькие переключатели для правила поиска. Например, искать во всём тексте или не учитывать большие и маленькие буквы. Обычно оставь как есть.',
    'Гардероб': 'Описание того, что персонаж сейчас носит. Его можно брать из постов отдельно от постоянной внешности.',
    'Промпт': 'Текстовое задание для модели: что нарисовать, кого показать и какие детали учесть.',
    'Режиссёр': 'Текстовая модель, которая читает события чата и подготавливает описание будущей картинки. Сама она картинку не рисует.',
    'Токен': 'Небольшая единица текста, которую обрабатывает модель. Чем больше текста, тем больше расход токенов.',
    'Профиль подключения': 'Сохранённый набор настроек связи с текстовой моделью. Выбираешь его из списка, и SP Imagen пользуется им для режиссёра. Это не персонаж, не отдельный чат и не твой профиль иллюстрации.',
    'Модель': 'Программа ИИ, которая выполняет задание: одна составляет описание сцены, другая создаёт изображение.',
    'NovelAI': 'Сервис, который создаёт картинки по подготовленному описанию. Для прямой генерации нужен доступ к его API.',
    'Anlas': 'Внутренняя валюта NovelAI. Если не хочешь её расходовать, оставь включённой защиту Anlas.',
    'Opus': 'Название уровня подписки NovelAI. От уровня зависит доступный объём генерации.',
    'Steps': 'Количество промежуточных шагов создания картинки. Для начала оставь стандартное значение.',
    'Snapshot': 'Одна иллюстрация момента из ролевой сцены, как отдельный кадр.',
    'Comic': 'Комикс с несколькими панелями и, при необходимости, репликами.',
    'Story Page': 'Страница иллюстрированной истории с композицией и, если нужно, текстом.',
    'Ракурс': 'С какой стороны виден персонаж. Например, спереди или со спины. Пустой ракурс заменяется полной базовой внешностью.',
    'NPC': 'Второстепенный персонаж, который появился в сцене, но не обязательно есть в твоей библиотеке.',
    'Seed': 'Число, по которому генератор выбирает исходный случайный рисунок. При повторе одного seed результат проще сравнивать.',
    'Sampler': 'Способ, которым генератор постепенно собирает изображение. Если не знаешь, что выбрать, оставь значение по умолчанию.',
    'CFG': 'Насколько строго генератор следует тексту задания. Слишком высокие значения иногда портят картинку.',
    'Temperature': 'Насколько свободно текстовая модель подбирает слова. Низкое значение делает ответы более предсказуемыми.',
    'Streaming': 'Когда текст приходит по частям, пока модель ещё отвечает. SP Imagen сам получает готовый ответ и не зависит от этой галочки других расширений.',
    'JB': 'Сокращение от jailbreak: дополнительные инструкции для языковой модели в некоторых инструментах. SP Imagen не использует настройки JB других расширений.',
});

const HELP_HINTS = Object.freeze({
    'Откуда брать модель': 'Выбери, откуда SP Imagen получит текстовую модель. Если у тебя уже настроено подключение SillyTavern, проще выбрать его профиль. При прямом API понадобятся адрес сервера, название модели и ключ.',
    'Профиль SillyTavern': 'Выбери сохранённое текстовое подключение. Оно используется только для составления описания картинки и не меняет модель твоего ролевого чата.',
    'Endpoint': 'Адрес сервера текстовой модели, например https://example.com/v1. Заполняй только в режиме прямого API. Если выбран профиль SillyTavern, не нужен.',
    'Модель': 'Точное название текстовой модели, которое выдаёт твой провайдер. Нужно при прямом API; при подключении через профиль отдельное название не требуется.',
    'API-ключ': 'Вставь секретный ключ доступа текстового провайдера, только если используешь прямой API. Не нужно вводить его при выборе профиля SillyTavern.',
    'Temperature': 'Настройка разнообразия текста. Новичку лучше оставить установленное значение. Меняй только если ответы режиссёра слишком случайные или однообразные.',
    'Максимум токенов': 'Ограничение длины текстового ответа режиссёра. Если не знаешь, что выбрать, оставь стандартное число: увеличивать его без необходимости не нужно.',
    'API-токен NovelAI': 'Секретный токен NovelAI, позволяющий SP Imagen создавать картинки напрямую. Введи свой токен и нажми проверку подключения. Это не ключ от текстовой модели.',
    'Стиль': 'Выбери оформление, в котором должны получаться изображения. Его можно оставить как есть и настроить позже.',
    'Negative prompt': 'Список нежелательных особенностей картинки. Поле необязательно: если не знаешь, что писать, оставь по умолчанию.',
    'Seed': 'Число для повторяемой генерации. Обычно его лучше не трогать: генератор сам выберет новое.',
    'Ракурс': 'Опиши ракурс, если хочешь уточнить внешность персонажа с определённой стороны. Если он пустой, SP Imagen использует полное основное описание внешности.',
    'Другие имена и псевдонимы': 'Впиши другие имена персонажа: как он упоминается в чате. Это помогает узнавать одного и того же героя. Каждое имя можно добавить отдельно; если псевдонимов нет, оставь пустым.',
    'Название тега': 'Короткое слово для группировки записей, например «Главные» или «Магия». Можно оставить без тегов.',
    'Цвет тега': 'Цвет метки, чтобы быстрее различать группы персонажей. На работу генерации он не влияет.',
    'Итоговый промпт': 'Это готовое задание для генератора изображений. Можешь прочитать и при желании отредактировать. Если всё устраивает, оставь как есть и отправляй.',
    'Сохранить для': 'Выбери, применять настройки только к этому чату или шире. Для первых проб безопаснее сохранять их в текущем чате.',
    'Поиск': 'Начни печатать имя или часть слова, чтобы найти персонажа. Поле можно оставить пустым — тогда видно всю библиотеку.',
    'Постоянная внешность': 'Запиши то, что у персонажа обычно не меняется: лицо, волосы, цвет глаз, телосложение и особенности тела. Лучше простыми английскими фразами или тегами. Одежду для отдельной сцены сюда писать не нужно.',
    'Имя': 'Имя персонажа так, как его обычно называют в ролевом чате. Это обязательное поле записи библиотеки.',
    'Имя для промпта': 'Имя героя в итоговом задании для генератора. Необязательно: если не знаешь, что писать, оставь пустым.',
    'Тип персонажа для промпта': 'Короткая английская категория вроде girl, boy или cat. Это помогает генератору различать персонажей. Можно не заполнять.',
    'Стиль-префикс': 'Фразы, задающие художественный стиль картинки. Например: soft lighting, watercolor, warm colors. Можно оставить пустым: тогда стиль ничего не добавляет.',
    'Название': 'Понятное название, чтобы найти эту запись в списке. Выбери любое удобное имя.',
    'JSON промптов': 'Это текстовый файл с тремя инструкциями режиссёра. Можно скачать тестовый пример, заменить значения test своими текстами, а затем импортировать обратно. Не импортируй test для настоящей генерации.',
    'Промпт режиссёра': 'Готовая инструкция для текстовой модели, которая описывает будущую картинку. Новичку её редактировать не нужно.',
    'Генерировать напрямую через NovelAI': 'Эта галочка включает создание картинок самим SP Imagen через NovelAI. Она нужна для независимой работы без других генераторов.',
    'Ни в коем случае не тратить Anlas': 'Защита от платного расхода Anlas. Если хочешь использовать только доступные по подписке генерации, оставь включённой.',
    'Постоянный API-токен NovelAI': 'Вставь свой секретный токен NovelAI. Для прямой генерации он обязателен. Это не ключ от текстовой модели. Токен нельзя публиковать.',
    'Адрес NovelAI': 'Сервер генерации изображений. Обычно оставляй уже вписанный адрес — менять его без инструкции не требуется.',
    'Размер': 'Размер готовой картинки. Начни с Normal — обычно этого достаточно.',
    'Steps': 'Сколько шагов генератор тратит на картинку. Оставь число по умолчанию для первой пробы.',
    'CFG scale': 'Как строго генератор пытается следовать тексту задания. Не трогай без необходимости, стандартное значение подходит для начала.',
    'CFG rescale': 'Дополнительная настройка силы следования заданию. Для первых изображений не нужно менять.',
    'Sampler': 'Способ создания картинки по шагам. Оставь выбранный вариант, если не знаешь, чем отличаются способы.',
    'Негативный промпт': 'Описание того, чего на картинке быть не должно. Для некоторых моделей уже есть подходящий текст, не удаляй его без причины.',
    'Формат': 'Выбери, как оформлены данные в посте. Если не разбираешься в форматах, открой помогатор и вставь настоящий пример.',
    'Как искать (флаги)': 'Небольшие настройки правил поиска, например искать по всему тексту. Обычно оставь готовое значение.',
    'Snapshot': 'Количество последних постов для одного кадра. Например, 2 — режиссёр прочитает два последних сообщения.',
    'Comic': 'Количество последних постов для комикса. Увеличивай, только когда нужно показать более длинную сцену.',
    'Story Page': 'Количество последних постов для страницы истории. Не путай с количеством картинок.',
});

export function getFriendlyFieldHelp(title, previous = '') {
    const name = String(title || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
    const custom = HELP_HINTS[name] || HELP_HINTS[Object.keys(HELP_HINTS).find(key => name.toLowerCase().includes(key.toLowerCase()))];
    if (custom) return custom;
    const old = String(previous || '').trim();
    if (old && !old.startsWith('Поле сохраняется вместе')) return `${old}\n\nЕсли не уверена, нужно ли заполнять, сначала попробуй оставить стандартное значение. Ничего не меняется, пока ты не сохранишь настройки.`;
    return 'Это поле уточняет выбранную настройку. Если у тебя пока нет подходящей информации, не придумывай значение: оставь пустым или стандартным, если поле не отмечено как обязательное. Сохраняй только те изменения, в которых уверена.';
}

let activeExplanation = null;
const WORDS = Object.keys(IMAGEN_GLOSSARY).sort((a,b) => b.length-a.length);
const termPattern = new RegExp('(?<![\\p{L}\\p{N}_])(' + WORDS.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')(?![\\p{L}\\p{N}_])', 'giu');
const termName = s => WORDS.find(t => t.toLocaleLowerCase('ru')===s.toLocaleLowerCase('ru'));
function textWithTerms(parent, text, exclude = '') {
    for (const paragraph of String(text).split(/\n\s*\n/)) {
        const p=document.createElement('p'); p.className='spi-guide-paragraph';
        let at=0;
        termPattern.lastIndex=0;
        for (const match of paragraph.matchAll(termPattern)) {
            if (match.index>at) p.append(document.createTextNode(paragraph.slice(at,match.index)));
            const name=termName(match[0]);
            if (name && name!==exclude) {
                const b=document.createElement('button');b.type='button';b.className='spi-guide-term';b.textContent=match[0];b.setAttribute('aria-label',`Что значит ${name}?`);
                b.addEventListener('click',()=>openExplanation(name,IMAGEN_GLOSSARY[name]));p.append(b);
            } else p.append(document.createTextNode(match[0]));
            at=match.index+match[0].length;
        }
        if(at<paragraph.length)p.append(document.createTextNode(paragraph.slice(at)));
        if(!p.childNodes.length)p.textContent=paragraph;
        parent.append(p);
    }
}

// One accessible explanation dialog for index.js, runtime.js and library-runtime.js.
export function openExplanation(title, detail) {
    activeExplanation?.();
    const previous=document.activeElement;
    const overlay=document.createElement('div');overlay.className='spi-guide-explain-overlay';
    const dialog=document.createElement('section');dialog.className='spi-guide-explain';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',`Подсказка: ${title}`);
    const head=document.createElement('div');head.className='spi-guide-explain-head';
    const h=document.createElement('h2');h.textContent=`💡 ${title}`;const closeButton=document.createElement('button');closeButton.type='button';closeButton.textContent='×';closeButton.className='spi-guide-icon';closeButton.setAttribute('aria-label','Закрыть подсказку');head.append(h,closeButton);
    const content=document.createElement('div');content.className='spi-guide-explain-body';textWithTerms(content,String(detail||getFriendlyFieldHelp(title)),title);
    const footer=document.createElement('div');footer.className='spi-guide-explain-foot';const understood=document.createElement('button');understood.type='button';understood.className='spi-guide-primary';understood.textContent='Понятно';footer.append(understood);
    dialog.append(head,content,footer);overlay.append(dialog);
    const unmount=mountViewportOverlay(overlay);let gone=false;
    const onKey=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish();}else if(e.key==='Tab'){const focus=[closeButton,understood];if(e.shiftKey&&document.activeElement===focus[0]){e.preventDefault();focus.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===focus.at(-1)){e.preventDefault();focus[0].focus();}}};
    function finish(){if(gone)return;gone=true;document.removeEventListener('keydown',onKey,true);unmount();overlay.remove();if(activeExplanation===finish)activeExplanation=null;previous?.focus?.({preventScroll:true});}
    overlay.addEventListener('click',event=>{if(event.target===overlay)finish();});closeButton.addEventListener('click',finish);understood.addEventListener('click',finish);document.addEventListener('keydown',onKey,true);activeExplanation=finish;closeButton.focus({preventScroll:true});return finish;
}

export function addFieldHelp(parent,title,oldHelp='') {
    parent.classList.add('spi-guide-has-help');
    const toggle=document.createElement('button');toggle.type='button';toggle.className='spi-guide-help';toggle.textContent='?';toggle.title='Что это значит?';
    toggle.setAttribute('aria-label',`Объяснить поле «${title}»`);toggle.setAttribute('aria-haspopup','dialog');
    toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openExplanation(title,getFriendlyFieldHelp(title,oldHelp));});parent.append(toggle);
    return toggle;
}

// The guide describes real, existing UI elements. No generation or settings writes.
// The route is short everywhere except the library, where each real control is shown.
// A first visit with an empty library includes a hands-on 'create character' step.
export function makeGuideSteps(hasCharacters = false) {
 return [
  {view:'home',selector:'[data-spi-action="settings"]',title:'Начнём с подключений',text:'Привет! SP Imagen берёт события из ролевого чата и помогает сделать по ним картинку. Сначала покажу, где подключить помощника и художника. Нажми подсвеченный пункт или «Далее».',click:true},
  {view:'settings',selector:'[data-spi-action="text-api"]',title:'Текстовая модель — наш режиссёр',text:'Она читает сцену и готовит понятное описание для картинки. Откроем её подключение.',click:true},
  {view:'text-api',selector:'.spi-connection-window .spi-form-grid',title:'Подключение режиссёра',text:'Если в SillyTavern уже есть рабочий профиль подключения, выбери его. Иначе можно ввести адрес и ключ своего API. Потом нажми «Проверить» и «Сохранить». Сейчас ничего вводить не обязательно.'},
  {view:'settings',selector:'[data-spi-action="novelai"]',title:'А теперь подключим художника',text:'NovelAI рисует картинку по описанию, которое подготовил режиссёр. Он работает напрямую через SP Imagen.',click:true},
  {view:'novelai',selector:'.spi-connection-window .spi-form-grid',title:'Подключение NovelAI',text:'Здесь включается генерация и вводится секретный токен NovelAI. Оставь остальные параметры стандартными для первого изображения. Токен никому не показывай.'},
  {view:'home',selector:'[data-spi-action="library"]',title:'Знакомимся с библиотекой',text:'Библиотека помогает рисовать одних и тех же героев узнаваемыми. Здесь хранятся имена, внешность и другие постоянные детали.',click:true},
  {view:'library',selector:'#sp-imagen-review-panel [data-library-search]',title:'Поиск персонажей',text:'Ищи героя по имени в этой строке. Можно искать и по тегам. Пустой поиск показывает все записи, подходящие под выбранный тег.'},
  {view:'library',selector:'#sp-imagen-review-panel .ness-tag-tools',title:'Теги поиска',text:'Теги — это твои папочки-метки для героев, например «Семья» или «Главные». «+ Тег» создаёт новый. Нажатие на готовый тег показывает только персонажей этой группы. Изменять тег можно рядом с лентой.'},
  {view:'library',selector:'#sp-imagen-review-panel [data-library-list]',title:'Как назначать теги',text:'У каждого персонажа в строке списка есть маленький «+». Нажми его, чтобы выбрать уже созданные поисковые теги. Это только удобный фильтр библиотеки; в промпт для NovelAI эти названия не добавляются.'},
  ...(!hasCharacters ? [{view:'library',selector:'#sp-imagen-review-panel .ness-library-filters .ness-button',title:'Создадим пробного персонажа?',text:'Библиотека пока пустая. Нажми «+ Персонаж» — не бойся, потом запись можно будет отредактировать или удалить. Она не сохранится, пока ты сама не нажмёшь «Сохранить».',click:'native',requireClick:true}] : []),
  {view:'library-first',selector:'#sp-imagen-review-panel [data-library-editor] .ness-editor-heading',title:'Откроем карточку персонажа',text:hasCharacters?'Я открыла первого персонажа из твоего текущего списка — с учётом поиска и выбранного тега. Мы просто изучим его поля: ничего менять не нужно.':'Теперь посмотрим, из чего состоит карточка созданного персонажа. Можешь заполнить её позже: пока я покажу нужные поля.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-appearance-wrap',title:'Основная внешность: теги, а не сочинение',text:'Записывай постоянную внешность короткими фразами через запятые: hair color, eye color, freckles, body type. Каждая фраза становится отдельным тегом внешности. Эти теги можно поправлять, удалять и перетаскивать, не переписывая описание целиком. Одежду для отдельной сцены лучше хранить отдельно.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-appearance-pencil',title:'Карандаш: выбираем нужные теги',text:'Нажми карандаш ✎, выбери нужный ракурс и нажимай на уже созданные теги внешности. Подсвеченные теги попадут в этот ракурс. Снова нажми карандаш, чтобы закончить редактирование. Никакого второго описания вводить не нужно.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-appearance-presets',title:'Ракурсы: какая часть персонажа видна',text:'Ракурс — это вид спереди, со спины, крупное лицо и другие варианты. Заполнять их НЕ обязательно: пустой ракурс автоматически использует всю основную внешность. Но NovelAI старается нарисовать всё, что получила в тексте. Если нужен только портрет, а ей дать длинное описание тела, лишние детали могут испортить результат. Выбранные теги помогают точнее показывать нужную часть и дают модели больше свободы.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-appearance-copy',title:'Не выбирай одни и те же теги сто раз',text:'При редактировании ракурса есть «Добавить из ракурса». Выбери другой уже заполненный ракурс и перенеси из него отмеченные теги. Это быстрее, чем заново выбирать одинаковые волосы, глаза или одежду для каждого вида.',fallback:'#sp-imagen-review-panel [data-library-editor] .ness-appearance-tools'},
  {view:'library-aliases',selector:'#sp-imagen-review-panel [role="tabpanel"]:not([hidden])',title:'Другие имена',text:'Если персонажа называют сокращённо, по фамилии или прозвищу — добавь эти имена здесь. Тогда режиссёр поймёт, что речь об одном герое. Если прозвищ нет, оставь пусто.'},
  {view:'library-prompt',selector:'#sp-imagen-review-panel [role="tabpanel"]:not([hidden])',title:'Данные для промпта',text:'«Имя для промпта» — как генератор должен назвать героя; «Тип» — коротко girl, boy, cat и так далее. Можно оставить пустыми: это уточнения, а не обязательная анкета.'},
  {view:'library-body',selector:'#sp-imagen-review-panel [role="tabpanel"]:not([hidden])',title:'Отметины и особенности тела',text:'Здесь можно отдельно хранить шрамы, татуировки и другие детали, которые показывают только когда нужно. Необязательные поля спокойно оставляй пустыми.'},
  {view:'library',selector:'#sp-imagen-review-panel [data-library-save]',title:'Сохранение библиотеки',text:'Изменения не записываются навсегда, пока ты не нажмёшь «Сохранить». Если просто изучала карточку и ничего не меняла, сохранять не нужно.'},
  {view:'home',selector:'[data-spi-action="prompts"]',title:'Профили иллюстраций',text:'Здесь живут готовые Snapshot (кадр), Comic (комикс) и Story Page (страница истории). Можно добавить свой профиль с личными правилами, не затрагивая встроенные.',click:true},
  {view:'prompts',selector:'.spi-prompt-center .spi-prompt-list',title:'Готовые и свои профили',text:'Открой готовый вариант, чтобы прочитать его инструкцию, или добавь собственный. Для первого изображения можно ничего не менять.'},
  {view:'settings',selector:'[data-spi-action="generation"]',title:'Тонкие настройки',text:'Сколько сообщений учитывать, как находить одежду и что убирать из текста? Всё это настраивается здесь. Первую генерацию можно сделать с обычными значениями.',click:true},
  {view:'generation',selector:'#sp-imagen-review-panel [data-review-scroll]',title:'Поля с вопросиком',text:'Кнопка «?» рядом с каждым параметром объясняет, зачем он нужен, нужно ли его заполнять и что означают непонятные слова. Можно не трогать то, в чём пока не разобралась.'},
  {view:'settings',selector:'[data-spi-action="styles"]',title:'Художественный стиль',text:'Отдельно можно выбрать цвет, линию и настроение рисунка. Стиль не нужен для первого запуска — это настройка на вкус.',click:true},
  {view:'styles',selector:'.spi-style-layout',title:'Стиль — по желанию',text:'Это просто несколько слов про оформление картинки, например warm colors, soft lineart. Никакие чужие стили у тебя автоматически не появятся.'},
  {view:'home',selector:'[data-spi-action="all-prompts"]',title:'Все остальные системные промпты',text:'Здесь хранятся внутренние инструкции помощника, кроме профилей. Новичку их менять не нужно. Можно посмотреть оригинал и при необходимости вернуть заводские настройки.'},
  {view:'home',selector:'[data-spi-action="last-prompt"]',title:'Где посмотреть результат',text:'После генерации здесь появятся последнее готовое описание картинки и ответ режиссёра. Просмотр ничего не генерирует.'},
  {view:'finish',selector:null,title:'Теперь можно пробовать!',text:'Вернись к RP-чату, нажми ✨ у подходящего сообщения, выбери формат и проверь описание перед отправкой. Гайд всегда можно запустить заново. И помни: при желании можно исправить или удалить любую созданную запись.'}
 ];
}
export const GUIDE_STEPS = Object.freeze(makeGuideSteps(true));

let stopCurrentGuide = null;
export function stopQuickGuide() { stopCurrentGuide?.(); }
export function startQuickGuide({navigate,steps=GUIDE_STEPS,onExit=()=>{}}={}) {
    stopQuickGuide();
    const previous=document.activeElement;
    const host=document.createElement('div');host.className='spi-onboarding';host.setAttribute('data-spi-tour','');
    const spotlight=document.createElement('div');spotlight.className='spi-tour-spotlight';spotlight.setAttribute('aria-hidden','true');
    const sheet=document.createElement('section');sheet.className='spi-tour-card';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Быстрый гайд по SP Imagen');
    const count=document.createElement('div');count.className='spi-tour-count';
    const heading=document.createElement('h2');const copy=document.createElement('div');copy.className='spi-tour-copy';
    const controls=document.createElement('div');controls.className='spi-tour-controls';
    const stop=document.createElement('button');stop.type='button';stop.className='spi-tour-stop';stop.textContent='Прервать обучение';
    const prev=document.createElement('button');prev.type='button';prev.className='spi-tour-prev';prev.textContent='← Назад';
    const next=document.createElement('button');next.type='button';next.className='spi-guide-primary';next.textContent='Далее →';
    controls.append(stop,prev,next);sheet.append(count,heading,copy,controls);host.append(spotlight,sheet);
    const unmount=mountViewportOverlay(host);
    let index=-1,abort=false,requestId=0,target=null,handleClick=null,frame=null;
    const detach=()=>{target?.removeEventListener('click',handleClick,true);target=null;handleClick=null;};
    function fit(){
        if(abort)return;
        const vp=getVisibleViewport();
        if(!target?.isConnected || !target.getClientRects().length){spotlight.hidden=true;sheet.style.left='';sheet.style.top='';sheet.style.bottom='';return;}
        const rect=target.getBoundingClientRect(),left=Math.max(4,rect.left-vp.left-5),top=Math.max(4,rect.top-vp.top-5),right=Math.min(vp.width-4,rect.right-vp.left+5),bottom=Math.min(vp.height-4,rect.bottom-vp.top+5);
        if(right<=left||bottom<=top){spotlight.hidden=true;return;}
        spotlight.hidden=false;Object.assign(spotlight.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
        const cardWidth=Math.min(sheet.offsetWidth||360,vp.width-20),cardHeight=sheet.offsetHeight||180,margin=10;
        if(vp.width<660){sheet.style.left='10px';const atTop=top>cardHeight+26 && top>=vp.height-cardHeight-24;sheet.style.top=atTop?margin+'px':'auto';sheet.style.bottom=atTop?'auto':margin+'px';spotlight.style.opacity=top>vp.height-cardHeight-24&&!atTop?'0.5':'1';}
        else{sheet.style.bottom='auto';const below=bottom+cardHeight+16<=vp.height;const y=below?bottom+12:Math.max(margin,top-cardHeight-12);sheet.style.left=Math.max(margin,Math.min(left,vp.width-cardWidth-margin))+'px';sheet.style.top=y+'px';spotlight.style.opacity='1';}
    }
    const onPosition=()=>{if(frame!==null)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=null;fit();});};
    function exit(){if(abort)return;abort=true;activeExplanation?.();requestId++;detach();if(frame!==null)cancelAnimationFrame(frame);window.removeEventListener('resize',onPosition);window.removeEventListener('scroll',onPosition,true);window.visualViewport?.removeEventListener('resize',onPosition);window.visualViewport?.removeEventListener('scroll',onPosition);document.removeEventListener('keydown',onKeys,true);unmount();host.remove();if(stopCurrentGuide===exit)stopCurrentGuide=null;onExit();if(previous?.isConnected)previous.focus({preventScroll:true});}
    function onKeys(event){if(abort || document.querySelector('.spi-guide-explain-overlay'))return;if(event.key==='Escape'){event.stopImmediatePropagation();event.preventDefault();exit();}else if(event.key==='Tab'){const buttons=[stop,prev,next].filter(e=>!e.disabled);if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}}}
    async function go(i){
        if(abort)return;
        const mine=++requestId;detach();index=Math.max(0,Math.min(steps.length-1,i));const step=steps[index];
        count.textContent=`💡 Быстрый гайд · ${index+1} / ${steps.length}`;
        heading.textContent=step.title;copy.replaceChildren();textWithTerms(copy,step.text);
        prev.hidden=false;stop.textContent='Прервать обучение';prev.disabled=index===0;next.textContent=index===steps.length-1?'Завершить ✓':'Далее →';spotlight.hidden=true;next.disabled=true;
        try{await navigate(step.view);}catch(error){
            console.warn('[SP Imagen guide] section not available:',error);
            const warning=document.createElement('p');warning.className='spi-tour-unavailable';
            warning.textContent=String(error?.message||'Не удалось открыть этот раздел. Попробуй ещё раз.');
            copy.append(warning);next.disabled=false;return;
        }
        if(abort||mine!==requestId)return;
        for(let attempt=0;attempt<14;attempt++){
            target=step.selector?document.querySelector(step.selector):null;
            if ((!target || !target.getClientRects().length) && step.fallback) target=document.querySelector(step.fallback);
            if(!step.selector||target?.getClientRects().length)break;
            await new Promise(resolve=>setTimeout(resolve,55));
            if(abort||mine!==requestId)return;
        }
        if(!target?.isConnected)target=null;
        if(step.selector && !target){const note=document.createElement('p');note.className='spi-tour-unavailable';note.textContent='Этот раздел пока недоступен в открытом чате. Можно продолжить обучение или вернуться к нему позже.';copy.append(note);}
        if(step.click&&target){handleClick=event=>{if(step.click !== 'native'){event.preventDefault();event.stopImmediatePropagation();}if(step.requireClick)next.disabled=false;queueMicrotask(()=>void go(index+1));};target.addEventListener('click',handleClick,true);}
        if(step.requireClick){next.disabled=true; next.title='Сначала нажми выделенную кнопку, или прерви обучение';}else next.title='';
        if (!step.requireClick) next.disabled=false;fit();
        // Do not steal focus from a highlighted clickable control when a mobile keyboard is open.
        next.focus({preventScroll:true});
    }
    next.addEventListener('click',()=>{if(index===steps.length-1)exit();else void go(index+1);});prev.addEventListener('click',()=>void go(index-1));stop.addEventListener('click',exit);
    window.addEventListener('resize',onPosition);window.addEventListener('scroll',onPosition,true);window.visualViewport?.addEventListener('resize',onPosition);window.visualViewport?.addEventListener('scroll',onPosition);document.addEventListener('keydown',onKeys,true);
    stopCurrentGuide=exit;
    // A real invitation: no panels open until the user chooses to begin.
    count.textContent='💡 Знакомство с SP Imagen';heading.textContent='Пройдём быстрый гайд?';
    textWithTerms(copy,'За несколько коротких шагов покажу, где подключить две модели, как сохранить внешность героев и как получить первую картинку. Ничего заполнять во время экскурсии не нужно. В любой момент можно остановиться.');
    prev.hidden=true;stop.textContent='Не сейчас';next.textContent='Начать →';
    next.focus({preventScroll:true});onPosition();
    return exit;
}
