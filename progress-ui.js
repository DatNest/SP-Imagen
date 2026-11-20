/** SP Imagen generation progress: real stages, no invented percentages or fake pause. */
export function createSpImagenProgress() {
    const controller = new AbortController();
    if (typeof document === 'undefined' || !document.body) {
        return { signal: controller.signal, set() {}, submitted() {}, complete() {}, fail() {}, close() {} };
    }
    // A completed/error card from a previous run must not impersonate this run.
    document.querySelectorAll('.spi-generation-progress[data-finished="true"]').forEach(node => node.remove());
    const root = document.createElement('section');
    root.className = 'spi-generation-progress';
    root.setAttribute('aria-label', 'Ход генерации SP Imagen');
    const heading = document.createElement('strong');
    const detail = document.createElement('p');
    const elapsed = document.createElement('small');
    const actions = document.createElement('div');
    actions.className = 'spi-generation-progress-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Остановить';
    cancel.title = 'Останавливает подготовку и ещё не отправленный запрос. После отправки картинки отмена может не предотвратить списание.';
    cancel.disabled = false;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Закрыть';
    close.hidden = true;
    close.onclick = () => destroy();
    actions.append(cancel, close);
    root.append(heading, detail, elapsed, actions);
    const start = Date.now();
    let ended = false;
    let dispatched = false;
    let timer = null;
    const updateTime = () => {
        if (ended) return;
        const seconds = Math.floor((Date.now() - start) / 1000);
        elapsed.textContent = `Прошло ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    };
    function destroy() {
        ended = true;
        if (timer !== null) clearInterval(timer);
        root.remove();
    }
    const set = (stage, description = '', { stoppable = true } = {}) => {
        if (ended || root.dataset.finished === 'true') return;
        heading.textContent = stage;
        detail.textContent = description;
        cancel.hidden = !stoppable || dispatched;
        updateTime();
    };
    cancel.onclick = () => {
        if (ended || dispatched || controller.signal.aborted) return;
        controller.abort(new Error('Генерация остановлена пользователем.'));
        cancel.disabled = true;
        set('Остановка…', 'Ожидаю завершения текущего локального шага.', { stoppable: false });
    };
    const finish = (stage, description, failed) => {
        if (ended || root.dataset.finished === 'true') return;
        heading.textContent = stage;
        detail.textContent = description;
        root.dataset.finished = 'true';
        root.classList.toggle('spi-generation-failed', failed);
        cancel.hidden = true;
        close.hidden = false;
        if (timer !== null) { clearInterval(timer); timer = null; }
        if (!failed) setTimeout(destroy, 4500);
    };
    const submitted = () => {
        dispatched = true;
        set('NovelAI · генерация изображения', 'Передаю запрос и ожидаю сервер; повторная отправка может потратить Anlas.', { stoppable: false });
    };
    document.body.appendChild(root);
    timer = setInterval(updateTime, 1000);
    set('Подготовка иллюстрации', 'Собираю данные из выбранных постов.');
    return {
        signal: controller.signal,
        set,
        submitted,
        complete: (stage = 'Изображение готово', description = 'Картинка передана в галерею.') => finish(stage, description, false),
        fail: error => finish(controller.signal.aborted ? 'Генерация остановлена' : 'Не удалось завершить генерацию', String(error?.message || error).slice(0, 500), true),
        close: destroy,
    };
}
