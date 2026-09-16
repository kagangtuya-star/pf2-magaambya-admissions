import {
  $,
  $$,
  esc,
  icon,
  toast,
  saveFile,
  openDialog,
  initDialog,
  focusHeading,
} from "./lib/dom.js";
import {
  createMachine,
  blankDraft,
  loadDraft,
  sanitizeDraft,
  persistDraft,
  missingAnswers,
  completion,
  DRAFT_KEY,
} from "./lib/state.js";
import { request, session } from "./lib/api.js";
import { CourtyardAudio } from "./lib/audio.js";

initDialog();
if (location.pathname.startsWith("/admin")) {
  document.body.className = "administration scene-flat";
  import("./admin.js")
    .then((m) => m.mount())
    .catch(() => {
      $("#app").textContent = "档案室暂时无法打开，请刷新重试。";
    });
} else {
  startAdmissions();
}
function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem("raincourt:preferences")) || {};
  } catch {
    return {};
  }
}
function startAdmissions() {
  const machine = createMachine(),
    audio = new CourtyardAudio();
  let draft = loadDraft(),
    content = null,
    token = session.get(),
    scene = null,
    sceneFailed = false,
    busy = false,
    page = draft.page || 0,
    receipt = null,
    site = { submission_enabled: true },
    savingFailed = false,
    skipMotion = false;
  const stored = readPreferences();
  let preferences = {
    quality: stored.quality || (innerWidth < 680 ? "low" : "balanced"),
    reduced: stored.reduced ?? false,
    flat: stored.flat ?? false,
  };
  let landingController = null,
    landingProgress = 0;
  const branchData = [
    [
      "承流学会",
      "想象",
      "推崇想象力，包含从最有远见的魔法理论家的设想，到各种富含创意的解决问题的奇思妙想。",
      "cascade",
    ],
    [
      "翠枝学社",
      "情谊",
      "强调友情、社区意识和与玛甘比校友们的联系；他们还善于与玛甘比之外的人互动，传递学院的信息。",
      "boughs",
    ],
    [
      "雨幕书会",
      "适应",
      "重视思想和实践上的适应能力，善于从失败中总结教训。",
      "rain",
    ],
    [
      "岚阳法盟",
      "勇气",
      "强调勇气，不仅是为帮助朋友和学校而行动，更注重思想上的勇气：敢于反对权威，而不是墨守成规。",
      "courage",
    ],
    [
      "传智学派",
      "知识",
      "相信知识不仅存在于世代相传的故事中，也能通过个人实践获得。",
      "knowledge",
    ],
  ];
  function brand() {
    return `<a class="brand" href="/" aria-label="玛甘比学院首页"><img src="/assets/crest.svg" alt="" width="44" height="44"><span>玛甘比学院<small>MAGAAMBYA</small></span></a>`;
  }
  function header() {
    return `<header class="masthead">${brand()}<nav class="top-nav" aria-label="主导航"><button type="button" data-action="branches" class="text-button">学院五支</button><button type="button" data-action="draft" class="text-button draft-nav">我的草稿</button><span class="nav-divider"></span><button type="button" class="icon-button" data-action="sound" aria-label="${audio.enabled ? "关闭音景" : "聆听庭院"}" aria-pressed="${audio.enabled}">${icon(audio.enabled ? "sound" : "mute")}</button><button type="button" class="icon-button" data-action="settings" aria-label="阅读与画面设置">${icon("tune")}</button></nav></header>`;
  }
  function syncSoundControl() {
    const control = $('[data-action="sound"]');
    if (!control) return;
    control.innerHTML = icon(audio.enabled ? "sound" : "mute");
    control.setAttribute("aria-label", audio.enabled ? "关闭音景" : "聆听庭院");
    control.setAttribute("aria-pressed", String(audio.enabled));
  }
  function footer() {
    return `<footer class="site-footer"><span class="footer-location"><i></i> 纳塔穆博 <span class="footer-slash">/</span> THE RAINCOURT</span><span class="footer-project">万千之力 · 入学档案</span><a href="/admin" class="archive-link">档案室 ${icon("arrow", 15)}</a></footer>`;
  }
  const button = (label, action, kind = "primary", extra = "") =>
    `<button type="button" class="${kind}" data-action="${action}" ${extra}>${label}<span>${icon("arrow")}</span></button>`;
  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }
  function applyLandingProgress(progress) {
    landingProgress = clamp(progress);
    document.documentElement.style.setProperty(
      "--landing-progress",
      landingProgress.toFixed(4),
    );
    const poster = $(".landing-poster"),
      prompt = $(".landing-prompt"),
      copy = $(".landing-copy"),
      caption = $(".landing-caption"),
      masthead = $(".masthead"),
      footer = $(".site-footer"),
      worldShade = $(".world-shade");
    const reveal3d = clamp((landingProgress - 0.08) / 0.36),
      copyReveal = clamp((landingProgress - 0.68) / 0.22),
      promptFade = 1 - clamp((landingProgress - 0.18) / 0.34),
      shadeLift = clamp((landingProgress - 0.28) / 0.44);
    if (poster) {
      poster.style.opacity = String(1 - reveal3d);
      poster.style.transform = `scale(${1 + 0.028 * (1 - reveal3d)})`;
      poster.style.filter = `blur(${(1 - reveal3d) * 2.2}px)`;
    }
    if (prompt) {
      prompt.style.opacity = String(promptFade);
      prompt.style.transform = `translateY(${(1 - promptFade) * 16}px)`;
      prompt.setAttribute("aria-hidden", promptFade < 0.08 ? "true" : "false");
    }
    if (copy) {
      copy.style.opacity = String(copyReveal);
      copy.style.transform = `translateY(${(1 - copyReveal) * 32}px)`;
      copy.style.pointerEvents = copyReveal > 0.94 ? "auto" : "none";
    }
    if (caption) {
      caption.style.opacity = String(copyReveal);
      caption.style.transform = `translateY(${(1 - copyReveal) * 18}px)`;
    }
    if (masthead) {
      masthead.style.opacity = String(copyReveal);
      masthead.style.pointerEvents = copyReveal > 0.94 ? "auto" : "none";
      masthead.style.transform = `translateY(${(1 - copyReveal) * -20}px)`;
    }
    if (footer) {
      footer.style.opacity = String(copyReveal);
      footer.style.pointerEvents = copyReveal > 0.94 ? "auto" : "none";
      footer.style.transform = `translateY(${(1 - copyReveal) * 20}px)`;
    }
    if (worldShade) worldShade.style.opacity = String(0.92 - shadeLift * 0.3);
    document.body.classList.toggle(
      "landing-intro-active",
      machine.phase === "arrival" && landingProgress < 0.98,
    );
    scene?.setLandingProgress?.(landingProgress);
  }
  function destroyLanding(reset = true) {
    if (landingController) {
      window.removeEventListener("scroll", landingController.onScroll);
      window.removeEventListener("resize", landingController.onResize);
      landingController = null;
    }
    if (reset) {
      document.documentElement.style.setProperty("--landing-progress", "1");
      scene?.setLandingProgress?.(1);
    }
    const nodes = [
      ".landing-poster",
      ".landing-prompt",
      ".landing-copy",
      ".landing-caption",
      ".masthead",
      ".site-footer",
      ".world-shade",
    ];
    nodes.forEach((sel) => {
      const el = $(sel);
      if (el) {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.filter = "";
        el.style.pointerEvents = "";
      }
    });
    document.body.classList.remove("landing-intro-active");
  }
  function initLanding() {
    const track = $(".landing-scroll");
    if (machine.phase !== "arrival" || !track) {
      destroyLanding();
      return;
    }
    if (landingController?.track === track) {
      landingController.sync();
      return;
    }
    destroyLanding(false);
    let frame = 0;
    const sync = () => {
      frame = 0;
      const max = Math.max(1, track.offsetHeight - window.innerHeight);
      const progress = clamp(-track.getBoundingClientRect().top / max);
      applyLandingProgress(progress);
    };
    const requestSync = () => {
      if (frame) return;
      frame = requestAnimationFrame(sync);
    };
    landingController = {
      track,
      sync,
      requestSync,
      onScroll: requestSync,
      onResize: requestSync,
    };
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync, { passive: true });
    sync();
  }
  function render() {
    const phase = machine.phase;
    document.body.className = `phase-${phase} ${sceneFailed || preferences.flat ? "scene-flat" : ""} ${preferences.reduced ? "reduced-motion" : ""} ${phase === "arrival" ? "landing-home" : ""}`;
    $("#app").innerHTML = header() + view() + footer();
    bindCommon();
    bindView();
    updateProgress();
    if (phase === "arrival") initLanding();
    else destroyLanding();
  }
  function view() {
    switch (machine.phase) {
      case "arrival":
        return `<main id="main" class="landing-screen"><section class="landing-scroll"><div class="landing-frame"><div class="landing-poster" aria-hidden="true"></div><div class="landing-prompt"><span class="landing-prompt__line"></span><p>玛甘比来信</p><small>向下滑动，接收你的魔法信件。</small><i>${icon("arrow", 18)}</i></div><div class="hero-copy landing-copy"><p class="eyebrow"><span class="fine-line"></span> 纳塔穆博 · 雨庭来信</p><h1 tabindex="-1">让你的故事<br><em>在此生根。</em></h1><p class="hero-description">先从这封着来信的匣子开始。<br>点击赴学院之约，凑近凉亭中的学院信匣。</p><div class="hero-actions">${button("赴学院之约", "approach")}<button type="button" class="understated" data-action="direct">直接阅信 ${icon("arrow", 16)}</button></div></div><div class="scene-caption landing-caption" aria-hidden="true"><span>庭院里的来信</span><small>THE COURTYARD LETTER</small><i></i></div><div class="hero-edition" aria-hidden="true">I</div><div class="landing-progressmark" aria-hidden="true"><span></span></div></div></section></main>`;
      case "chest":
        return `<main id="main" class="stage-screen"><div class="stage-copy"><button class="back-link" type="button" data-action="home">${icon("back", 17)} 返回庭院</button><p class="eyebrow">第一笺 <span>/</span> AN INVITATION</p><h1 tabindex="-1">一封为你<br>留存的来信。</h1><p class="stage-description">铜扣仍带着雨后的凉意。<br>说出交予你的启封词，让来信重见天光。</p><form id="unlock-form"><label class="field-label" for="spell">启封词</label><div class="spell-field"><input id="spell" name="spell" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="120" placeholder="在此写下启封词" required aria-describedby="unlock-error"><span>${icon("leaf")}</span></div><p id="unlock-error" class="form-error" role="alert"></p><button class="primary" type="submit" ${busy ? "disabled" : ""}>${busy ? "正在启封" : "开启来信"}<span>${icon("arrow")}</span></button></form></div><div class="object-note" aria-hidden="true">I <span>学院信匣</span></div></main>`;
      case "letter":
        return `<main id="main" class="stage-screen"><div class="stage-copy"><p class="eyebrow">第二笺 <span>/</span> A QUIET BEGINNING</p><h1 tabindex="-1">封蜡之下，<br>故事初始。</h1><p class="stage-description">薄纸承载的，并不只是邀约。<br>还有一群愿意与你同行的人。</p>${button("揭开封蜡", "unseal", "primary", busy ? "disabled" : "")}<button class="understated separate" type="button" data-action="read-now">直接阅读 ${icon("arrow", 16)}</button></div><div class="object-note" aria-hidden="true">II <span>寄给求学者</span></div></main>`;
      case "invitation":
        return `<main id="main" class="invitation-screen"><article class="invitation-paper"><div class="letter-top"><img src="/assets/crest.svg" alt="" width="56" height="56"><span>MAGAAMBYA<small>NANTAMBU</small></span></div><p class="eyebrow">致远道而来的求学者</p><h1 tabindex="-1">你的来处，<br>也是知识的来处。</h1><div class="letter-prose"><p>在这里，我们珍视的不只是你能施展何种魔法，还有你愿意为谁运用它。</p><p>带来你的疑问，你的经历，以及尚未成形的想法。你会向前人学习，也会成为后来者的引路人。</p><p>请在下一页留下名字与故事。我们期待认识你。</p></div><div class="letter-signature"><span>玛甘比学院</span><small>THE MAGAAMBYA</small></div>${button("开始书写", "write")}<span class="paper-page-number">01</span></article></main>`;
      case "writing":
        return writingView();
      case "review":
        return reviewView();
      case "receipt":
        return `<main id="main" class="receipt-screen"><article class="receipt-paper"><div class="receipt-seal">${icon("check", 32)}</div><p class="eyebrow">LETTER RECEIVED</p><h1 tabindex="-1">你的故事，<br>已抵达学院。</h1><p class="receipt-intro">${esc(receipt?.player_name || draft.name)}，谢谢你认真写下这一切。<br>来信已收存，静待主持人阅览。</p><dl class="receipt-meta"><div><dt>档案编号</dt><dd>${esc(receipt?.submission_id || "")}</dd></div><div><dt>收信时间</dt><dd>${receipt ? new Date(receipt.created_at).toLocaleString("zh-CN") : ""}</dd></div></dl><div class="receipt-actions">${button("保存来信副本", "receipt-export", "paper-button")}<button type="button" class="understated" data-action="restart">返回庭院 ${icon("arrow", 16)}</button></div></article></main>`;
      default:
        return "";
    }
  }
  function pageList() {
    return [
      "写下名字",
      "学前问答",
      ...(content?.page2_exam || []).map(
        (g, i) =>
          g.title ||
          (i === 0 ? "魔法与思考" : i === 1 ? "经历与同行" : `材料 ${i + 1}`),
      ),
    ];
  }
  function writingView() {
    if (!content)
      return `<main id="main" class="loading-page">正在取来题笺……</main>`;
    const pages = pageList(),
      g = content.page2_exam[page - 2],
      isStart = page === 0,
      isRiddles = page === 1;
    const subtitle = isStart
      ? "每段故事，都从一个名字开始。"
      : isRiddles
        ? "先让我们谈谈你即将走入的学院。"
        : "慢慢读，认真想。属于你的见解，比漂亮的措辞更重要。";
    const leftContent = isStart
      ? `<p class="material-lead">从此以后，<br>你也是这段传承的一部分。</p><p>旅途带你来到这里。接下来的书页，为你留白。</p><img class="botanical-plate" src="/assets/botanical.svg" alt="">`
      : isRiddles
        ? `<p class="material-lead">知识让我们相遇，<br>也让我们彼此照亮。</p><p>这些问题关于玛甘比的传统与精神。选择之后，你仍然可以返回修改。</p><div class="scholarship-note">${icon("book", 28)}<span>三道小问<br><small>PRELIMINARY QUESTIONS</small></span></div>`
        : `<span class="material-label">阅读材料 ${String(page - 1).padStart(2, "0")}</span><blockquote>${esc(g.reading_material).replaceAll("\n", "<br>")}</blockquote><div class="source-rule"></div><p class="material-instruction">读完材料后，在右页写下你的想法。</p>`;
    const rightContent = isStart
      ? `<div class="identity-field"><label class="field-label" for="player-name">在此署名</label><input id="player-name" maxlength="80" autocomplete="name" value="${esc(draft.name)}" placeholder="你希望我们如何称呼你" required><span class="identity-underline"></span><p>使用角色名，或与主持人约定的称呼。</p></div><div class="writing-promise"><span class="small-crest">${icon("leaf", 28)}</span><p>这里没有预先写好的故事。<br>请将真实的你，带到书页之间。</p></div><p class="privacy-note">草稿保存在本机。提交后，来信将由主持人阅览。</p>`
      : isRiddles
        ? content.page1_riddles
            .map(
              (q, i) =>
                `<fieldset class="riddle" id="${esc(q.id)}"><legend><span class="question-number">${String(i + 1).padStart(2, "0")}</span>${esc(q.question)}</legend><div class="options">${q.options.map((o) => `<label class="option ${draft.riddles[q.id] === o.key ? "selected" : ""}"><input type="radio" name="${esc(q.id)}" value="${esc(o.key)}" ${draft.riddles[q.id] === o.key ? "checked" : ""}><span class="option-key">${esc(o.key)}</span><span>${esc(o.text)}</span><i>${icon("check", 15)}</i></label>`).join("")}</div><p class="question-error" role="alert"></p></fieldset>`,
            )
            .join("")
        : g.questions
            .map(
              (q, i) =>
                `<section class="essay" id="${esc(q.id)}"><div class="essay-heading"><span class="question-number">${String(i + 1).padStart(2, "0")}</span><h3><label for="answer-${esc(q.id)}">${esc(q.question)}</label></h3><span class="points">${esc(q.points ?? "")} 分</span></div><textarea id="answer-${esc(q.id)}" data-answer="${esc(q.id)}" rows="${g.questions.length === 1 ? 10 : 6}" maxlength="10000" ${q.required !== false ? "required" : ""} placeholder="在这里落笔……">${esc(draft.answers[q.id] || "")}</textarea><div class="answer-meta"><span>${q.required === false ? "选答" : "必答"}</span><span data-count="${esc(q.id)}">${(draft.answers[q.id] || "").length} / 10000</span></div></section>`,
            )
            .join("");
    return `<main id="main" class="scribe-shell"><aside class="folio-nav"><div class="folio-caption"><span>你的入学书笺</span><small>THE ADMISSIONS FOLIO</small></div><ol>${pages.map((name, i) => `<li><button type="button" data-page="${i}" class="${i === page ? "active" : ""}" ${i === page ? 'aria-current="step"' : ""}><span>${String(i + 1).padStart(2, "0")}</span>${esc(name)}</button></li>`).join("")}</ol><div class="folio-progress"><div class="progress-track"><span id="progress-bar"></span></div><p id="progress-text"></p></div><button type="button" class="folio-return" data-action="return-chest">${icon("back", 16)} 暂别书桌</button></aside><section class="folio"><header class="folio-header"><div><p class="eyebrow">${String(page + 1).padStart(2, "0")} <span>/</span> ${String(pages.length).padStart(2, "0")}</p><h1 tabindex="-1">${esc(pages[page])}</h1><p>${subtitle}</p></div><div class="folio-tools"><span id="save-status">${savingFailed ? "未能保存草稿" : "草稿已保存在本机"}</span><button class="icon-button" type="button" data-action="export" aria-label="导出草稿">${icon("download")}</button></div></header><div class="open-book"><aside class="paper-left">${leftContent}<span class="folio-imprint">MAGAAMBYA · NANTAMBU</span></aside><div class="paper-right ${isStart ? "identity-page" : ""}">${rightContent}</div></div><footer class="folio-footer"><button type="button" class="back-link" data-action="previous" ${page === 0 ? "disabled" : ""}>${icon("back", 17)} 上一页</button><span class="folio-leaf">${icon("leaf", 20)}</span><button type="button" class="paper-button" data-action="next" ${busy ? "disabled" : ""}>${busy ? "正在核对" : page === pages.length - 1 ? "核对来信" : "下一页"} ${icon("arrow", 18)}</button></footer></section></main>`;
  }
  function reviewView() {
    const rows = content.page1_riddles
      .map(
        (q) =>
          `<div class="review-answer"><h3>${esc(q.question)}</h3><p>${esc(q.options.find((o) => o.key === draft.riddles[q.id])?.text || "未作答")}</p></div>`,
      )
      .join("");
    return `<main id="main" class="review-screen"><article class="review-paper"><header class="review-title"><p class="eyebrow">BEFORE YOU SEND</p><h1 tabindex="-1">让我们再读一遍。</h1><p>封好来信之前，请核对署名与每一页回答。</p></header><div class="review-name"><small>来信人</small><strong>${esc(draft.name)}</strong><button class="understated" type="button" data-edit="0">修改署名</button></div><details class="review-objective"><summary>学前问答 <span>${content.page1_riddles.length} 题</span></summary>${rows}<button class="understated" type="button" data-edit="1">返回修改</button></details>${content.page2_exam.map((g, i) => `<section class="review-section"><div class="review-section-title"><h2>${esc(pageList()[i + 2])}</h2><button class="understated" type="button" data-edit="${i + 2}">返回修改</button></div>${g.questions.map((q) => `<div class="review-answer"><h3>${esc(q.question)}</h3><p class="preserve-lines">${esc(draft.answers[q.id] || "未作答")}</p></div>`).join("")}</section>`).join("")}<div class="submission-area"><label class="consent"><input id="consent" type="checkbox"><span>我已核对来信，愿将以上内容交予主持人阅览。</span></label><p class="form-error" id="submit-error" role="alert"></p><div class="submission-actions"><button class="back-link" type="button" data-action="edit-last">${icon("back", 17)} 继续修改</button><button class="primary" type="button" data-action="submit" ${busy ? "disabled" : ""}>${busy ? "正在寄出" : "封存并寄出"}<span>${icon("arrow")}</span></button></div></div></article></main>`;
  }
  async function go(phase, instant = false) {
    machine.go(phase);
    render();
    focusHeading();
    window.scrollTo({ top: 0, behavior: "instant" });
    await scene?.go(phase, { instant: instant || skipMotion });
  }
  function bindCommon() {
    $$("[data-action]").forEach((el) =>
      el.addEventListener("click", () => action(el.dataset.action)),
    );
    $$("[data-page]").forEach(
      (el) =>
        (el.onclick = () => {
          save();
          page = Number(el.dataset.page);
          draft.page = page;
          save();
          render();
          focusHeading();
          window.scrollTo({ top: 0, behavior: "instant" });
        }),
    );
    $$("[data-edit]").forEach(
      (el) =>
        (el.onclick = () => {
          page = Number(el.dataset.edit);
          draft.page = page;
          go("writing");
        }),
    );
  }
  function bindView() {
    $("#unlock-form")?.addEventListener("submit", unlock);
    $("#player-name")?.addEventListener("input", (e) => {
      draft.name = e.target.value;
      save();
    });
    $$(".riddle input").forEach(
      (input) =>
        (input.onchange = () => {
          draft.riddles[input.name] = input.value;
          input.closest("fieldset").classList.remove("invalid");
          input
            .closest("fieldset")
            .querySelector(".question-error").textContent = "";
          $$(".option", input.closest("fieldset")).forEach((l) =>
            l.classList.toggle("selected", l.contains(input)),
          );
          save();
        }),
    );
    $$("[data-answer]").forEach((input) =>
      input.addEventListener("input", () => {
        draft.answers[input.dataset.answer] = input.value;
        const count = $(`[data-count="${CSS.escape(input.dataset.answer)}"]`);
        if (count) count.textContent = `${input.value.length} / 10000`;
        input.closest(".essay").classList.remove("invalid");
        save();
      }),
    );
  }
  function save() {
    try {
      persistDraft(draft);
      savingFailed = false;
      const label = $("#save-status");
      if (label) label.textContent = "草稿已保存在本机";
    } catch {
      savingFailed = true;
      const label = $("#save-status");
      if (label) label.textContent = "请导出草稿备份";
    }
    updateProgress();
  }
  function updateProgress() {
    const p = completion(draft, content);
    if ($("#progress-bar"))
      $("#progress-bar").style.width = `${(p.done / p.total) * 100}%`;
    if ($("#progress-text"))
      $("#progress-text").textContent = `已落笔 ${p.done} / ${p.total}`;
  }
  async function unlock(event) {
    event.preventDefault();
    if (busy) return;
    const spell = $("#spell").value;
    if (!spell.trim()) return;
    busy = true;
    const submit = $("#unlock-form button");
    submit.disabled = true;
    submit.firstChild.textContent = "正在启封";
    $("#unlock-error").textContent = "";
    try {
      const result = await request("/api/public/unlock", {
        method: "POST",
        body: { spell },
      });
      token = result.attempt_token;
      session.set(token);
      content = await request("/api/public/exam", { token });
      const oldVersion = draft.version;
      draft = sanitizeDraft(draft, content);
      draft.version = content.updated_at;
      page = Math.min(draft.page, pageList().length - 1);
      save();
      audio.chime();
      busy = false;
      if (oldVersion && oldVersion !== content.updated_at)
        toast("题笺已更新，请重新核对保留的回答。");
      if (skipMotion) await go("invitation", true);
      else await go("letter");
    } catch (error) {
      busy = false;
      if ($("#unlock-error")) $("#unlock-error").textContent = error.message;
      if (submit.isConnected) {
        submit.disabled = false;
        submit.firstChild.textContent = "开启来信";
      }
    }
  }
  async function checkRiddles() {
    for (const q of content.page1_riddles) {
      if (!draft.riddles[q.id]) {
        showMissing({ page: 1, id: q.id, message: "请为每一道小问选择答案。" });
        return false;
      }
      try {
        await request("/api/public/riddles/verify", {
          method: "POST",
          body: { question_id: q.id, answer_key: draft.riddles[q.id] },
          token,
        });
      } catch (error) {
        if (error.code === "RIDDLE_ANSWER_INCORRECT") {
          showMissing({
            page: 1,
            id: q.id,
            message: "这一题还需再想一想。请核对学院的相关资料。",
          });
          return false;
        }
        throw error;
      }
    }
    return true;
  }
  function showMissing(item) {
    page = item.page;
    draft.page = page;
    if (machine.phase !== "writing") machine.go("writing");
    render();
    scene?.go("writing", { instant: true });
    const target = document.getElementById(item.id);
    target?.classList.add("invalid");
    target?.scrollIntoView({
      block: "center",
      behavior: preferences.reduced ? "instant" : "smooth",
    });
    const error = target?.querySelector(".question-error");
    if (error) error.textContent = item.message;
    const input = target?.matches("input,textarea")
      ? target
      : target?.querySelector("input,textarea");
    input?.focus({ preventScroll: true });
    toast(item.message);
  }
  async function next() {
    if (busy || !content) return;
    save();
    const missing = missingAnswers(draft, content).find((m) => m.page === page);
    if (missing) {
      showMissing(missing);
      return;
    }
    if (page === 1) {
      busy = true;
      const btn = $('[data-action="next"]');
      if (btn) btn.disabled = true;
      try {
        if (!(await checkRiddles())) return;
      } catch (error) {
        handleError(error);
        return;
      } finally {
        busy = false;
        const current = $('[data-action="next"]');
        if (current) current.disabled = false;
      }
    }
    if (page < pageList().length - 1) {
      page++;
      draft.page = page;
      save();
      render();
      focusHeading();
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      const missingAll = missingAnswers(draft, content)[0];
      if (missingAll) {
        showMissing(missingAll);
        return;
      }
      busy = true;
      try {
        if (await checkRiddles()) await go("review");
      } catch (error) {
        handleError(error);
      } finally {
        busy = false;
        render();
      }
    }
  }
  function handleError(error) {
    if (error.status === 401 || error.code === "EXAM_CHANGED") {
      token = "";
      session.clear();
      save();
      busy = false;
      go("chest", true);
      toast(
        error.code === "EXAM_CHANGED"
          ? "题笺已有更新，请重新启封；草稿已保留。"
          : "启封凭据已过期，请重新启封；草稿已保留。",
      );
    } else toast(error.message);
  }
  async function submit() {
    if (busy) return;
    if (!$("#consent")?.checked) {
      $("#submit-error").textContent = "请先确认来信内容与阅览授权。";
      $("#consent").focus();
      return;
    }
    busy = true;
    $("#submit-error").textContent = "";
    const btn = $('[data-action="submit"]');
    btn.disabled = true;
    btn.firstChild.textContent = "正在寄出";
    try {
      receipt = await request("/api/public/submissions", {
        method: "POST",
        token,
        body: {
          player_name: draft.name.trim(),
          riddle_answers: draft.riddles,
          exam_answers: draft.answers,
        },
      });
      busy = false;
      audio.chime();
      await go("receipt");
    } catch (error) {
      busy = false;
      if (error.status === 401 || error.code === "EXAM_CHANGED") {
        handleError(error);
        return;
      }
      if ($("#submit-error")) $("#submit-error").textContent = error.message;
      if (btn.isConnected) {
        btn.disabled = false;
        btn.firstChild.textContent = "封存并寄出";
      }
    }
  }
  async function action(name) {
    switch (name) {
      case "approach":
        skipMotion = false;
        await go("chest");
        $("#spell")?.focus({ preventScroll: true });
        break;
      case "direct":
        skipMotion = true;
        await go("chest", true);
        $("#spell")?.focus({ preventScroll: true });
        break;
      case "home":
        go("arrival");
        break;
      case "unseal":
        if (busy) return;
        busy = true;
        $('[data-action="unseal"]').disabled = true;
        audio.chime();
        await go("invitation");
        busy = false;
        break;
      case "read-now":
        go("invitation", true);
        break;
      case "write":
        page = Math.min(draft.page, pageList().length - 1);
        await go("writing");
        break;
      case "return-chest":
        save();
        go("chest");
        break;
      case "previous":
        if (page > 0) {
          save();
          page--;
          draft.page = page;
          save();
          render();
          focusHeading();
        }
        break;
      case "next":
        await next();
        break;
      case "edit-last":
        page = pageList().length - 1;
        go("writing");
        break;
      case "submit":
        await submit();
        break;
      case "export":
        saveFile("玛甘比-入学草稿.json", draft);
        break;
      case "receipt-export":
        saveFile("玛甘比-来信回执.json", {
          format: "raincourt-receipt",
          receipt,
          questions: content.page2_exam,
          riddle_answers: draft.riddles,
        });
        break;
      case "restart":
        session.clear();
        token = "";
        draft = blankDraft();
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        content = null;
        receipt = null;
        page = 0;
        go("arrival");
        break;
      case "branches":
        showBranches();
        break;
      case "draft":
        showDraft();
        break;
      case "settings":
        showSettings();
        break;
      case "sound":
        try {
          await audio.toggle();
          syncSoundControl();
        } catch (e) {
          toast(e.message);
        }
        break;
    }
  }
  function showBranches() {
    openDialog(
      `<p class="eyebrow">FIVE BRANCHES · ONE COMMUNITY</p><h2>五种求知的方式，<br>同一座学院。</h2><p class="dialog-intro">学派强调不同的价值，而知识在彼此交流中生长。</p><div class="branches">${branchData.map(([name, value, text, glyph], i) => `<article><span class="branch-number">0${i + 1}</span><div><h3>${name}<small>${value}</small></h3><p>${text}</p></div><span class="branch-glyph ${glyph}" aria-hidden="true">${icon(glyph, 28)}</span></article>`).join("")}</div>`,
    );
  }
  function showDraft() {
    openDialog(
      `<p class="eyebrow">YOUR UNFINISHED LETTER</p><h2>为下一次落笔，<br>留存这一页。</h2><p class="dialog-intro">${draft.updatedAt ? `最近保存于 ${new Date(draft.updatedAt).toLocaleString("zh-CN")}` : "尚未保存入学草稿。"}</p><div class="draft-summary"><span>来信人</span><strong>${esc(draft.name || "尚未署名")}</strong></div><div class="dialog-actions"><button type="button" class="paper-button" id="draft-resume">继续书写 ${icon("arrow", 17)}</button><button type="button" class="understated" id="draft-download">导出草稿</button><label class="understated import-label">导入草稿<input type="file" id="draft-import" accept="application/json,.json"></label></div><p class="dialog-footnote">导出文件可在其他设备上导入。导入后仍需使用启封词进入。</p>`,
      () => {
        $("#draft-download").onclick = () =>
          saveFile("玛甘比-入学草稿.json", draft);
        $("#draft-resume").onclick = async () => {
          $("#dialog").close();
          if (content && token) {
            page = draft.page || 0;
            if (["arrival", "invitation"].includes(machine.phase))
              go("writing");
            else if (machine.phase === "review") go("writing");
            else if (machine.phase === "writing") {
              render();
              focusHeading();
            } else if (
              machine.phase === "chest" ||
              machine.phase === "letter"
            ) {
              machine.go("invitation");
              go("writing", true);
            } else {
              skipMotion = true;
              machine.go("arrival");
              go("writing", true);
            }
          } else {
            skipMotion = true;
            if (machine.phase === "receipt") {
              machine.go("arrival");
            }
            go("chest", true);
            toast("请先使用启封词取回题笺。");
          }
        };
        $("#draft-import").onchange = async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 500000) {
            toast("草稿文件过大。");
            return;
          }
          try {
            const raw = JSON.parse(await file.text());
            draft = sanitizeDraft(raw, content);
            page = draft.page;
            save();
            $("#dialog").close();
            render();
            toast("草稿已导入。");
          } catch (error) {
            toast(error.message || "无法读取这份草稿。");
          }
        };
      },
    );
  }
  function showSettings() {
    openDialog(
      `<p class="eyebrow">YOUR PACE, YOUR WAY</p><h2>在舒适的节奏里阅读。</h2><div class="settings-fields"><label><span>画面层次</span><select id="quality"><option value="low" ${preferences.quality === "low" ? "selected" : ""}>轻盈</option><option value="balanced" ${preferences.quality === "balanced" ? "selected" : ""}>均衡</option><option value="high" ${preferences.quality === "high" ? "selected" : ""}>细腻</option></select></label><label><span>减少动态</span><input id="reduced" type="checkbox" ${preferences.reduced ? "checked" : ""}></label><label><span>使用静态庭院</span><input id="flat" type="checkbox" ${preferences.flat ? "checked" : ""}></label></div><div class="dialog-actions"><button type="button" id="settings-save" class="paper-button">保存设置 ${icon("check", 17)}</button></div>`,
      () => {
        $("#settings-save").onclick = async () => {
          preferences = {
            quality: $("#quality").value,
            reduced: $("#reduced").checked,
            flat: $("#flat").checked,
          };
          try {
            localStorage.setItem(
              "raincourt:preferences",
              JSON.stringify(preferences),
            );
          } catch {}
          $("#dialog").close();
          if (preferences.flat) {
            scene?.dispose();
            scene = null;
            $("#world").classList.remove("is-ready");
          } else if (scene) scene.configure(preferences);
          else await loadScene();
          render();
        };
      },
    );
  }
  async function loadScene() {
    if (preferences.flat) return;
    try {
      const module = await import("./scene/scene.js");
      scene = module.createScene($("#world"), {
        ...preferences,
        onActivate: (phase) => {
          if (phase === "arrival") action("approach");
          else if (phase === "letter") action("unseal");
          else $("#spell")?.focus();
        },
        onFailure: () => {
          sceneFailed = true;
          scene?.dispose();
          scene = null;
          $("#world").classList.remove("is-ready");
          render();
        },
      });
      sceneFailed = false;
      scene.setLandingProgress?.(
        machine.phase === "arrival" ? landingProgress : 1,
      );
      await scene.go(machine.phase, { instant: true });
      scene.setLandingProgress?.(
        machine.phase === "arrival" ? landingProgress : 1,
      );
    } catch (error) {
      sceneFailed = true;
      $("#world").classList.remove("is-ready");
      document.body.classList.add("scene-flat");
      console.warn("Raincourt: static illustration active.", error.message);
    }
  }
  render();
  request("/api/public/site")
    .then((data) => {
      site = data;
      if (!data.submission_enabled)
        toast("学院目前暂停收信，你仍可阅信和保存草稿。");
    })
    .catch(() => {});
  loadScene();
  const activateAudio = async (event) => {
    if (event.target?.closest?.('[data-action="sound"]')) return;
    document.removeEventListener("pointerdown", activateAudio, true);
    document.removeEventListener("keydown", activateAudio, true);
    try {
      await audio.enable();
      syncSoundControl();
    } catch {}
  };
  document.addEventListener("pointerdown", activateAudio, {
    capture: true,
    passive: true,
  });
  document.addEventListener("keydown", activateAudio, true);
  document.addEventListener("visibilitychange", () =>
    document.hidden ? audio.pause() : audio.resume(),
  );
  window.addEventListener("pagehide", () => {
    document.removeEventListener("pointerdown", activateAudio, true);
    document.removeEventListener("keydown", activateAudio, true);
    save();
    audio.dispose();
    scene?.dispose();
    destroyLanding(false);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
  });
  window.__RAINCOURT__ = {
    get phase() {
      return machine.phase;
    },
    get scene() {
      return scene;
    },
    get stats() {
      return scene?.stats() || { mode: "static" };
    },
  };
}
