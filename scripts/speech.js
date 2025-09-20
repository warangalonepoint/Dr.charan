// Voice-to-text (Web Speech API) — graceful fallback.
// Usage:
//   const s = createSpeechToText((text, isFinal) => {...});
//   s.start(); s.stop();

export function createSpeechToText(onResult) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    return {
      supported: false,
      start(){ alert('Speech recognition not supported on this browser.'); },
      stop(){},
    };
  }

  const recog = new SR();
  recog.continuous = true;
  recog.interimResults = true;
  recog.lang = 'en-IN';0   

  recog.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const text = res[0].transcript;
      onResult(text, res.isFinal);
    }
  };
  recog.onerror = (e) => console.warn('speech error', e);

  return {
    supported: true,
    start(){ try{ recog.start(); }catch(_){} },
    stop(){ try{ recog.stop(); }catch(_){} }
  };
}