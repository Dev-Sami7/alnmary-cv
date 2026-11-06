(() => {
  "use strict";
  const data = window.CV_DATA;
  if (!data) return;
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [
    ...scope.querySelectorAll(selector),
  ];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const storage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
  };
  let language = storage.get("abdullah-language") === "en" ? "en" : "ar";
  let activeGroup = data.skillGroups[0].id;
  let motionPaused = storage.get("abdullah-motion") === "paused";
  let orbitEntryStarted = false;
  let orbitAnimations = [];
  let statusTimer;
  const text = (value) =>
    typeof value === "object" && value !== null
      ? value[language] || value.ar || ""
      : String(value ?? "");
  const copy = (key) => data.copy[language][key] || data.copy.ar[key] || key;

  function icon(name, className = "icon") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#i-${name}`);
    svg.append(use);
    return svg;
  }

  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }

  function renderProjects() {
    const list = $("[data-project-list]");
    const previous = $$(".project[open]", list).map(
      (item) => item.dataset.project,
    );
    const firstRender = !list.children.length;
    const fragment = document.createDocumentFragment();
    data.projects.forEach((project, index) => {
      const details =
        $("#project-template").content.firstElementChild.cloneNode(true);
      details.dataset.project = project.id;
      details.open = firstRender ? index === 0 : previous.includes(project.id);
      $(".project-type", details).textContent = text(project.type);
      $(".project-title", details).textContent = text(project.title);
      $(".project-cover", details).classList.add(`cover-${project.cover}`);
      $(".cover-label", details).textContent = copy("coverLabel");
      $(".cover-word", details).textContent = project.word;
      $(".cover-title", details).textContent = text(project.shortTitle);
      $(".project-focus", details).textContent = text(project.focus);
      $(".project-body", details).textContent = text(project.description);
      project.tags.forEach((tag) =>
        $(".project-tags", details).append(element("li", "", tag)),
      );
      if (/^https?:\/\//i.test(project.url || "")) {
        const link = $(".project-visit", details);
        link.hidden = false;
        link.href = project.url;
        $("span", link).textContent = copy("projectVisit");
        link.setAttribute(
          "aria-label",
          `${copy("projectVisit")} — ${text(project.shortTitle)}. ${copy("newTab")}`,
        );
      }
      details.addEventListener("toggle", () => {
        if (details.open && !reduceMotion.matches && !motionPaused) {
          $(".project-content", details).animate(
            [
              { opacity: 0.5, transform: "translateY(8px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 250, easing: "cubic-bezier(.23,1,.32,1)" },
          );
        }
      });
      fragment.append(details);
    });
    list.replaceChildren(fragment);
  }

  function renderSkillPanel(animate = false) {
    const group =
      data.skillGroups.find((item) => item.id === activeGroup) ||
      data.skillGroups[0];
    const panel = $("[data-skill-panel]");
    panel.setAttribute("aria-labelledby", `tab-${group.id}`);
    const fragment = document.createDocumentFragment();
    group.items.forEach(([name, detail]) => {
      const row = element("div", "skill-row");
      const label = element("span", "skill-name", name);
      label.dir = "ltr";
      row.append(label, element("span", "skill-note", text(detail)));
      fragment.append(row);
    });
    panel.replaceChildren(fragment);
    $$("[data-skill-group]").forEach((button) => {
      const selected = button.dataset.skillGroup === activeGroup;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    if (animate && !reduceMotion.matches && !motionPaused) {
      panel.animate([{ opacity: 0.45 }, { opacity: 1 }], {
        duration: 200,
        easing: "cubic-bezier(.23,1,.32,1)",
      });
    }
  }

  function renderSkills() {
    const tabs = $("[data-skill-tabs]");
    tabs.setAttribute("aria-label", copy("skillTabLabel"));
    const buttons = data.skillGroups.map((group) => {
      const button = element("button", "skill-tab");
      button.type = "button";
      button.id = `tab-${group.id}`;
      button.dataset.skillGroup = group.id;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", "skill-panel");
      button.append(
        element("span", "", text(group.title)),
        icon("arrow", "icon arrow-icon"),
      );
      button.addEventListener("click", () => {
        activeGroup = group.id;
        renderSkillPanel(true);
      });
      return button;
    });
    tabs.replaceChildren(...buttons);
    renderSkillPanel();
    const soft = $("[data-soft-skills]");
    soft.replaceChildren(
      ...data.softSkills[language].map((value) => {
        const li = element("li");
        li.append(icon("check"), element("span", "", value));
        return li;
      }),
    );
  }

  function renderCourses() {
    const items = data.courses.map((course) => {
      const row = element("article", "course");
      const body = element("div");
      body.append(
        element("h4", "", text(course.title)),
        element("p", "", text(course.detail)),
      );
      row.append(icon(course.icon), body);
      return row;
    });
    $("[data-courses]").replaceChildren(...items);
    $("[data-interests]").replaceChildren(
      ...data.interests[language].map((item) => element("li", "", item)),
    );
  }

  function applyProfile() {
    const person = data.person;
    $$("[data-profile]").forEach((node) => {
      const key = node.dataset.profile;
      node.textContent =
        key === "shortName"
          ? `${text(person.firstName)} ${text(person.lastName)}`
          : key === "fullNameEnglish"
            ? person.fullName.en
            : text(person[key]);
    });
    $$("[data-cv]").forEach((link) => {
      link.href = person.cv;
      link.setAttribute("aria-label", copy("cvLabel"));
    });
    const portrait = $("[data-portrait]");
    portrait.src = person.portrait;
    portrait.alt = copy("portraitAlt");
    $$("[data-email]").forEach((link) => {
      link.textContent = person.email;
      link.href = `mailto:${person.email}`;
    });
    const digits = person.whatsapp.replace(/\D/g, "");
    $("[data-whatsapp]").href = `https://wa.me/${digits}`;
    $("[data-whatsapp]").setAttribute(
      "aria-label",
      `${copy("whatsapp")}. ${copy("newTab")}`,
    );
    $("[data-phone]").textContent =
      `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    const handle = person.telegram.replace(/^@/, "");
    $("[data-telegram]").href = `https://t.me/${handle}`;
    $("[data-telegram]").setAttribute(
      "aria-label",
      `${copy("telegram")}. ${copy("newTab")}`,
    );
    $("[data-handle]").textContent = `@${handle}`;
    $("[data-graduation]").textContent = person.graduation;
    $("[data-year]").textContent = new Date().getFullYear();
    $("[data-brand]").setAttribute("aria-label", text(person.fullName));
  }

  function applyLanguage(value, persist = false) {
    language = value === "en" ? "en" : "ar";
    root.lang = language;
    root.dir = language === "ar" ? "rtl" : "ltr";
    if (persist) storage.set("abdullah-language", language);
    document.title = copy("pageTitle");
    $('meta[name="description"]').content = copy("description");
    $('meta[property="og:title"]').content = copy("pageTitle");
    $('meta[property="og:description"]').content = copy("description");
    $$("[data-i18n]").forEach((node) => {
      node.textContent = copy(node.dataset.i18n);
    });
    $$("[data-i18n-aria]").forEach((node) =>
      node.setAttribute("aria-label", copy(node.dataset.i18nAria)),
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
    $("[data-blue-label]").setAttribute("aria-label", copy("signature"));
    applyProfile();
    renderProjects();
    renderSkills();
    renderCourses();
    updateMotionButton();
    closeMobileMenu(false);
  }

  function closeMobileMenu(restoreFocus = false) {
    const button = $("[data-menu]");
    const wasOpen = button.getAttribute("aria-expanded") === "true";
    $("#mobile-nav").hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (restoreFocus && wasOpen) button.focus();
  }

  function updateMotionButton() {
    root.classList.toggle("motion-paused", motionPaused);
    $("[data-motion]").setAttribute("aria-pressed", String(motionPaused));
    $("[data-motion]").setAttribute(
      "aria-label",
      copy(motionPaused ? "motionResume" : "motionPause"),
    );
    syncOrbitAnimations();
  }

  function notify(message) {
    const node = $("[data-status]");
    clearTimeout(statusTimer);
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
      const area = element("textarea");
      area.value = data.person.email;
      area.style.cssText =
        "position:fixed;inset:0;opacity:0;pointer-events:none";
      area.setAttribute("readonly", "");
      document.body.append(area);
      area.select();
      try {
        success = document.execCommand("copy");
      } catch {}
      area.remove();
      $("[data-copy-email]").focus({ preventScroll: true });
    }
    notify(
      success ? copy("copied") : `${copy("emailLabel")}: ${data.person.email}`,
    );
  }

  function syncOrbitAnimations() {
    const paused =
      motionPaused ||
      document.hidden ||
      root.classList.contains("orbit-outside");
    orbitAnimations.forEach((animation) => {
      if (animation.playState === "finished" || animation.playState === "idle")
        return;
      if (paused) animation.pause();
      else animation.play();
    });
  }

  function composeOrbit() {
    if (orbitEntryStarted) return;
    orbitEntryStarted = true;
    if (
      reduceMotion.matches ||
      typeof Element.prototype.animate !== "function"
    ) {
      root.classList.add("orbit-ready");
      return;
    }
    const starts = [
      "translate3d(0,-18px,0) rotateY(-35deg)",
      "translate3d(16px,0,0) rotateY(10deg)",
      "translate3d(-16px,8px,0) rotateY(45deg)",
      "translate3d(0,15px,0) rotateX(35deg)",
    ];
    const finishes = [
      "rotateY(0deg)",
      "rotateY(45deg)",
      "rotateY(90deg)",
      "rotateX(90deg)",
    ];
    orbitAnimations = $$(".orbit-sculpture i").map((ring, index) =>
      ring.animate(
        [
          { transform: starts[index], opacity: 0.65 },
          { transform: finishes[index], opacity: 1 },
        ],
        {
          duration: 900,
          delay: index * 60,
          easing: "cubic-bezier(.23,1,.32,1)",
          fill: "backwards",
        },
      ),
    );
    syncOrbitAnimations();
    Promise.allSettled(
      orbitAnimations.map((animation) => animation.finished),
    ).then(() => {
      orbitAnimations = [];
      root.classList.add("orbit-ready");
    });
  }

  function setupObservers() {
    if (!("IntersectionObserver" in window)) {
      composeOrbit();
      return;
    }
    const orbitObserver = new IntersectionObserver(
      (entries) => {
        root.classList.toggle(
          "orbit-outside",
          !entries[0].isIntersecting || document.hidden,
        );
        if (entries[0].isIntersecting && !document.hidden) composeOrbit();
        syncOrbitAnimations();
      },
      { rootMargin: "50px" },
    );
    orbitObserver.observe($(".hero-blue"));
    const heroObserver = new IntersectionObserver(
      (entries) => {
        root.classList.toggle("hero-in-view", entries[0].isIntersecting);
      },
      { threshold: 0 },
    );
    heroObserver.observe($(".hero"));
    document.addEventListener("visibilitychange", () => {
      const rect = $(".hero-blue").getBoundingClientRect();
      root.classList.toggle(
        "orbit-outside",
        document.hidden || rect.bottom < 0 || rect.top > innerHeight,
      );
      syncOrbitAnimations();
    });
    reduceMotion.addEventListener("change", () => {
      if (reduceMotion.matches) {
        orbitAnimations.forEach((animation) => animation.cancel());
        orbitAnimations = [];
        root.classList.add("orbit-ready");
      }
    });
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          $$(".desktop-nav a").forEach((link) => {
            if (link.hash === `#${entry.target.id}`)
              link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: 0 },
    );
    ["about", "projects", "skills", "journey"].forEach((id) =>
      navObserver.observe(document.getElementById(id)),
    );
  }

  function setupContact() {
    const popover = $("#contact-options");
    const triggers = $$("[data-contact-trigger]");
    const supportsPopover = "showPopover" in HTMLElement.prototype;
    const update = (opened) =>
      triggers.forEach((button) =>
        button.setAttribute("aria-expanded", String(opened)),
      );
    triggers.forEach((button) => {
      button.setAttribute("aria-controls", "contact-options");
      button.setAttribute("aria-expanded", "false");
    });
    if (supportsPopover) {
      popover.addEventListener("toggle", (event) =>
        update(event.newState === "open"),
      );
    } else {
      popover.hidden = true;
      const setOpen = (opened) => {
        popover.hidden = !opened;
        update(opened);
      };
      triggers.forEach((button) =>
        button.addEventListener("click", () => setOpen(popover.hidden)),
      );
      $(".close-button", popover).addEventListener("click", () => {
        setOpen(false);
        triggers[1].focus();
      });
      document.addEventListener("click", (event) => {
        if (
          !popover.hidden &&
          !popover.contains(event.target) &&
          !triggers.some((button) => button.contains(event.target))
        )
          setOpen(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !popover.hidden) {
          setOpen(false);
          triggers[1].focus();
        }
      });
    }
    $$("a", popover).forEach((link) =>
      link.addEventListener("click", () => {
        if (supportsPopover) popover.hidePopover();
        else {
          popover.hidden = true;
          update(false);
        }
      }),
    );
  }

  $("[data-language]").addEventListener("click", () =>
    applyLanguage(language === "ar" ? "en" : "ar", true),
  );
  $("[data-menu]").addEventListener("click", () => {
    const menu = $("#mobile-nav");
    const opened = menu.hidden;
    menu.hidden = !opened;
    $("[data-menu]").setAttribute("aria-expanded", String(opened));
    if (opened && !reduceMotion.matches && !motionPaused)
      menu.animate(
        [
          { opacity: 0.4, transform: "translateY(-6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 200, easing: "cubic-bezier(.23,1,.32,1)" },
      );
  });
  $$("#mobile-nav a").forEach((link) =>
    link.addEventListener("click", () => {
      closeMobileMenu(false);
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    }),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMobileMenu(true);
  });
  document.addEventListener("click", (event) => {
    if (!$(".site-header").contains(event.target)) closeMobileMenu();
  });
  $("[data-skill-tabs]").addEventListener("keydown", (event) => {
    const buttons = $$("[data-skill-group]");
    const position = buttons.indexOf(event.target);
    if (position < 0) return;
    let next;
    if (event.key === "ArrowDown") next = (position + 1) % buttons.length;
    if (event.key === "ArrowUp")
      next = (position - 1 + buttons.length) % buttons.length;
    if (event.key === "ArrowRight")
      next =
        (position + (language === "ar" ? -1 : 1) + buttons.length) %
        buttons.length;
    if (event.key === "ArrowLeft")
      next =
        (position + (language === "ar" ? 1 : -1) + buttons.length) %
        buttons.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = buttons.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    activeGroup = buttons[next].dataset.skillGroup;
    renderSkillPanel(false);
    buttons[next].focus();
  });
  $("[data-copy-email]").addEventListener("click", copyEmail);
  $("[data-motion]").addEventListener("click", () => {
    motionPaused = !motionPaused;
    storage.set("abdullah-motion", motionPaused ? "paused" : "playing");
    updateMotionButton();
  });
  window.matchMedia("(max-width:700px)").addEventListener("change", (event) => {
    if (!event.matches) closeMobileMenu();
  });
  let progressFrame = false;
  const progress = $(".reading-progress");
  function updateProgress() {
    const max = root.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0})`;
    progressFrame = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!progressFrame) {
        progressFrame = true;
        requestAnimationFrame(updateProgress);
      }
    },
    { passive: true },
  );
  window.addEventListener("resize", updateProgress, { passive: true });
  let printedDetails = [];
  window.addEventListener("beforeprint", () => {
    printedDetails = $$(".project").map((node) => ({ node, open: node.open }));
    printedDetails.forEach(({ node }) => {
      node.open = true;
    });
    const panel = $("[data-skill-panel]");
    panel.replaceChildren();
    data.skillGroups.forEach((group) => {
      panel.append(element("h3", "print-skill-heading", text(group.title)));
      group.items.forEach(([name, detail]) => {
        const row = element("div", "skill-row");
        row.append(
          element("span", "skill-name", name),
          element("span", "skill-note", text(detail)),
        );
        panel.append(row);
      });
    });
  });
  window.addEventListener("afterprint", () => {
    printedDetails.forEach(({ node, open }) => {
      node.open = open;
    });
    printedDetails = [];
    renderSkillPanel();
  });
  applyLanguage(language);
  setupContact();
  setupObservers();
  updateProgress();
})();
