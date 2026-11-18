// Deadlines for extension-owned asynchronous operations. A timeout releases the
// SP Imagen UI lock, but does not pretend that an unabortable SillyTavern save
// operation has been cancelled.
export class SpImagenTimeoutError extends Error {
    constructor(message, code = 'SP_IMAGEN_TIMEOUT') {
        super(message);
        this.name = 'SpImagenTimeoutError';
        this.code = code;
    }
}

export async function withOperationDeadline(run, milliseconds, message, { controller = null, code = 'SP_IMAGEN_TIMEOUT' } = {}) {
    if (typeof run !== 'function') throw new TypeError('SP Imagen expected an operation.');
    let timer;
    try {
        return await Promise.race([
            Promise.resolve().then(run),
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    try { controller?.abort?.(); } catch (_) {}
                    reject(new SpImagenTimeoutError(message, code));
                }, milliseconds);
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
}
