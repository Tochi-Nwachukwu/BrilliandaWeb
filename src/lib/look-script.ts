/** Where the chosen look is kept on this device. */
export const LOOK_KEY = "brillianda:look";

/** Runs in <head> before first paint, so a Neutral school never flashes Pastel. */
export const LOOK_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(LOOK_KEY)})==="neutral")document.documentElement.dataset.theme="neutral"}catch(e){}`;
