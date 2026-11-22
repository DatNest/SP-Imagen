// SP Imagen's own beginner guide and field reference. No external extensions.
import { getVisibleViewport, mountViewportOverlay } from './viewport-overlay.js';

export const IMAGEN_GLOSSARY = Object.freeze({
    'Метка': 'Специальная подпись в сообщении, по которой SP Imagen узнаёт нужные данные. Например, ⟦ОДЕЖДА:Джи⟧blue shirt⟦/ОДЕЖДА⟧ сообщает, что на Джи надета голубая рубашка.',
    'Сводка': 'Короткая техническая запись с итогом или значениями, которую некоторые инструменты добавляют после сцены. Обычно её не нужно рисовать.',
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
    'Подсветка тега': 'В обычном режиме нажми тег слева, чтобы выбрать его для ракурса. Повторное нажатие или нажатие всей плашки справа снимает выбор.',
    'Разделитель': 'Заголовок группы тегов. Нажми на него, чтобы свернуть раздел. Маленький + рядом добавляет тег в эту группу. Название раздела в промпт не попадает.',
    'Без текста': 'В обычных и тестовых Comic / Story Page переключатель под ✧ отключает реплики, пузыри и надписи для следующего изображения.',
    'Тестовый режим': 'Переключатель «🧪 Тест: ON / OFF» в меню ✧. При ON появляются три тестовых профиля со слотами. Обычные профили остаются доступными.',
    'JSON-слоты': 'Начало, сцена, рамки, пузыри, персонажи и надписи в ответе тестового режиссёра. Код собирает из них готовый промпт без второго запроса к текстовой модели.',
    'Рамки панелей': 'Видимые контуры панелей, промежутки между ними, декоративные детали и края страницы. В тестовом промпте идут перед описанием сцены.',
    'Пузырь речи': 'Замкнутый контур с репликой внутри и хвостиком, указывающим на говорящего. Тестовый режиссёр привязывает его к конкретной панели.',
    'Режим перемещения': 'Кнопка ✥ в верхней панели редактора внешности. Выбери тег, двигай его стрелками или удерживай для открытия меню разделов.',
    'Редактор иконки': 'Нажми на ✦ или фотографию в шапке записи, выбери файл, вставь изображение или ссылку, обрежь квадратный кадр и сохрани.',
    'Черновик генерации': 'Сохранённая подготовка конкретного ролевого поста. Её можно продолжить без повторного сбора сцены, если генерация прервалась.',
    'Anlas': 'Внутренняя валюта NovelAI. Если не хочешь её расходовать, оставь включённой защиту Anlas.',
    'Opus': 'Название уровня подписки NovelAI. От уровня зависит доступный объём генерации.',
    'Steps': 'Количество промежуточных шагов создания картинки. Для начала оставь стандартное значение.',
    'Snapshot': 'Одна иллюстрация момента из ролевой сцены, как отдельный кадр.',
    'Comic': 'Комикс с несколькими панелями и, при необходимости, репликами.',
    'Story Page': 'Страница иллюстрированной истории с композицией и, если нужно, текстом.',
    'Ракурс': 'С какой стороны виден персонаж. Например, спереди или со спины. Пока ракурсы вообще не настроены, используется базовое описание. После настройки пустой ракурс получает только теги «Показывать всегда».',
    'NPC': 'Второстепенный персонаж, который появился в сцене, но не обязательно есть в твоей библиотеке.',
    'Seed': 'Число, по которому генератор выбирает исходный случайный рисунок. При повторе одного seed результат проще сравнивать.',
    'Sampler': 'Способ, которым генератор постепенно собирает изображение. Если не знаешь, что выбрать, оставь значение по умолчанию.',
    'CFG': 'Насколько строго генератор следует тексту задания. Слишком высокие значения иногда портят картинку.',
    'Temperature': 'Насколько свободно текстовая модель подбирает слова. Низкое значение делает ответы более предсказуемыми.',
    'Streaming': 'Когда текст приходит по частям, пока модель ещё отвечает. SP Imagen сам получает готовый ответ и не зависит от этой галочки других расширений.',
    'JB': 'Сокращение от jailbreak: дополнительные инструкции для языковой модели в некоторых инструментах. SP Imagen не использует настройки JB других расширений.',
});

const HELP_HINTS = Object.freeze({
    'Тестовый режим': 'OFF — обычные профили. ON — дополнительно доступны 🧪 Snapshot, 🧪 Comic и 🧪 Story Page. Старые профили и уже созданные картинки сохраняются.',
    'Тестовые профили': 'За один запрос режиссёр возвращает JSON-слоты: начало, короткую сцену и компоновку, видимые рамки, пузыри, внешность и действия персонажей, надписи. Код собирает промпт и помещает Text: в конце. При повреждённом JSON NovelAI не вызывается.',
    'Текст в комиксе': 'В Comic и Story Page этот переключатель действует на одну генерацию. С текстом модель описывает пузыри и реплики; без текста пузыри и надписи отсутствуют. Старые изображения не меняются.',
    'Режимы тегов': '✎ — переименовать теги. 🗑 — удалить тег нажатием с возможностью отмены. ✥ — выбрать тег и двигать стрелками ← → ↑ ↓. Режимы взаимоисключающие, повторное нажатие выключает режим. ↶ и ↷ отменяют и повторяют действия.',
    'Добавление тегов': 'Нажми маленький ＋ рядом с разделом, введи новый тег и нажми Enter. Когда разделов нет, ＋ есть в начале и конце списка. Разделы создаются отдельной кнопкой.',
    'Перенос в раздел': 'Включи ✥ и выбери тег. Стрелки двигают его по списку; ↗ открывает меню разделов. На телефоне удерживай тег, на ПК нажми правой кнопкой мыши. Перенесённый тег остаётся выделенным, а переход в другой режим снимает прежние назначения.',
    'Фильтры библиотеки': 'Теги для поиска записей, а не внешности. Две строки прокручиваются вертикально колёсиком мыши или свайпом. Выбранный тег фильтрует список персонажей.',
    'Иконка персонажа': 'Нажми ✦ или картинку в шапке записи. Можно выбрать файл, вставить изображение из буфера или загрузить по прямой ссылке. Перед сохранением выставь квадратный кадр.',
    'Масштаб и обрезка': 'Двигай картинку в квадратной области обрезки и меняй масштаб ползунком. В библиотеке сохранится квадратная иконка. Внешние ссылки требуют разрешения CORS от сервера.',
    'Структура тестового промпта': 'Режиссёр заполняет поля за один запрос. Расширение вставляет число персонажей, рамки, краткую сцену и фоны, пузыри, персонажей с подробными действиями и Text: в конце. Содержимое художественных полей не переписывается.',
    'Откуда брать модель': 'Выбери, откуда SP Imagen получит текстовую модель. Если у тебя уже настроено подключение SillyTavern, проще выбрать его профиль. При прямом API понадобятся адрес сервера, название модели и ключ.',
    'Профиль SillyTavern': 'Выбери сохранённое текстовое подключение. Оно используется только для составления описания картинки и не меняет модель твоего ролевого чата.',
    'Endpoint': 'Адрес сервера текстовой модели, например https://example.com/v1. Заполняй только в режиме прямого API. Если выбран профиль SillyTavern, не нужен.',
    'Модель': 'Точное название текстовой модели, которое выдаёт твой провайдер. Нужно при прямом API; при подключении через профиль отдельное название не требуется.',
    'API-ключ': 'Вставь секретный ключ доступа текстового провайдера, только если используешь прямой API. Не нужно вводить его при выборе профиля SillyTavern.',
    'Temperature': 'Настройка разнообразия текста. Новичку лучше оставить установленное значение. Меняй только если ответы режиссёра слишком случайные или однообразные.',
    'Максимум токенов': 'Ограничение длины текстового ответа режиссёра. Если не знаешь, что выбрать, оставь стандартное число: увеличивать его без необходимости не нужно.',
    'API-токен NovelAI': 'Секретный токен NovelAI, позволяющий SP Imagen создавать картинки напрямую. Введи свой токен и нажми проверку подключения. Это не ключ от текстовой модели.',
    'Стиль': 'В разделе «Стили» кружочек ○ делает оформление активным, а нажатие на название открывает его для редактирования. Активный стиль применяется к новым картинкам и обычному ↻. В редакторе 📝 можно указать другой стиль только для одной картинки.',
    'Negative prompt': 'Список нежелательных особенностей картинки. Поле необязательно: если не знаешь, что писать, оставь по умолчанию.',
    'Seed': 'Число для повторяемой генерации. Обычно его лучше не трогать: генератор сам выберет новое.',
    'Ракурс': 'Выбери нужный ракурс и подсвети теги, которые там видны. «Показывать всегда» применяется к любому ракурсу. Если ракурсы уже настроены, пустой ракурс не добавляет всю внешность автоматически.',
    'Другие имена и псевдонимы': 'Впиши другие имена персонажа: как он упоминается в чате. Это помогает узнавать одного и того же героя. Каждое имя можно добавить отдельно; если псевдонимов нет, оставь пустым.',
    'Название тега': 'Короткое слово для группировки записей, например «Главные» или «Магия». Можно оставить без тегов.',
    'Цвет тега': 'Цвет метки, чтобы быстрее различать группы персонажей. На работу генерации он не влияет.',
    'Итоговый промпт': 'Это готовое задание для генератора изображений. Можешь прочитать и при желании отредактировать. Если всё устраивает, оставь как есть и отправляй.',
    'Сохранить для': 'Выбери, применять настройки только к этому чату или шире. Для первых проб безопаснее сохранять их в текущем чате.',
    'Поиск': 'Начни печатать имя или часть слова, чтобы найти персонажа. Поле можно оставить пустым — тогда видно всю библиотеку.',
    'Постоянная внешность': 'Запиши то, что у персонажа обычно не меняется: лицо, волосы, цвет глаз, телосложение и особенности тела. Лучше простыми английскими фразами или тегами. Одежду для отдельной сцены сюда писать не нужно.',
    'Имя': 'Имя персонажа так, как его обычно называют в ролевом чате. Это обязательное поле записи библиотеки.',
    'Под одеждой': 'В режиме «Под одеждой» хранятся постоянные шрамы, родинки, татуировки и особенности открытого тела. Подсвечивай их для нужной области: верх/низ спереди или сзади, руки либо ноги. Если участок закрыт одеждой, эти признаки не вставляются в промпт. Старые поля автоматически переносятся сюда.',
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
  {view:'home',selector:'.spi-hub',title:'Познакомимся с SP Imagen',text:'SP Imagen создаёт иллюстрации по событиям ролевого чата. Сначала познакомимся с подключениями, затем с библиотекой и кнопками под постом. Нажми «Далее».',click:false},
  {view:'settings',selector:'[data-spi-action="text-api"]',title:'Кто придумывает сцену?',text:'Текстовая модель читает ролевые посты и составляет задание для художника. Здесь выбирается её подключение.',click:true},
  {view:'text-api',selector:'.spi-connection-window .spi-form-grid',title:'Подключение режиссёра',text:'Выбери готовый профиль SillyTavern или настрой прямой API. При прямом подключении SP Imagen попросит подтвердить адрес сервера — ведь ему передаются текст сцены и ключ. Проверь соединение и сохрани настройки.'},
  {view:'settings',selector:'[data-spi-action="novelai"]',title:'Кто рисует картинку?',text:'NovelAI получает готовое описание и создаёт изображение. Нажми на этот пункт, чтобы открыть подключение художника.',click:true},
  {view:'novelai',selector:'.spi-connection-window .spi-form-grid',title:'Подключение NovelAI',text:'Введи собственный API-токен NovelAI и проверь соединение. Токен никому не отправляй. Для первой картинки остальные настройки можно оставить стандартными, а защиту Anlas — включённой.'},
  {view:'home',selector:'[data-spi-action="library"]',title:'Библиотека персонажей',text:'Сюда записывают постоянную внешность персонажей. Тогда режиссёр не будет каждый раз угадывать цвет глаз, шрамы или причёску.',click:true},
  {view:'library',selector:'#sp-imagen-review-panel [data-library-search]',title:'Как найти персонажа',text:'Начни вводить имя или его часть — список отфильтруется. Оставь поиск пустым, чтобы увидеть всех.'},
  {view:'library',selector:'#sp-imagen-review-panel .ness-tag-tools',title:'Поисковые теги — это не внешность',text:'Эти теги нужны для удобства самой библиотеки: например, «Главные», «Семья» или «Злодеи». Создай новый через «+», нажимай на готовые для фильтрации, а для изменения названия используй кнопку рядом с лентой.'},
  {view:'library',selector:'#sp-imagen-review-panel [data-library-list]',title:'Назначаем персонажам поисковые теги',text:'У каждой записи есть маленький «+». Через него назначаются метки из общего списка. В промпт картинки они не вставляются.'},
  ...(!hasCharacters?[{view:'library',selector:'#sp-imagen-review-panel .ness-library-filters .ness-button',title:'Добавим первого персонажа?',text:'Пока библиотека пуста. Нажми «+ Персонаж», чтобы открыть карточку. Во время обучения её необязательно заполнять.',click:'native',requireClick:true}]:[]),
  {view:'library-first',selector:'#sp-imagen-review-panel [data-library-editor] .ness-editor-heading',title:'Открываем карточку',text:hasCharacters?'Открылась первая запись из текущего списка. Посмотрим, где теперь редактируется внешность.':'Это карточка нового персонажа: здесь находятся имя, постоянная внешность и отдельные данные для промпта.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-format-strip',title:'Текст или теги?',text:'В «Тексте» можно менять описание целиком. В «Тегах» — выбирать детали для отдельных ракурсов. Переключайся, как тебе удобнее.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-modes',title:'Три режима внешности',text:'«Ракурсы» — обычная внешность. «Под одеждой» — шрамы, родинки и отметины на коже. «NSFW» — отдельные особенности анатомии. У каждого режима свои теги.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-ribbon',title:'Зачем нужны ракурсы?',text:'Генератору не нужны детали, которых в кадре не видно. Выбери лицо, голову, верх или полный рост и отметь подходящие теги. Строку ракурсов можно листать.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-ribbon',title:'✦ Показывать всегда',text:'Здесь выбирай признаки, которые нужны в любом ракурсе. Они добавятся в остальные ракурсы автоматически.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-unified-tagflow',title:'Выбираем теги',text:'Нажми тег слева — он появится справа и подсветится. Нажми ещё раз — выбор снимется. Плашки занимают столько места, сколько нужно.',fallback:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-left'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-right',title:'Выбранные теги',text:'Справа собраны теги текущего ракурса. Убирай их крестиком × или повторным нажатием слева. На телефоне этот блок находится внизу и прокручивается отдельно.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-history',title:'Поиск и отмена',text:'Найди нужный тег через поиск. ↶ отменяет последнее действие, ↷ возвращает его. Ничего не отправляется на генерацию.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-edit-toggle',title:'Карандаш ✎',text:'Нажми ✎ — все теги станут текстовыми полями. Меняй названия прямо в плашках. Их привязки к ракурсам сохранятся. Нажми ✎ ещё раз, чтобы закончить.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-grip',title:'Перетаскиваем теги',text:'Зажми ⠿ и перетащи тег пальцем или мышью. Так меняется его место или раздел, а назначения ракурсов сохраняются.',fallback:'#sp-imagen-review-panel [data-library-editor] .ness-unified-tagflow'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-grip',title:'Стрелки перемещения',text:'Одно короткое нажатие на ⠿ открывает стрелки ← → ↑ ↓. Ими тоже можно двигать теги внутри списка и между разделами.',fallback:'#sp-imagen-review-panel [data-library-editor] .ness-unified-tagflow'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-grip',title:'Копировать или перенести',text:'На ноутбуке нажми ПКМ на тег. На телефоне удерживай ⠿, не двигая палец. Выбери «Копировать» или «Перенести», а затем нужный режим.',fallback:'#sp-imagen-review-panel [data-library-editor] .ness-unified-tagflow'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-unified-section',title:'Разделы',text:'Разделы помогают разложить теги по темам. Нажми на заголовок, чтобы свернуть группу. Заголовок не попадёт в промпт.',fallback:'#sp-imagen-review-panel [data-library-editor] .ness-unified-tagflow'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-unified-add',title:'Добавляем теги и разделы',text:'Впиши один тег и нажми «＋ Добавить» или Enter. Он сразу появится в текущем ракурсе. Через «＋ Новый раздел» создай свою группу.'},
  {view:'library-skin',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-ribbon',title:'Под одеждой',text:'Выбери, где находится отметина: верх спереди или сзади, низ спереди или сзади, руки либо ноги. Эти детали нужны только тогда, когда кожа видна.'},
  {view:'library-skin',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-right',title:'Открытые участки',text:'Например, шрам на ноге добавь в «Открытые ноги». Если кожа закрыта одеждой, эта отметина не нужна. «Для всех открытых областей» работает как «Всегда».'},
  {view:'library-skin',selector:'#sp-imagen-review-panel [data-library-editor] .ness-unified-tagflow',title:'Старые отметины',text:'Отметины из старых полей бёдер, голеней, плеч и других участков переносятся сюда автоматически. Проверь, для каких областей они выбраны.'},
  {view:'library-nsfw',selector:'#sp-imagen-review-panel [data-library-editor] .ness-tagboard-ribbon',title:'Режим NSFW',text:'Здесь три области: грудь, низ спереди и низ сзади. Выбирай подходящие анатомические детали. Само по себе назначение тега не оголяет персонажа.'},
  {view:'library-appearance',selector:'#sp-imagen-review-panel [data-library-editor] .ness-format-strip',title:'Текстовый формат',text:'В «Ракурсах» текст редактирует исходное описание, в остальных режимах — список тегов. При переименовании сохраняются назначения.'},
  {view:'library-aliases',selector:'#sp-imagen-review-panel [role="tabpanel"]:not([hidden])',title:'Другие имена',text:'Впиши прозвища, сокращения и другие имена героя, под которыми он встречается в ролевой. Так режиссёр поймёт, что речь об одном персонаже. Если псевдонимов нет, оставь пустым.'},
  {view:'library-prompt',selector:'#sp-imagen-review-panel [role="tabpanel"]:not([hidden])',title:'Данные для промпта',text:'«Имя для промпта» позволяет отдельно назвать героя для NovelAI, а «Тип» задаёт короткую категорию вроде girl, boy или cat. Для начала эти поля можно не трогать.'},
  {view:'library',selector:'#sp-imagen-review-panel [aria-label="Экспорт библиотеки"]',title:'Сохрани копию библиотеки',text:'Кнопка экспорта выгружает JSON с персонажами, их внешностью, разделителями и назначенными тегами. Сохрани такую копию перед большими изменениями. Рядом находится импорт для восстановления.'},
  {view:'library',selector:'#sp-imagen-review-panel [data-library-save]',title:'Сохраняем изменения',text:'Когда закончишь, нажми «Сохранить». Если просто смотрела карточку и ничего не меняла, сохранять нечего. При импорте старые поля отметин тоже переносятся в новые области.'},
  {view:'home',selector:'[data-spi-action="prompts"]',title:'Профили генерации',text:'Здесь находятся готовые Snapshot, Comic и Story Page. Можно создать и собственный профиль.',click:true},
  {view:'prompts',selector:'.spi-prompt-center .spi-prompt-list',title:'Встроенные профили',text:'Snapshot — один кадр, Comic — комикс с панелями, Story Page — страница иллюстрированной истории. Встроенные инструкции можно посмотреть, а для своей версии — сделать копию профиля. Галочка определяет, виден ли профиль у звёздочки ✧.'},
  {view:'prompts',selector:'.spi-prompt-center .spi-create-custom-profile',title:'Собственные профили',text:'«Создать свой профиль» добавляет свой режим с собственным режиссёром. В настройках можно выбрать, сколько постов читать и какие сведения учитывать. Менять встроенные профили ради этого не нужно.'},
  {view:'prompts',selector:'.spi-prompt-center .spi-prompt-add',title:'Общие инструкции режиссёру',text:'«Добавить промпт» — это не ещё один профиль. Здесь записывается отдельная дополнительная инструкция, которая включается в работу режиссёра. Например: «Чаще выбирай крупный план». Если непонятно поле, нажми «?».'},
  {view:'settings',selector:'[data-spi-action="generation"]',title:'Подготовка изображения',text:'Здесь выбирают число читаемых постов, источники одежды и какие технические вставки не следует пересказывать художнику. Для сложных правил есть помощник с примером «Было → Станет».',click:true},
  {view:'generation',selector:'#sp-imagen-review-panel [data-review-scroll]',title:'Настройки с примерами',text:'Не обязательно заполнять всё сразу. Начни с источников одежды и количества постов, а дополнительные параметры открывай, только когда они понадобятся.'},
  {view:'settings',selector:'[data-spi-action="styles"]',title:'Художественные стили',text:'Стиль — отдельные художественные теги для NovelAI. Он необязателен и не заменяет описание сцены.',click:true},
  {view:'styles',selector:'.spi-style-layout',title:'Как включить стиль',text:'Выбери нужный стиль кружочком ○ слева от его названия — он станет активным для новых картинок и обычного повтора ↻. Нажатие на название открывает стиль для редактирования. «Без стиля» отключает префикс. В 📝 можно выбрать другое оформление только для одной картинки.'},
  {view:'home',selector:'[data-spi-action="all-prompts"]',title:'Все системные промпты',text:'Здесь собраны внутренние инструкции расширения. Их можно читать и редактировать, но для первой генерации менять их не требуется. У каждой есть восстановление исходного варианта.'},
  {view:'home',selector:'[data-spi-action="last-prompt"]',title:'Последний промпт',text:'После подготовки здесь появится итоговое задание для NovelAI. Посмотреть его можно без генерации картинки.'},
  {view:'post-star',selector:'[data-spi-post-demo]',title:'Генерация из ролевого чата',text:'Нажми звёздочку ✧ под ролевым постом. SP Imagen подготовит изображение и прикрепит его к этому посту.',click:'native',requireClick:true},
  {view:'post-formats',selector:'[data-spi-post-demo]',title:'Выбираем формат',text:'Snapshot — один кадр, Comic — комикс, Story Page — иллюстрированная страница. Нажми формат: сейчас это только учебный выбор, без обращения к моделям.',click:'native',clickGroup:'.option',requireClick:true},
  {view:'post-formats-text',selector:'.text-mode-toggle',title:'Comic и Story Page: с текстом или без?',text:'Рядом с Comic и Story Page есть маленький переключатель «Текст / Без текста». Он действует только на следующую генерацию. «Текст» оставляет реплики и бабблы, «Без текста» рассказывает сцену через рисунок, без надписей. Snapshot не меняется.'},
  {view:'post-saved',selector:'[data-spi-post-demo]',title:'Где сохранённый промпт?',text:'Под постом сохраняются и изображение, и задание, по которому оно было нарисовано. Значок ▤ показывает этот текст. Сейчас перед тобой учебный пример: нажми на него.',click:'native',requireClick:true},
  {view:'post-view',selector:'[data-spi-post-demo]',title:'Читаем промпт',text:'Это текст, который получил художник. Просмотр сам по себе ничего не генерирует, так что можно спокойно проверять описание.'},
  {view:'post-replace',selector:'[data-spi-post-demo]',title:'Начнём ещё одну картинку?',text:'Нажми ✧ снова. В реальной ролевой старые изображения останутся под постом; новый запуск создаст следующую версию.',click:'native',requireClick:true},
  {view:'post-cleared',selector:'[data-spi-post-demo]',title:'Выбор для следующего запуска',text:'Можно выбрать другой формат и заново решить, нужен ли текст в Comic или Story Page. Этот выбор не меняет прошлые изображения.'},
  {view:'post-result',selector:'[data-spi-post-demo]',title:'Галерея под постом',text:'← → перелистывают версии, ↻ повторяет изображение с текущим активным стилем, ↓ скачивает файл. 🗑 удаляет выбранную версию только после подтверждения. Для изображений SP Imagen расширение также удаляет файл с сервера, если он не используется больше нигде в этом чате. В других чатах ссылку проверить нельзя — поэтому важное лучше скачать заранее.'},
  {view:'post-result',selector:'[data-spi-post-demo]',title:'Если генерация прервалась',text:'Под тем же постом может появиться «↪ Продолжить». Это сохранённый черновик: SP Imagen возвращается к нужному этапу, не разбирая ролевую сначала и не тратя лишние токены режиссёра. Рядом есть × для удаления только черновика. Готовые картинки она не трогает.'},
  {view:'post-edit',selector:'[data-spi-post-demo]',title:'Исправим готовую картинку?',text:'Если ошиблась деталь, не нравится стиль или хочется другой ракурс, нажми 📝 на картинке.',click:'native',requireClick:true},
  {view:'post-editor',selector:'[data-spi-post-demo]',title:'Редактирование и перегенерация',text:'Здесь можно исправить сам промпт и выбрать стиль только для этой картинки. Затем нажми «Перегенерировать»: запрос сразу уйдёт в NovelAI, без повторной работы текстового режиссёра. Токены текстовой модели не тратятся, но NovelAI может списать Anlas. Новая версия сохранится рядом с прежней.'},
  {view:'finish',selector:null,title:'Готово',text:'Теперь ты знаешь, где хранить внешность, как подсвечивать ракурсы и отметины, выбирать стиль и запускать Comic без надписей. Для первой картинки выбери пост, нажми ✧ и выбери профиль. Учебные элементы исчезнут после завершения гайда.'}
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
    let index=-1,abort=false,requestId=0,target=null,handleClick=null,clickTargets=[],frame=null;
    const detach=()=>{for(const node of clickTargets)node.removeEventListener('click',handleClick,true);clickTargets=[];target=null;handleClick=null;};
    function fit(){
        if(abort)return;
        const vp=getVisibleViewport();
        if(!target?.isConnected || !target.getClientRects().length){spotlight.hidden=true;sheet.style.left='';sheet.style.top='';sheet.style.bottom='';return;}
        const rect=target.getBoundingClientRect(),left=Math.max(4,rect.left-vp.left-5),top=Math.max(4,rect.top-vp.top-5),right=Math.min(vp.width-4,rect.right-vp.left+5),bottom=Math.min(vp.height-4,rect.bottom-vp.top+5);
        if(right<=left||bottom<=top){spotlight.hidden=true;return;}
        spotlight.hidden=false;Object.assign(spotlight.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
        const cardWidth=Math.min(sheet.offsetWidth||360,vp.width-20),cardHeight=sheet.offsetHeight||180,margin=10;
        if(vp.width<660){
            sheet.style.left='10px';
            const overlap=(a,b)=>Math.max(0,Math.min(bottom,b)-Math.max(top,a));
            const topOverlap=overlap(margin,margin+cardHeight);
            const bottomOverlap=overlap(vp.height-cardHeight-margin,vp.height-margin);
            const atTop=topOverlap<bottomOverlap;
            sheet.style.top=atTop?margin+'px':'auto';
            sheet.style.bottom=atTop?'auto':margin+'px';
            spotlight.style.opacity=atTop||bottomOverlap===0?'1':topOverlap===0?'1':'0.65';
        }
        else{
            sheet.style.bottom='auto';
            const clamp=(value,min,max)=>Math.max(min,Math.min(value,Math.max(min,max)));
            const maxX=vp.width-cardWidth-margin;
            const maxY=vp.height-cardHeight-margin;
            const besideY=clamp(top+(bottom-top-cardHeight)/2,margin,maxY);
            const canRight=right+12+cardWidth<=vp.width-margin;
            const canLeft=left-cardWidth-12>=margin;
            let x,y;
            if(canRight){x=right+12;y=besideY;}
            else if(canLeft){x=left-cardWidth-12;y=besideY;}
            else{
                const canBelow=bottom+12+cardHeight<=vp.height-margin;
                x=clamp(left,margin,maxX);
                y=canBelow?bottom+12:clamp(top-cardHeight-12,margin,maxY);
            }
            sheet.style.left=x+'px';sheet.style.top=y+'px';spotlight.style.opacity='1';
        }
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
        let navigationTarget = null;
        try{navigationTarget = await navigate(step.view);}catch(error){
            console.warn('[SP Imagen guide] section not available:',error);
            const warning=document.createElement('p');warning.className='spi-tour-unavailable';
            warning.textContent=String(error?.message||'Не удалось открыть этот раздел. Попробуй ещё раз.');
            copy.append(warning);next.disabled=false;return;
        }
        if(abort||mine!==requestId)return;
        for(let attempt=0;attempt<14;attempt++){
            target=navigationTarget?.isConnected && typeof navigationTarget.getBoundingClientRect === 'function'
                ? navigationTarget : (step.selector?document.querySelector(step.selector):null);
            if ((!target || !target.getClientRects().length) && step.fallback) target=document.querySelector(step.fallback);
            if(!step.selector||target?.getClientRects().length)break;
            await new Promise(resolve=>setTimeout(resolve,55));
            if(abort||mine!==requestId)return;
        }
        if(!target?.isConnected)target=null;
        if(step.selector && !target){const note=document.createElement('p');note.className='spi-tour-unavailable';note.textContent='Этот раздел пока недоступен в открытом чате. Можно продолжить обучение или вернуться к нему позже.';copy.append(note);}
        if(step.click&&target){handleClick=event=>{if(step.click !== 'native'){event.preventDefault();event.stopImmediatePropagation();}if(step.requireClick)next.disabled=false;const nextIndex=index+1,visit=requestId;setTimeout(()=>{if(!abort&&visit===requestId)void go(nextIndex);},0);};clickTargets=step.clickGroup ? [...target.getRootNode().querySelectorAll(step.clickGroup)] : [target];for(const node of clickTargets)node.addEventListener('click',handleClick,true);}
        if(step.requireClick && target){next.disabled=true; next.title='Сначала нажми выделенную кнопку или прерви обучение';}
        else {next.disabled=false; next.title='';}
        fit();
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
