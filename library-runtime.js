// Generated from NESS_GEN2_STUDIO/modules.
export function createSpImagenLibraryRuntime(){
async function activateNessProfile(){return true;}
async function routeImages(method,kind){const map={generateAt:'sp_ness_generate_at',prepareRp:'sp_ness_'+kind+'_scene_parser',openSettings:'sp_ness_settings'};return globalThis.__spImagenExtension.run(map[method],kind);}

// Module: field_help
const NESS_FIELD_HELP={
  "Помогатор: справка": "С чего начать?\n1. Выбери, что сделать: убрать вставку или найти одежду. В отдельном помогаторе исключений задача уже выбрана — сохранить нужное.\n2. Скопируй один полный фрагмент из поста и нажми «Обработать».\n3. Проверь показанный результат, нажми «Добавить в настройки», затем «Сохранить настройки» в основном окне. Код копировать не обязательно.\n\nГде взять пример?\nНужна вставка целиком: например ⟦SCORE:12⟧ или <span class=\"score\">12</span>. Если видна только оформленная карточка, открой редактирование сообщения и скопируй её исходный текст. Не нужно присылать весь пост или весь список правил.\n\nЧто такое метка?\nТекст в скобках, по которому можно найти служебную вставку. Например, в ⟦SCORE:12⟧ метка SCORE остаётся той же, а число 12 меняется. По одному примеру помогатор учится находить и другие числа с этой меткой.\n\nЧто такое HTML?\nРазметка для оформления текста: например <b>текст</b> делает его жирным. Нужное содержимое находится между частями <b> и </b>. Помогатору можно дать такой фрагмент целиком.\n\nЧто такое regex?\nПравило поиска похожих фрагментов. В отличие от обычного слова оно может найти, например, любое число после SCORE. Если у тебя уже есть такое правило, его тоже можно вставить. Не нужно учиться писать его самостоятельно.\n\nЧто делают исключения?\nДопустим, служебный блок нужно убрать, но число из него важно. Исключение сначала запоминает число, затем возвращает его без оформления. С подписью «Шкала отношений» результат будет: «Шкала отношений: 12».\n\nЗачем просить модель помочь?\nЕсли простой разбор не подошёл, используется текстовая модель, подключённая в SP Imagen. Ей передаётся только вставленный пример. Можно снять галочку — тогда помощник работает без обращения к модели.\n\nЗачем раздел с кодом?\nОн нужен для ручного переноса готового правила. JSON — просто способ записать настройки в виде кода. Для обычного использования достаточно кнопки «Добавить в настройки».\n\nЕсли не получилось\nВставь начало и конец фрагмента, а не только его значение. Например, ⟦SCORE:12⟧ вместо одного числа 12. В разделе ручной настройки можно указать, что вставлено: готовый код, дословный текст или текст между двумя метками.",
  "Исключения": "Сначала извлекают нужное, потом позволяют удалить окружающий служебный блок.\nНапример: из ⟦SCORE:12⟧ оставить только «Шкала отношений: 12».\nОткрой «Помогатор исключений» и дай ему пример. Если два исключения находят одно и то же, действует первое.",
  "Шаблон сохраняемого текста (regex)": "Код для поиска нужного фрагмента до удаления окружающего мусора.\nДля обычного использования его составляет отдельный помогатор исключений.\nВручную меняется только тогда, когда ты знаешь, как устроено правило поиска.",
  "Группа извлечения": "Необязательно: какая часть уже найденного фрагмента нужна.\nНапример, value или 1 обозначает часть правила, а не само значение.\nПустое поле оставляет весь найденный фрагмент без оформления. По примеру это заполняется автоматически.",
  "Подпись перед текстом (необязательно)": "Например: Шкала отношений.\nРежиссёр получит «Шкала отношений: извлечённый текст». Без подписи передаётся только текст.",
  "Сложный формат: попросить модель": "Если локальный разбор не справится, вставленный пример уйдёт в текстовую модель, подключённую в SP Imagen.\nИстория чата не отправляется. При выключенной галочке запросов к модели не будет.",
  "Что сделать": "Удаление скрывает найденный текст. Извлечение одежды связывает имя персонажа с его гардеробом.\nДля сохранения текста открой отдельный помогатор исключений.",
  "Что вставляешь": "Автоформат распознаёт частые метки, HTML, regex с /разделителями/ и экспорт JSON.\nДля regex без разделителей или дословного текста выбери формат вручную.",
  "Вставь один пример": "Один полный фрагмент из поста или исходник одного regex.\nНе нужно вставлять всю историю чата или весь список расширения.",
  "Начальная метка": "Точный текст непосредственно перед нужным содержимым.\nНапример [PRIVATE]. Никакого экранирования вручную не требуется.",
  "Конечная метка": "Точный текст после нужного содержимого.\nНапример [/PRIVATE]. Помогатор сам подготовит шаблон.",
  "Готовое правило JSON": "Универсальная запись правила для этих настроек.\nКнопка «Добавить в настройки» перенесёт её в правильные поля. Не вставляй весь JSON в поле regex.",
  "Источники одежды": "Здесь определяется, где в постах записана одежда.\nНапример: [OUTFIT:Анна]синяя рубашка[/OUTFIT]. По такой записи режиссёр узнает, что надето на Анне.\nНачни с кнопки «Найти одежду по примеру». Ручные поля нужны только для своей разметки.",
  "Свои форматы одежды": "Дополнительные способы найти имя и одежду в посте.\nПроще открыть «Найти одежду по примеру»: помощник заполнит нужные поля.\nРучная настройка нужна, если готовый разбор не подошёл.",
  "Распознавать прежнюю разметку одежды": "Читает записи вида ⟦ОДЕЖДА:Имя⟧описание одежды.\nОбщий блок ⟦ГАРДЕРОБ⟧…⟦/ГАРДЕРОБ⟧ необязателен.\nЕсли у тебя другой формат, добавь его ниже.",
  "Примеры форматов": "Добавляет заполненный образец для ручной настройки.\nМетки — текст вокруг имени и одежды. Regex — правило поиска. HTML — запись в тегах <…>.\nДля своего примера удобнее кнопка «Найти одежду по примеру».",
  "Использовать этот источник": "Включает извлечение одежды по этому правилу.\nВыключенное правило сохраняется, но не читает посты.",
  "Количество постов": "Сколько последних сообщений прочитает модель, составляющая картинку.\nЭто не число кадров: 2 означает прочитать два последних поста.\nДля истории из нескольких событий может понадобиться больше постов.",
  "Очистка постов": "Режиссёр получит события сцены без выбранных служебных вставок. Исходные посты чата сохраняются.\nХочешь убрать свою вставку? Нажми «Помогатор-кодировщик 3000».\nХочешь оставить нужное значение из неё? Открой «Исключения».",
  "Скрытые мысли и служебные метки": "Скрывает распознаваемые внутренние мысли и технические маркеры.\nСобытия сцены и телефонная переписка остаются.",
  "Комментарии в коде HTML": "Скрывает вставки <!-- комментарий -->.\nВидимый текст обычных HTML-элементов эта настройка не удаляет.",
  "Скрытые элементы HTML": "Убирает скрытые HTML-блоки и переводит остальную разметку в читаемый текст.\nВидимые телефонные сообщения сохраняются.",
  "Сводки в конце поста": "Убирает распознаваемую служебную сводку в конце сообщения.\nЕсли твоя сводка оформлена иначе, добавь её шаблон в «Свои правила удаления».",
  "Свои правила удаления": "Для своих служебных вставок, которые не убираются галочками выше.\nОбычный путь: открыть помогатор, вставить пример, обработать и добавить правило.\nРучное поле ждёт готовый код поиска, а не описание словами «удалить это».",
  "Шаблон удаляемого текста (regex)": "Код, по которому будут находиться ненужные вставки.\nНе вставляй сюда просьбу «удали комментарии». Вместо этого дай помогатору реальный пример из поста.\nОн заполнит это поле за тебя.",
  "Текст на картинке": "Реплика — короткая фраза персонажа или сообщение из постов, выбранное для картинки.\nПервое ограничение — сколько таких фраз можно взять на всю страницу. Второе — длина каждой.\nКороткие фразы проще разместить и прочитать в комиксе. Это максимум: модель может выбрать меньше.",
  "Максимум реплик на странице": "Верхняя граница числа фраз на всей странице.\nНапример, 2 — можно выбрать не больше двух реплик. 0 — не выбирать реплики.\nЭто не обязательное количество пузырей.",
  "Максимум слов в реплике": "Ограничивает длину одной выбранной фразы.\nНапример, 7 — не больше семи слов в каждой реплике. Короткий текст легче разместить в пузыре и прочитать.",
  "Предпросмотр": "Позволяет проверить и отредактировать готовый промпт до отправки генератору.",
  "Теги персонажа": "Назначай теги кнопкой «+» под именем в карточке.\n«Сохранить» запоминает теги, их цвета, назначения и выбранный фильтр для всех чатов. Теги не попадают в промпт.",
  "Имя": "Имя записи в библиотеке. Используется в списке, при поиске персонажа и сопоставлении с постами. Укажи привычное имя; другие варианты добавь в псевдонимы.",
  "Тип записи": "Персона — персонаж пользователя; персонаж — остальные действующие лица. Определяет раздел библиотеки. Само описание внешности остаётся в поле «Постоянная внешность».",
  "Постоянная внешность": "Постоянные признаки персонажа: идентичность, возраст взрослого персонажа, лицо, волосы, глаза, телосложение. Пиши по-английски тегами или короткими фразами. Режиссёр получает этот текст как фиксированный источник внешности; текущую одежду и действия указывай в сцене и гардеробе.",
  "Другие имена и псевдонимы": "Варианты имени, которыми персонажа называют в постах: русское и английское имя, фамилия, прозвища. Введи один вариант и нажми Enter. Каждый тег — отдельный элемент aliases. Они помогают поиску и распознаванию персонажа, а не добавляют ему новые черты.",
  "Имя для промпта": "Имя, которое режиссёр ставит после типа персонажа в его записи. Например, Kian даёт начало | boy, Kian, … при типе boy. Поле можно оставить пустым.",
  "Тип персонажа для промпта": "Укажи girl, boy, cat или other. Режиссёр использует тип в начале записи персонажа и в счётчике видимых персонажей. Например, один видимый персонаж типа boy учитывается как 1boy. Поле можно оставить пустым.",
  "Отметины на бёдрах": "Постоянные татуировки, шрамы и другие отметины на бёдрах. Короткое английское описание с указанием стороны, места и вида отметины. Учитывается, когда этот участок открыт и виден в кадре.",
  "Отметины на коленях": "Постоянные отметины на коленях. Укажи левое или правое колено и внешний вид отметины по-английски. Используется при видимых открытых коленях.",
  "Отметины на голенях": "Татуировки, шрамы и постоянные отметины на голенях. Укажи сторону и расположение по-английски. Применяется при видимой открытой коже этой области.",
  "Отметины на плечах": "Постоянные отметины на плечах. Укажи сторону, форму и расположение по-английски. Режиссёр использует описание, когда плечи открыты и видны.",
  "Отметины на предплечьях": "Постоянные отметины между локтем и запястьем. Разделяй левую и правую руку, если они различаются. Используется, когда соответствующая область открыта и видна.",
  "Особенности открытого верха тела": "Постоянные особенности открытой верхней части тела, включая грудь, живот, шрамы и индивидуальные анатомические черты. Заполняй английскими визуальными описаниями. Передаётся режиссёру для использования только в видимых открытых областях подходящей сцены.",
  "Особенности открытого низа тела": "Постоянные особенности открытой нижней части тела и индивидуальной анатомии. Пиши точные английские визуальные признаки. Используется только когда соответствующая область действительно открыта и видна в сцене.",
  "Название тега": "Короткое название группы, например Проект или Редакция. Нажми Enter или «Готово». Новый тег можно назначать нескольким персонажам; его название используется только для организации библиотеки.",
  "Поиск": "Ищет по имени, псевдонимам и ключу записи. Ограничивает только отображаемый список; выбранные теги и сами персонажи сохраняются.",
  "Импорт библиотеки JSON": "Выбери экспортированный JSON библиотеки с полями version, personas и characters. Он заменит черновик окна. Перед окончательным сохранением можно проверить записи; действующая версия сохраняется как резервная копия.",
  "Сохранить для": "Настройки общие для всех чатов и применяются при следующей подготовке картинки.",
  "Формат": "Укажи, как одежда записана в исходном посте.\nМетки: [OUTFIT:Имя]одежда[/OUTFIT].\nHTML: запись внутри <…>.\nRegex: готовое правило поиска, которое узнаёт имя и одежду.",
  "Маркер перед именем": "Скопируй текст непосредственно перед именем.\nДля [OUTFIT:Анна]синяя рубашка[/OUTFIT] это [OUTFIT:.\nСамо имя Анна сюда не вставляется.",
  "Маркер после имени": "Скопируй то, что отделяет имя от описания одежды.\nДля [OUTFIT:Анна]синяя рубашка[/OUTFIT] это ].",
  "Регулярное выражение": "Готовый код, который находит в посте имя и одежду.\nЭто не описание одежды обычными словами.\nЕсли не пишешь такие правила, используй «Найти одежду по примеру»: код будет составлен автоматически.",
  "Флаги": "Буквы, меняющие способ поиска. Это не искомый текст. Обычно можно оставить gm.\ng — искать все совпадения; m — ^ и $ работают для каждой строки; i — не различать заглавные и строчные буквы.\ns — точка . захватывает переносы строк; u — работа с символами Unicode. Пиши буквы без пробелов.",
  "Comic: максимум реплик": "Верхняя граница количества коротких реплик для Comic: от 0 до 8. Ноль отключает выбор реплик. Это максимум, а не обязательное число пузырей.",
  "Comic: слов в реплике": "Максимальная длина одной выбранной реплики Comic: от 1 до 40 слов. Короткие реплики обычно легче разместить в пузырях.",
  "Story Page: максимум реплик": "Максимальное количество выбранных реплик Story Page: от 0 до 8. Ноль отключает выбор реплик; при меньшем числе подходящих реплик используются только они.",
  "Story Page: слов в реплике": "Максимальное число слов в одной реплике Story Page: от 1 до 40. Ограничивает отбор текста для иллюстрации.",
  "Включено": "Включает это правило извлечения гардероба. Выключенное правило сохраняется в настройках, но не применяется к постам.",
  "Исходные RP-посты": "Текст постов, который получит режиссёр для текущей картинки. Можно уточнить факты или убрать лишнее. Редактирование действует на эту генерацию и не переписывает историю чата.",
  "Описание сцены": "Свободное описание текущей картинки: кто присутствует, что делает и где находится. Для ручного режима замещает собранные посты.",
  "Гардероб персонажей": "Текущая одежда и открытые участки тела: одна запись Имя_outfit: описание на строку. Пиши то, что действительно надето в сцене. Эти данные определяют, какие части внешности видны.",
  "Пожелания к композиции": "Пожелания к кадрированию, ракурсу, панелям, рамкам и размещению текста. Можно выбрать категорию и дописать своё. При смене категории её стандартный текст заменяет содержимое поля.",
  "Категория композиции": "Выбирает стандартный набор композиционных пожеланий для текущей картинки. Смена категории заменяет текст пожеланий ниже; после выбора его можно дополнить вручную.",
  "Имя или роль NPC": "Имя или понятная роль дополнительного участника, например «охранник». Используется для связи внешности NPC с его действиями в сцене.",
  "Внешность и одежда NPC": "Короткое описание двумя частями: Appearance: внешность и Clothing: одежда. Можно исправить предложенный образ. Оно передаётся как источник для этого NPC в текущей картинке.",
  "Итоговый промпт": "Готовый текст, который будет отправлен в генератор изображений после подтверждения. Можно исправить его вручную; отправляется именно содержимое этого поля.",
  "Конец одежды": "Скопируй окончание записи после одежды.\nДля [OUTFIT:Анна]синяя рубашка[/OUTFIT] это [/OUTFIT].\nЕсли отдельного окончания нет, оставь пустым: чтение идёт до следующей записи или конца блока.",
  "Начало блока": "Заполняется, только если все записи одежды обёрнуты в общий блок.\nНапример, для [WARDROBE]…[/WARDROBE] начало — [WARDROBE].\nЕсли такого блока нет, оставь это поле и поле конца пустыми.",
  "Конец блока": "Закрывающая часть общего блока одежды.\nДля [WARDROBE]…[/WARDROBE] это [/WARDROBE].\nЗаполняется вместе с началом блока. Если блока нет — пусто.",
  "Группа имени": "Указывает, какая часть готового regex содержит имя персонажа.\nНапример, для (?<name>…) введи name; для первой части в круглых скобках — 1.\nСамо имя персонажа сюда не вставляется. Помогатор может заполнить это за тебя.",
  "Группа одежды": "Указывает часть готового regex с описанием одежды.\nНапример, для (?<outfit>…) введи outfit; для второй части в скобках — 2.\nСам текст одежды сюда не вставляется.",
  "Запись персонажа": "Адрес HTML-записи с одним персонажем.\nНапример, class=\"wardrobe-entry\" → .wardrobe-entry, а id=\"outfit\" → #outfit. Такие адреса называются CSS-селекторами.\nЕсли не знаешь адрес, используй помогатор с целым примером записи.",
  "Элемент имени": "Адрес части HTML-записи, где лежит имя.\nНапример, <span class=\"name\">Анна</span> → .name.\nЕсли имя записано как data-name=\"Анна\" в самой записи, оставь это поле пустым и укажи data-name в поле атрибута.",
  "Атрибут имени": "Атрибут — значение, записанное прямо в открывающем теге.\nДля <div data-name=\"Анна\">…</div> укажи data-name.\nЕсли имя написано обычным текстом внутри элемента, оставь пустым.",
  "Элемент одежды": "Адрес части записи с описанием одежды.\nНапример, <span class=\"outfit\">рубашка</span> → .outfit.\nПустое поле использует всю запись.",
  "Атрибут одежды": "Если одежда записана прямо в открывающем теге, укажи название её атрибута.\nДля data-outfit=\"рубашка\" это data-outfit.\nЕсли одежда находится внутри элемента обычным текстом, оставь пустым.",
  "Удаляемый контейнер": "Адрес общего блока с техническими записями одежды.\nНапример, class=\"wardrobe\" → .wardrobe. После извлечения одежды этот блок не будет читаться как событие сцены.\nОбычно можно оставить пустым: удалятся найденные записи персонажей.",
  "Что удалить из постов": "Выражение для удаления собственных служебных вставок перед отправкой постов режиссёру. Оно удаляет всё совпадение; проверь, чтобы оно не захватывало нужные события и реплики.",
  "Snapshot": "Сколько последних настоящих RP-постов читать для одного снимка: от 1 до 20. Скрытые телефонные логи и технические записи не считаются постами сцены.",
  "Comic": "Сколько последних настоящих RP-постов использовать для Comic: от 1 до 20. Влияет на контекст, который получит режиссёр, а не напрямую на число панелей.",
  "Story Page": "Сколько последних настоящих RP-постов использовать для Story Page: от 1 до 20. Более длинный контекст позволяет выбрать последовательные события; число панелей задаётся отдельно режиссёром.",
  "Служебные маркеры": "Исключает распознаваемые технические маркеры, скрытые мысли и внутренние вставки. Обычные события и явно включённые в RP телефонные сообщения остаются источником сцены.",
  "HTML-комментарии": "Удаляет технические комментарии вида <!-- ... --> из текста, который получает режиссёр.",
  "Скрытые блоки": "Извлекает полезный текст из HTML и исключает скрытые блоки. Правила гардероба читают исходный HTML до этой очистки.",
  "Читать сохранённый формат одежды": "Включает ранее использованный формат извлечения одежды. Твои существующие правила сохраняются. Для другого формата добавь своё правило маркеров, regex или HTML; пример можно взять из секции «Примеры форматов».",
  "Служебные сводки": "Применяет сохранённое правило удаления служебной сводки в конце поста. Для собственной разметки добавь редактируемый фильтр: так можно точно указать, какие технические вставки исключать.",
  "Показывать промпт перед отправкой": "Промпт — готовое текстовое задание для генератора картинки.\nЕсли включено, перед отправкой откроется окно, где можно его прочитать и исправить.\nЕсли выключено, этот шаг пропускается.",
  "Реплик": "Максимум реплик для режима в этой строке: от 0 до 8. Ноль отключает выбор реплик. Это верхняя граница, а не обязательное число пузырей.",
  "Слов": "Максимальная длина одной реплики для режима в этой строке: от 1 до 40 слов. Короткий текст обычно легче разместить на странице.",
  "Цвет тега": "Цвет этого тега в полосе фильтров и карточках персонажей. Выбери любой оттенок; он сохраняется вместе с тегом и не влияет на цвета иллюстрации.",
  "Настройки: с чего начать": "Режиссёр — модель, которая составляет задание для картинки. Эти настройки определяют, что она узнает из постов.\n\n▤ Последние посты — сколько сообщений прочитать, чтобы понять сцену.\n❞ Текст на картинке — сколько коротких фраз выбрать для комикса.\n◇ Одежда — как найти в постах записи о том, что надето.\n✂ Очистка — какие служебные вставки не показывать режиссёру.\n✓ Проверка задания — можно ли отредактировать готовое описание до генерации.\n\nХочешь убрать свою служебную вставку? Открой помогатор в разделе «Что скрыть от режиссёра».\nХочешь сохранить из неё число или текст? Открой там «Исключения» и отдельный помогатор.\n\nВ конце нажми «Сохранить настройки». Сами сообщения чата не переписываются.",
  "Задача помогатора": "«Не передавать» — такие вставки будут скрыты от модели, составляющей картинку.\n«Найти имя и одежду» — найденная одежда станет частью данных о персонаже.\nЕсли нужен текст из удаляемого блока, используй отдельный помогатор исключений.",
  "Пример для помогатора": "Скопируй один фрагмент целиком, включая скобки или теги.\nНапример: ⟦SCORE:12⟧, а не просто 12.\nМожно также вставить одно готовое правило поиска из расширения regex.",
  "Название извлечённых данных": "Необязательная подпись перед найденным значением.\nПример: подпись «Шкала отношений» + найденное число 12 → «Шкала отношений: 12».\nОставь пустым, если нужна только сама найденная информация.",
  "Способ поиска": "Обычно подходит автоматическое определение.\n«Точно такой же текст» — ищет только то, что вставлено, без замены чисел.\n«Между началом и концом» — позволяет отдельно указать две окружающие метки.\n«Готовое правило поиска» — если ты копируешь сам regex, а не его результат.",
  "Готовое правило": "Код с настройками поиска. Он уже заполнен помощником.\nДля обычной работы нажми «Добавить в настройки».\nКопирование нужно лишь для ручного переноса в другое место.",
  "Попросить модель помочь, если пример не распознан": "Когда обычный разбор не справляется, пример обрабатывает текстовая модель SP Imagen.\nЕй отправляется только вставленный фрагмент, а не история чата.\nЕсли снять галочку, помощник не обращается к модели.",
  "Читать одежду из меток ⟦ОДЕЖДА:Имя⟧": "Находит записи вида ⟦ОДЕЖДА:Анна⟧синяя рубашка.\nЕсли у тебя одежда записана иначе, нажми «Найти одежду по примеру».\nСмена этой галочки не удаляет записи библиотеки.",
  "Служебные комментарии <!-- … -->": "Убирает технические заметки между <!-- и -->.\nНапример: <!-- SCORE:12 -->. Обычно читателю они не видны.\nЕсли значение внутри нужно для картинки, сохрани его через исключение.",
  "Скрытые блоки и HTML-оформление": "HTML — оформление с тегами вроде <div>текст</div>.\nЭта галочка убирает теги оформления и скрытые блоки. Обычный видимый текст внутри остаётся.\nЧтобы убрать весь конкретный блок вместе с содержимым, создай правило через помогатор.",
  "Служебная сводка в конце поста": "Убирает распознаваемую техническую сводку, добавленную в конце сообщения.\nЕсли твоя сводка оформлена иначе, дай помогатору её полный пример.",
  "Перенос настроек: инструкция": "НАСТРОИТЬ С ИИ\n1. Скопировать инструкцию.\n2. Вставить в ИИ → добавить пожелания и 2 полных поста с метками.\n3. Ответ ИИ → «Импорт настроек».\n4. «Проверить настройки» → «Загрузить в настройки» → «Сохранить настройки».\n\nПЕРЕНЕСТИ ГОТОВЫЕ НАСТРОЙКИ\n«Скачать JSON настроек» → передать файл → «Импорт настроек» → проверить → загрузить → сохранить.\n\nПосле сохранения настройки применяются ко всем чатам.\nФайл содержит только настройки генерации — без постов, библиотеки и подключений.",
  "Инструкция для копирования": "Готовое сообщение для твоего ИИ, уже с текущими настройками.\nСкопируй целиком, добавь свои пожелания и два полных поста в отмеченные места.\nЗатем верни ответ ИИ через импорт настроек.",
  "Или вставь ответ ИИ целиком": "Вставь весь JSON, полученный от ИИ: от первой { до последней }.\nНе вставляй сюда сами посты или только отдельное правило.\nНажми «Проверить настройки», чтобы увидеть сводку перед загрузкой."
};
const NESS_HELP_LABELS={
  "Текст перед именем": "Маркер перед именем",
  "Текст сразу после имени": "Маркер после имени",
  "Текст после описания одежды": "Конец одежды",
  "Общий блок: начало (если есть)": "Начало блока",
  "Общий блок: конец (если есть)": "Конец блока",
  "Готовое правило поиска": "Регулярное выражение",
  "Как искать (флаги)": "Флаги",
  "Часть правила с именем": "Группа имени",
  "Часть правила с одеждой": "Группа одежды",
  "Как найти запись персонажа": "Запись персонажа",
  "Как найти имя внутри записи": "Элемент имени",
  "Имя хранится в атрибуте": "Атрибут имени",
  "Как найти одежду внутри записи": "Элемент одежды",
  "Одежда хранится в атрибуте": "Атрибут одежды",
  "Как найти общий блок для удаления": "Удаляемый контейнер"
};
function nessFieldHelp(title){const key=String(title).replace(/^[^\p{L}\p{N}]+/u,'').trim();return NESS_FIELD_HELP[NESS_HELP_LABELS[key]||key]||'Поле сохраняется вместе с этой записью. Укажи данные по его названию; если оно необязательное, его можно оставить пустым.';}

// Module: ui_popovers
let nessOpenTip=null;
function closeNessTooltip(){if(nessOpenTip){const close=nessOpenTip;nessOpenTip=null;close();}}
function positionNessPopover(node,anchor,below=false){
 const vp=window.visualViewport,left=vp?.offsetLeft||0,top=vp?.offsetTop||0,width=vp?.width||window.innerWidth,height=vp?.height||window.innerHeight;
 const a=anchor.getBoundingClientRect(),margin=12;
 node.style.maxWidth=Math.min(node.className==='ness-tooltip'?290:360,Math.max(0,width-margin*2))+'px';node.style.maxHeight=Math.max(80,height-margin*2)+'px';
 const b=node.getBoundingClientRect();let x=Math.min(Math.max(left+margin,a.right-b.width),left+width-b.width-margin);
 let y=below?a.bottom+8:a.top-b.height-8;
 if(y<top+margin)y=a.bottom+8;if(y+b.height>top+height-margin)y=Math.max(top+margin,a.top-b.height-8);
 node.style.left=x+'px';node.style.top=y+'px';
}
function bindNessTooltip(D,anchor,text,{hover=true,onToggle=()=>{},id=''}={}){
 let popup=null,timer=null;
 function cancelHide(){if(timer!==null){clearTimeout(timer);timer=null;}}
 function hide(){cancelHide();if(!popup)return;popup.remove();popup=null;D.removeEventListener('pointerdown',outside,true);D.removeEventListener('scroll',scroll,true);onToggle(false);if(nessOpenTip===hide)nessOpenTip=null;}
 function outside(e){if(!anchor.contains(e.target)&&!popup?.contains(e.target))hide();}
 function scroll(e){if(e.target!==popup)hide();}
 function later(){cancelHide();timer=setTimeout(hide,100);}
 function show(){
  cancelHide();if(popup?.isConnected)return popup;closeNessTooltip();
  popup=D.createElement('div');popup.className='ness-tooltip';if(id)popup.id=id;popup.setAttribute('role','tooltip');popup.textContent=text.replace(/([.!?])\s+(?=[А-ЯЁ«])/gu,'$1\n');
  (D.querySelector('#sp-imagen-review-overlay')||D.body).appendChild(popup);positionNessPopover(popup,anchor);
  popup.onmouseenter=cancelHide;popup.onmouseleave=later;D.addEventListener('pointerdown',outside,true);D.addEventListener('scroll',scroll,true);nessOpenTip=hide;onToggle(true);return popup;
 }
 if(hover){anchor.onmouseenter=show;anchor.onmouseleave=later;anchor.onfocus=show;anchor.onblur=later;}
 return {show,hide,later,cancelHide,toggle(){if(popup?.isConnected)hide();else show();},get body(){return popup;}};
}

// Module: ui_header
function createNessHeader(D,panel,title,subtitle,badgeText){
 const ui=createUiKit(D),header=ui.el('header',undefined,panel,'ness-header'),copy=ui.el('div',undefined,header,'ness-header-copy');
 ui.el('h3',title,copy);
 if(subtitle)ui.el('p',subtitle,copy);
 const actions=ui.el('div',undefined,header,'ness-row');
 const badge=ui.el('span',badgeText||'',actions,'ness-badge');
 return {header,badge};
}

// Module: ui_components
// Shared visual primitives. Data and generation logic do not live in this module.
let nessHelpSequence=0;
function createUiKit(D){
 const el=(tag,text,parent,classes='')=>{const e=D.createElement(tag);if(text!==undefined)e.textContent=text;if(classes)e.className=classes;if(parent)parent.appendChild(e);return e;};
 const clear=node=>{while(node.firstChild)node.removeChild(node.firstChild);};
 const input=(value='',type='text')=>{const e=el('input',undefined,undefined,'ness-input');e.type=type;e.value=String(value??'');return e;};
 const area=value=>{const e=el('textarea',undefined,undefined,'ness-input ness-area');e.value=String(value??'');e.spellcheck=false;return e;};
 const help=(parent,title,target)=>{
  const text=nessFieldHelp(title),id='ness-field-help-'+(++nessHelpSequence);
  parent.className+=' ness-has-help';const toggle=el('button','?',parent,'ness-help-toggle');toggle.type='button';toggle.setAttribute('aria-label','Подсказка: '+title);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',id);
  const binding=bindNessTooltip(D,toggle,text,{hover:false,id,onToggle:open=>{toggle.setAttribute('aria-expanded',String(open));if(target){if(open)target.setAttribute('aria-describedby',id);else target.removeAttribute('aria-describedby');}}});
  toggle.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();binding.toggle();};toggle.onmouseenter=binding.cancelHide;toggle.onmouseleave=binding.later;
  return {toggle,get body(){return binding.body;}};
 };
 const tip=(target,text)=>bindNessTooltip(D,target,text);
 const field=(parent,title,e,helpTitle=title)=>{const label=el('label',undefined,parent,'ness-field');el('span',title,label,'ness-label');label.appendChild(e);help(label,helpTitle,e);return e;};
 const button=(title,parent,handler,variant='')=>{const classes=variant.split(/\s+/).filter(Boolean).map(v=>v.startsWith('ness-')?v:'ness-'+v).join(' ');const e=el('button',title,parent,'ness-button'+(classes?' '+classes:''));e.type='button';if(handler)e.onclick=handler;return e;};
 const choice=(options,value)=>{const e=el('select',undefined,undefined,'ness-input');for(const [key,title] of options){const o=el('option',title,e);o.value=key;}e.value=value;return e;};
 const checkbox=(parent,title,checked)=>{const label=el('label',undefined,parent,'ness-check-label'),e=input('','checkbox');e.checked=Boolean(checked);label.append(e,el('span',title));help(label,title,e);return e;};
 const section=(parent,title,open=false)=>{const e=el('details',undefined,parent,'ness-section');e.open=open;el('summary',title,e);return e;};
 const row=parent=>el('div',undefined,parent,'ness-row');
 const note=(parent,text)=>el('p',text,parent,'ness-note');
 return {el,clear,input,area,field,button,choice,checkbox,section,row,note,help,tip};
}

function createNessTabs(ui,parent,label){
 const {el,button}=ui,bar=el('div',undefined,parent,'ness-tab-strip'),tabs=[];
 bar.setAttribute('role','tablist');bar.setAttribute('aria-label',label);
 const viewport=el('div',undefined,parent,'ness-tab-viewport');
 function select(index,focus=false){
  for(const [i,{tab,content}] of tabs.entries()){
   const active=i===index;
   tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;content.hidden=!active;
  }
  if(focus)tabs[index].tab.focus();
 }
 return {add(title){
  const index=tabs.length,id='ness-tab-'+(++nessHelpSequence);
  const tab=button(title,bar,()=>select(index),'ness-tab');tab.id=id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',id+'-panel');
  const content=el('div',undefined,viewport,'ness-tab-content');content.id=id+'-panel';content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby',id);content.tabIndex=0;
  tabs.push({tab,content});
  tab.setAttribute('aria-selected',String(index===0));tab.tabIndex=index===0?0:-1;content.hidden=index!==0;
  tab.onkeydown=event=>{
   const next={ArrowLeft:(index+tabs.length-1)%tabs.length,ArrowRight:(index+1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
   if(next===undefined)return;
   event.preventDefault();select(next,true);
  };
  return content;
 }};
}


// Module: ui_child_dialog
// One lifecycle for child dialogs in Settings: focus, inert background, dismissal and cleanup.
function createNessChildDialog(D,panel,{title,marker,onClose=()=>{}}){
 if(panel.querySelector('[data-ness-child-dialog]'))throw Error('Сначала закрой открытое дополнительное окно.');
 const ui=createUiKit(D),{el,button}=ui;closeNessTooltip();const previous=D.activeElement;
 const shade=el('div',undefined,panel,'ness-child-shade');shade.setAttribute('data-ness-child-dialog','');if(marker)shade.setAttribute(marker,'');
 const box=el('div',undefined,shade,'ness-child');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',title);
 const siblings=[...panel.children].filter(e=>e!==shade).map(e=>[e,e.inert]);for(const [e]of siblings)e.inert=true;
 const head=el('div',undefined,box,'ness-child-head');el('h4',title,head);const close=button('×',head,undefined,'icon quiet');close.setAttribute('aria-label','Закрыть: '+title);
 const body=el('div',undefined,box,'ness-child-body'),actions=el('div',undefined,box,'ness-child-actions');let closed=false;
 function finish(){if(closed)return;closed=true;closeNessTooltip();D.removeEventListener('keydown',key,true);for(const [e,inert]of siblings)e.inert=inert;shade.remove();previous?.focus?.();onClose();}
 const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}else if(e.key==='Tab'){const nodes=[...box.querySelectorAll('button,input,textarea,select,summary')].filter(n=>!n.disabled&&!n.hidden&&n.getClientRects?.().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&D.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&D.activeElement===last){e.preventDefault();first.focus();}}};
 D.addEventListener('keydown',key,true);close.onclick=finish;shade.onclick=e=>{if(e.target===shade)finish();};close.focus();
 return {...ui,shade,box,body,actions,finish,get closed(){return closed;}};
}

// Module: alias_tags
function createAliasTags(D,values,onChange){
 const ui=createUiKit(D),element=ui.el('div',undefined,undefined,'ness-aliases');
 ui.el('span','Другие имена и псевдонимы',element,'ness-label');
 element.setAttribute('role','group');element.setAttribute('aria-label','Другие имена и псевдонимы');
 const chips=ui.el('div',undefined,element,'ness-alias-chips'),input=ui.input('');
 input.placeholder='Введи имя и нажми Enter';input.setAttribute('aria-label','Добавить псевдоним');input.setAttribute('enterkeyhint','done');input.setAttribute('autocomplete','off');element.appendChild(input);
 ui.help(element,'Другие имена и псевдонимы',input);
 let items=[...(values||[])];
 function render(){
  ui.clear(chips);
  items.forEach((name,index)=>{
   const chip=ui.el('span',undefined,chips,'ness-alias-chip');ui.el('span',name,chip);
   const remove=ui.button('×',chip,()=>{items.splice(index,1);render();onChange();},'icon quiet');remove.setAttribute('aria-label','Удалить псевдоним '+name);remove.title='Удалить '+name;
  });
 }
 function add(text){
  const names=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);let changed=false;
  for(const name of names)if(!items.includes(name)){items.push(name);changed=true;}
  if(changed){render();onChange();}return changed;
 }
 function commit(){const text=input.value;input.value='';return add(text);}
 input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();commit();}};
 input.oninput=()=>{if(/[\r\n]/.test(input.value))commit();else onChange();};
 input.onpaste=e=>{const text=e.clipboardData?.getData('text/plain');if(text&&/[\r\n]/.test(text)){e.preventDefault();commit();add(text);}};
 render();return {element,input,commit,get values(){return items.slice();}};
}

// Module: virtual_list
// Keep only the visible rows plus a small scroll buffer in the DOM.
function createVirtualList(D,container,renderRow,{rowHeight=56,overscan=6,emptyText='Ничего не найдено.'}={}){
 const ui=createUiKit(D),top=ui.el('div',undefined,container),rows=ui.el('div',undefined,container),bottom=ui.el('div',undefined,container);
 top.setAttribute('aria-hidden','true');bottom.setAttribute('aria-hidden','true');
 let items=[],start=-1,end=-1,frame=null,disposed=false;
 const request=typeof window.requestAnimationFrame==='function'?fn=>window.requestAnimationFrame(fn):fn=>setTimeout(fn,16);
 const getRowHeight=()=>typeof rowHeight==='function'?rowHeight():rowHeight;
 const cancel=typeof window.cancelAnimationFrame==='function'?id=>window.cancelAnimationFrame(id):id=>clearTimeout(id);
 function paint(force=false){
  if(disposed)return;
  const rowHeight=getRowHeight(),height=container.clientHeight||400,from=Math.max(0,Math.floor((container.scrollTop||0)/rowHeight)-overscan),to=Math.min(items.length,from+Math.ceil(height/rowHeight)+overscan*2);
  if(!force&&from===start&&to===end)return;start=from;end=to;
  top.style.height=(from*rowHeight)+'px';bottom.style.height=(Math.max(0,items.length-to)*rowHeight)+'px';ui.clear(rows);
  if(!items.length){ui.el('p',emptyText,rows,'ness-note');return;}
  for(let i=from;i<to;i++)rows.appendChild(renderRow(items[i]));
 }
 function refresh(){if(disposed||frame!==null)return;frame=request(()=>{frame=null;paint(true);});}
 container.onscroll=()=>{if(disposed||frame!==null)return;frame=request(()=>{frame=null;paint();});};
 const Observer=window.ResizeObserver;const observer=Observer?new Observer(refresh):null;observer?.observe(container);
 return {setItems(value,{reset=false}={}){items=value;const limit=Math.max(0,items.length*getRowHeight()-(container.clientHeight||400));container.scrollTop=reset?0:Math.min(container.scrollTop||0,limit);paint(true);},refresh,dispose(){disposed=true;if(frame!==null)cancel(frame);observer?.disconnect();container.onscroll=null;},get renderedCount(){return rows.children.length;}};
}

// Module: dialogs
function createDialogShell(kind='review'){
 const overlay=document.createElement('div');overlay.id='sp-imagen-review-overlay';
 const panel=document.createElement('div');panel.id='sp-imagen-review-panel';panel.className='ness-ui';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',({library:'Библиотека персонажей',settings:'Настройки генерации'})[kind]||'Подготовка иллюстрации');panel.setAttribute('data-dialog',kind);
 
 overlay.appendChild(panel);return {overlay,panel};
}
function mountDialog(overlay){(document.documentElement||document.body).appendChild(overlay);const stop=trackDialogViewport(overlay);return ()=>{stop();closeNessTooltip();};}
function trackDialogViewport(overlay){
const viewport=window.visualViewport;let frame=null,last='',stopped=false;
  const queueFit=()=>{if(stopped)return;if(typeof window.requestAnimationFrame!=='function'){fitViewport();return;}if(frame===null)frame=window.requestAnimationFrame(()=>{frame=null;if(!stopped)fitViewport();});};
  const fitViewport=()=>{
    const width=viewport?.width||window.innerWidth||document.documentElement.clientWidth;
    const height=viewport?.height||window.innerHeight||document.documentElement.clientHeight;
    const top=viewport?.offsetTop||0,left=viewport?.offsetLeft||0;
    if(!(width>0&&height>0))return;const signature=[width,height,top,left].join(',');if(signature===last)return;last=signature;
    for(const [key,value] of Object.entries({top:top+'px',left:left+'px',width:width+'px',height:height+'px',right:'auto',bottom:'auto'}))overlay.style.setProperty(key,value,'important');
  };
  const stopViewportTracking=()=>{
    stopped=true;if(frame!==null)window.cancelAnimationFrame?.(frame);
    window.removeEventListener('resize',queueFit);
    viewport?.removeEventListener('resize',queueFit);
    viewport?.removeEventListener('scroll',queueFit);
  };
  fitViewport();
  window.addEventListener('resize',queueFit);
  viewport?.addEventListener('resize',queueFit);
  viewport?.addEventListener('scroll',queueFit);
return stopViewportTracking;
}
async function previewFinalPrompt(config, origin) {
 const {overlay,panel}=createDialogShell('prompt');
 const ui=createUiKit(document);createNessHeader(document,panel,'Итоговый промпт','Последняя проверка перед генерацией','NAI5');
 const scroll=ui.el('div',undefined,panel);scroll.setAttribute('data-review-scroll','');
 const tools=ui.el('div',undefined,scroll,'ness-prompt-toolbar');ui.el('span','✎ Готовое задание · можно редактировать',tools);
 ui.el('span',config.aspect_ratio+' · '+config.image_size,tools,'ness-badge');const counter=ui.el('span','',tools,'ness-badge');
 const field=ui.area('');field.setAttribute('data-final-prompt','');field.setAttribute('aria-label','Итоговый промпт');ui.field(scroll,'Итоговый промпт',field);
 const actions=ui.el('footer',undefined,panel);actions.setAttribute('data-review-actions','');
 const error=ui.el('p','',actions,'ness-error');error.setAttribute('data-error','');error.style.display='none';
 const cancel=ui.button('Отмена',actions),send=ui.button('Отправить в NAI5',actions,undefined,'primary');cancel.setAttribute('data-preview-cancel','');send.setAttribute('data-preview-send','');
 field.value=config.prompt;const updateCount=()=>{counter.textContent=field.value.length.toLocaleString('ru-RU')+' / 45 000 знаков';};field.oninput=updateCount;updateCount();
 const previousFocus=document.activeElement;
 const cleanupViewport=mountDialog(overlay);
 return await new Promise(resolve=>{
  let closed=false;
  const close=result=>{
   if(closed)return;closed=true;
   document.removeEventListener('keydown',onKey,true);
   cleanupViewport();overlay.remove();previousFocus?.focus?.();resolve(result);
  };
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(false);}};
  document.addEventListener('keydown',onKey,true);
  cancel.onclick=()=>close(false);
  overlay.onclick=e=>{if(e.target===overlay)close(false);};
  send.onclick=()=>{
   if(closed)return;
   error.style.display='none';
   const now=SillyTavern.getContext();
   if(now.chat!==origin.chat||now.chatId!==origin.id||now.chat.length!==origin.count){error.textContent='Чат изменился. Отмени отправку и запусти профиль заново.';error.style.display='block';return;}
   const edited=field.value.trim();
   if(!edited||edited.length>45000){error.textContent=!edited?'Промпт не может быть пустым.':'Промпт длиннее 45 000 символов.';error.style.display='block';return;}
   config.prompt=edited;
   close(true);
  };
 });
}


// Module: library_view
function createLibraryView(D){
 const ui=createUiKit(D),{el,input,field,button,note}=ui,{overlay,panel}=createDialogShell('library');panel.setAttribute('data-view','list');
 const {badge:total}=createNessHeader(D,panel,'Библиотека','Персонажи и постоянные образы','SP Imagen');
 const tools=el('div',undefined,panel,'ness-library-tools'),filters=el('div',undefined,tools,'ness-library-filters');
 const search=field(filters,'⌕ Поиск',input('','search'));search.placeholder='Найти персонажа…';search.setAttribute('data-library-search','');search.setAttribute('aria-label','Поиск персонажей');
 const add=button('+ Персонаж',filters,undefined,'primary');
 const tagTools=el('div',undefined,tools,'ness-tag-tools'),addTag=button('+ Тег',tagTools),tagStrip=el('div',undefined,tagTools,'ness-tag-strip');tagStrip.setAttribute('data-tag-filters','');
 const editTag=button('⋯',tagTools,undefined,'icon quiet');editTag.hidden=true;editTag.setAttribute('aria-label','Изменить выбранный тег');ui.tip(editTag,'Имя, цвет и удаление выбранного тега.');
 const tagEditor=el('div',undefined,tagTools,'ness-tag-editor');tagEditor.hidden=true;
 const tagName=field(tagEditor,'Название тега',input(''));tagName.placeholder='Новый тег';tagName.setAttribute('aria-label','Название тега');
 const tagColor=field(tagEditor,'Цвет тега',input('#c4b3db','color'));tagColor.parentNode.className+=' ness-tag-color-field';
 const applyTag=button('✓ Готово',tagEditor),deleteTag=button('Удалить',tagEditor,undefined,'danger'),cancelTag=button('×',tagEditor,undefined,'icon quiet');cancelTag.setAttribute('aria-label','Закрыть редактирование тега');
 const bulk=el('div',undefined,tools,'ness-library-bulk');bulk.hidden=true;const count=note(bulk,''),bulkActions=el('div',undefined,bulk,'ness-row'),bulkTags=el('div',undefined,bulk,'ness-tag-strip');bulkTags.setAttribute('data-bulk-tags','');
 const workspace=el('div',undefined,panel,'ness-library-workspace'),listpane=el('div',undefined,workspace,'ness-library-listpane');
 const resultCount=el('p','',listpane,'ness-library-count'),list=el('div',undefined,listpane);list.setAttribute('data-library-list','');
 const form=el('div',undefined,workspace,'ness-library-editorpane');form.setAttribute('data-library-editor','');
 const actions=el('footer',undefined,panel,'ness-footer-library');actions.setAttribute('data-review-actions','');
 const footerLeft=el('div',undefined,actions,'ness-footer-left'),importButton=button('↥',footerLeft,undefined,'icon quiet'),exportButton=button('↧',footerLeft,undefined,'icon quiet');
 importButton.setAttribute('aria-label','Импорт библиотеки');exportButton.setAttribute('aria-label','Экспорт библиотеки');
 ui.tip(importButton,'Импорт библиотеки из JSON: записи, внешность, псевдонимы и теги. Файл загрузится в черновик; действующая библиотека изменится после сохранения.');
 ui.tip(exportButton,'Экспорт всей текущей библиотеки в JSON: записи, внешность, псевдонимы, теги и их цвета.');
 const upload=input('','file');upload.hidden=true;upload.accept='.json,application/json';upload.setAttribute('data-library-import','');footerLeft.appendChild(upload);importButton.onclick=()=>upload.click();
 const message=el('p','',actions,'ness-status');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const close=button(globalThis.__spImagenHubChild?'← Назад':'Закрыть',actions),save=button('✓ Сохранить',actions,undefined,'primary');save.setAttribute('data-library-save','');
 function resetEditor(){ui.clear(form);const empty=el('div',undefined,form,'ness-library-empty');el('div','✧',empty,'ness-empty-symbol');el('h4','Выбери персонажа',empty);note(empty,'Нажми на строку слева, чтобы открыть запись.');panel.setAttribute('data-view','list');}
 function showEditor(){panel.setAttribute('data-view','editor');form.scrollTop=0;}
 function selection(n){count.textContent='Выбрано: '+n;bulk.hidden=n===0;}
 function counts(all,visible){total.textContent=String(all);resultCount.textContent=visible===all?'Персонажей: '+all:'Найдено: '+visible+' из '+all;}
 resetEditor();return {...ui,overlay,panel,search,tools,tagStrip,bulk,bulkActions,bulkTags,list,form,message,add,save,close,resetEditor,showEditor,selection,counts,addTag,editTag,tagEditor,tagName,tagColor,applyTag,deleteTag,cancelTag,upload,importButton,exportButton};
}

// Module: appearance_visibility
const NESS_APPEARANCE_REGIONS={face:'Лицо',hair:'Волосы и голова',upper:'Верх тела',lower:'Низ тела',arms:'Руки и предплечья',hands:'Кисти и пальцы',legs:'Ноги и стопы'};
const NESS_APPEARANCE_VIEWS={front:'Спереди',back:'Сзади',side:'Сбоку'};
const NESS_APPEARANCE_ALWAYS='always';
const NESS_UPPER_REGIONS=['hair','upper','arms','hands'];
const NESS_APPEARANCE_PRESETS={
 face:{label:'Только лицо',view:'front',regions:['face']},
 head:{label:'Голова целиком',view:'front',regions:['face','hair']},
 upper_front:{label:'Верх тела спереди',view:'front',regions:['face',...NESS_UPPER_REGIONS]},
 upper_back:{label:'Верх тела сзади',view:'back',regions:NESS_UPPER_REGIONS},
 full_front:{label:'Полный рост спереди',view:'front',regions:['face',...NESS_UPPER_REGIONS,'lower','legs']},
 full_back:{label:'Полный рост сзади',view:'back',regions:[...NESS_UPPER_REGIONS,'lower','legs']},
 arms:{label:'Только руки',view:'front',regions:['arms','hands']},
 legs:{label:'Только ноги',view:'front',regions:['legs']}
};
const NESS_APPEARANCE_RULES={
 priority:['Общий выбор','Если персонаж показан в нескольких панелях, выбирай самый широкий ракурс, в котором его фигура действительно различима. Крупный план детали не заменяет более широкий кадр. При равном охвате бери ракурс из главной панели персонажа.'],
 face:['Только лицо','В кадре только черты лица. Волосы и форма головы не читаются целиком.'],
 head:['Голова целиком','Читается голова с волосами или её силуэтом. Корпус за пределами кадра.'],
 upper_front:['Верх тела спереди','Виден корпус примерно по пояс спереди или в три четверти спереди. Ноги за пределами кадра.'],
 upper_back:['Верх тела сзади','Виден верх тела со спины. Нижняя часть тела за пределами кадра.'],
 full_front:['Полный рост спереди','Видна фигура от головы до ног спереди или в три четверти спереди.'],
 full_back:['Полный рост сзади','Видна фигура от головы до ног со спины.'],
 arms:['Только руки','Крупный план руки, предплечья или кисти без головы и корпуса.'],
 legs:['Только ноги','Крупный план ноги или стопы без головы и корпуса.'],
 none:['Без деталей ракурса','Персонаж присутствует, но его внешность не читается, например виден только силуэт за препятствием.']
};

function normalizeAppearanceRules(rules){
 return Object.fromEntries(Object.keys(NESS_APPEARANCE_RULES).flatMap(id=>{
  const text=typeof rules?.[id]==='string'?rules[id].trim().slice(0,1200):'';
  return text&&text!==NESS_APPEARANCE_RULES[id][1]?[[id,text]]:[];
 }));
}

function normalizeAppearanceRanges(base,ranges,allowUnclassified=false){
 if(!Array.isArray(ranges))return [];
 const valid=ranges.filter(r=>r&&Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start>=0&&r.end>r.start&&r.end<=base.length&&typeof r.text==='string'&&r.text.trim()&&base.slice(r.start,r.end)===r.text&&((allowUnclassified&&r.region==null)||(Object.hasOwn(NESS_APPEARANCE_REGIONS,r.region)&&(r.view==='any'||Object.hasOwn(NESS_APPEARANCE_VIEWS,r.view))))).sort((a,b)=>a.start-b.start);
 const result=[];
 for(const {start,end,text,region,view} of valid){
  if(start<(result.at(-1)?.end??0))continue;
  result.push(region==null?{start,end,text}:{start,end,text,region,view});
 }
 return result;
}

function normalizeAppearanceSelections(base,selections){
 if(!selections||typeof selections!=='object')return {};
 const result=Object.fromEntries(Object.entries(selections).filter(([id,ranges])=>(id===NESS_APPEARANCE_ALWAYS||Object.hasOwn(NESS_APPEARANCE_PRESETS,id))&&Array.isArray(ranges)).map(([id,ranges])=>[id,normalizeAppearanceRanges(base,ranges,true)]));
 if(Array.isArray(selections.upper_no_face)){
  const rear=result.upper_back||[];
  const legacy=normalizeAppearanceRanges(base,selections.upper_no_face,true).filter(r=>isRearUpperAppearanceRange(r)&&!rear.some(s=>s.start<r.end&&r.start<s.end));
  result.upper_back=normalizeAppearanceRanges(base,[...rear,...legacy],true);
 }
 return result;
}

function isRearUpperAppearanceRange(range){
 return (!range.region||NESS_UPPER_REGIONS.includes(range.region))&&(!range.view||range.view==='any'||range.view==='back');
}

function visibleAppearanceRanges(ranges,id,selections={},includeAlways=false){
 const preset=NESS_APPEARANCE_PRESETS[id];
 const selected=selections[id]??(preset?ranges.filter(r=>preset.regions.includes(r.region)&&(r.view==='any'||r.view===preset.view)):[]);
 const visible=[...selected];
 if(includeAlways&&id!==NESS_APPEARANCE_ALWAYS)visible.push(...(selections[NESS_APPEARANCE_ALWAYS]||[]));
 visible.sort((a,b)=>a.start-b.start||b.end-a.end);
 const result=[],seen=new Set();
 for(const r of visible){
  const previous=result.at(-1);
  if(previous&&r.start<previous.end){
   if(r.end>previous.end){previous.text+=r.text.slice(previous.end-r.start);previous.end=r.end;}
   continue;
  }
  const key=r.text.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  if(seen.has(key))continue;
  seen.add(key);result.push({...r});
 }
 return result;
}

function appearanceVisibilityInstruction(records,rules={}){
 if(!records.size)return '';
 const descriptions=Object.entries(NESS_APPEARANCE_RULES).map(([id,[,text]])=>id+': '+(rules[id]||text)).join('\n');
 return `\n\nFRAMING OVERRIDE FOR MARKED LIBRARY CHARACTERS\nFor each marked character shown, choose exactly ONE preset for their whole entry, even across multiple panels. Put exactly one literal marker in their own entry where fixed base appearance belongs. Use the supplied character ID. Example: [[NESS_VIS:id:upper_back]]. Use one preset ID only, with no combined views or suffixes. Do not write fixed base appearance yourself. Keep their usual identity, pose, clothing and scene details. The library inserts the chosen preset and always-insert tags once, in library order. If no appearance detail is visible, use [[NESS_VIS:id:none]]. Never include markers for absent characters. These markers override any placeholder ban. The following editable rules guide the single choice within this format:\n${descriptions}`;
}

function insertVisibleAppearance(prompt,records){
 const seen=new Set();
 const result=prompt.replace(/([ \t]*,[ \t]*)?\[\[NESS_VIS:([a-z][a-z0-9_]*):([^\]\r\n]+)\]\]([ \t]*[,;])?/g,(_,before,id,spec,after)=>{
  if(!records.has(id)||seen.has(id))throw Error('Некорректная метка ракурса для «'+id+'». Запусти режиссёра заново.');
  seen.add(id);
  if(spec!=='none'&&!Object.hasOwn(NESS_APPEARANCE_PRESETS,spec))throw Error('Режиссёр должен выбрать один ракурс для «'+id+'». Запусти генерацию заново.');
  const record=records.get(id),{ranges,selections}=record;
  const tags=visibleAppearanceRanges(ranges,spec,selections,true).map(r=>r.text.trimEnd().replace(/[,;]+$/,'')).filter(Boolean);
  const exposure=reviewedWardrobeExposure(record.outfit);
  const regions=NESS_APPEARANCE_PRESETS[spec]?.regions||[];
  if(exposure.upper&&regions.some(region=>NESS_UPPER_REGIONS.includes(region))&&record.nudeUpper)tags.push(record.nudeUpper.replace(/\s+/g,' ').replace(/[,;]+$/,''));
  if(exposure.lower&&regions.some(region=>region==='lower'||region==='legs')&&record.nudeLower)tags.push(record.nudeLower.replace(/\s+/g,' ').replace(/[,;]+$/,''));
  return tags.length?(before||'')+tags.join(', ')+';':after||'';
 });
 if(result.includes('[[NESS_VIS:'))throw Error('Режиссёр вернул незавершённую метку ракурса. Запусти генерацию заново.');
 return result;
}

// Module: library_store
const MASTER_LIBRARY_KEY='sp_ness_master_library_v1';
const MASTER_SNAPSHOT_KEY='sp_ness_master_library_snapshot_text';
const MASTER_BACKUP_KEY='sp_ness_master_library_previous_v1';
const cloneLibrary=value=>JSON.parse(JSON.stringify(value));
const safeLibraryId=id=>/^[a-z][a-z0-9_]*$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
function libraryEntries(data){
 return [...Object.entries(data.personas).map(([id,entry])=>({id,group:'personas',entry})),...Object.entries(data.characters).map(([id,entry])=>({id,group:'characters',entry}))];
}
function validateMasterLibrary(input,{copy=true}={}){
 if(!input||input.version!==1||!input.personas||!input.characters||Array.isArray(input.personas)||Array.isArray(input.characters)||typeof input.personas!=='object'||typeof input.characters!=='object')throw Error('Неверный формат библиотеки: нужны version: 1, personas и characters.');
 const data=copy?cloneLibrary(input):input,ids=new Set();
 if(Object.hasOwn(data,'appearanceRules')){
  const rules=normalizeAppearanceRules(data.appearanceRules);
  if(Object.keys(rules).length)data.appearanceRules=rules;else delete data.appearanceRules;
 }
 for(const {id,entry} of libraryEntries(data)){
  if(!safeLibraryId(id)||ids.has(id))throw Error('Некорректный или повторяющийся ключ персонажа: '+id);
  ids.add(id);
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||typeof entry.name!=='string'||!entry.name.trim()||typeof entry.base!=='string'||!entry.base.trim())throw Error('Заполни имя и постоянную внешность: '+id);
  if(entry.aliases!==undefined&&(!Array.isArray(entry.aliases)||entry.aliases.some(a=>typeof a!=='string')))throw Error('Неверный список имён персонажа: '+id);
  if(Object.hasOwn(entry,'appearanceRanges')){
   const ranges=normalizeAppearanceRanges(entry.base,entry.appearanceRanges);
   if(ranges.length)entry.appearanceRanges=ranges;else delete entry.appearanceRanges;
  }
  if(Object.hasOwn(entry,'appearanceSelections'))entry.appearanceSelections=normalizeAppearanceSelections(entry.base,entry.appearanceSelections);
 }
 const source=data.organizer||{},tags=[],tagIds=new Set(),names=new Map(),remap=new Map();
 const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/ё/g,'е').trim();
 const legacy=Array.isArray(source.folders)?source.folders:[];
 for(const tag of [...(Array.isArray(source.tags)?source.tags:[]),...legacy]){
  if(!tag||!safeLibraryId(tag.id)||typeof tag.name!=='string'||!tag.name.trim())throw Error('Некорректный тег библиотеки.');
  const key=normalize(tag.name),existing=names.get(key);
  if(existing){remap.set(tag.id,existing);continue;}
  if(tagIds.has(tag.id))throw Error('Повторяющийся ключ тега: '+tag.id);
  tagIds.add(tag.id);names.set(key,tag.id);remap.set(tag.id,tag.id);tags.push({id:tag.id,name:tag.name.trim(),color:/^#[a-f0-9]{6}$/i.test(tag.color||'')?tag.color:'#c4b3db'});
 }
 const characters={};
 for(const id of ids){
  const item=source.characters?.[id]||{};
  const assigned=[...new Set([...(Array.isArray(item.tagIds)?item.tagIds:[]),...(item.folderId?[item.folderId]:[])].map(t=>remap.get(t)).filter(t=>tagIds.has(t)))];
  if(assigned.length)characters[id]={tagIds:assigned};
 }
 const filterTagId=source.filterTagId===''?'':remap.get(source.filterTagId)??'*';
 data.organizer={version:3,tags,characters,filterTagId};
 return data;
}
function masterLibraryRaw(){return SillyTavern.getContext()?.extensionSettings?.variables?.global?.[MASTER_LIBRARY_KEY]??'';}
function loadMasterLibrary(){
 const raw=masterLibraryRaw();
 if(!raw)return validateMasterLibrary({version:1,personas:{},characters:{}});
 try{return typeof raw==='string'?validateMasterLibrary(JSON.parse(raw),{copy:false}):validateMasterLibrary(raw);}catch(e){throw Error('Не удалось прочитать библиотеку: '+String(e?.message||e));}
}

// Module: library_publish
function librarySnapshot(data){
 return 'PERSONAL CHARACTER IDENTITY LIBRARY — fixed appearance data; use only people visible in the scene. Copy retained descriptions verbatim. Optional marks and anatomy apply only when uncovered and visible.\n'+JSON.stringify(libraryEntries(data).map(({id,group,entry:{appearanceRanges,appearanceSelections,...entry}})=>({id,type:group==='personas'?'persona':'character',...entry})),null,1);
}
async function saveMasterLibrary(input,expectedRaw){
 const st=SillyTavern.getContext();
 if(!st?.extensionSettings||typeof st.saveSettingsDebounced!=='function')throw Error('Недоступно сохранение общих настроек SillyTavern.');
 if(masterLibraryRaw()!==expectedRaw)throw Error('Библиотека уже изменилась в другом окне. Закрой редактор и открой заново, чтобы не затереть изменения.');
 const data=validateMasterLibrary(input);
 data.savedAt=new Date().toISOString();data.catalogRevision=(Number(data.catalogRevision)||0)+1;
 // The retired attribute-ID catalogue is not consumed by these profiles.
 delete data.attributeCatalog;
 st.extensionSettings.variables||={};const global=st.extensionSettings.variables.global||={};
 const keys=[MASTER_LIBRARY_KEY,MASTER_SNAPSHOT_KEY,MASTER_BACKUP_KEY],previous=new Map(keys.map(k=>[k,global[k]]));
 const serialized=JSON.stringify(data);
 if(expectedRaw)global[MASTER_BACKUP_KEY]=typeof expectedRaw==='string'?expectedRaw:JSON.stringify(expectedRaw);
 global[MASTER_LIBRARY_KEY]=serialized;global[MASTER_SNAPSHOT_KEY]=librarySnapshot(data);
 try{await st.saveSettingsDebounced();}
 catch(e){if(global[MASTER_LIBRARY_KEY]===serialized)for(const [k,v] of previous){if(v===undefined)delete global[k];else global[k]=v;}throw e;}
 return {data,raw:serialized};
}
function newLibraryId(prefix,existing){
 let id;do{id=prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}while(existing.has(id));return id;
}

// Module: appearance_visibility_editor
function createAppearanceVisibilityEditor(ui,form,area,initial,changed,tagColor,save,canEdit){
 const {el,clear,button,input}=ui;
 const wrap=el('div',undefined,undefined,'ness-appearance-wrap');
 if(tagColor)wrap.style.setProperty('--ness-appearance-color',tagColor);
 area.parentNode.insertBefore(wrap,area);
 const fragments=el('div',undefined,wrap,'ness-appearance-fragments');
 fragments.setAttribute('aria-label','Фразы внешности для выбранного ракурса');
 wrap.appendChild(area);area.hidden=true;
 const tagInput=input();tagInput.className+=' ness-appearance-tag-input';wrap.appendChild(tagInput);
 tagInput.placeholder='Новый тег → Enter';tagInput.setAttribute('aria-label','Тег внешности');
 const moves=el('div',undefined,wrap,'ness-appearance-moves');
 const moveEarlier=button('← Раньше',moves,()=>moveEditedTag(-1),'quiet');
 const moveLater=button('Позже →',moves,()=>moveEditedTag(1),'quiet');
 const pencil=button('✎',wrap,undefined,'icon quiet ness-appearance-pencil');
 pencil.setAttribute('aria-label','Разметить видимую внешность');
 pencil.setAttribute('aria-pressed','false');
 const box=el('div',undefined,form,'ness-appearance-tools');
 const editHelp='Enter добавляет тег. Для перестановки потяни за ⠿ или нажми на тег и выбери «Раньше» или «Позже».';
 const message=el('p',editHelp,box,'ness-note');
 message.setAttribute('aria-live','polite');
 const presets=el('div',undefined,box,'ness-appearance-presets');
 presets.setAttribute('role','group');presets.setAttribute('aria-label','Ракурсы внешности');
 const presetButtons=new Map();
 const copyToggle=button('Добавить из ракурса',box,()=>{
  if(!editing||transitioning||!canEdit())return;
  if(copyPanel.hidden)openCopyPanel();else closeCopyPanel();
 },'quiet');
 copyToggle.hidden=true;copyToggle.setAttribute('aria-expanded','false');
 const copyPanel=el('div',undefined,box,'ness-appearance-copy');copyPanel.hidden=true;
 let base=area.value;
 let ranges=normalizeAppearanceRanges(base,initial.appearanceRanges);
 let selections=normalizeAppearanceSelections(base,initial.appearanceSelections);
 let activePreset='face',editing=false,pending=false,transitioning=false,editingTag=null,draggedStart=null;

 const labels=new Map([[NESS_APPEARANCE_ALWAYS,'Вставлять всегда'],...Object.entries(NESS_APPEARANCE_PRESETS).map(([id,preset])=>[id,preset.label])]);
 for(const [id,label] of labels){
  const chip=button(undefined,presets,()=>changePreset(id),'ness-appearance-preset');
  chip.setAttribute('data-appearance-preset',id);
  el('span',label,chip);
  const dot=el('span',undefined,chip,'ness-appearance-filled');dot.setAttribute('aria-hidden','true');
  presetButtons.set(id,{chip,dot});
 }
 function selected(id){return visibleAppearanceRanges(ranges,id,selections);}
 function closeCopyPanel(){
  copyPanel.hidden=true;clear(copyPanel);copyToggle.setAttribute('aria-expanded','false');
 }
 function openCopyPanel(){
  const sources=[];
  const choices=el('div',undefined,copyPanel,'ness-row');
  for(const [id,label] of labels){
   if(id===activePreset||!selected(id).length)continue;
   const option=el('label',undefined,choices,'ness-check-label');
   const checkbox=input('','checkbox');option.appendChild(checkbox);el('span',label,option);
   sources.push({id,checkbox});
  }
  copyPanel.hidden=false;copyToggle.setAttribute('aria-expanded','true');
  if(!sources.length){el('p','В других разделах пока нет отметок.',copyPanel,'ness-note');return;}
  button('Добавить отмеченные',copyPanel,()=>{
   if(!editing||transitioning||!canEdit())return;
   const ids=sources.filter(({checkbox})=>checkbox.checked).map(({id})=>id);
   if(!ids.length){message.textContent='Выбери хотя бы один раздел.';return;}
   const current=selected(activePreset);
   const combined=visibleAppearanceRanges([],activePreset,{[activePreset]:[...current,...ids.flatMap(selected)]});
   closeCopyPanel();
   if(JSON.stringify(combined)===JSON.stringify(current)){
    message.textContent='Эти отметки уже есть в текущем разделе.';return;
   }
   selections[activePreset]=normalizeAppearanceRanges(base,combined,true);
   pending=true;changed();updatePresets();drawFragments();
   message.textContent='Отметки добавлены к текущему разделу.';
  },'primary');
 }
 function updatePresets(){
  for(const [id,{chip,dot}] of presetButtons){
   const filled=selected(id).length>0;
   dot.hidden=!filled;
   chip.setAttribute('aria-pressed',String(id===activePreset));
   chip.setAttribute('aria-label',labels.get(id)+(filled?', есть разметка':''));
  }
 }
 function clauses(){
  const items=[];
  for(const match of base.matchAll(/[^,]+/g)){
   let text=match[0].trim();
   if(match.index+match[0].length===base.length)text=text.replace(/;+$/,'').trimEnd();
   if(!text)continue;
   const start=match.index+match[0].indexOf(text);
   items.push({start,end:start+text.length,text});
  }
  return items;
 }
 function drawFragments(focusStart){
  const scroll=fragments.scrollTop,visible=editing?selected(activePreset):[];
  clear(fragments);
  const items=clauses();
  for(const [index,fragment] of items.entries()){
   const {start,end,text}=fragment;
   const marked=visible.some(r=>r.start<end&&start<r.end);
   const chip=el('span',undefined,fragments,'ness-appearance-chip');
   chip.setAttribute('data-selected',String(marked));
   const part=button(text,chip,e=>{
    e?.preventDefault();if(!canEdit())return;
    if(editing)toggleFragment(fragment,e?.detail===0);
    else{editingTag=fragment;tagInput.value=text;updateMoves();tagInput.focus();tagInput.select?.();}
   },'quiet ness-appearance-fragment');
   if(editing)part.setAttribute('aria-pressed',String(marked));
   else{
    if(items.length>1){
     const handle=el('span','⠿',undefined,'ness-appearance-drag');
     handle.draggable=true;handle.title='Перетащить тег';handle.setAttribute('aria-hidden','true');chip.insertBefore(handle,part);
     handle.ondragstart=event=>{
      if(!canEdit()||editing){event.preventDefault();return;}
      draggedStart=start;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-ness-tag','move');
     };
     handle.ondragend=()=>{draggedStart=null;};
     chip.ondragover=event=>{
      if(draggedStart===null||draggedStart===start||!canEdit()||editing)return;
      event.preventDefault();event.dataTransfer.dropEffect='move';
     };
     chip.ondrop=event=>{
      if(draggedStart===null||!canEdit()||editing)return;
      event.preventDefault();const from=draggedStart;draggedStart=null;reorderTags(from,index);
     };
    }
    const remove=button('×',chip,e=>{e?.preventDefault();if(canEdit())removeTag(items,index);},'quiet ness-appearance-remove');
    remove.setAttribute('aria-label','Удалить тег '+text);
   }
   if(start===focusStart)part.focus();
  }
  fragments.scrollTop=scroll;
  updateMoves();
 }
 function updateMoves(){
  const items=clauses(),index=items.findIndex(item=>item.start===editingTag?.start);
  moves.hidden=editing||index<0||items.length<2;
  moveEarlier.disabled=index<=0;moveLater.disabled=index<0||index===items.length-1;
 }
 function moveEditedTag(direction){
  if(!editingTag)return;
  const index=clauses().findIndex(item=>item.start===editingTag.start);
  if(index>=0)reorderTags(editingTag.start,index+direction);
 }
 function reorderTags(fromStart,to){
  if(editing||transitioning||!canEdit())return;
  const items=clauses(),from=items.findIndex(item=>item.start===fromStart);
  if(from<0||from===to||to<0||to>=items.length)return;
  const original=items.slice(),[moved]=items.splice(from,1);items.splice(to,0,moved);
  const positions=new Map();let cursor=0;
  const next=items.map((item,index)=>{
   const text=index===items.length-1?item.text.replace(/;+$/,'').trimEnd():item.text;
   positions.set(item.start,{start:cursor,end:cursor+text.length,text});
   cursor+=text.length+2;return text;
  }).join(', ')+';';
  function remap(marked,allowUnclassified){
   const pieces=[];
   for(const range of marked)for(const item of original){
    const start=Math.max(range.start,item.start),end=Math.min(range.end,item.end);
    if(start>=end)continue;
    const destination=positions.get(item.start);
    const mappedStart=destination.start+start-item.start;
    const mappedEnd=Math.min(destination.end,destination.start+end-item.start);
    if(mappedStart<mappedEnd)pieces.push({...range,start:mappedStart,end:mappedEnd,text:next.slice(mappedStart,mappedEnd)});
   }
   return normalizeAppearanceRanges(next,pieces,allowUnclassified);
  }
  ranges=remap(ranges,false);
  selections=Object.fromEntries(Object.entries(selections).map(([id,marked])=>[id,remap(marked,true)]));
  if(editingTag)editingTag=positions.get(editingTag.start)||null;
  area.value=base=next;changed();updatePresets();drawFragments();
 }
 function writeTags(next){
  area.value=next.trim()?next.trimEnd().replace(/[;,\s]+$/,'')+';':'';
  sync();changed();drawFragments();
 }
 function removeTag(items,index){
  const item=items[index],next=items[index+1],previous=items[index-1];
  const start=next?item.start:(previous?.end??0),end=next?next.start:base.length;
  editingTag=null;tagInput.value='';writeTags(base.slice(0,start)+base.slice(end));
 }
 tagInput.onkeydown=e=>{
  if(e.key==='Escape'&&editingTag){e.preventDefault();e.stopPropagation();editingTag=null;tagInput.value='';updateMoves();return;}
  if(e.key!=='Enter'||e.isComposing)return;
  e.preventDefault();if(!canEdit()||editing)return;
  const text=tagInput.value.split(',').map(part=>part.trim().replace(/;+$/,'').trimEnd()).filter(Boolean).join(', ');
  if(!text)return;
  const target=editingTag;editingTag=null;tagInput.value='';
  writeTags(target?base.slice(0,target.start)+text+base.slice(target.end):[base.trimEnd().replace(/[;,\s]+$/,''),text].filter(Boolean).join(', '));
 };
 function toggleFragment(fragment,keyboard=false){
  if(!editing||transitioning||!canEdit())return;
  const current=selections[activePreset]||selected(activePreset);
  const overlap=r=>r.start<fragment.end&&fragment.start<r.end;
  const isMarked=current.some(overlap);
  const currentRanges=current.flatMap(r=>{
   if(!isMarked||!overlap(r))return [r];
   const pieces=[];
   if(r.start<fragment.start)pieces.push({...r,end:fragment.start,text:base.slice(r.start,fragment.start)});
   if(r.end>fragment.end)pieces.push({...r,start:fragment.end,text:base.slice(fragment.end,r.end)});
   return pieces;
  });
  if(!isMarked){
   const known=ranges.find(r=>r.start===fragment.start&&r.end===fragment.end);
   currentRanges.push(known||fragment);
  }
  const previous=selections[activePreset];
  selections[activePreset]=normalizeAppearanceRanges(base,currentRanges,true);
  if(!isMarked&&!selected(activePreset).some(overlap)){
   if(previous)selections[activePreset]=previous;else delete selections[activePreset];
   message.textContent='Такая фраза уже отмечена для этого ракурса.';
   return;
  }
  pending=true;changed();updatePresets();drawFragments(keyboard?fragment.start:undefined);
 }
 async function savePending(){
  if(!pending)return true;
  transitioning=true;
  try{if(!await save())return false;pending=false;return true;}
  finally{transitioning=false;}
 }
 async function changePreset(id){
  if(id===activePreset||transitioning||!canEdit())return;
  if(editing&&!await savePending())return;
  closeCopyPanel();
  activePreset=id;updatePresets();drawFragments();
  if(editing)updateMarkingHelp();
 }
 function updateMarkingHelp(){
  message.textContent=activePreset===NESS_APPEARANCE_ALWAYS
   ?'Отметь теги, которые нужны в любом ракурсе. Они появятся один раз, в порядке основного списка.'
   :'Нажимай на теги, чтобы отметить их для ракурса. В промпт они попадут в порядке списка. Смена ракурса и выход сохраняют разметку.';
 }
 pencil.onclick=async e=>{
  e?.preventDefault();
  if(transitioning||!canEdit())return;
  if(editing&&!await savePending())return;
  editing=!editing;
  closeCopyPanel();copyToggle.hidden=!editing;
  wrap.setAttribute('data-marking',String(editing));box.setAttribute('data-marking',String(editing));pencil.setAttribute('aria-pressed',String(editing));
  pencil.setAttribute('aria-label',editing?'Закончить разметку и сохранить':'Разметить видимую внешность');
  tagInput.hidden=editing;
  if(editing){
   sync();
   updateMarkingHelp();
  }else{
   message.textContent=editHelp;
  }
  drawFragments();
 };
 function sync(){
  const next=area.value;if(next===base)return;
  let prefix=0,suffix=0;
  while(prefix<Math.min(next.length,base.length)&&next[prefix]===base[prefix])prefix++;
  while(suffix<Math.min(next.length,base.length)-prefix&&next.at(-suffix-1)===base.at(-suffix-1))suffix++;
  const delta=next.length-base.length;
  const move=(items,unclassified)=>normalizeAppearanceRanges(next,items.flatMap(r=>{
   if(r.end<=prefix)return [r];
   if(r.start>=base.length-suffix)return [{...r,start:r.start+delta,end:r.end+delta}];
   return [];
  }),unclassified);
  const previousCount=ranges.length+Object.values(selections).flat().length;
  ranges=move(ranges,false);
  selections=Object.fromEntries(Object.entries(selections).map(([id,items])=>[id,move(items,true)]));
  if(ranges.length+Object.values(selections).flat().length<previousCount)message.textContent='Метки изменённых фраз сняты. При необходимости отметь их заново.';
  base=next;updatePresets();
 }
 area.oninput=()=>{sync();changed();drawFragments();};
 updatePresets();drawFragments();
 return {get value(){sync();return {ranges,selections};}};
}

function defaultNessTagColor(){
 const raw=typeof getComputedStyle==='function'
  ? getComputedStyle(document.documentElement).getPropertyValue('--SmartThemeQuoteColor').trim()
  : '';
 if(/^#[0-9a-f]{6}$/i.test(raw))return raw;
 if(/^#[0-9a-f]{3}$/i.test(raw))return '#'+[...raw.slice(1)].map(v=>v+v).join('');
 return '#c4b3db';
}

// Module: library_editor
async function openLibraryEditor(){
 if(typeof document==='undefined')throw Error('Редактор доступен только внутри SillyTavern.');
 if(document.querySelector('#sp-imagen-review-overlay'))throw Error('Сначала закрой уже открытое окно.');
 let baseline=masterLibraryRaw(),draft=loadMasterLibrary(),dirty=false,busy=false,done=false,editor=null,discardAsked=false,editingTag=null,closeTagPicker=()=>{};
 // Opening the editor must never silently mutate a saved library.
 const selected=new Set();
 const view=createLibraryView(document);
 const {overlay,panel,el,clear,input,area,field,button,choice,section,search,bulkActions,list,form,message,save,close}=view;
 const labels={name:'Имя',base:'Постоянная внешность',promptName:'Имя для промпта',subject:'Тип персонажа для промпта',thighMarks:'Отметины на бёдрах',kneeMarks:'Отметины на коленях',shinMarks:'Отметины на голенях',shoulderMarks:'Отметины на плечах',forearmMarks:'Отметины на предплечьях',nudeUpper:'Особенности открытого верха тела',nudeLower:'Особенности открытого низа тела'};
 const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').trim();
 const status=text=>{if(message.textContent!==text)message.textContent=text;};
 let revision=0,indexedRevision=-1,searchIndex=[];
 const changed=(indexChanged=false)=>{if(indexChanged===true)revision++;dirty=true;discardAsked=false;status('Не сохранено');};
 const setBusy=value=>{busy=value;for(const tag of ['input','textarea','select','button'])for(const e of panel.querySelectorAll(tag))e.disabled=value;};
 function flushEditor(){
  if(!editor)return;
  const {id,group,fields,aliases,kind,tagIds,visibility}=editor,entry=cloneLibrary(draft[group][id]);
  for(const [key,e] of Object.entries(fields))if(e.value!==''||Object.hasOwn(entry,key))entry[key]=e.value;
  const {ranges,selections}=visibility.value;
  if(ranges.length)entry.appearanceRanges=ranges;else delete entry.appearanceRanges;
  if(Object.keys(selections).length)entry.appearanceSelections=selections;else delete entry.appearanceSelections;
  aliases.commit();const names=aliases.values;
  if(JSON.stringify(names)!==JSON.stringify(entry.aliases||[]))entry.aliases=[...new Set(names)];
  if(!entry.name.trim()||!entry.base.trim())throw Error('У персонажа должны быть имя и постоянная внешность.');
  const old=draft.organizer.characters[id],retained=[...tagIds].filter(t=>draft.organizer.tags.some(tag=>tag.id===t)),meta=retained.length?{tagIds:retained}:undefined;
  if(meta)draft.organizer.characters[id]=meta;else delete draft.organizer.characters[id];
  if(kind.value!==group){delete draft[group][id];draft[kind.value][id]=entry;editor.group=kind.value;}else draft[group][id]=entry;
  if(JSON.stringify(entry)!==JSON.stringify(editor.original)||JSON.stringify(old)!==JSON.stringify(meta)||kind.value!==group)changed(entry.name!==editor.original.name||JSON.stringify(entry.aliases)!==JSON.stringify(editor.original.aliases)||kind.value!==group);
  editor.original=cloneLibrary(entry);
 }
 function tryFlush(){try{flushEditor();return true;}catch(e){status(e.message);return false;}}
 let rulesDialog=null;
 button('Правила ракурсов',view.addTag.parentNode,()=>{
  if(busy||done||rulesDialog||!tryFlush())return;
  closeTagPicker();
  const dialog=createNessChildDialog(document,panel,{title:'Правила ракурсов',marker:'data-appearance-rules',onClose:()=>{rulesDialog=null;}});
  rulesDialog=dialog;
  el('p','Режиссёр выбирает один ракурс на персонажа. Опиши, когда выбирать каждый вариант. «Вставлять всегда» применяется отдельно.',dialog.body,'ness-note');
  const inputs={};
  for(const [id,[label,standard]] of Object.entries(NESS_APPEARANCE_RULES)){
   const row=el('div',undefined,dialog.body,'ness-appearance-rule');
   const control=field(row,label,area(draft.appearanceRules?.[id]||standard));
   control.maxLength=1200;control.setAttribute('data-appearance-rule',id);inputs[id]=control;
   button('Вернуть стандартное',row,()=>{control.value=standard;},'quiet');
  }
  button('Отмена',dialog.actions,dialog.finish);
  button('Применить',dialog.actions,()=>{
   const rules=normalizeAppearanceRules(Object.fromEntries(Object.entries(inputs).map(([id,control])=>[id,control.value])));
   if(JSON.stringify(rules)!==JSON.stringify(draft.appearanceRules||{})){
    if(Object.keys(rules).length)draft.appearanceRules=rules;else delete draft.appearanceRules;
    changed();status('Правила изменены. Нажми «Сохранить».');
   }
   dialog.finish();
  },'primary');
 },'quiet');
 function renderTags(){
  view.tagStrip.hidden=!view.tagEditor.hidden;
  clear(view.tagStrip);
  const selectedTag=draft.organizer.filterTagId;
  const addFilter=(id,name,color)=>{const chip=el('button',name,view.tagStrip,'ness-tag-filter');chip.type='button';chip.setAttribute('data-tag-filter',id);chip.setAttribute('aria-pressed',String(selectedTag===id));if(color){chip.setAttribute('data-colored','');chip.style.setProperty('--ness-tag-color',color);}chip.onclick=()=>{if(busy||draft.organizer.filterTagId===id)return;draft.organizer.filterTagId=id;changed();renderTags();searchNow();};};
  addFilter('*','Все');addFilter('','Без тегов');for(const tag of draft.organizer.tags)addFilter(tag.id,tag.name,tag.color);
  view.editTag.hidden=!view.tagEditor.hidden||!draft.organizer.tags.some(t=>t.id===selectedTag);
 }
 function renderBulkTags(){
  clear(view.bulkTags);if(!selected.size)return;
  for(const tag of draft.organizer.tags){const assigned=[...selected].every(id=>draft.organizer.characters[id]?.tagIds?.includes(tag.id));const chip=el('button',(assigned?'✓ ':'+ ')+tag.name,view.bulkTags,'ness-tag-filter');chip.type='button';chip.setAttribute('aria-pressed',String(assigned));chip.setAttribute('data-colored','');chip.style.setProperty('--ness-tag-color',tag.color);chip.onclick=()=>assignSelectedTag(tag.id,!assigned);}
 }
 function renderList(reset=false){
  const q=norm(search.value);
  const selectedTag=draft.organizer.filterTagId;
  if(indexedRevision!==revision){searchIndex=libraryEntries(draft).map(record=>({...record,searchText:norm([record.id,record.entry.name,...(record.entry.aliases||[])].join('\n'))}));indexedRevision=revision;}
  const entries=searchIndex.filter(({id,searchText})=>{
   const tags=draft.organizer.characters[id]?.tagIds||[];
   return (selectedTag==='*'||(selectedTag===''?tags.length===0:tags.includes(selectedTag)))&&(!q||searchText.includes(q));
  });
  view.selection(selected.size);view.counts(searchIndex.length,entries.length);renderBulkTags();
  virtualList.setItems(entries,{reset});
 }
 function openRecordTags(id,anchor){
  if(busy||!tryFlush())return;closeTagPicker();closeNessTooltip();
  const box=el('div',undefined,panel,'ness-record-tag-popover');box.setAttribute('role','dialog');box.setAttribute('aria-label','Теги записи');
  const heading=el('div',undefined,box,'ness-row');el('strong','Теги записи',heading);const quit=button('×',heading,()=>closeTagPicker(),'icon quiet');quit.setAttribute('aria-label','Закрыть выбор тегов');
  const choices=el('div',undefined,box,'ness-tag-choices');
  function paint(){clear(choices);const ids=new Set(draft.organizer.characters[id]?.tagIds||[]);
   if(!draft.organizer.tags.length)el('p','Сначала создай тег кнопкой «+ Тег» над списком.',choices,'ness-note');
   for(const tag of draft.organizer.tags){const chip=el('button',(ids.has(tag.id)?'✓ ':'+ ')+tag.name,choices,'ness-tag-filter');chip.type='button';chip.setAttribute('data-record-tag',tag.id);chip.setAttribute('aria-pressed',String(ids.has(tag.id)));chip.setAttribute('data-colored','');chip.style.setProperty('--ness-tag-color',tag.color);
    chip.onclick=()=>{if(busy)return;if(ids.has(tag.id))ids.delete(tag.id);else ids.add(tag.id);draft.organizer.characters[id]={...draft.organizer.characters[id],tagIds:[...ids]};if(editor?.id===id)editor.tagIds=new Set(ids);changed();renderList();paint();};
   }
  }
  function outside(e){if(!box.contains(e.target)&&!anchor.contains(e.target))closeTagPicker();}
  function scroll(e){if(!box.contains(e.target))closeTagPicker();}
  closeTagPicker=()=>{box.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('scroll',scroll,true);closeTagPicker=()=>{};};
  paint();positionNessPopover(box,anchor,true);document.addEventListener('pointerdown',outside,true);document.addEventListener('scroll',scroll,true);
 }
 function renderLibraryRow({id,group,entry}){
  const row=el('div',undefined,undefined,'ness-library-item');row.setAttribute('data-active',String(editor?.id===id));
  const cb=el('input',undefined,row);cb.type='checkbox';cb.checked=selected.has(id);cb.disabled=busy;cb.setAttribute('data-library-id',id);cb.setAttribute('aria-label','Выбрать '+entry.name+' для действий');cb.onclick=e=>e?.stopPropagation?.();
  cb.onchange=()=>{if(cb.checked)selected.add(id);else selected.delete(id);view.selection(selected.size);renderBulkTags();};
  const content=el('div',undefined,row,'ness-record-content'),open=el('button',undefined,content,'ness-record-open');open.type='button';open.disabled=busy;open.title='Редактировать '+entry.name;open.setAttribute('aria-label','Открыть '+entry.name);open.setAttribute('data-open-record',id);open.onclick=e=>{e?.stopPropagation?.();editCharacter(id,group);};
  row.onclick=e=>{if(!busy&&e?.target!==cb)editCharacter(id,group);};
  const title=el('span',undefined,open,'ness-record-title');el('span',entry.name,title,'ness-record-name');el('span',group==='personas'?'Персона':'Персонаж',title,'ness-record-type');
  const tags=el('div',undefined,content,'ness-record-tags'),ids=draft.organizer.characters[id]?.tagIds||[];
  const add=el('button','+',tags,'ness-tag-add');add.type='button';add.disabled=busy;add.setAttribute('aria-label','Назначить теги: '+entry.name);add.setAttribute('data-row-tags',id);add.onclick=e=>{e?.stopPropagation?.();openRecordTags(id,add);};
  for(const tag of draft.organizer.tags.filter(t=>ids.includes(t.id))){const chip=el('button',tag.name,tags,'ness-tag-badge');chip.type='button';chip.style.setProperty('--ness-tag-color',tag.color);chip.onclick=e=>{e?.stopPropagation?.();openRecordTags(id,chip);};}
  return row;
 }
 const virtualList=createVirtualList(document,list,renderLibraryRow,{rowHeight:()=>window.matchMedia?.('(max-width:767px), (pointer:coarse)')?.matches?80:68,emptyText:'Нет персонажей с таким тегом или именем.'});
 let searchTimer=null;
 function searchNow(){closeTagPicker();if(searchTimer!==null)clearTimeout(searchTimer);searchTimer=null;if(!done)renderList(true);}
 function editCharacter(id,group){
  if(!tryFlush())return;closeTagPicker();clear(form);const entry=draft[group][id],fields={};
  const heading=el('div',undefined,form,'ness-editor-heading');button('← К списку',heading,()=>{if(!tryFlush())return;editor=null;view.resetEditor();renderList();},'quiet ness-editor-back');el('h4',entry.name,heading);
  const tabs=createNessTabs({el,button},form,'Карточка персонажа');
  const appearance=tabs.add('Внешность');
  const identity=el('div',undefined,appearance,'ness-grid');fields.name=field(identity,labels.name,input(entry.name));
  const kind=field(identity,'Тип записи',choice([['personas','Персона'],['characters','Персонаж']],group));kind.onchange=()=>{changed(true);};
  fields.base=field(appearance,labels.base,area(entry.base));fields.base.className+=' ness-appearance';
  const recordTags=draft.organizer.characters[id]?.tagIds||[];
  const highlightTag=draft.organizer.tags.find(t=>t.id===draft.organizer.filterTagId&&recordTags.includes(t.id))||draft.organizer.tags.find(t=>recordTags.includes(t.id));
  const visibility=createAppearanceVisibilityEditor({el,clear,button,input},appearance,fields.base,entry,changed,highlightTag?.color,()=>publishDraft(true),()=>!busy&&!done);
  const aliasesTab=tabs.add('Другие имена'),aliases=createAliasTags(document,entry.aliases||[],()=>changed(true));aliasesTab.appendChild(aliases.element);
  const promptTab=tabs.add('Данные для промпта'),promptGrid=el('div',undefined,promptTab,'ness-grid');
  fields.promptName=field(promptGrid,labels.promptName,input(entry.promptName||''));fields.promptName.placeholder='Kian';
  fields.subject=field(promptGrid,labels.subject,input(entry.subject||''));fields.subject.placeholder='boy';
  el('p','Например, Kian и boy дают начало записи «| boy, Kian, …» и учитываются в общем теге количества, например 1boy.',promptTab,'ness-note');
  const body=tabs.add('Отметины и тело'),bodyGrid=el('div',undefined,body,'ness-grid');for(const key of ['thighMarks','kneeMarks','shinMarks','shoulderMarks','forearmMarks','nudeUpper','nudeLower'])fields[key]=field(bodyGrid,labels[key],area(entry[key]||''));
  const extra=Object.entries(entry).filter(([key,v])=>!fields[key]&&key!=='aliases'&&typeof v==='string');if(extra.length){const box=tabs.add('Дополнительно');for(const [key,value] of extra)fields[key]=field(box,key,area(value));}
  for(const e of Object.values(fields))if(e!==fields.base)e.oninput=changed;fields.name.oninput=()=>changed(true);
  editor={id,group,fields,kind,aliases,visibility,tagIds:new Set(draft.organizer.characters[id]?.tagIds||[]),original:cloneLibrary(entry)};
  let asked=false;const remove=button('Удалить персонажа',body,()=>{if(!asked){asked=true;remove.textContent='Точно удалить?';return;}delete draft[editor.group][id];delete draft.organizer.characters[id];selected.delete(id);editor=null;view.resetEditor();changed(true);renderList();},'danger');
  view.showEditor();renderList();
 }
 function showTagEditor(id=null){
  if(!tryFlush())return;closeTagPicker();editingTag=id;deleteTagAsked=false;view.deleteTag.textContent='Удалить';view.tagEditor.hidden=false;view.tagName.value=draft.organizer.tags.find(t=>t.id===id)?.name||'';view.tagColor.value=draft.organizer.tags.find(t=>t.id===id)?.color||defaultNessTagColor();view.deleteTag.hidden=!id;renderTags();view.tagName.focus();
 }
 function applyTag(){
  if(busy)return;const name=view.tagName.value.trim();if(!name){status('Введи название тега.');return;}
  const duplicate=draft.organizer.tags.find(t=>norm(t.name)===norm(name));
  if(duplicate&&duplicate.id!==editingTag){status('Тег с таким именем уже есть. Выбери его в списке.');return;}
  if(editingTag){Object.assign(draft.organizer.tags.find(t=>t.id===editingTag),{name,color:view.tagColor.value});}else{editingTag=newLibraryId('tag',new Set(draft.organizer.tags.map(t=>t.id)));draft.organizer.tags.push({id:editingTag,name,color:view.tagColor.value});}
  view.tagEditor.hidden=true;changed();renderTags();renderList();
 }
 view.addTag.onclick=()=>showTagEditor();view.editTag.onclick=()=>showTagEditor(draft.organizer.filterTagId);view.applyTag.onclick=applyTag;view.tagName.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();applyTag();}};view.cancelTag.onclick=()=>{view.tagEditor.hidden=true;editingTag=null;renderTags();};
 let deleteTagAsked=false;view.deleteTag.onclick=()=>{if(!deleteTagAsked){deleteTagAsked=true;view.deleteTag.textContent='Удалить у всех?';return;}draft.organizer.tags=draft.organizer.tags.filter(t=>t.id!==editingTag);for(const meta of Object.values(draft.organizer.characters))meta.tagIds=(meta.tagIds||[]).filter(t=>t!==editingTag);editor?.tagIds.delete(editingTag);if(draft.organizer.filterTagId===editingTag)draft.organizer.filterTagId='*';view.tagEditor.hidden=true;editingTag=null;deleteTagAsked=false;view.deleteTag.textContent='Удалить';changed();renderTags();renderList();};
 function assignSelectedTag(id,add){if(!tryFlush())return;for(const actor of selected){const meta=draft.organizer.characters[actor]||{},tags=new Set(meta.tagIds||[]);if(add)tags.add(id);else tags.delete(id);draft.organizer.characters[actor]={...meta,tagIds:[...tags]};if(editor?.id===actor)editor.tagIds=new Set(tags);}changed();renderList();}
 button('Снять выделение',bulkActions,()=>{selected.clear();renderList();},'quiet');
 button('Добавить в участники',bulkActions,async()=>{
  if(busy||!tryFlush())return;
  const st=SillyTavern.getContext(),ids=[...selected];
  const known=new Set(libraryEntries(loadMasterLibrary()).map(e=>e.id));
  if(ids.some(id=>!known.has(id))){status('Сначала сохрани новых персонажей.');return;}
  if(!st?.extensionSettings||typeof st.saveSettingsDebounced!=='function'){status('Общие настройки недоступны.');return;}
  st.extensionSettings.variables||={};
  const global=st.extensionSettings.variables.global||={},key='sp_ness_global_cast_ids_v1',previous=global[key];
  const next=[...new Set([...(Array.isArray(previous)?previous:[]),...ids])];
  global[key]=next;setBusy(true);
  try{await st.saveSettingsDebounced();status('Добавлено в общий список участников: '+ids.length);}
  catch(e){if(global[key]===next){if(previous===undefined)delete global[key];else global[key]=previous;}status('Не удалось сохранить список: '+e.message);}
  finally{setBusy(false);}
 });
 view.add.onclick=()=>{if(!tryFlush())return;const id=newLibraryId('character',new Set(libraryEntries(draft).map(e=>e.id)));draft.characters[id]={name:'Новый персонаж',aliases:[],base:''};changed(true);editCharacter(id,'characters');};
 const upload=view.upload;
 upload.onchange=async()=>{if(busy||!upload.files?.[0]||!tryFlush())return;setBusy(true);try{const value=validateMasterLibrary(JSON.parse((await upload.files[0].text()).replace(/^\uFEFF/,'')));draft=value;editor=null;selected.clear();view.resetEditor();changed(true);renderTags();renderList();status('Импортировано в черновик. Нажми «Сохранить».');}catch(e){status('Импорт не выполнен: '+e.message);}finally{upload.value='';setBusy(false);}};
 view.exportButton.onclick=()=>{if(!tryFlush())return;try{const url=URL.createObjectURL(new Blob([JSON.stringify(validateMasterLibrary(draft),null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='SP_IMAGEN_LIBRARY.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){status(e.message);}};
 search.oninput=()=>{if(searchTimer!==null)clearTimeout(searchTimer);searchTimer=setTimeout(searchNow,140);};search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchNow();}};renderTags();renderList();
 status(libraryEntries(draft).length?'Библиотека загружена. Изменения сохраняются для всех чатов.':'Библиотека пуста. Добавь персонажей или импортируй JSON.');
 const previousFocus=document.activeElement,stopViewport=mountDialog(overlay);virtualList.refresh();if(!window.matchMedia?.('(max-width:767px), (pointer:coarse)')?.matches)search.focus();
 async function publishDraft(keepEditor=false){
  if(busy||done||!tryFlush())return false;
  closeTagPicker();setBusy(true);
  try{
   const result=await saveMasterLibrary(draft,baseline);draft=result.data;baseline=result.raw;
   if(!keepEditor){editor=null;view.resetEditor();}
   dirty=false;discardAsked=false;revision++;renderTags();
   try{await activateNessProfile('images');status(keepEditor?'Разметка сохранена.':'Библиотека SP Imagen сохранена.');}
   catch(e){status('Библиотека сохранена. Вернуться в Images не удалось: '+e.message);}
   return true;
  }catch(e){status('Не удалось сохранить: '+e.message);return false;}
  finally{setBusy(false);renderList();}
 }
 return await new Promise(resolve=>{
  const finish=()=>{if(done)return;done=true;rulesDialog?.finish();closeTagPicker();if(searchTimer!==null)clearTimeout(searchTimer);virtualList.dispose();document.removeEventListener('keydown',onKey,true);stopViewport();overlay.remove();previousFocus?.focus?.();resolve('Библиотека закрыта');};
  close.onclick=()=>{if(busy)return;if(dirty&&!discardAsked){discardAsked=true;status('Сохрани изменения или нажми «Закрыть» ещё раз, чтобы отменить их.');return;}finish();};
  const onKey=e=>{if(e.key==='Escape'&&!rulesDialog){e.preventDefault();e.stopPropagation();if(panel.querySelector('.ness-record-tag-popover'))closeTagPicker();else close.onclick();}};document.addEventListener('keydown',onKey,true);
  save.onclick=()=>publishDraft();
 });
}

// Module: library_exports
return {openLibraryEditor,routeImages,utilities:{loadMasterLibrary,saveMasterLibrary,validateMasterLibrary,libraryEntries,masterLibraryRaw}};

}
