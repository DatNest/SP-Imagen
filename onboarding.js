// SP Imagen's own beginner guide and field reference. No external extensions.
import { getVisibleViewport, mountViewportOverlay } from './viewport-overlay.js';

export const IMAGEN_GLOSSARY = Object.freeze({
    'API': 'Способ, которым SP Imagen связывается с выбранным сервисом. Обычно подключение настраивают один раз.',
    'API-ключ': 'Личный секретный код доступа к сервису. Бери его в своём аккаунте провайдера. Не публикуй и не отправляй другим людям.',
    'Endpoint': 'Адрес сервера, куда отправляется запрос. Заполняй только при прямом подключении и копируй из инструкции своего провайдера.',
    'Danbooru': 'Большая база тегов для аниме-иллюстраций. Теги в ней называют детали привычными генератору короткими английскими словами. Их можно использовать в описании внешности.',
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
    'Отметины и тело': 'Раздел для постоянных шрамов, татуировок и деталей открытого тела. Каждую отметину записывай в поле нужной части тела; особенности груди и живота — в «Верх тела», таза и бёдер — в «Низ тела». ВАЖНО: детали должны использоваться только если соответствующий участок виден и не закрыт одеждой. Все поля необязательны.',
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
  {view:'home',selector:'.spi-hub',title:'Познакомимся с SP Imagen',text:'SP Imagen создаёт иллюстрации по событиям ролевого чата. Сначала настроим подключения. Нажми «Далее».',click:false},
  {view:'settings',selector:'[data-spi-action="text-api"]',title:'Кто придумывает сцену?',text:'Текстовая модель читает ролевые посты и составляет задание для художника. Здесь можно выбрать её подключение.',click:true},
  {view:'text-api',selector:'.spi-connection-window .spi-form-grid',title:'Подключение режиссёра',text:'Выбери готовое подключение SillyTavern или настрой прямой API. Проверь соединение и сохрани настройки.'},
  {view:'settings',selector:'[data-spi-action="novelai"]',title:'Кто рисует картинку?',text:'NovelAI получает описание сцены и рисует картинку. Нажми выделенный пункт, чтобы открыть подключение.',click:true},
  {view:'novelai',selector:'.spi-connection-window .spi-form-grid',title:'Подключение NovelAI',text:'Для генерации нужен твой токен NovelAI. Не публикуй его. Для первой картинки остальные значения можно оставить как есть.'},
  {view:'home',selector:'[data-spi-action="library"]',title:'Библиотека персонажей',text:'Библиотека хранит внешность персонажей, чтобы они оставались узнаваемыми на картинках.',click:true},
  {view:'library',selector:'#sp-imagen-review-panel [data-library-search]',title:'Как найти персонажа',text:'Впиши часть имени в поиск или оставь поле пустым, чтобы посмотреть весь список.'},
  {view:'library',selector:'#sp-imagen-review-panel .ness-tag-tools',title:'Теги для поиска',text:'Это метки для удобной сортировки: например, «Главные» и «Семья». Создай тег через «+», нажми на него для фильтрации, а карандашом рядом с лентой можно переименовать или удалить метку.'},
  {view:'library',selector:'#sp-imagen-review-panel [data-library-list]',title:'Как назначать поисковые теги',text:'В строке каждого персонажа есть «+». Нажми его и выбери подходящие метки. Они нужны для поиска, а не для рисования.'},
  ...(!hasCharacters ? [{view:'library',selector:'#sp-imagen-review-panel .ness-library-filters .ness-button',title:'Создадим пробного персонажа?',text:'В библиотеке пока пусто. Нажми «+ Персонаж». Не бойся: позже запись можно отредактировать или удалить.',click:'native',requireClick:true}] : []),
  {view:'library-first',selector:'#sp-imagen-review-panel [data-library-editor] .ness-editor-heading',title:'Откроем карточку персонажа',text:hasCharacters?'Открыт первый персонаж из текущего списка. Посмотрим, за что отвечают поля карточки.':'Открылась новая карточка персонажа. Здесь находятся имя и описание внешности.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-appearance-wrap',title:'Постоянная внешность',text:'Записывай внешность короткими английскими тегами через запятую: long hair, blue eyes, freckles. Для NovelAI V5 особенно полезны узнаваемые теги Danbooru: с ними проще управлять деталями. Каждый тег можно отдельно изменить, удалить или передвинуть.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-appearance-presets',title:'Что такое ракурсы?',text:'Это наборы уже созданных тегов для разных кадров: лицо крупно, вид со спины, полный рост и другое. Заполнять их необязательно: пустой ракурс использует всю внешность. Но NovelAI старается показать всё описанное. Если для портрета передать полный список деталей тела, она может добавить лишнее. Ракурсы помогают оставить только видимое и дают модели больше свободы.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-appearance-pencil',title:'Карандаш редактирует ракурсы',text:'Чтобы отредактировать ракурс, нажми карандаш ✎. Выбери нужный ракурс и отметь подсветкой подходящие теги из уже созданных. Заново вводить описания не нужно. Нажми карандаш ещё раз, чтобы закончить.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-appearance-copy',title:'Копируем теги между ракурсами',text:'Не выбирай одни и те же теги по сто раз для разных ракурсов! Нажми «Добавить из ракурса» и перенеси отмеченные теги из другого заполненного ракурса.',fallback:'#sp-imagen-review-panel [data-library-editor] .ness-appearance-tools'},
  {view:'library-aliases',selector:'#sp-imagen-review-panel [role="tabpanel"]:not([hidden])',title:'Другие имена',text:'Здесь можно вписать прозвища, сокращения и другие имена героя, чтобы режиссёр понимал, о ком речь. Необязательно.'},
  {view:'library-prompt',selector:'#sp-imagen-review-panel [role="tabpanel"]:not([hidden])',title:'Данные для промпта',text:'«Имя для промпта» уточняет, как обозначить героя для генератора. «Тип» — короткая категория вроде girl или cat. Если не нужны, оставь пустыми.'},
  {view:'library-body',selector:'#sp-imagen-review-panel [data-library-body-marks]',title:'Отметины: что и куда вписывать',text:'Шрамы, родинки и татуировки записывай в поле соответствующей части тела: бёдра, колени, голени, плечи или предплечья. Используй короткие английские теги через запятую. Указывай сторону: small scar on left thigh. Пустые поля заполнять не нужно.'},
  {view:'library-body',selector:'#sp-imagen-review-panel [data-library-body-details]',title:'Особенности открытого тела',text:'В «Верх тела» записывай особенности груди, живота и торса, в «Низ тела» — особенности таза, бёдер и интимной анатомии. Это не одежда и не описание позы. Оба поля необязательны.'},
  {view:'library-body',selector:'#sp-imagen-review-panel [data-library-body-important]',title:'ВАЖНО! Показываем только открытое',text:'Детали из этих полей нужны только тогда, когда соответствующий участок тела действительно открыт и виден. Если он спрятан одеждой или находится за кадром, показывать его не нужно. Слишком подробное описание скрытой анатомии может заставить NovelAI оголить персонажа, чтобы нарисовать её. Основную внешность записывай отдельно.'},
  {view:'library',selector:'#sp-imagen-review-panel [data-library-save]',title:'Сохраняем изменения',text:'Когда закончишь редактировать, нажми «Сохранить». Если просто смотрела карточку и ничего не меняла, сохранять не нужно.'},
  {view:'home',selector:'[data-spi-action="prompts"]',title:'Профили генерации',text:'Здесь находятся готовые профили генерации. Можно создавать и собственные.',click:true},
  {view:'prompts',selector:'.spi-prompt-center .spi-prompt-list',title:'Открыть готовый профиль',text:'Открой профиль, чтобы прочитать или изменить его промпт.'},
  {view:'prompts',selector:'.spi-prompt-center .spi-prompt-add',title:'Добавить свой промпт',text:'Нажми «Добавить промпт», придумай название и впиши свои пожелания к картинке. Дополнительные галочки необязательны. После сохранения промпт можно изменять или выключать.'},
  {view:'settings',selector:'[data-spi-action="generation"]',title:'Подготовка изображения',text:'Здесь выбирают, сколько постов читать, где находить одежду и какие технические вставки не передавать режиссёру. Все дополнительные параметры можно раскрыть по желанию.',click:true},
  {view:'generation',selector:'#sp-imagen-review-panel [data-review-scroll]',title:'Настройки с понятными примерами',text:'Открой нужный раздел. Для одежды и очистки есть помощник: вставь пример и посмотри «Было → Станет». Сложные правила спрятаны в «Дополнительно».'},
  {view:'settings',selector:'[data-spi-action="styles"]',title:'Художественный стиль',text:'Стиль выбирается отдельно и необязателен. Он задаёт внешний вид рисунка.',click:true},
  {view:'styles',selector:'.spi-style-layout',title:'Стиль — по желанию',text:'Здесь можно написать стиль для модели-художника. Когда стиль активен, он автоматически вставляется как префикс в начало промпта.'},
  {view:'home',selector:'[data-spi-action="all-prompts"]',title:'Все системные промпты',text:'Здесь можно прочитать и при необходимости изменить остальные внутренние инструкции расширения. У каждого текста есть кнопка восстановления исходной версии.'},
  {view:'home',selector:'[data-spi-action="last-prompt"]',title:'Последний промпт',text:'После генерации здесь можно посмотреть итоговое описание картинки. Просмотр ничего не генерирует.'},
  {view:'finish',selector:null,title:'Теперь можно создавать картинки',text:'Вернись в ролевой чат, нажми ✨ возле поста, выбери формат и при необходимости проверь описание перед отправкой. '}
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
