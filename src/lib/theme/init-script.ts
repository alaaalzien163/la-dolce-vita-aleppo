/**
 * Resolves the persisted theme before the document paints. Both root layouts use
 * this exact script so public and admin pages cannot drift into separate theme
 * systems. Reading localStorage here keeps public locale pages statically rendered.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("ldv-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;
