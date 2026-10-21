export const STYLE = `
@font-face{font-family:"Bricolage";src:url("fonts/latin-ext.woff2") format("woff2");font-weight:200 800;unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}
@font-face{font-family:"Bricolage";src:url("fonts/latin.woff2") format("woff2");font-weight:200 800;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
*{box-sizing:border-box;margin:0}
body{margin:0;background:#efe9fb}
#root{position:relative;width:1280px;height:720px;overflow:hidden;font-family:"Bricolage",system-ui,sans-serif;color:#2a1d3d;background:#efe9fb}
.clip.scene{position:absolute;inset:0}
.stage{position:absolute;inset:0}
.backdrop{filter:blur(7px) saturate(1.1);transform:scale(1.04)}
.backdrop + .board{background:radial-gradient(circle at 88% 12%,rgba(255,226,190,0.55) 0,rgba(255,226,190,0) 34%),linear-gradient(160deg,rgba(246,241,255,0.86) 0%,rgba(236,228,252,0.8) 60%,rgba(248,232,243,0.84) 100%)}
#level{position:absolute;left:28px;top:22px;z-index:20;font-weight:800;font-size:21px;letter-spacing:0.06em;color:#ffffff;background:linear-gradient(135deg,#7c4dd6,#b24fc7);border-radius:14px;padding:5px 14px;box-shadow:0 6px 16px rgba(60,20,120,0.3)}
#progress{position:absolute;left:0;bottom:0;height:6px;width:1280px;background:linear-gradient(90deg,#ff8a5b,#e2559b,#7c4dd6);transform-origin:0 50%;z-index:20}
.overlay-title{position:absolute;left:112px;top:24px;font-size:23px;font-weight:700;color:#3b2566;background:rgba(255,255,255,0.88);border-radius:14px;padding:6px 16px;opacity:0;box-shadow:0 6px 16px rgba(60,20,120,0.18)}
.phrase-card{position:absolute;transform:translateX(-50%);min-width:180px;max-width:440px;background:#ffffff;border:3px solid #5b3da0;border-radius:22px;padding:12px 24px;text-align:center;opacity:0;box-shadow:0 10px 24px rgba(60,20,120,0.25),0 4px 0 rgba(91,61,160,0.25)}
.phrase-card::after{content:"";position:absolute;left:50%;bottom:-14px;margin-left:-12px;border:12px solid transparent;border-top-color:#5b3da0;border-bottom:0}
.phrase-card{width:max-content}.phrase-card .said{display:block;font-size:40px;font-weight:800;line-height:1.1;white-space:nowrap;color:#2a1d3d}
.phrase-card.long{max-width:640px}.phrase-card.long .said{white-space:normal;font-size:32px}
.phrase-card.xlong .said{font-size:26px}.phrase-card.xlong .gloss{font-size:18px}
.phrase-card .gloss{display:block;margin-top:4px;font-size:22px;color:#6a5a8a;opacity:0}
.phrase-card.answer{border-color:#1f8a5b}.phrase-card.answer::after{border-top-color:#1f8a5b}
.phrase-card .ok{position:absolute;left:-18px;top:-18px;width:36px;height:36px;border-radius:50%;background:#1f8a5b;color:#fff;font-size:22px;line-height:36px;text-align:center}
.dim{position:absolute;inset:0;background:rgba(40,16,80,0.28)}
.prompt{position:absolute;left:50%;top:64px;transform:translateX(-50%);background:linear-gradient(135deg,#3b2566,#5b3da0);color:#ffffff;font-size:30px;font-weight:700;border-radius:18px;padding:14px 28px;opacity:0;width:max-content;max-width:1000px;text-align:center;box-shadow:0 12px 28px rgba(40,16,80,0.35)}
.prompt .tag{display:block;font-size:16px;letter-spacing:0.12em;text-transform:uppercase;color:#ffb3d4;margin-bottom:4px}
.timer{position:absolute;left:50%;top:236px;margin-left:-30px;width:60px;height:60px;opacity:0}
.check{position:absolute;left:50%;bottom:46px;transform:translateX(-50%);font-size:26px;font-weight:600;color:#3b2566;background:rgba(255,255,255,0.94);border-radius:14px;padding:8px 20px;opacity:0;white-space:nowrap;box-shadow:0 8px 20px rgba(60,20,120,0.2)}
.board{position:absolute;inset:0;padding:120px 120px 60px;background:radial-gradient(circle at 88% 12%,rgba(255,214,170,0.75) 0,rgba(255,214,170,0) 32%),radial-gradient(circle at 8% 92%,rgba(226,85,155,0.22) 0,rgba(226,85,155,0) 38%),linear-gradient(160deg,#f3edff 0%,#e6dcfb 55%,#f6e3f0 100%);display:flex;flex-direction:column;justify-content:center;gap:16px}
.board::before{content:"";position:absolute;left:92px;top:90px;bottom:90px;width:6px;border-radius:3px;background:linear-gradient(180deg,#ff8a5b,#e2559b,#7c4dd6)}
.board::after{content:"";position:absolute;right:-120px;top:-160px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.7) 0,rgba(255,255,255,0) 70%)}
.heading{font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#7c4dd6}
.focus-phrase{font-size:110px;font-weight:800;line-height:1;letter-spacing:-0.02em;color:#2a1d3d}
.focus-phrase.long{font-size:60px;line-height:1.1}
.focus-phrase mark{background:linear-gradient(transparent 60%,rgba(226,85,155,0.45) 60%) no-repeat;background-size:0% 40%;background-position:0 100%;color:inherit}
.focus-meaning{font-size:40px;color:#5a4a7a;opacity:0}
.respell{font-size:34px;opacity:0}.respell b{color:#c2407f}
.panels{display:flex;gap:18px;margin-top:10px}
.panel{background:#ffffff;border:2px solid rgba(91,61,160,0.18);border-radius:18px;padding:14px 20px;opacity:0;transform:translateY(12px);box-shadow:0 8px 20px rgba(60,20,120,0.12)}
.panel .cap{display:block;font-size:18px;color:#7a6a9a}.panel .said{font-size:34px;font-weight:800}
.contrast{display:flex;gap:40px}
.col{flex:1;border:3px solid rgba(91,61,160,0.18);border-radius:22px;padding:16px 24px;background:#ffffff;text-align:center;box-shadow:0 8px 20px rgba(60,20,120,0.12)}
.col .spell{font-size:72px;font-weight:800;line-height:1}.col .mouth{width:270px;height:210px}
.col .word{font-size:40px;font-weight:800}.col .gloss{font-size:22px;color:#6a5a8a}
.note-small{font-size:18px;color:#7a6a9a}
.body{font-size:40px;line-height:1.3;max-width:900px;color:#3b2566}
.arrow{width:180px;height:60px;fill:none;stroke:#e2559b;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
`;
