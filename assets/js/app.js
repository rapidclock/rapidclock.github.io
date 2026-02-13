(function () {
  const storageKey = "cs_cookbook_language";

  function setupSidebar() {
    const sidebar = document.getElementById("sidebar");
    const mobileToggle = document.getElementById("sidebar-toggle");
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener("click", () => {
        sidebar.classList.toggle("is-open");
      });
    }

    const toggles = document.querySelectorAll(".nav-toggle");
    toggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        const branch = btn.closest(".nav-item")?.querySelector(":scope > .nav-children");
        if (branch) {
          branch.classList.toggle("is-collapsed", expanded);
        }
      });
    });
  }

  function addCopyButtons() {
    const targets = document.querySelectorAll("pre");
    targets.forEach((pre) => {
      if (pre.dataset.copyReady === "true") return;
      const code = pre.querySelector("code");
      if (!code) return;
      pre.dataset.copyReady = "true";
      const btn = document.createElement("button");
      btn.className = "copy-code-btn";
      btn.type = "button";
      btn.textContent = "Copy";
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(code.innerText);
          btn.textContent = "Copied";
          btn.classList.add("is-copied");
          setTimeout(() => {
            btn.textContent = "Copy";
            btn.classList.remove("is-copied");
          }, 1200);
        } catch (_) {
          btn.textContent = "Failed";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 1200);
        }
      });
      pre.appendChild(btn);
    });
  }

  function setupCodeTabs() {
    const groups = document.querySelectorAll(".code-tabs");
    groups.forEach((group) => {
      const panels = Array.from(group.querySelectorAll(".tab-panel[data-lang]"));
      if (!panels.length) return;

      let tabList = group.querySelector(".code-tab-list");
      if (!tabList) {
        tabList = document.createElement("div");
        tabList.className = "code-tab-list";
        group.prepend(tabList);
      }

      const preferred = localStorage.getItem(storageKey)?.toLowerCase();
      let activeLang = preferred && panels.some((p) => p.dataset.lang === preferred)
        ? preferred
        : panels[0].dataset.lang;

      if (panels.length === 1) {
        tabList.style.display = "none";
      }

      panels.forEach((panel) => {
        const lang = panel.dataset.lang;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "code-tab-btn";
        button.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
        button.addEventListener("click", () => {
          setActive(lang);
          localStorage.setItem(storageKey, lang);
        });
        tabList.appendChild(button);
      });

      function setActive(lang) {
        activeLang = lang;
        panels.forEach((panel) => {
          panel.classList.toggle("is-active", panel.dataset.lang === activeLang);
        });
        tabList.querySelectorAll(".code-tab-btn").forEach((btn) => {
          btn.classList.toggle("is-active", btn.textContent.toLowerCase() === activeLang);
        });
      }

      setActive(activeLang);
    });
  }

  function setupSearch() {
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");
    if (!input || !results) return;

    const baseUrl = document.documentElement.dataset.baseurl || "";
    fetch(`${baseUrl}/search.json`)
      .then((resp) => resp.json())
      .then((docs) => {
        const indexed = docs.map((doc) => ({
          ...doc,
          titleLower: doc.title.toLowerCase(),
          descriptionLower: doc.description.toLowerCase(),
          contentLower: doc.content.toLowerCase(),
        }));

        input.addEventListener("input", () => {
          const query = input.value.trim().toLowerCase();
          if (query.length < 2) {
            results.classList.remove("is-open");
            results.innerHTML = "";
            return;
          }

          const terms = query.split(/\s+/).filter(Boolean);
          const matches = indexed
            .map((doc) => {
              let score = 0;
              terms.forEach((term) => {
                if (doc.titleLower.includes(term)) score += 5;
                if (doc.descriptionLower.includes(term)) score += 3;
                if (doc.contentLower.includes(term)) score += 1;
              });
              return { doc, score };
            })
            .filter((row) => row.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

          if (!matches.length) {
            results.innerHTML = '<a href="#" aria-disabled="true"><div class="search-title">No matches</div><div class="search-snippet">Try a broader term.</div></a>';
            results.classList.add("is-open");
            return;
          }

          results.innerHTML = matches
            .map(({ doc }) => {
              const snippet = (doc.description || doc.content || "").slice(0, 130);
              return `<a href="${doc.url}"><div class="search-title">${escapeHtml(doc.title)}</div><div class="search-snippet">${escapeHtml(snippet)}...</div></a>`;
            })
            .join("");
          results.classList.add("is-open");
        });

        document.addEventListener("click", (event) => {
          if (!results.contains(event.target) && event.target !== input) {
            results.classList.remove("is-open");
          }
        });
      })
      .catch(() => {
        results.innerHTML = '<a href="#" aria-disabled="true"><div class="search-title">Search unavailable</div></a>';
      });
  }

  function escapeHtml(text) {
    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setupMermaid() {
    const blocks = document.querySelectorAll("code.language-mermaid");
    if (!blocks.length) return;

    blocks.forEach((code) => {
      const pre = code.closest("pre");
      if (!pre) return;
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid";
      wrapper.textContent = code.textContent;
      pre.replaceWith(wrapper);
    });

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
    script.onload = () => {
      if (window.mermaid) {
        window.mermaid.initialize({
          startOnLoad: true,
          theme: "dark",
          securityLevel: "loose",
        });
      }
    };
    document.head.appendChild(script);
  }

  function setupSectionNav() {
    const content = document.querySelector(".doc-content");
    const nav = document.getElementById("section-nav");
    const navList = document.getElementById("section-nav-list");
    if (!content || !nav || !navList) return;

    const headings = Array.from(content.querySelectorAll("h2, h3"))
      .filter((heading) => heading.textContent?.trim().length);

    if (!headings.length) {
      nav.classList.add("is-hidden");
      return;
    }

    const usedIds = new Set();
    headings.forEach((heading) => {
      if (!heading.id) {
        heading.id = uniqueId(slugify(heading.textContent || ""), usedIds);
      } else {
        heading.id = uniqueId(heading.id, usedIds);
      }
    });

    const sections = [];
    let current = null;
    headings.forEach((heading) => {
      const level = heading.tagName.toLowerCase();
      if (level === "h2") {
        current = { heading, children: [] };
        sections.push(current);
      } else if (current) {
        current.children.push(heading);
      }
    });

    if (!sections.length) {
      nav.classList.add("is-hidden");
      return;
    }

    const linkById = new Map();
    const sectionById = new Map();
    const parentByChildId = new Map();

    function setSectionExpanded(sectionId, expanded) {
      const meta = sectionById.get(sectionId);
      if (!meta || !meta.childList || !meta.toggle) return;
      meta.item.classList.toggle("is-expanded", expanded);
      meta.childList.classList.toggle("is-collapsed", !expanded);
      meta.toggle.setAttribute("aria-expanded", String(expanded));
    }

    function openSection(sectionId) {
      sectionById.forEach((_, id) => {
        setSectionExpanded(id, id === sectionId);
      });
    }

    sections.forEach((section) => {
      const item = document.createElement("li");
      item.className = "section-nav-item level-h2";

      const row = document.createElement("div");
      row.className = "section-nav-row";

      const link = document.createElement("a");
      link.className = "section-nav-link";
      link.href = `#${section.heading.id}`;
      link.textContent = section.heading.textContent.trim();
      row.appendChild(link);
      item.appendChild(row);
      linkById.set(section.heading.id, link);

      if (section.children.length) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "section-nav-toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", `Toggle subsections for ${section.heading.textContent.trim()}`);
        toggle.textContent = ">";
        toggle.addEventListener("click", (event) => {
          event.preventDefault();
          const expanded = toggle.getAttribute("aria-expanded") === "true";
          if (expanded) {
            setSectionExpanded(section.heading.id, false);
          } else {
            openSection(section.heading.id);
          }
        });
        row.appendChild(toggle);

        link.addEventListener("click", () => {
          openSection(section.heading.id);
        });

        const childList = document.createElement("ul");
        childList.className = "section-nav-children is-collapsed";
        section.children.forEach((heading) => {
          parentByChildId.set(heading.id, section.heading.id);

          const childItem = document.createElement("li");
          childItem.className = "section-nav-item level-h3";

          const childLink = document.createElement("a");
          childLink.className = "section-nav-link";
          childLink.href = `#${heading.id}`;
          childLink.textContent = heading.textContent.trim();
          childItem.appendChild(childLink);
          childList.appendChild(childItem);

          linkById.set(heading.id, childLink);
        });

        item.appendChild(childList);
        sectionById.set(section.heading.id, { item, toggle, childList });
      } else {
        sectionById.set(section.heading.id, { item });
      }

      navList.appendChild(item);
    });

    function clearActiveState() {
      linkById.forEach((link) => {
        link.classList.remove("is-active");
        link.classList.remove("is-parent-active");
        link.removeAttribute("aria-current");
      });
    }

    function setActiveHeading(activeHeading) {
      const id = activeHeading?.id;
      if (!id) return;
      clearActiveState();

      const activeLink = linkById.get(id);
      if (!activeLink) return;
      activeLink.classList.add("is-active");
      activeLink.setAttribute("aria-current", "true");

      const level = activeHeading.tagName.toLowerCase();
      if (level === "h2") {
        openSection(id);
        return;
      }

      const parentId = parentByChildId.get(id);
      if (!parentId) return;
      linkById.get(parentId)?.classList.add("is-parent-active");
      openSection(parentId);
    }

    function setActiveByScroll() {
      const offset = 140;
      let active = headings[0];
      headings.forEach((heading) => {
        if (heading.getBoundingClientRect().top <= offset) {
          active = heading;
        }
      });

      setActiveHeading(active);
    }

    setActiveByScroll();
    window.addEventListener("scroll", setActiveByScroll, { passive: true });
    window.addEventListener("resize", setActiveByScroll);
    window.addEventListener("hashchange", () => {
      const id = window.location.hash.replace("#", "");
      if (!id) return;
      const target = headings.find((heading) => heading.id === id);
      if (target) setActiveHeading(target);
    });
  }

  function slugify(value) {
    const clean = value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return clean || "section";
  }

  function uniqueId(base, usedIds) {
    let id = base;
    let count = 2;
    while (usedIds.has(id) || document.getElementById(id)) {
      id = `${base}-${count}`;
      count += 1;
    }
    usedIds.add(id);
    return id;
  }

  setupSidebar();
  setupCodeTabs();
  addCopyButtons();
  setupSearch();
  setupMermaid();
  setupSectionNav();
})();
