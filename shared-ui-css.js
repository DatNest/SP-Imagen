export const NESS_UI_CSS = String.raw`
#sp-imagen-review-overlay{position:fixed!important;top:0!important;left:0!important;right:auto!important;bottom:auto!important;width:100vw!important;height:100dvh!important;margin:0!important;padding:calc(12px + env(safe-area-inset-top,0px)) calc(12px + env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) calc(12px + env(safe-area-inset-left,0px))!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;overscroll-behavior:none;z-index:2147483000;transform:none!important;background:color-mix(in srgb,var(--ness-bg) 78%,transparent);}
#sp-imagen-review-panel{color-scheme:normal;display:flex!important;flex-direction:column!important;position:relative!important;inset:auto!important;transform:none!important;width:min(920px,100%)!important;max-height:100%!important;min-height:0!important;min-width:0!important;margin:0!important;padding:0!important;overflow:hidden!important;box-sizing:border-box!important;border:1px solid var(--ness-border)!important;border-radius:18px!important;background:var(--ness-bg)!important;background-image:none!important;color:var(--ness-text)!important;text-align:left!important;font:14px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif!important;letter-spacing:.005em;box-shadow:0 14px 50px color-mix(in srgb,var(--ness-bg) 65%,transparent)!important;}
/* Compact/minimized overlays leave the RP chat interactive. */
#sp-imagen-review-overlay[data-minimized="true"]{background:transparent!important;align-items:flex-end!important;justify-content:flex-end!important;pointer-events:none!important;}
#sp-imagen-review-overlay[data-minimized="true"] #sp-imagen-review-panel{width:min(365px,100%)!important;height:auto!important;min-height:0!important;max-height:none!important;pointer-events:auto!important;border-radius:13px!important;}
#sp-imagen-review-overlay[data-minimized="true"] #sp-imagen-review-panel>:not(.ness-header){display:none!important;}
#sp-imagen-review-overlay[data-minimized="true"] #sp-imagen-review-panel .ness-header{padding:9px 12px!important;min-width:0;}
#sp-imagen-review-overlay[data-minimized="true"] #sp-imagen-review-panel .ness-header h3{font-size:14px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#sp-imagen-review-overlay[data-minimized="true"] #sp-imagen-review-panel .ness-header p{display:none!important;}
#sp-imagen-review-panel .ness-header .ness-minimize,#sp-imagen-review-panel .ness-header .ness-close-dialog{flex:none;font-size:20px!important;}
#sp-imagen-review-panel .ness-child-shade[data-minimized="true"]{align-items:flex-end!important;justify-content:flex-end!important;pointer-events:none!important;background:transparent!important;}
#sp-imagen-review-panel .ness-child-shade[data-minimized="true"] .ness-child{width:min(340px,100%)!important;max-height:none!important;pointer-events:auto!important;}
#sp-imagen-review-panel .ness-child-shade[data-minimized="true"] .ness-child>:not(.ness-child-head){display:none!important;}
#sp-imagen-review-panel .ness-child-shade[data-minimized="true"] .ness-child-head{border-bottom:0!important;}
#sp-imagen-review-panel *,#sp-imagen-review-panel *::before,#sp-imagen-review-panel *::after{box-sizing:border-box;}
#sp-imagen-review-panel [hidden]{display:none!important;}
#sp-imagen-review-panel h3,#sp-imagen-review-panel h4,#sp-imagen-review-panel p{padding:0;text-shadow:none;color:inherit;}
#sp-imagen-review-panel h3{font-size:20px!important;font-weight:650!important;letter-spacing:-.02em;margin:0!important;line-height:1.3;}
#sp-imagen-review-panel h4{font-size:16px;font-weight:600;line-height:1.4;margin:0;}
#sp-imagen-review-panel .ness-header{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px 14px;border-bottom:1px solid var(--ness-border);}
#sp-imagen-review-panel .ness-header-copy{min-width:0;}
#sp-imagen-review-panel .ness-header p{margin:4px 0 0;color:var(--ness-muted);font-size:12px;}
#sp-imagen-review-panel .ness-badge{display:inline-flex;align-items:center;flex:none;border:1px solid var(--ness-border);border-radius:8px;padding:3px 8px;color:var(--ness-muted);font-size:12px;}
#sp-imagen-review-panel [data-review-scroll]{flex:1 1 auto;min-height:0!important;min-width:0;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:16px 20px!important;scrollbar-width:thin;scrollbar-color:var(--ness-border) transparent;}
#sp-imagen-review-panel [data-review-actions]{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 18px!important;margin:0!important;border-top:1px solid var(--ness-border);background:var(--ness-bg);}
#sp-imagen-review-panel .ness-status{flex:1;margin:0!important;color:var(--ness-muted);font-size:12px;min-width:0;overflow-wrap:anywhere;max-height:70px;overflow:auto;}
#sp-imagen-review-panel .ness-footer-left{display:flex;gap:4px;flex:none;}
#sp-imagen-review-panel .ness-button{appearance:none!important;display:inline-flex;align-items:center;justify-content:center;gap:6px;width:auto;min-width:0;max-width:100%;min-height:38px;margin:0;padding:8px 12px;border:1px solid var(--ness-border)!important;border-radius:10px!important;background:var(--ness-surface)!important;background-image:none!important;color:var(--ness-contrast-surface,var(--ness-text))!important;font:550 13px/1.35 system-ui!important;text-shadow:none!important;box-shadow:none!important;cursor:pointer;touch-action:manipulation;white-space:nowrap;}
#sp-imagen-review-panel .ness-button:hover{background:color-mix(in srgb,var(--ness-surface) 85%,var(--ness-accent))!important;}
#sp-imagen-review-panel .ness-button.ness-primary{background:var(--ness-accent)!important;border-color:var(--ness-accent)!important;color:var(--ness-contrast-accent,var(--ness-input))!important;font-weight:650!important;}
#sp-imagen-review-panel .ness-button.ness-quiet{border-color:transparent!important;background:transparent!important;color:var(--ness-muted)!important;}
#sp-imagen-review-panel .ness-button.ness-danger{background:transparent!important;color:var(--ness-danger)!important;}
#sp-imagen-review-panel .ness-button.ness-icon{padding:0;width:36px;height:38px;min-width:36px;font-size:19px!important;}
#sp-imagen-review-panel button:disabled,#sp-imagen-review-panel input:disabled,#sp-imagen-review-panel select:disabled{opacity:.5;cursor:wait;}
#sp-imagen-review-panel .ness-input{appearance:none!important;display:block;width:100%!important;min-width:0;max-width:100%;min-height:40px;height:auto;margin:0!important;padding:8px 10px!important;border:1px solid var(--ness-border)!important;border-radius:10px!important;background:var(--ness-input)!important;background-image:none!important;color:var(--ness-contrast-input,var(--ness-text))!important;font:400 14px/1.55 system-ui!important;box-shadow:none!important;text-shadow:none!important;text-align:left!important;}
#sp-imagen-review-panel select.ness-input{appearance:auto!important;padding-right:4px!important;cursor:pointer;}
#sp-imagen-review-panel option{background:var(--ness-input)!important;color:var(--ness-contrast-input,var(--ness-text))!important;}
#sp-imagen-review-panel .ness-input::placeholder{color:var(--ness-contrast-input-muted,var(--ness-muted))!important;opacity:1;}
#sp-imagen-review-panel :is(input,textarea,button,select,summary):focus-visible{outline:2px solid var(--ness-accent)!important;outline-offset:2px;}
#sp-imagen-review-panel textarea.ness-input{min-height:82px;height:112px;resize:vertical;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;}
#sp-imagen-review-panel input[type=checkbox]{appearance:none!important;-webkit-appearance:none!important;position:relative!important;display:inline-block!important;vertical-align:middle!important;width:18px!important;height:18px!important;min-width:18px!important;min-height:18px!important;flex:0 0 18px!important;margin:0!important;padding:0!important;border:1.5px solid var(--ness-muted)!important;border-radius:5px!important;background:var(--ness-input)!important;background-image:none!important;box-shadow:none!important;filter:none!important;transform:none!important;cursor:pointer;}
#sp-imagen-review-panel input[type=checkbox]::before{display:none!important;}
#sp-imagen-review-panel input[type=checkbox]::after{content:''!important;display:none!important;position:absolute!important;inset:3px!important;width:auto!important;height:auto!important;transform:none!important;border:0!important;box-shadow:none!important;opacity:1!important;background:var(--ness-input)!important;background-image:none!important;clip-path:polygon(0 48%,16% 32%,40% 58%,83% 6%,100% 20%,41% 94%);}
#sp-imagen-review-panel input[type=checkbox]:checked{border-color:var(--ness-accent)!important;background:var(--ness-accent)!important;}
#sp-imagen-review-panel input[type=checkbox]:checked::after{display:block!important;}
#sp-imagen-review-panel input[type=color]{width:42px!important;height:36px;min-height:36px;padding:3px!important;cursor:pointer;}
#sp-imagen-review-panel .ness-field{display:flex!important;flex-direction:column;gap:5px;min-width:0;margin:0 0 10px!important;padding:0!important;}
#sp-imagen-review-panel .ness-label{font-size:12px;font-weight:550;line-height:1.5;color:var(--ness-muted);overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-note{font-size:12px;line-height:1.55;color:var(--ness-muted);margin:6px 0 10px!important;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0;}
#sp-imagen-review-panel .ness-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0;}
#sp-imagen-review-panel .ness-check-label{display:flex!important;align-items:center;gap:9px;min-height:36px;margin:4px 0!important;padding:0!important;font-size:13px;line-height:1.5;cursor:pointer;}
#sp-imagen-review-panel .ness-section{border:1px solid var(--ness-border);border-radius:12px;background:transparent;min-width:0;margin:0 0 10px;padding:0 12px;}
#sp-imagen-review-panel .ness-section>summary{position:relative;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:42px;list-style:none;cursor:pointer;font-size:13px;font-weight:600;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-section>summary::-webkit-details-marker{display:none;}
#sp-imagen-review-panel .ness-section>summary::after{content:'+';font-size:17px;color:var(--ness-muted);flex:none;}
#sp-imagen-review-panel .ness-section[open]>summary::after{content:'−';}
#sp-imagen-review-panel .ness-section[open]>summary{margin-bottom:8px;}
#sp-imagen-review-panel .ness-section>summary.ness-has-help{padding-right:34px;}
#sp-imagen-review-panel .ness-section>summary>.ness-help-toggle{top:9px;}
#sp-imagen-review-panel .ness-section .ness-section{background:var(--ness-input);}
#sp-imagen-review-panel .ness-error{color:var(--ness-danger)!important;font-size:12px;margin:0 auto 0 0;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-warning{padding:8px 10px;border-left:2px solid var(--ness-accent);color:var(--ness-muted);font-size:12px;}
#sp-imagen-review-panel .ness-has-help{position:relative;}
#sp-imagen-review-panel .ness-has-help>.ness-label{padding-right:25px;}
#sp-imagen-review-panel .ness-help-toggle{position:absolute;top:-3px;right:0;width:24px;height:24px;padding:0;border:1px solid var(--ness-border);border-radius:50%;background:var(--ness-bg);color:var(--ness-muted);font:500 12px system-ui;cursor:help;}
#sp-imagen-review-panel .ness-check-label.ness-has-help{padding-right:29px!important;}
#sp-imagen-review-panel fieldset.ness-cast{border:0!important;min-width:0;padding:0!important;margin:0 0 12px!important;}
#sp-imagen-review-panel .ness-cast legend{font-size:13px;font-weight:600;padding:0;}
#sp-imagen-review-panel .ness-chips{display:flex;flex-wrap:wrap;gap:6px;}
#sp-imagen-review-panel .ness-chip{display:flex;align-items:center;max-width:100%;gap:2px;border:1px solid var(--ness-border);background:var(--ness-surface);border-radius:10px;padding-left:9px;}
#sp-imagen-review-panel .ness-chip label{display:flex;align-items:center;gap:7px;min-height:38px;overflow-wrap:anywhere;cursor:pointer;font-size:13px;}
#sp-imagen-review-panel .ness-results{max-height:210px;overflow:auto;display:block;padding-bottom:8px;}
#sp-imagen-review-panel .ness-results .ness-button{justify-content:flex-start;}
#sp-imagen-review-panel .ness-npc{display:flex;flex-direction:column;gap:6px;}
#sp-imagen-review-panel .ness-npc>.ness-section>summary::after{display:none;}
#sp-imagen-review-panel[data-dialog=library]{width:min(1080px,100%)!important;height:min(760px,100%)!important;}
#sp-imagen-review-panel .ness-library-tools{flex:none;padding:12px 18px 10px;border-bottom:1px solid var(--ness-border);}
#sp-imagen-review-panel .ness-library-filters{display:grid;grid-template-columns:minmax(130px,1fr) auto;gap:10px;align-items:end;}
#sp-imagen-review-panel .ness-library-filters .ness-field{margin-bottom:0!important;}
#sp-imagen-review-panel .ness-tag-tools{display:flex;align-items:end;flex-wrap:wrap;gap:7px;margin-top:8px;}
#sp-imagen-review-panel .ness-tag-strip{display:flex;flex-wrap:wrap;gap:5px;min-width:0;flex:1;max-height:72px;overflow:auto;scrollbar-width:thin;}
#sp-imagen-review-panel .ness-tag-filter{padding:5px 10px;min-height:32px;border:1px solid var(--ness-border);border-radius:16px;background:transparent;color:var(--ness-text);font:500 12px/1.4 system-ui;cursor:pointer;white-space:nowrap;}
#sp-imagen-review-panel .ness-tag-filter[aria-pressed=true]{border-color:var(--ness-accent);background:var(--ness-surface);}
#sp-imagen-review-panel .ness-tag-badge,#sp-imagen-review-panel .ness-tag-filter[data-colored]{border:1px solid color-mix(in srgb,var(--ness-tag-color) 55%,var(--ness-border));background:color-mix(in srgb,var(--ness-tag-color) 16%,var(--ness-surface));color:var(--ness-text);}
#sp-imagen-review-panel .ness-tag-editor{display:flex;flex:1;min-width:0;align-items:end;flex-wrap:wrap;gap:7px;margin-top:8px;}
#sp-imagen-review-panel .ness-tag-editor>.ness-field{min-width:140px;flex:1;margin-bottom:0!important;}
#sp-imagen-review-panel .ness-tag-editor>.ness-field.ness-tag-color-field{flex:none;min-width:42px;}
#sp-imagen-review-panel .ness-library-bulk{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:8px;}
#sp-imagen-review-panel .ness-library-bulk .ness-note{margin:0!important;}
#sp-imagen-review-panel .ness-library-bulk .ness-field{flex:1;min-width:140px;margin:0!important;}
#sp-imagen-review-panel .ness-library-workspace{display:grid;grid-template-columns:minmax(250px,35%) minmax(0,1fr);min-height:0;flex:1;overflow:hidden;}
#sp-imagen-review-panel[data-view]{height:min(820px,100%)!important;}
#sp-imagen-review-panel .ness-library-listpane{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--ness-border);}
#sp-imagen-review-panel .ness-library-count{margin:0;padding:9px 14px;color:var(--ness-muted);font-size:12px;}
#sp-imagen-review-panel [data-library-list]{overflow-y:auto;overscroll-behavior:contain;min-height:0;flex:1;padding:0 7px 8px;scrollbar-width:thin;scrollbar-color:var(--ness-border) transparent;}
#sp-imagen-review-panel .ness-library-item{display:flex;align-items:center;gap:8px;height:68px;min-height:68px;padding:4px 8px;border:1px solid transparent;border-radius:11px;margin:0;cursor:pointer;}
#sp-imagen-review-panel .ness-library-item:hover{background:var(--ness-surface);}
#sp-imagen-review-panel .ness-library-item[data-active=true]{background:color-mix(in srgb,var(--ness-accent) 13%,var(--ness-bg));border-color:var(--ness-border);}
#sp-imagen-review-panel .ness-record-content{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;}
#sp-imagen-review-panel .ness-record-open{appearance:none!important;display:flex;flex-direction:column;justify-content:center;gap:3px;flex:1;min-width:0;min-height:23px;padding:0;margin:0;border:0!important;background:transparent!important;box-shadow:none!important;color:var(--ness-text)!important;text-align:left!important;font:inherit;cursor:pointer;}
#sp-imagen-review-panel .ness-record-title{display:flex;align-items:baseline;gap:8px;min-width:0;width:100%;line-height:1.4;}
#sp-imagen-review-panel .ness-record-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;}
#sp-imagen-review-panel .ness-record-type{flex:none;color:var(--ness-muted);font-size:11px;font-weight:400;}
#sp-imagen-review-panel .ness-record-tags{display:flex;align-items:center;gap:4px;max-width:100%;height:27px;overflow-x:auto;scrollbar-width:none;}
#sp-imagen-review-panel .ness-tag-badge{appearance:none!important;cursor:pointer;flex:none;display:inline-block;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:7px;font:500 11px/1.4 system-ui;min-height:24px;padding:2px 7px;}
#sp-imagen-review-panel .ness-library-editorpane{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;padding:15px 18px 0;}
#sp-imagen-review-panel .ness-library-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;height:100%;text-align:center;color:var(--ness-muted);}
#sp-imagen-review-panel .ness-empty-symbol{font-size:30px;color:var(--ness-accent);margin-bottom:10px;}
#sp-imagen-review-panel .ness-editor-heading{display:flex;flex:none;align-items:center;justify-content:space-between;gap:9px;margin-bottom:10px;}
#sp-imagen-review-panel .ness-editor-heading h4{flex:1;min-width:0;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-editor-back{display:none;}
#sp-imagen-review-panel .ness-tab-strip{display:flex;flex:none;gap:4px;overflow-x:auto;padding:2px 2px 0;border-bottom:1px solid var(--ness-border);scrollbar-width:thin;}
#sp-imagen-review-panel .ness-tab-strip .ness-tab{flex:none;white-space:nowrap;border-radius:9px 9px 0 0!important;background:transparent!important;color:var(--ness-muted)!important;}
#sp-imagen-review-panel .ness-tab-strip .ness-tab[aria-selected=true]{background:var(--ness-input)!important;color:var(--ness-contrast-input,var(--ness-text))!important;border-top-color:var(--ness-accent)!important;}
#sp-imagen-review-panel .ness-tab-viewport{flex:1;min-height:0;min-width:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--ness-border) transparent;}
#sp-imagen-review-panel .ness-tab-content{padding:12px 3px 16px;min-width:0;}
#sp-imagen-review-panel .ness-body-section{min-width:0;margin:0 0 16px;padding:13px;border:1px solid var(--ness-border);border-radius:12px;background:var(--ness-surface);}
#sp-imagen-review-panel .ness-body-section h4{margin:0 0 7px!important;font-size:15px!important;}
#sp-imagen-review-panel .ness-body-section .ness-note{margin:0 0 9px!important;line-height:1.5;}
#sp-imagen-review-panel .ness-body-example{margin:0 0 12px!important;padding:8px 10px;border-radius:8px;background:var(--ness-input);color:var(--ness-text);font:12px/1.55 system-ui,sans-serif;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-body-section .ness-grid{gap:12px;}
#sp-imagen-review-panel .ness-body-section .ness-field:last-child{margin-bottom:0!important;}
#sp-imagen-review-panel .ness-body-section textarea.ness-input{height:78px;min-height:70px;}
#sp-imagen-review-panel .ness-body-important{margin:0 0 10px;padding:12px 13px;border:1px solid var(--ness-border);border-left:3px solid var(--ness-accent);border-radius:9px;background:var(--ness-surface);color:var(--ness-text);font-size:13px;line-height:1.55;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-body-important strong{display:block;margin:0 0 4px;font-weight:750;letter-spacing:.025em;}
#sp-imagen-review-panel .ness-body-important p{margin:0!important;}
#sp-imagen-review-panel .ness-appearance-wrap{position:relative;min-width:0;padding:9px 46px 9px 9px;border:1px solid var(--ness-border);border-radius:10px;background:var(--ness-input);}
#sp-imagen-review-panel .ness-appearance-wrap[data-format="prose"]{padding:9px;}
#sp-imagen-review-panel .ness-appearance-wrap[data-format="prose"] textarea.ness-appearance{display:block!important;width:100%!important;min-height:170px;resize:vertical;white-space:pre-wrap;}
#sp-imagen-review-panel .ness-appearance-wrap[data-marking=true]{background:color-mix(in srgb,var(--ness-appearance-color,var(--ness-accent)) 8%,var(--ness-input));}
#sp-imagen-review-panel .ness-appearance-wrap .ness-appearance-pencil{position:absolute;top:3px;right:7px;z-index:1;}
#sp-imagen-review-panel .ness-appearance-fragments{display:flex;flex-wrap:wrap;align-content:flex-start;gap:5px;min-height:105px;max-height:clamp(175px,30dvh,310px);overflow:auto;scrollbar-width:thin;padding:2px;}
#sp-imagen-review-panel .ness-appearance-chip{display:inline-flex;align-items:center;min-width:0;max-width:100%;border:1px solid var(--ness-border);border-radius:8px;background:var(--ness-surface);}
#sp-imagen-review-panel .ness-appearance-chip[data-selected=true]{background:color-mix(in srgb,var(--ness-appearance-color,var(--ness-accent)) 24%,transparent);border-color:color-mix(in srgb,var(--ness-appearance-color,var(--ness-accent)) 46%,transparent);}
#sp-imagen-review-panel .ness-appearance-chip .ness-appearance-fragment{min-height:30px;padding:4px 7px;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--ness-text)!important;}
#sp-imagen-review-panel .ness-appearance-chip .ness-appearance-remove{min-height:30px;padding:2px 6px;flex:none;}
#sp-imagen-review-panel .ness-appearance-drag{padding:0 0 0 6px;color:var(--ness-muted);cursor:grab;user-select:none;}
#sp-imagen-review-panel .ness-appearance-moves{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;}
#sp-imagen-review-panel .ness-appearance-moves .ness-button{min-height:32px;padding:3px 8px;}
@media(pointer:coarse){#sp-imagen-review-panel .ness-appearance-drag{display:none;}}
#sp-imagen-review-panel .ness-appearance-wrap .ness-appearance-tag-input{margin-top:7px!important;}
#sp-imagen-review-panel .ness-appearance-presets{display:flex;flex-wrap:wrap;gap:5px;padding:4px 2px 7px;}
/* Three in-place tag-category tabs: one content width, no nested cards. */
#sp-imagen-review-panel .ness-context-tab-strip{display:flex;gap:4px;align-items:end;min-width:0;overflow-x:auto;padding:4px 2px 0;border-bottom:1px solid var(--ness-border);scrollbar-width:thin;}
#sp-imagen-review-panel .ness-context-tab{flex:0 0 auto;min-height:34px!important;padding:6px 11px!important;border:1px solid transparent!important;border-bottom:0!important;border-radius:9px 9px 0 0!important;background:transparent!important;color:var(--ness-muted)!important;font-weight:600!important;white-space:nowrap;}
#sp-imagen-review-panel .ness-context-tab[aria-selected=true]{border-color:var(--ness-border)!important;border-top-color:var(--ness-accent)!important;background:var(--ness-input)!important;color:var(--ness-text)!important;}
#sp-imagen-review-panel .ness-context-tab:focus-visible{outline:2px solid var(--ness-accent);outline-offset:-3px;}
#sp-imagen-review-panel .ness-context-tab-content{padding:8px 2px 10px;min-width:0;}
#sp-imagen-review-panel .ness-context-tab-content[hidden]{display:none!important;}
#sp-imagen-review-panel .ness-context-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;min-width:0;padding:7px 4px;border-bottom:1px solid color-mix(in srgb,var(--ness-border) 64%,transparent);}
#sp-imagen-review-panel .ness-context-row:last-child{border-bottom:0;}
#sp-imagen-review-panel .ness-context-link{flex:none;max-width:100%;padding:4px 8px!important;min-height:30px!important;text-align:left!important;white-space:normal!important;}
#sp-imagen-review-panel .ness-context-excerpt{flex:1 1 250px;min-width:0;color:var(--ness-muted);font-size:12px;line-height:1.5;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-context-nsfw-row{display:block;}
#sp-imagen-review-panel .ness-context-row-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;font-size:12px;}
#sp-imagen-review-panel .ness-context-nsfw-text{display:block;width:100%;min-height:76px;max-height:180px;resize:vertical;font-size:12px!important;line-height:1.5!important;}
#sp-imagen-review-panel .ness-appearance-inline-divider{display:flex;flex:1 0 100%;align-items:center;gap:7px;min-width:0;margin:6px 1px 2px;color:var(--ness-muted);font-size:11px;font-weight:650;}
#sp-imagen-review-panel .ness-appearance-inline-divider::after{content:"";display:block;flex:1;min-width:12px;border-top:1px solid var(--ness-border);}
@media(max-width:620px){#sp-imagen-review-panel .ness-context-tab{font-size:12px!important;padding:5px 8px!important;}#sp-imagen-review-panel .ness-context-row{align-items:flex-start;} }

#sp-imagen-review-panel .ness-appearance-copy{display:grid;justify-items:start;gap:8px;padding:8px 10px;border:1px solid var(--ness-border);border-radius:9px;}
#sp-imagen-review-panel .ness-appearance-presets .ness-appearance-preset{flex:none;white-space:nowrap;border-radius:999px!important;}
#sp-imagen-review-panel .ness-appearance-tools[data-marking=true] .ness-appearance-presets [aria-pressed=true]{border-color:var(--ness-accent)!important;color:var(--ness-accent)!important;}
#sp-imagen-review-panel .ness-appearance-filled{display:inline-block;width:6px;height:6px;flex:none;border-radius:50%;background:color-mix(in srgb,mediumseagreen 80%,var(--ness-text));}
#sp-imagen-review-panel .ness-appearance-rule{padding:8px 0;border-bottom:1px solid var(--ness-border);}
#sp-imagen-review-panel .ness-tag-choices,#sp-imagen-review-panel .ness-alias-chips{display:flex;flex-wrap:wrap;gap:6px;}
#sp-imagen-review-panel .ness-tag-add{appearance:none!important;flex:none;width:27px;min-height:26px;border:1px dashed var(--ness-border);border-radius:7px;background:transparent;color:var(--ness-muted);font:18px/1 system-ui;cursor:pointer;}
.ness-record-tag-popover{position:fixed;z-index:2147483600;width:300px;max-width:calc(100vw - 24px);padding:10px;border:1px solid var(--ness-border);border-radius:12px;background:var(--ness-bg);color:var(--ness-text);box-shadow:0 8px 26px color-mix(in srgb,var(--ness-bg) 70%,transparent);overflow:auto;font:14px/1.5 system-ui;}
.ness-record-tag-popover .ness-row{justify-content:space-between;margin-bottom:6px;}
.ness-record-tag-popover .ness-tag-choices{max-height:220px;overflow:auto;}
#sp-imagen-review-panel .ness-aliases{display:flex;flex-direction:column;gap:8px;padding-bottom:10px;}
#sp-imagen-review-panel .ness-alias-chip{display:inline-flex;align-items:center;gap:2px;max-width:100%;padding-left:10px;border:1px solid var(--ness-border);border-radius:18px;background:var(--ness-surface);font-size:13px;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-alias-chip>span{min-width:0;}
#sp-imagen-review-panel .ness-alias-chip>.ness-button.ness-icon{width:30px;height:32px;min-width:30px;min-height:32px;font-size:18px!important;}
/* Settings: one responsive form; the chat-theme palette supplies all colors. */
#sp-imagen-review-panel[data-dialog=settings]{width:min(980px,100%)!important;}
#sp-imagen-review-panel .ness-settings-form{display:flex;flex-direction:column;gap:12px;min-width:0;}
#sp-imagen-review-panel .ness-settings-top{display:flex;align-items:center;justify-content:flex-end;gap:12px;flex-wrap:wrap;order:0;padding:0 0 10px;border-bottom:1px solid var(--ness-border);}
#sp-imagen-review-panel .ness-settings-top>.ness-field{width:min(260px,100%);margin:0!important;}
#sp-imagen-review-panel .ness-settings-intro{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:3px 12px;margin-top:2px;}
#sp-imagen-review-panel .ness-settings-intro h4{font-size:17px!important;line-height:1.4;font-weight:700;}
#sp-imagen-review-panel .ness-settings-intro p{margin:0!important;color:var(--ness-muted);font-size:12px;line-height:1.5;}
#sp-imagen-review-panel .ness-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start;min-width:0;}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card{margin:0!important;padding:0 14px 12px;border-radius:14px;background:color-mix(in srgb,var(--ness-surface) 43%,var(--ness-bg));border:1px solid var(--ness-border);min-width:0;overflow:visible;}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card:not([open]){padding-bottom:0;}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card>summary{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:3px;min-height:82px;padding:13px 76px 13px 0!important;line-height:1.45;}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card>summary::after{position:absolute;top:50%;right:9px;transform:translateY(-50%);font-size:21px;}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card>summary>.spi-guide-help{position:absolute;top:50%;right:36px;transform:translateY(-50%);}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card>summary:hover .ness-settings-card-title{color:var(--ness-accent);}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card>summary:focus-visible{outline:2px solid var(--ness-accent)!important;outline-offset:2px;}
#sp-imagen-review-panel .ness-settings-card-title{display:block;width:100%;font-size:14px;font-weight:700;color:var(--ness-text);overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-settings-card-desc{display:block;width:100%;font-size:12px;font-weight:400;line-height:1.5;color:var(--ness-muted);overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card[open]>summary{margin-bottom:12px;padding-bottom:10px!important;border-bottom:1px solid var(--ness-border);}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card>.ness-section{background:var(--ness-bg);}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card>.ness-check-label{padding:5px 30px 5px 0!important;}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card>.ness-check-label:last-child{margin-bottom:12px!important;}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card>.ness-numbers{padding:2px 0 4px;}
#sp-imagen-review-panel .ness-settings-form .ness-settings-card>.ness-dialogue-row:last-child{margin-bottom:4px;}
#sp-imagen-review-panel .ness-settings-form>.ness-settings-card{width:100%;}
#sp-imagen-review-panel .ness-settings-form>.ness-settings-card[open]{padding-bottom:14px;}
#sp-imagen-review-panel .ness-settings-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:3px 0 12px;}
#sp-imagen-review-panel .ness-settings-transferbar{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;padding-bottom:10px;}
#sp-imagen-review-panel .ness-transfer-ai{margin:10px 0 4px;padding-top:10px;border-top:1px solid var(--ness-border);}
#sp-imagen-review-panel .ness-settings-lead{margin:0 0 15px!important;color:var(--ness-muted);font-size:13px;line-height:1.6;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-source-step{display:flex;flex-direction:column;gap:9px;min-width:0;padding:14px;margin:10px 0;border:1px solid var(--ness-border);border-radius:12px;background:color-mix(in srgb,var(--ness-surface) 63%,transparent);}
#sp-imagen-review-panel .ness-step-title{font-size:14px;font-weight:700;line-height:1.45;color:var(--ness-text);}
#sp-imagen-review-panel .ness-step-desc{margin:0!important;font-size:12px;line-height:1.55;color:var(--ness-muted);overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-settings-subgroup{display:flex;flex-direction:column;gap:9px;min-width:0;padding:12px 0 0;border-top:1px solid var(--ness-border);}
#sp-imagen-review-panel .ness-settings-subgroup[hidden],#sp-imagen-review-panel .ness-source-step[hidden]{display:none!important;}
#sp-imagen-review-panel .ness-source-step>.ness-field,#sp-imagen-review-panel .ness-settings-subgroup>.ness-field{width:100%;min-width:0;margin:0!important;}
#sp-imagen-review-panel .ness-source-step select,#sp-imagen-review-panel .ness-source-step input:not([type=checkbox]){min-width:0;width:100%;max-width:100%;}
#sp-imagen-review-panel .ness-settings-inline{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;padding:15px;border:1px solid var(--ness-border);border-radius:14px;background:color-mix(in srgb,var(--ness-surface) 43%,var(--ness-bg));}
#sp-imagen-review-panel .ness-settings-inline-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;position:relative;padding-right:25px;}
#sp-imagen-review-panel .ness-settings-inline-text>strong{font-size:14px;line-height:1.4;color:var(--ness-text);overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-settings-inline>.ness-check-label{flex:0 0 auto;min-width:0;margin:0!important;padding:7px 8px!important;}
#sp-imagen-review-panel .ness-clean-row{display:flex;flex-direction:column;gap:7px;padding:12px 0;border-bottom:1px solid var(--ness-border);min-width:0;}
#sp-imagen-review-panel .ness-clean-row:last-of-type{border-bottom:0;}
#sp-imagen-review-panel .ness-clean-row>.ness-check-label{min-height:40px;margin:0!important;}
#sp-imagen-review-panel .ness-before-after{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;min-width:0;}
#sp-imagen-review-panel .ness-before-after>div{min-width:0;padding:10px;border:1px solid var(--ness-border);border-radius:9px;background:var(--ness-surface);}
#sp-imagen-review-panel .ness-before-after strong{font-size:12px;color:var(--ness-text);}
#sp-imagen-review-panel .ness-before-after pre{font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:5px 0 0;color:var(--ness-text);}
#sp-imagen-review-panel .ness-wardrobe-example{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 ui-monospace,monospace;background:var(--ness-surface);border:1px solid var(--ness-border);border-radius:10px;padding:12px;max-height:170px;overflow:auto;user-select:text;}
#sp-imagen-review-panel .ness-child-shade{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:12px;background:color-mix(in srgb,var(--ness-bg) 84%,transparent);}
#sp-imagen-review-panel .ness-child{display:flex;flex-direction:column;width:min(560px,100%);max-height:100%;min-height:0;min-width:0;border:1px solid var(--ness-border);border-radius:14px;background:var(--ness-bg);box-shadow:0 12px 36px color-mix(in srgb,var(--ness-input) 70%,transparent);}
#sp-imagen-review-panel .ness-child-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid var(--ness-border);}
#sp-imagen-review-panel .ness-child-body{min-height:0;overflow:auto;overscroll-behavior:contain;padding:12px 14px;scrollbar-width:thin;}
#sp-imagen-review-panel .ness-child-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding:10px 14px;border-top:1px solid var(--ness-border);}
#sp-imagen-review-panel .ness-coder-faq{font-size:13px;line-height:1.65;white-space:pre-line;padding-bottom:12px;}
#sp-imagen-review-panel .ness-coder-result{margin-top:12px;}
#sp-imagen-review-panel .ness-coder-preview{padding:9px 11px;margin:8px 0 12px;border-left:2px solid var(--ness-accent);background:var(--ness-surface);color:var(--ness-text);font-size:14px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-coder-result textarea{height:150px;font-family:ui-monospace,monospace!important;}
#sp-imagen-review-panel .ness-numbers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:end;min-width:0;}
#sp-imagen-review-panel .ness-helper-shortcut,#sp-imagen-review-panel .ness-helper-home{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;min-width:0;padding:13px 15px;border-radius:12px;border:1px solid var(--ness-accent);background:color-mix(in srgb,var(--ness-accent) 8%,var(--ness-surface));}
#sp-imagen-review-panel .ness-helper-shortcut>div{flex:1 1 240px;min-width:0;display:flex;flex-direction:column;gap:5px;}
#sp-imagen-review-panel .ness-helper-home{margin:12px 0 16px;flex-direction:column;align-items:flex-start;}
#sp-imagen-review-panel .ness-helper-shortcut>.ness-button,#sp-imagen-review-panel .ness-helper-home>.ness-button{white-space:normal;}
#sp-imagen-review-panel .ness-friendly-rule{margin:10px 0!important;padding:10px 12px!important;border:1px solid var(--ness-border);border-radius:11px;background:color-mix(in srgb,var(--ness-surface) 55%,var(--ness-bg));min-width:0;}
#sp-imagen-review-panel .ness-friendly-rule>summary{padding:7px 55px 7px 0!important;min-height:42px;line-height:1.45;}
#sp-imagen-review-panel .ness-friendly-rule>summary>.ness-button{position:absolute;right:0;top:3px;z-index:1;}
#sp-imagen-review-panel .ness-rule-head{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:end;gap:8px 12px;min-width:0;}
#sp-imagen-review-panel .ness-rule-head>.ness-check-label{align-self:center;}
#sp-imagen-review-panel .ness-rule-head>.ness-field{width:100%;min-width:0;margin:0!important;}
#sp-imagen-review-panel .ness-rule-explain{display:flex;flex-direction:column;gap:7px;margin:10px 0;padding:11px;border:1px solid var(--ness-border);border-radius:10px;min-width:0;background:var(--ness-bg);}
#sp-imagen-review-panel .ness-rule-feedback{margin:0!important;color:var(--ness-accent);font-size:12px;line-height:1.55;overflow-wrap:anywhere;}
#sp-imagen-review-panel .ness-rule-explain>strong{color:var(--ness-text);font-size:12px;}
#sp-imagen-review-panel .ness-rule-explain>.ness-settings-actions{padding:0;}
#sp-imagen-review-panel .ness-rule-explain>.ness-wardrobe-example{max-height:130px;margin:0;}
#sp-imagen-review-panel .ness-rule-extra{margin:10px 0 0!important;padding:8px 10px!important;background:var(--ness-bg);}
#sp-imagen-review-panel .ness-rule-extra>summary{white-space:normal!important;line-height:1.45;}
#sp-imagen-review-panel .ness-rule-extra>.ness-field{width:100%;max-width:100%;}
#sp-imagen-review-panel .ness-rule-extra .ness-field>.ness-input{width:100%;min-width:0;}
#sp-imagen-review-panel .ness-rule-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 10px;}
#sp-imagen-review-panel .ness-rule-fields .ness-wide{grid-column:1/-1;}
#sp-imagen-review-panel .ness-rule-fields textarea{height:72px;min-height:60px;font-family:ui-monospace,monospace!important;}
#sp-imagen-review-panel .ness-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px;}
#sp-imagen-review-panel .ness-dialogue-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:end;gap:6px 10px;padding:8px 0;border-top:1px solid var(--ness-border);min-width:0;}
#sp-imagen-review-panel .ness-dialogue-row>.ness-field{margin-bottom:8px!important;}
#sp-imagen-review-panel .ness-dialogue-row>.ness-dialogue-title{grid-column:1/-1;font-size:13px;color:var(--ness-text);font-weight:650;}
.ness-tooltip,.ness-theme-popover{position:fixed;z-index:2147483600;width:max-content;max-width:330px;border:1px solid var(--ness-border);border-radius:12px;background:var(--ness-surface);color:var(--ness-text);padding:11px 13px;font:14px/1.6 system-ui;letter-spacing:.005em;text-align:left;overflow:auto;box-shadow:0 8px 26px color-mix(in srgb,var(--ness-bg) 70%,transparent);overflow-wrap:anywhere;}
.ness-tooltip{width:290px;max-width:calc(100vw - 24px);font-size:13px;line-height:1.55;white-space:pre-line;padding:10px 12px;}
#sp-imagen-review-panel .ness-theme-popover{width:340px;max-width:calc(100vw - 24px);}
#sp-imagen-review-panel .ness-theme-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px 12px;margin:10px 0;}
#sp-imagen-review-panel .ness-theme-color{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--ness-muted);}
#sp-imagen-review-panel[data-dialog=review]{width:min(1180px,100%)!important;}
#sp-imagen-review-panel .ness-scene-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(270px,1fr);gap:16px;align-items:start;}
#sp-imagen-review-panel .ness-scene-main,#sp-imagen-review-panel .ness-scene-side{min-width:0;display:flex;flex-direction:column;gap:14px;}
#sp-imagen-review-panel .ness-scene-card{padding:14px 16px;border:1px solid var(--ness-border);border-radius:13px;min-width:0;background:var(--ness-bg);}
#sp-imagen-review-panel .ness-scene-card>summary{display:flex;align-items:center;justify-content:space-between;gap:9px;cursor:pointer;list-style:none;color:var(--ness-text);font-size:14px;font-weight:650;letter-spacing:.02em;min-height:30px;}
#sp-imagen-review-panel .ness-scene-card>summary::-webkit-details-marker{display:none;}
#sp-imagen-review-panel .ness-scene-card>summary::after{content:'+';flex:none;color:var(--ness-muted);font-size:18px;}
#sp-imagen-review-panel .ness-scene-card[open]>summary::after{content:'−';}
#sp-imagen-review-panel .ness-scene-card[open]>summary{margin-bottom:13px;}
#sp-imagen-review-panel .ness-scene-card:not([open]){padding-bottom:10px;}

#sp-imagen-review-panel .ness-scene-context{background:var(--ness-surface);border-top:3px solid var(--ness-accent);}
#sp-imagen-review-panel .ness-scene-meta{margin:-6px 0 12px!important;font-size:12px;color:var(--ness-muted);}
#sp-imagen-review-panel .ness-scene-context [data-scene]{height:290px;min-height:180px;font:14px/1.7 system-ui!important;}
#sp-imagen-review-panel .ness-scene-wardrobe{border-left:3px solid color-mix(in srgb,var(--ness-accent) 60%,var(--ness-border));}
#sp-imagen-review-panel .ness-scene-composition{background:color-mix(in srgb,var(--ness-accent) 5%,var(--ness-bg));}
#sp-imagen-review-panel .ness-scene-composition [data-composition]{height:155px;}
#sp-imagen-review-panel .ness-scene-cast{background:var(--ness-input);}
#sp-imagen-review-panel .ness-scene-card .ness-field:last-child{margin-bottom:0!important;}
#sp-imagen-review-panel .ness-cast-result{width:100%;height:44px;min-height:44px;overflow:hidden;white-space:nowrap;}
#sp-imagen-review-panel[data-dialog=prompt]{width:min(1080px,100%)!important;}
#sp-imagen-review-panel .ness-prompt-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:0 0 12px;border-bottom:1px solid var(--ness-border);margin-bottom:15px;}
#sp-imagen-review-panel .ness-prompt-toolbar>span:first-child{flex:1;min-width:180px;font-size:13px;color:var(--ness-muted);}
#sp-imagen-review-panel[data-dialog=prompt] [data-final-prompt]{height:57dvh;min-height:220px;font:14px/1.8 system-ui!important;padding:16px!important;background:var(--ness-input)!important;}
@media(max-width:767px),(pointer:coarse){
 #sp-imagen-review-panel .ness-scene-layout{grid-template-columns:minmax(0,1fr);gap:14px;}
 #sp-imagen-review-panel .ness-scene-card{padding:13px 12px;}
 #sp-imagen-review-panel .ness-scene-context [data-scene]{height:260px;font-size:16px!important;}
 #sp-imagen-review-panel[data-dialog=prompt] [data-final-prompt]{height:50dvh;font-size:16px!important;padding:12px!important;}

 #sp-imagen-review-overlay{padding:calc(8px + env(safe-area-inset-top,0px)) calc(8px + env(safe-area-inset-right,0px)) calc(8px + env(safe-area-inset-bottom,0px)) calc(8px + env(safe-area-inset-left,0px))!important;}
 #sp-imagen-review-panel{border-radius:14px!important;width:100%!important;height:100%!important;max-height:100%!important;-webkit-text-size-adjust:100%;}
 #sp-imagen-review-panel .ness-header{padding:13px 12px 11px;}
 #sp-imagen-review-panel h3{font-size:18px!important;}
 #sp-imagen-review-panel [data-review-scroll]{padding:12px!important;}
 #sp-imagen-review-panel [data-review-actions]{padding:9px 10px!important;flex-wrap:wrap;}
 #sp-imagen-review-panel [data-review-actions]>.ness-status,#sp-imagen-review-panel [data-review-actions]>.ness-error{flex-basis:100%;max-height:60px;}
 #sp-imagen-review-panel [data-review-actions]>.ness-button{flex:1;}
 #sp-imagen-review-panel .ness-footer-library{display:grid;grid-template-columns:auto 1fr 1fr;}
 #sp-imagen-review-panel .ness-footer-library>.ness-status{grid-column:1/-1;grid-row:1;}
 #sp-imagen-review-panel .ness-button{min-height:44px;font-size:14px!important;}
 #sp-imagen-review-panel .ness-button.ness-icon{width:40px;height:44px;min-width:40px;}
 #sp-imagen-review-panel .ness-input{font-size:16px!important;min-height:44px;}
 #sp-imagen-review-panel .ness-label{font-size:13px;}
 #sp-imagen-review-panel .ness-help-toggle{top:-6px;width:30px;height:30px;font-size:14px;}
 #sp-imagen-review-panel .ness-check-label{min-height:40px;}
 #sp-imagen-review-panel .ness-grid,#sp-imagen-review-panel .ness-settings-grid{grid-template-columns:minmax(0,1fr);gap:12px;}
 #sp-imagen-review-panel .ness-library-tools{padding:10px;max-height:42%;overflow:auto;}
 #sp-imagen-review-panel .ness-tag-strip{flex-wrap:nowrap;overflow-x:auto;max-height:none;}
 #sp-imagen-review-panel .ness-tag-filter{min-height:38px;}
 #sp-imagen-review-panel .ness-library-workspace{display:flex;flex-direction:column;}
 #sp-imagen-review-panel .ness-library-listpane{flex:1;border:0;}
 #sp-imagen-review-panel .ness-library-editorpane{display:none;flex:1;padding:12px;}
 #sp-imagen-review-panel[data-view=editor] .ness-library-listpane,#sp-imagen-review-panel[data-view=editor] .ness-library-tools{display:none;}
 #sp-imagen-review-panel[data-view=editor] .ness-library-editorpane{display:flex;}
 #sp-imagen-review-panel .ness-editor-back{display:inline-flex;}
 #sp-imagen-review-panel .ness-alias-chip>.ness-button.ness-icon{width:40px;min-width:40px;height:44px;min-height:44px;}
 #sp-imagen-review-panel .ness-section>summary{min-height:44px;}
 #sp-imagen-review-panel .ness-check-grid,#sp-imagen-review-panel .ness-rule-fields{grid-template-columns:minmax(0,1fr);}
 #sp-imagen-review-panel .ness-dialogue-row{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px;}
 #sp-imagen-review-panel .ness-settings-inline{flex-wrap:wrap;gap:10px;padding:12px;}
 #sp-imagen-review-panel .ness-settings-inline>.ness-check-label{margin-left:auto!important;}
 #sp-imagen-review-panel .ness-source-step{padding:11px;margin:8px 0;}
 #sp-imagen-review-panel .ness-before-after{grid-template-columns:minmax(0,1fr);gap:7px;}
 #sp-imagen-review-panel .ness-settings-form .ness-settings-card>summary{min-height:74px;}
 #sp-imagen-review-panel .ness-settings-form .ness-settings-card{padding-left:12px;padding-right:12px;}
 /* On narrow phones, each post count is a separate readable row. */
 #sp-imagen-review-panel .ness-settings-form .ness-numbers{grid-template-columns:minmax(0,1fr);gap:7px;}
 #sp-imagen-review-panel .ness-settings-form .ness-numbers>.ness-field{display:grid!important;grid-template-columns:minmax(0,1fr) 88px;align-items:center;gap:8px;min-height:46px;padding:3px 31px 3px 0!important;margin:0!important;}
 #sp-imagen-review-panel .ness-settings-form .ness-numbers>.ness-field>.ness-label{grid-column:1;grid-row:1;padding-right:0!important;overflow-wrap:anywhere;}
 #sp-imagen-review-panel .ness-settings-form .ness-numbers>.ness-field>.ness-input{grid-column:2;grid-row:1;min-width:0;}
 #sp-imagen-review-panel .ness-settings-form .ness-numbers>.ness-field>.spi-guide-help{right:0;top:50%;transform:translateY(-50%);}
 #sp-imagen-review-panel[data-dialog=settings] [data-review-actions]{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;padding:9px 10px!important;}
 #sp-imagen-review-panel[data-dialog=settings] [data-review-actions]>.ness-status{grid-column:1/-1;min-width:0;margin:0!important;}
 #sp-imagen-review-panel[data-dialog=settings] [data-review-actions]>.ness-button{width:100%;min-width:0;padding:8px 5px!important;font-size:12px!important;white-space:normal;overflow-wrap:anywhere;text-align:center;}
 #sp-imagen-review-panel .ness-settings-top>.ness-field{width:100%;}
 #sp-imagen-review-panel .ness-helper-shortcut{padding:10px 12px;}
 #sp-imagen-review-panel .ness-helper-shortcut>.ness-button{width:100%;}
 #sp-imagen-review-panel .ness-rule-head{grid-template-columns:minmax(0,1fr);}
 #sp-imagen-review-panel .ness-friendly-rule{padding:9px!important;}
 #sp-imagen-review-panel .ness-rule-explain{padding:9px;}
 #sp-imagen-review-panel .ness-settings-transferbar{justify-content:stretch;}
 #sp-imagen-review-panel .ness-settings-transferbar>.ness-button{flex:1;}
 #sp-imagen-review-panel .ness-library-item{height:80px;min-height:80px;}
 #sp-imagen-review-panel .ness-record-tags{height:36px;}
 #sp-imagen-review-panel .ness-tag-add{width:36px;min-height:36px;}
 #sp-imagen-review-panel .ness-tag-badge{min-height:36px;padding:7px 9px;}
 }
@media(prefers-reduced-motion:reduce){#sp-imagen-review-panel *{scroll-behavior:auto!important;}}
`;
