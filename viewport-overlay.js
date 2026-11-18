// The single viewport coordinate system for all SP Imagen dialogs.
// SillyTavern themes may transform the body, so overlays are mounted
// directly under the document root rather than inside the page layout.
export function getVisibleViewport(win = window) {
    const visual = win.visualViewport;
    const width = visual?.width || win.innerWidth || win.document.documentElement.clientWidth;
    const height = visual?.height || win.innerHeight || win.document.documentElement.clientHeight;
    return {
        top: visual?.offsetTop || 0,
        left: visual?.offsetLeft || 0,
        width: Math.max(1, width),
        height: Math.max(1, height),
    };
}

export function mountViewportOverlay(overlay, win = window) {
    const doc = win.document;
    (doc.documentElement || doc.body).appendChild(overlay);
    const visual = win.visualViewport;
    let disposed = false;
    let frame = null;
    let previousBounds = '';

    const fit = () => {
        if (disposed || !overlay.isConnected) return;
        const { top, left, width, height } = getVisibleViewport(win);
        const bounds = `${top},${left},${width},${height}`;
        if (bounds === previousBounds) return;
        previousBounds = bounds;
        // Explicit bounds prevent 100dvh and a different-sized visual
        // viewport (browser bars, keyboard, pinch zoom) from diverging.
        for (const [property, value] of Object.entries({
            top: `${top}px`, left: `${left}px`,
            right: 'auto', bottom: 'auto',
            width: `${width}px`, height: `${height}px`,
        })) overlay.style.setProperty(property, value, 'important');
    };
    const queueFit = () => {
        if (disposed || frame !== null) return;
        frame = win.requestAnimationFrame
            ? win.requestAnimationFrame(() => { frame = null; fit(); })
            : null;
        if (!win.requestAnimationFrame) fit();
    };
    fit();
    win.addEventListener('resize', queueFit);
    visual?.addEventListener('resize', queueFit);
    visual?.addEventListener('scroll', queueFit);
    return () => {
        if (disposed) return;
        disposed = true;
        if (frame !== null) win.cancelAnimationFrame?.(frame);
        win.removeEventListener('resize', queueFit);
        visual?.removeEventListener('resize', queueFit);
        visual?.removeEventListener('scroll', queueFit);
    };
}
