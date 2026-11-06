(() => {
  "use strict";
  const data = window.CV_DATA;
  if (!data) return;
  const root = document.documentElement,
    $ = (s, c = document) => c.querySelector(s),
    $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const gsap = window.gsap,
    ScrollTrigger = window.ScrollTrigger,
    ScrollToPlugin = window.ScrollToPlugin;
  if (gsap && ScrollTrigger && ScrollToPlugin)
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const storage = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {}
    },
  };
  let language = storage.get("abdullah-language") === "en" ? "en" : "ar",
    activeSkill = data.skillGroups[0].id,
    activeProject = 0;
  let motionPaused = storage.get("abdullah-midnight-motion") === "paused",
    motionContext = null,
    motionMedia = null,
    projectTween = null,
    statusTimer,
    firstRender = true;
  const value = (x) => {
    const text =
      typeof x === "object" && x !== null
        ? x[language] || x.ar || ""
        : String(x ?? "");
    return language === "ar"
      ? text.replace(/C\+\+/g, "\u2066C++\u2069")
      : text;
  };
  const copy = (k) => data.copy[language][k] || data.copy.ar[k] || k;
  const motionEnabled = () =>
    Boolean(gsap && ScrollTrigger && !reduced.matches && !motionPaused);
  function element(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function icon(name, cls = "icon") {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    s.setAttribute("class", cls);
    s.setAttribute("aria-hidden", "true");
    u.setAttribute("href", "#i-" + name);
    s.append(u);
    return s;
  }
  function wrapLines() {
    $$(".line-reveal").forEach((heading) => {
      const lines = heading.textContent.split("\n");
      if (lines.length === 1) return;
      heading.replaceChildren();
      lines.forEach((text, index) => {
        if (index) heading.append(document.createTextNode(" "));
        const line = element("span", "line"),
          inner = element("span", "", text);
        line.append(inner);
        heading.append(line);
      });
    });
    const paragraph = $("[data-scrub]");
    const content = paragraph.textContent;
    paragraph.replaceChildren();
    content
      .split(/(\s+)/)
      .filter(Boolean)
      .forEach((word) =>
        paragraph.append(
          /^\s+$/.test(word)
            ? document.createTextNode(word)
            : element("span", "word", word),
        ),
      );
  }
  function setActiveProject(index) {
    activeProject = Math.max(0, Math.min(data.projects.length - 1, index));
    $$("[data-project-select]").forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(+b.dataset.projectSelect === activeProject),
      ),
    );
    $("[data-project-current]").textContent = String(
      activeProject + 1,
    ).padStart(2, "0");
    const cinematic = $(".project-cinema").classList.contains("is-cinematic");
    $$(".project-slide").forEach((slide, i) => {
      slide.inert = cinematic && i !== activeProject;
      if (cinematic)
        slide.setAttribute("aria-hidden", String(i !== activeProject));
      else slide.removeAttribute("aria-hidden");
    });
  }
  function navigateProject(index, animate = true) {
    const trigger = projectTween?.scrollTrigger;
    if (trigger) {
      const stops = [0.02, 0.5, 0.97];
      const y = trigger.start + (trigger.end - trigger.start) * stops[index];
      if (animate && motionEnabled())
        gsap.to(window, {
          scrollTo: { y, autoKill: true },
          duration: 1.05,
          ease: "expo.out",
          overwrite: "auto",
        });
      else window.scrollTo(0, y);
    } else {
      const slide = $$(".project-slide")[index];
      if (slide) scrollToTarget(slide, animate);
    }
    setActiveProject(index);
  }
  function showPreview(project) {
    const dialog = $(".project-dialog");
    $("#preview-title").textContent = value(project.title);
    $("[data-preview-image]").src = project.image;
    $("[data-preview-image]").alt =
      `${copy("coverLabel")} — ${value(project.shortTitle)}`;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      if (motionEnabled())
        gsap.fromTo(
          dialog,
          { opacity: 0.4, scale: 0.97 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.25,
            ease: "expo.out",
            clearProps: "opacity,transform",
          },
        );
    } else window.open(project.image, "_blank", "noopener");
  }
  function renderProjects() {
    const fragment = document.createDocumentFragment(),
      selectors = document.createDocumentFragment();
    data.projects.forEach((project, index) => {
      const article =
        $("#project-template").content.firstElementChild.cloneNode(true);
      article.id = "project-" + project.id;
      article.dataset.project = project.id;
      $(".project-title", article).textContent = value(project.title);
      $(".project-description", article).textContent = value(
        project.description,
      );
      $(".project-category", article).textContent = value(project.type);
      $(".project-concept-label", article).textContent = copy("coverLabel");
      const image = $(".project-image-button>img", article);
      image.src = project.image;
      image.alt = `${copy("coverLabel")} — ${value(project.shortTitle)}`;
      $(".image-action>span", article).textContent = copy("preview");
      const preview = $(".project-preview", article);
      $("span", preview).textContent = copy("preview");
      preview.addEventListener("click", () => showPreview(project));
      const imageButton = $(".project-image-button", article);
      imageButton.setAttribute(
        "aria-label",
        `${copy("preview")}: ${value(project.title)}`,
      );
      imageButton.addEventListener("click", () => showPreview(project));
      project.tags.forEach((tag) =>
        $(".project-tags", article).append(element("li", "", tag)),
      );
      if (/^https?:\/\//i.test(project.url || "")) {
        const link = $(".project-visit", article);
        link.hidden = false;
        link.href = project.url;
        link.textContent = copy("projectVisit");
      }
      fragment.append(article);
      const button = element("button", "project-select");
      button.type = "button";
      button.dataset.projectSelect = index;
      button.setAttribute("aria-label", value(project.title));
      button.append(
        element("span", "selector-index", String(index + 1).padStart(2, "0")),
        element("span", "selector-label", value(project.shortTitle)),
      );
      button.addEventListener("click", (e) =>
        navigateProject(index, e.detail !== 0),
      );
      selectors.append(button);
    });
    $("[data-project-list]").replaceChildren(fragment);
    $("[data-project-selector]").replaceChildren(selectors);
    setActiveProject(activeProject);
  }
  function renderSkillPanel(animate = false) {
    const group =
        data.skillGroups.find((g) => g.id === activeSkill) ||
        data.skillGroups[0],
      panel = $("[data-skill-panel]");
    panel.setAttribute("aria-labelledby", "tab-" + group.id);
    panel.replaceChildren(
      ...group.items.map(([name, note]) => {
        const row = element("div", "skill-row"),
          label = element("span", "skill-name", name);
        label.dir = "ltr";
        row.append(label, element("span", "skill-note", value(note)));
        return row;
      }),
    );
    $$("[data-skill-group]").forEach((b) => {
      const selected = b.dataset.skillGroup === activeSkill;
      b.setAttribute("aria-selected", String(selected));
      b.tabIndex = selected ? 0 : -1;
    });
    if (animate && motionEnabled())
      gsap.fromTo(
        panel.children,
        { opacity: 0.35, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          stagger: 0.035,
          ease: "expo.out",
          clearProps: "transform,opacity",
        },
      );
  }
  function renderSkills() {
    const tabs = $("[data-skill-tabs]");
    tabs.setAttribute("aria-label", copy("skillTabLabel"));
    tabs.setAttribute(
      "aria-orientation",
      innerWidth > 700 ? "vertical" : "horizontal",
    );
    tabs.replaceChildren(
      ...data.skillGroups.map((group) => {
        const b = element("button", "skill-tab");
        b.id = "tab-" + group.id;
        b.type = "button";
        b.dataset.skillGroup = group.id;
        b.setAttribute("role", "tab");
        b.setAttribute("aria-controls", "skill-panel");
        b.append(
          element("span", "", value(group.title)),
          icon("arrow", "icon arrow-icon"),
        );
        b.addEventListener("click", (e) => {
          activeSkill = group.id;
          renderSkillPanel(e.detail !== 0);
        });
        return b;
      }),
    );
    renderSkillPanel();
    $("[data-soft-skills]").replaceChildren(
      ...data.softSkills[language].map((text) => {
        const li = element("li");
        li.append(icon("check"), element("span", "", text));
        return li;
      }),
    );
  }
  function renderCourses() {
    $("[data-courses]").replaceChildren(
      ...data.courses.map((course) => {
        const article = element("article", "course"),
          body = element("div");
        body.append(
          element("h4", "", value(course.title)),
          element("p", "", value(course.detail)),
        );
        article.append(icon(course.icon), body);
        return article;
      }),
    );
    $("[data-interests]").replaceChildren(
      ...data.interests[language].map((text) => element("li", "", text)),
    );
  }
  function applyProfile() {
    const p = data.person;
    $$("[data-profile]").forEach((e) => {
      const k = e.dataset.profile;
      e.textContent =
        k === "shortName"
          ? `${value(p.firstName)} ${value(p.lastName)}`
          : k === "fullNameEnglish"
            ? p.fullName.en
            : value(p[k]);
    });
    $$("[data-cv]").forEach((e) => {
      e.href = p.cv;
      e.setAttribute("aria-label", copy("cvLabel"));
    });
    $("[data-portrait]").src = p.portrait;
    $("[data-portrait]").alt = copy("portraitAlt");
    $("[data-brand]").setAttribute("aria-label", value(p.fullName));
    $$("[data-email]").forEach((e) => {
      e.textContent = p.email;
      e.href = "mailto:" + p.email;
    });
    const digits = p.whatsapp.replace(/\D/g, "");
    $("[data-whatsapp]").href = "https://wa.me/" + digits;
    $("[data-phone]").textContent =
      `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    const handle = p.telegram.replace(/^@/, "");
    $("[data-telegram]").href = "https://t.me/" + handle;
    $("[data-handle]").textContent = "@" + handle;
    ["whatsapp", "telegram"].forEach((service) =>
      $("[data-" + service + "]").setAttribute(
        "aria-label",
        `${copy(service)}. ${copy("newTab")}`,
      ),
    );
    $("[data-graduation]").textContent = p.graduation;
    $("[data-year]").textContent = new Date().getFullYear();
  }
  function resetMotion() {
    if (gsap) gsap.killTweensOf(window);
    motionMedia?.revert();
    motionMedia = null;
    motionContext?.revert();
    motionContext = null;
    projectTween = null;
    $(".project-cinema").classList.remove("is-cinematic");
    if (gsap) gsap.set($$(".project-slide"), { clearProps: "all" });
    $$(".project-slide").forEach((slide) => {
      slide.inert = false;
      slide.removeAttribute("aria-hidden");
    });
  }
  function updateMotionControl() {
    root.classList.toggle("motion-paused", motionPaused);
    $("[data-motion]").setAttribute("aria-pressed", String(motionPaused));
    $("[data-motion]").setAttribute(
      "aria-label",
      copy(motionPaused ? "motionResume" : "motionPause"),
    );
  }
  function applyLanguage(next, persist = false) {
    resetMotion();
    language = next === "en" ? "en" : "ar";
    root.lang = language;
    root.dir = language === "ar" ? "rtl" : "ltr";
    if (persist) storage.set("abdullah-language", language);
    document.title = copy("pageTitle");
    $("meta[name=description]").content = copy("description");
    $('meta[property="og:title"]').content = copy("pageTitle");
    $('meta[property="og:description"]').content = copy("description");
    $$("[data-i18n]").forEach((e) => (e.textContent = copy(e.dataset.i18n)));
    $$("[data-i18n-aria]").forEach((e) =>
      e.setAttribute("aria-label", copy(e.dataset.i18nAria)),
    );
    $("[data-language-label]").textContent = language === "ar" ? "EN" : "عربي";
    $("[data-language]").setAttribute("aria-label", copy("language"));
    $("[data-nav-label]").setAttribute(
      "aria-label",
      language === "ar" ? "التنقل الرئيسي" : "Main navigation",
    );
    $("#mobile-nav").setAttribute(
      "aria-label",
      language === "ar" ? "التنقل عبر الهاتف" : "Mobile navigation",
    );
    $("[data-menu]").setAttribute("aria-label", copy("menu"));
    $("[data-close-preview]").setAttribute("aria-label", copy("closePreview"));
    applyProfile();
    renderProjects();
    renderSkills();
    renderCourses();
    wrapLines();
    updateMotionControl();
    closeMenu();
    setupMotion(firstRender);
    firstRender = false;
    updateScroll();
  }
  function setupMotion(intro = false) {
    if (!motionEnabled()) return;
    const direction = language === "ar" ? -1 : 1;
    motionContext = gsap.context(() => {
      if (intro) {
        const opening = gsap.timeline({ defaults: { ease: "expo.out" } });
        opening
          .from(
            ".hero .name-line>span",
            { yPercent: 110, rotation: 3, duration: 1.05, stagger: 0.09 },
            0.05,
          )
          .from(".hero .surname>i", { opacity: 0, y: 25, duration: 0.6 }, 0.4)
          .from(".hero-fullname", { opacity: 0, y: 14, duration: 0.65 }, 0.35)
          .from(
            ".hero-motto .line>span",
            { yPercent: 105, duration: 0.8, stagger: 0.07 },
            0.45,
          )
          .from(".hero-intro", { opacity: 0, y: 18, duration: 0.8 }, 0.6)
          .from(
            ".hero-actions>.button",
            { opacity: 0, y: 18, duration: 0.7, stagger: 0.07 },
            0.7,
          )
          .fromTo(
            ".portrait-frame",
            { clipPath: "inset(0 0 100% 0)", y: 40, rotation: 5 },
            { clipPath: "inset(0 0 0% 0)", y: 0, rotation: 0, duration: 1.3 },
            0.15,
          )
          .from(
            ".portrait-outline",
            { opacity: 0, rotation: 15, duration: 1.3 },
            0.3,
          )
          .from(
            ".portrait-stage figcaption",
            { opacity: 0, y: 15, duration: 0.8 },
            0.95,
          );
      }
      gsap.to(".hero-lines", {
        yPercent: 12,
        opacity: 0.04,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
      gsap.to(".portrait-stage", {
        yPercent: 10,
        rotation: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
      gsap.to(".hero-copy", {
        yPercent: -8,
        opacity: 0.22,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "30% top",
          end: "bottom top",
          scrub: 1,
        },
      });
      gsap.fromTo(
        "[data-scrub] .word",
        { opacity: 0.22 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-scrub]",
            start: "top 85%",
            end: "bottom 55%",
            scrub: 0.65,
          },
        },
      );
      gsap.fromTo(
        ".inline-image",
        { scale: 0.7, rotation: 12 },
        {
          scale: 1,
          rotation: -8,
          ease: "none",
          scrollTrigger: {
            trigger: ".about-top",
            start: "top 85%",
            end: "bottom 45%",
            scrub: 1,
          },
        },
      );
      $$(".section-title.line-reveal").forEach((title) => {
        const lines = $$(".line>span", title);
        if (lines.length)
          gsap.from(lines, {
            yPercent: 105,
            rotation: 1.5,
            duration: 0.9,
            stagger: 0.07,
            ease: "expo.out",
            scrollTrigger: {
              trigger: title,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          });
      });
      gsap.from(".skill-tabs .skill-tab", {
        x: direction * 25,
        opacity: 0.25,
        duration: 0.7,
        stagger: 0.07,
        ease: "expo.out",
        scrollTrigger: {
          trigger: ".skills-workspace",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
      gsap.from(".skills-workspace>.skill-panel", {
        y: 35,
        opacity: 0.25,
        duration: 0.9,
        ease: "expo.out",
        scrollTrigger: {
          trigger: ".skills-workspace",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
      gsap.from(".education-block", {
        y: 45,
        opacity: 0.2,
        duration: 0.9,
        ease: "expo.out",
        scrollTrigger: {
          trigger: ".education-block",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
      gsap.from(".courses-block .course", {
        x: direction * 16,
        opacity: 0.2,
        duration: 0.8,
        stagger: 0.1,
        ease: "expo.out",
        scrollTrigger: {
          trigger: ".courses-block",
          start: "top 83%",
          toggleActions: "play none none reverse",
        },
      });
      gsap.from(".experience-block", {
        scale: 0.96,
        opacity: 0.35,
        duration: 0.9,
        ease: "expo.out",
        scrollTrigger: {
          trigger: ".experience-block",
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      });
      gsap.from(".contact-title .line>span", {
        yPercent: 105,
        duration: 1.1,
        stagger: 0.1,
        ease: "expo.out",
        scrollTrigger: {
          trigger: ".contact-section",
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });
      gsap.fromTo(
        ".contact-orbit",
        { rotation: -20, scale: 0.8 },
        {
          rotation: 20,
          scale: 1.15,
          ease: "none",
          scrollTrigger: {
            trigger: ".contact-section",
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        },
      );
    });
    motionMedia = gsap.matchMedia();
    motionMedia.add("(min-width:1000px)", () => {
      const cinema = $(".project-cinema"),
        slides = $$(".project-slide");
      cinema.classList.add("is-cinematic");
      gsap.set(slides, {
        autoAlpha: 0,
        scale: 0.94,
        xPercent: direction * 12,
      });
      gsap.set(slides[0], { autoAlpha: 1, scale: 1, xPercent: 0 });
      const timeline = gsap.timeline({
        scrollTrigger: {
          id: "project-reel",
          trigger: cinema,
          start: "top 110px",
          end: () => "+=" + Math.round(innerHeight * 2.35),
          pin: true,
          scrub: 0.85,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) =>
            setActiveProject(Math.round(self.progress * (slides.length - 1))),
        },
      });
      timeline.to({}, { duration: 0.7 });
      for (let i = 1; i < slides.length; i++) {
        timeline
          .to(slides[i - 1], {
            autoAlpha: 0,
            scale: 0.92,
            xPercent: -direction * 11,
            duration: 0.7,
            ease: "power2.inOut",
          })
          .fromTo(
            slides[i],
            { autoAlpha: 0, scale: 0.94, xPercent: direction * 14 },
            {
              autoAlpha: 1,
              scale: 1,
              xPercent: 0,
              duration: 0.85,
              ease: "power2.inOut",
            },
            "<",
          )
          .to({}, { duration: 0.65 });
      }
      projectTween = timeline;
      setActiveProject(0);
      return () => {
        projectTween = null;
        cinema.classList.remove("is-cinematic");
        gsap.set(slides, { clearProps: "all" });
        slides.forEach((slide) => {
          slide.inert = false;
          slide.removeAttribute("aria-hidden");
        });
      };
    });
    motionMedia.add("(max-width:999px)", () => {
      $$(".project-visual").forEach((visual) =>
        gsap.from(visual, {
          y: 35,
          scale: 0.95,
          opacity: 0.35,
          duration: 0.95,
          ease: "expo.out",
          scrollTrigger: {
            trigger: visual,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        }),
      );
    });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }
  function scrollToTarget(target, animate = true) {
    if (animate && motionEnabled() && ScrollToPlugin) {
      gsap.to(window, {
        scrollTo: { y: target, offsetY: 115, autoKill: true },
        duration: 1.1,
        ease: "expo.out",
        overwrite: "auto",
      });
    } else target.scrollIntoView({ behavior: "auto", block: "start" });
  }
  function closeMenu(restore = false) {
    const button = $("[data-menu]"),
      opened = button.getAttribute("aria-expanded") === "true";
    $("#mobile-nav").hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (restore && opened) button.focus();
  }
  function notify(message) {
    clearTimeout(statusTimer);
    const node = $("[data-status]");
    node.textContent = message;
    node.classList.add("is-visible");
    statusTimer = setTimeout(() => node.classList.remove("is-visible"), 2600);
  }
  async function copyEmail() {
    let success = false;
    try {
      await navigator.clipboard.writeText(data.person.email);
      success = true;
    } catch {
      const textarea = element("textarea");
      textarea.value = data.person.email;
      textarea.readOnly = true;
      textarea.style.cssText =
        "position:fixed;inset:0;opacity:0;pointer-events:none";
      document.body.append(textarea);
      textarea.select();
      try {
        success = document.execCommand("copy");
      } catch {}
      textarea.remove();
      $("[data-copy-email]").focus({ preventScroll: true });
    }
    notify(
      success ? copy("copied") : `${copy("emailLabel")}: ${data.person.email}`,
    );
  }
  function setupContact() {
    const surface = $("#contact-options"),
      triggers = $$("[data-contact-trigger]"),
      native = "showPopover" in HTMLElement.prototype;
    const update = (opened) =>
      triggers.forEach((b) => b.setAttribute("aria-expanded", String(opened)));
    triggers.forEach((b) => {
      b.setAttribute("aria-controls", "contact-options");
      b.setAttribute("aria-expanded", "false");
    });
    if (native)
      surface.addEventListener("toggle", (e) => update(e.newState === "open"));
    else {
      surface.hidden = true;
      const open = (value) => {
        surface.hidden = !value;
        update(value);
      };
      triggers.forEach((b) =>
        b.addEventListener("click", () => open(surface.hidden)),
      );
      $(".close-button", surface).addEventListener("click", () => open(false));
      document.addEventListener("click", (e) => {
        if (
          !surface.contains(e.target) &&
          !triggers.some((b) => b.contains(e.target))
        )
          open(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") open(false);
      });
    }
    $$("a", surface).forEach((a) =>
      a.addEventListener("click", () => {
        if (native) surface.hidePopover();
        else {
          surface.hidden = true;
          update(false);
        }
      }),
    );
  }
  function setupPointer() {
    if (!gsap) return;
    const ring = $(".cursor-ring"),
      moveX = gsap.quickTo(ring, "x", { duration: 0.3, ease: "power2.out" }),
      moveY = gsap.quickTo(ring, "y", { duration: 0.3, ease: "power2.out" });
    document.addEventListener(
      "pointermove",
      (e) => {
        if (
          !finePointer.matches ||
          !motionEnabled() ||
          e.pointerType === "touch"
        )
          return;
        ring.style.opacity = "1";
        moveX(e.clientX - 18);
        moveY(e.clientY - 18);
        const button = e.target.closest(".magnetic");
        if (button) {
          const box = button.getBoundingClientRect();
          gsap.to(button, {
            x: (e.clientX - box.left - box.width / 2) * 0.12,
            y: (e.clientY - box.top - box.height / 2) * 0.18,
            duration: 0.4,
            ease: "expo.out",
            overwrite: "auto",
          });
        }
        const portrait = e.target.closest(".portrait-stage");
        if (portrait) {
          const box = portrait.getBoundingClientRect();
          gsap.to($(".portrait-frame", portrait), {
            rotationY: ((e.clientX - box.left) / box.width - 0.5) * 8,
            rotationX: -((e.clientY - box.top) / box.height - 0.5) * 8,
            duration: 0.6,
            ease: "expo.out",
            overwrite: "auto",
          });
        }
      },
      { passive: true },
    );
    document.addEventListener("pointerover", (e) => {
      if (finePointer.matches)
        ring.classList.toggle(
          "over-control",
          Boolean(e.target.closest("button,a,summary")),
        );
    });
    document.addEventListener("pointerout", (e) => {
      const button = e.target.closest?.(".magnetic");
      if (button && !button.contains(e.relatedTarget) && motionEnabled())
        gsap.to(button, {
          x: 0,
          y: 0,
          duration: 0.4,
          ease: "expo.out",
          overwrite: "auto",
        });
      const portrait = e.target.closest?.(".portrait-stage");
      if (portrait && !portrait.contains(e.relatedTarget) && motionEnabled())
        gsap.to($(".portrait-frame", portrait), {
          rotationX: 0,
          rotationY: 0,
          duration: 0.6,
          ease: "expo.out",
          overwrite: "auto",
        });
    });
    document.documentElement.addEventListener(
      "pointerleave",
      () => (ring.style.opacity = "0"),
    );
  }
  let scrollQueued = false;
  function updateScroll() {
    const max = root.scrollHeight - innerHeight;
    $(".reading-progress>span").style.transform =
      `scaleX(${max > 0 ? Math.max(0, Math.min(1, scrollY / max)) : 0})`;
    root.classList.toggle("has-scrolled", scrollY > 500);
    scrollQueued = false;
  }
  $("[data-language]").addEventListener("click", () =>
    applyLanguage(language === "ar" ? "en" : "ar", true),
  );
  $("[data-motion]").addEventListener("click", () => {
    const oldY = scrollY;
    resetMotion();
    motionPaused = !motionPaused;
    storage.set(
      "abdullah-midnight-motion",
      motionPaused ? "paused" : "playing",
    );
    updateMotionControl();
    setupMotion(false);
    window.scrollTo(0, Math.min(oldY, root.scrollHeight - innerHeight));
  });
  $("[data-menu]").addEventListener("click", () => {
    const menu = $("#mobile-nav"),
      open = menu.hidden;
    menu.hidden = !open;
    $("[data-menu]").setAttribute("aria-expanded", String(open));
    if (open && motionEnabled())
      gsap.fromTo(
        menu,
        { opacity: 0.4, y: -6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.2,
          ease: "expo.out",
          clearProps: "opacity,transform",
        },
      );
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu(true);
  });
  document.addEventListener("click", (e) => {
    if (!$(".site-header").contains(e.target)) closeMenu();
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = anchor.getAttribute("href").slice(1),
      target = document.getElementById(id);
    if (!target) return;
    closeMenu();
    if (e.detail === 0 || !motionEnabled()) return;
    e.preventDefault();
    scrollToTarget(target, true);
    try {
      history.replaceState(null, "", "#" + id);
    } catch {}
  });
  $("[data-skill-tabs]").addEventListener("keydown", (e) => {
    const buttons = $$("[data-skill-group]"),
      index = buttons.indexOf(e.target);
    if (index < 0) return;
    let next;
    if (e.key === "ArrowDown") next = index + 1;
    if (e.key === "ArrowUp") next = index - 1;
    if (e.key === "ArrowRight") next = index + (language === "ar" ? -1 : 1);
    if (e.key === "ArrowLeft") next = index + (language === "ar" ? 1 : -1);
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = buttons.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    next = (next + buttons.length) % buttons.length;
    activeSkill = buttons[next].dataset.skillGroup;
    renderSkillPanel(false);
    buttons[next].focus();
  });
  $("[data-copy-email]").addEventListener("click", copyEmail);
  $("[data-close-preview]").addEventListener("click", () =>
    $(".project-dialog").close(),
  );
  $(".project-dialog").addEventListener("click", (e) => {
    if (e.target !== e.currentTarget) return;
    const box = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < box.left ||
      e.clientX > box.right ||
      e.clientY < box.top ||
      e.clientY > box.bottom
    )
      e.currentTarget.close();
  });
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(updateScroll);
      }
    },
    { passive: true },
  );
  window.addEventListener(
    "resize",
    () => {
      if (innerWidth > 700) closeMenu();
      $("[data-skill-tabs]").setAttribute(
        "aria-orientation",
        innerWidth > 700 ? "vertical" : "horizontal",
      );
      updateScroll();
    },
    { passive: true },
  );
  reduced.addEventListener("change", () => {
    resetMotion();
    setupMotion(false);
  });
  document.addEventListener("visibilitychange", () =>
    root.classList.toggle("page-hidden", document.hidden),
  );
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) =>
      root.classList.toggle("hero-in-view", entries[0].isIntersecting),
    ).observe($(".hero"));
    const navObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          $$(".desktop-nav>a").forEach((a) => {
            if (a.hash === "#" + entry.target.id)
              a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        }),
      { rootMargin: "-15% 0px -55% 0px" },
    );
    ["about", "projects", "skills", "journey"].forEach((id) =>
      navObserver.observe(document.getElementById(id)),
    );
  }
  let printY = 0;
  window.addEventListener("beforeprint", () => {
    printY = scrollY;
    resetMotion();
    const panel = $("[data-skill-panel]");
    panel.replaceChildren();
    data.skillGroups.forEach((group) => {
      panel.append(element("h3", "print-skill-heading", value(group.title)));
      group.items.forEach(([name, note]) => {
        const row = element("div", "skill-row");
        row.append(
          element("span", "skill-name", name),
          element("span", "skill-note", value(note)),
        );
        panel.append(row);
      });
    });
  });
  window.addEventListener("afterprint", () => {
    renderSkillPanel();
    setupMotion(false);
    window.scrollTo(0, printY);
  });
  applyLanguage(language);
  setupContact();
  setupPointer();
  document.fonts?.ready.then(() => ScrollTrigger?.refresh());
  window.addEventListener("load", () => ScrollTrigger?.refresh(), {
    once: true,
  });
})();
