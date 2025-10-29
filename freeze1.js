// freeze1.js — Fake "freeze" sicuro, mobile-first, avvia audio al primo gesto (ottimizzato per iPhone)
(function () {
  if (window.__SAFE_FREEZE1_LOADED__) return;
  window.__SAFE_FREEZE1_LOADED__ = true;

  // --- CONFIG ---
  const AUTO_TIMEOUT_MS = 8000;    // tempo massimo prima di rimuovere overlay automaticamente
  const REMOVE_AFTER_AUDIO_MS = 500; // rimuove overlay X ms dopo fine audio (se play once)
  const AUDIO_SRC = "troll.mp3";   // percorso file audio (metti troll.mp3 nella stessa cartella)
  const AUDIO_LOOP = false;        // true per loop continuo, false per riproduzione singola
  const PLAY_ON_FIRST_TAP = true;  // play audio al primo gesto dell'utente
  // ---------------

  // crea overlay
  const overlay = document.createElement("div");
  overlay.id = "safe-freeze1-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-live", "polite");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0,0,0,0.90)";
  overlay.style.color = "#fff";
  overlay.style.zIndex = 2147483647;
  overlay.style.textAlign = "center";
  overlay.style.padding = "20px";
  overlay.style.boxSizing = "border-box";
  overlay.style.webkitTapHighlightColor = "transparent";

  // inner content (touch-friendly)
  const inner = document.createElement("div");
  inner.style.maxWidth = "94%";
  inner.style.padding = "18px";
  inner.style.borderRadius = "12px";
  inner.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial';
  inner.style.userSelect = "none";
  inner.style.webkitUserSelect = "none";
  inner.innerHTML = `
    <div style="font-size:56px;line-height:1">😵‍💫</div>
    <div id="sf1-msg" style="margin-top:12px;font-size:20px">Sembra che la pagina si sia bloccata…</div>
    <div style="margin-top:8px;font-size:15px;opacity:0.9">Tocca lo schermo per sbloccare e sentire un suono.</div>
    <div style="margin-top:14px">
      <button id="sf1-unfreeze" style="padding:12px 18px;font-size:18px;border-radius:10px;border:none;cursor:pointer">
        Ripristina ora
      </button>
    </div>
  `;
  overlay.appendChild(inner);

  // append overlay e disabilita scroll sottostante
  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  document.documentElement.appendChild(overlay);

  // audio element (preload)
  const audio = new Audio(AUDIO_SRC);
  audio.preload = "auto";
  audio.loop = !!AUDIO_LOOP;

  // stato
  let unlocked = false; // audio "sbloccato" dal gesto
  let playedOnce = false;

  // funzione pulita per rimuovere overlay
  function unfreeze() {
    if (!document.documentElement.contains(overlay)) return;
    overlay.style.opacity = "0";
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.documentElement.style.overflow = prevOverflow || "";
    }, 260);
    cleanup();
  }

  // funzione che prova a sbloccare il contesto audio: play/pause rapido
  function tryUnlockAudio() {
    if (unlocked) return Promise.resolve(true);
    // Alcuni browser considerano questo gesto valido, così i successivi play funzionano
    return audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        unlocked = true;
        return true;
      })
      .catch(() => {
        // rifiutato, ma non grave — il play legato allo stesso evento user gesture può ancora suonare
        return false;
      });
  }

  // funzione che riproduce l'audio (legata a gesto)
  function playAudioOnce() {
    if (!AUDIO_SRC) return;
    // se già suonato e non loop, non riavviare
    if (playedOnce && !AUDIO_LOOP) return;
    audio.currentTime = 0;
    audio.play().then(() => {
      playedOnce = true;
      // se non è in loop, rimuoviamo overlay qualche ms dopo la fine
      if (!AUDIO_LOOP) {
        audio.addEventListener("ended", onAudioEndedOnce, { once: true });
      }
    }).catch(() => {
      // se play fallisce (rare su gesture valida), semplicemente lasciamo overlay e l'utente può premere il bottone
    });
  }

  function onAudioEndedOnce() {
    // attendi un attimo e poi rimuovi overlay per esperienza più fluida
    setTimeout(unfreeze, REMOVE_AFTER_AUDIO_MS);
  }

  // handler: il primo tap sullo schermo sblocca audio e avvia riproduzione se configurato
  function onFirstGesture(e) {
    // preveniamo doppio triggering se l'utente ha premuto il bottone (questo handler viene prima)
    // non stopPropagation: vogliamo comunque catturare il gesto
    tryUnlockAudio().finally(() => {
      if (PLAY_ON_FIRST_TAP) {
        playAudioOnce();
      }
      // se vuoi che il tap rimuova subito l'overlay anche prima dell'audio, puoi
      // unfreeze(); // <-- altrimenti lasciamo overlay fino a timeout o fine audio
    });
  }

  // rendiamo il tap ovunque sul overlay un gesto per sbloccare (utile su mobile)
  overlay.addEventListener("touchstart", onFirstGesture, { passive: true, once: true });
  overlay.addEventListener("click", onFirstGesture, { passive: true, once: true });

  // pulsante ripristina
  const btn = overlay.querySelector("#sf1-unfreeze");
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    // se l'utente preme il bottone è considerata interazione: possiamo anche riprodurre audio qui
    tryUnlockAudio().finally(() => {
      // facciamo partire l'audio (opzionale): qui l'utente ha fatto gesto esplicito
      playAudioOnce();
    });
    unfreeze();
  });

  // ESC per desktop
  function onKeyDown(e) {
    if (e.key === "Escape") {
      unfreeze();
    }
  }
  document.addEventListener("keydown", onKeyDown);

  // auto-rimozione dopo DEFAULT timeout (utente non resta bloccato)
  const autoTimer = setTimeout(() => {
    // Se l'audio è in riproduzione con loop, non rimuoviamo automaticamente.
    if (AUDIO_LOOP && !audio.paused) {
      // se in loop lasciamo overlay finché non viene rimosso dall'utente
      return;
    }
    unfreeze();
  }, AUTO_TIMEOUT_MS);

  // cleanup
  function cleanup() {
    clearTimeout(autoTimer);
    document.removeEventListener("keydown", onKeyDown);
    overlay.removeEventListener("touchstart", onFirstGesture);
    overlay.removeEventListener("click", onFirstGesture);
  }

  // Setting per evitare che il focus vada altrove
  overlay.tabIndex = -1;
  overlay.focus && overlay.focus();

  // (Opzionale) Se vuoi attivare solo via query param, puoi decommentare e gestire:
  // if (new URLSearchParams(location.search).get('freeze') !== '1') { unfreeze(); }
})();
