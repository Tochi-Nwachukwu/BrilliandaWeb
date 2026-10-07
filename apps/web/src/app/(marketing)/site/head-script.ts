/** Remembers that the intro has been seen, so it plays on a first visit only. */
export const INTRO_KEY = "brillianda-seen";

/** Runs in <head> before first paint: the saved light/dark choice, and skipping the intro on a return visit. */
export const SITE_HEAD_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem("brillianda-theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t);if(localStorage.getItem("${INTRO_KEY}")==="1"||matchMedia("(prefers-reduced-motion: reduce)").matches)d.classList.add("intro-skip")}catch(e){}`;
