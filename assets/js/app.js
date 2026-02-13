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

    function normalizePath(path) {
      let out = String(path || "").trim();
      if (!out) return "/";
      out = out.split("#")[0].split("?")[0];
      if (!out.startsWith("/")) out = `/${out}`;
      out = out.replace(/\/{2,}/g, "/");
      if (out !== "/" && out.endsWith("/")) {
        out = out.slice(0, -1);
      }
      return out || "/";
    }

    function openNavItem(item) {
      if (!item) return;
      const branch = item.querySelector(":scope > .nav-children");
      const toggle = item.querySelector(":scope > .nav-row > .nav-toggle");
      if (branch) branch.classList.remove("is-collapsed");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
    }

    function expandActivePath() {
      if (!sidebar) return;

      const currentPath = normalizePath(window.location.pathname);
      const links = Array.from(sidebar.querySelectorAll(".nav-link"));
      const activeLinks = [];

      links.forEach((link) => {
        const linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
        if (linkPath === currentPath) {
          link.classList.add("is-active");
          link.closest(".nav-item")?.classList.add("is-active");
          activeLinks.push(link);
        }
      });

      activeLinks.forEach((link) => {
        let item = link.closest(".nav-item");
        while (item) {
          openNavItem(item);
          const parentChildren = item.parentElement;
          if (!parentChildren || !parentChildren.classList.contains("nav-children")) break;
          parentChildren.classList.remove("is-collapsed");
          item = parentChildren.closest(".nav-item");
        }
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

    expandActivePath();
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

      group.classList.add("is-enhanced");

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
      } else {
        tabList.style.display = "";
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

    const stopWords = new Set([
      "a",
      "an",
      "and",
      "are",
      "as",
      "at",
      "be",
      "by",
      "for",
      "from",
      "in",
      "is",
      "it",
      "of",
      "on",
      "or",
      "that",
      "the",
      "to",
      "with",
      "your",
    ]);

    const synonymMap = new Map([
      ["deref", ["derefmut"]],
      ["derefmut", ["deref"]],
      ["unionfind", ["union", "find"]],
      ["disjointset", ["unionfind", "union", "find"]],
      ["toposort", ["topological", "sort"]],
      ["bfs", ["breadth", "first"]],
      ["dfs", ["depth", "first"]],
    ]);

    const rustPriorityTerms = new Set([
      "drop",
      "deref",
      "derefmut",
      "phantomdata",
      "pin",
      "unpin",
      "raii",
    ]);

    const fieldWeights = {
      title: 8.5,
      headings: 5.2,
      description: 3.3,
      url: 4.1,
      content: 1.0,
    };

    function normalizeText(text) {
      return String(text || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[’']/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function normalizeUrl(url) {
      let out = String(url || "").trim();
      if (!out) return "/";
      if (baseUrl && out.startsWith(baseUrl)) {
        out = out.slice(baseUrl.length) || "/";
      }
      if (!out.startsWith("/")) out = `/${out}`;
      out = out.split("#")[0].split("?")[0];
      out = out.replace(/\/{2,}/g, "/");
      if (out !== "/" && !out.endsWith("/")) out = `${out}/`;
      return out;
    }

    function tokenize(text) {
      return normalizeText(text)
        .split(/[^a-z0-9_+#]+/)
        .filter((t) => t.length >= 2 && !stopWords.has(t));
    }

    function slugifyHeading(text) {
      return normalizeText(text)
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    function extractHeadingEntriesFromMarkdown(rawContent) {
      const lines = String(rawContent || "").split(/\r?\n/);
      const entries = [];
      lines.forEach((line) => {
        const match = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
        if (!match) return;
        const level = match[1].length;
        const cleaned = match[2]
          .replace(/`+/g, "")
          .replace(/\[(.*?)\]\(.*?\)/g, "$1")
          .replace(/[*_>#]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (!cleaned || level > 4) return;
        const id = slugifyHeading(cleaned);
        entries.push({
          level,
          text: cleaned,
          path: cleaned,
          norm: normalizeText(cleaned),
          pathNorm: normalizeText(cleaned),
          id,
        });
      });
      return entries;
    }

    function extractHeadingEntriesFromHtml(rawHtml) {
      if (!rawHtml || typeof DOMParser === "undefined") return [];

      try {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(`<article>${rawHtml}</article>`, "text/html");
        const headings = Array.from(parsed.querySelectorAll("h2, h3, h4"));
        if (!headings.length) return [];

        const entries = [];
        let currentH2 = null;

        headings.forEach((heading) => {
          const text = (heading.textContent || "").replace(/\s+/g, " ").trim();
          if (!text) return;

          const level = Number.parseInt(heading.tagName.slice(1), 10);
          if (!Number.isFinite(level) || level > 4) return;

          const id = heading.getAttribute("id") || slugifyHeading(text);
          if (!id) return;

          if (level === 2) {
            currentH2 = text;
          }

          const path =
            level > 2 && currentH2 && currentH2 !== text ? `${currentH2} > ${text}` : text;

          entries.push({
            level,
            text,
            path,
            norm: normalizeText(text),
            pathNorm: normalizeText(path),
            id,
          });
        });

        return entries;
      } catch (_) {
        return [];
      }
    }

    function countTokens(tokens) {
      const out = new Map();
      tokens.forEach((token) => {
        out.set(token, (out.get(token) || 0) + 1);
      });
      return out;
    }

    function extractHeadings(rawContent) {
      return extractHeadingEntriesFromMarkdown(rawContent).map((e) => e.text).join(" ");
    }

    function addPosting(postings, term, docId, field, tf) {
      let termMap = postings.get(term);
      if (!termMap) {
        termMap = new Map();
        postings.set(term, termMap);
      }
      let row = termMap.get(docId);
      if (!row) {
        row = { title: 0, headings: 0, description: 0, url: 0, content: 0 };
        termMap.set(docId, row);
      }
      row[field] += tf;
    }

    function bm25(tf, docLen, avgLen, k1 = 1.2, b = 0.75) {
      const safeAvg = avgLen > 0 ? avgLen : 1;
      const norm = 1 - b + b * (docLen / safeAvg);
      return (tf * (k1 + 1)) / (tf + k1 * norm);
    }

    function buildSnippet(doc, queryNorm, baseTerms) {
      const source = String(doc.descriptionRaw || doc.headingsRaw || doc.contentRaw || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!source) return "";

      const sourceNorm = normalizeText(source);
      let pos = queryNorm ? sourceNorm.indexOf(queryNorm) : -1;

      if (pos < 0) {
        for (let i = 0; i < baseTerms.length; i += 1) {
          pos = sourceNorm.indexOf(baseTerms[i]);
          if (pos >= 0) break;
        }
      }

      if (pos < 0) return source.slice(0, 170);

      const start = Math.max(0, pos - 70);
      const end = Math.min(source.length, pos + 140);
      let snippet = source.slice(start, end).trim();
      if (start > 0) snippet = `...${snippet}`;
      if (end < source.length) snippet = `${snippet}...`;
      return snippet;
    }

    fetch(`${baseUrl}/search.json`)
      .then((resp) => resp.json())
      .then((rawDocs) => {
        if (!Array.isArray(rawDocs) || !rawDocs.length) return;

        const docs = rawDocs.map((doc, id) => {
          const titleRaw = String(doc.title || "");
          const descriptionRaw = String(doc.description || "");
          const contentRaw = String(doc.content || "");
          const contentHtmlRaw = String(doc.content_html || "");
          const htmlHeadingEntries = extractHeadingEntriesFromHtml(contentHtmlRaw);
          const headingEntries = htmlHeadingEntries.length
            ? htmlHeadingEntries
            : extractHeadingEntriesFromMarkdown(contentRaw);
          const headingsRaw = headingEntries.map((e) => e.text).join(" ");

          const titleNorm = normalizeText(titleRaw);
          const descriptionNorm = normalizeText(descriptionRaw);
          const contentNorm = normalizeText(contentRaw);
          const headingsNorm = normalizeText(headingsRaw);
          const urlNorm = normalizeUrl(doc.url || "");
          const urlTokenSource = normalizeText(urlNorm.replaceAll("/", " "));

          const titleTokens = tokenize(titleRaw);
          const headingTokens = tokenize(headingsRaw);
          const descriptionTokens = tokenize(descriptionRaw);
          const urlTokens = tokenize(urlTokenSource);
          const contentTokens = tokenize(contentRaw).slice(0, 9000);

          return {
            id,
            title: titleRaw,
            url: String(doc.url || ""),
            urlNorm,
            titleNorm,
            descriptionNorm,
            contentNorm,
            headingsNorm,
            descriptionRaw,
            contentRaw,
            contentHtmlRaw,
            headingsRaw,
            titleTokensSet: new Set(titleTokens),
            headingTokensSet: new Set(headingTokens),
            headingEntries,
            fields: {
              title: countTokens(titleTokens),
              headings: countTokens(headingTokens),
              description: countTokens(descriptionTokens),
              url: countTokens(urlTokens),
              content: countTokens(contentTokens),
            },
            lengths: {
              title: Math.max(1, titleTokens.length),
              headings: Math.max(1, headingTokens.length),
              description: Math.max(1, descriptionTokens.length),
              url: Math.max(1, urlTokens.length),
              content: Math.max(1, contentTokens.length),
            },
            isIndex: /\/(index)?\/?$/.test(urlNorm),
          };
        });

        const urlToId = new Map();
        docs.forEach((doc) => {
          urlToId.set(doc.urlNorm, doc.id);
        });

        const postings = new Map();
        const lengthSums = { title: 0, headings: 0, description: 0, url: 0, content: 0 };

        docs.forEach((doc) => {
          Object.keys(lengthSums).forEach((field) => {
            lengthSums[field] += doc.lengths[field];
          });

          Object.entries(doc.fields).forEach(([field, tfMap]) => {
            tfMap.forEach((tf, term) => {
              addPosting(postings, term, doc.id, field, tf);
            });
          });
        });

        const avgLens = {
          title: lengthSums.title / docs.length,
          headings: lengthSums.headings / docs.length,
          description: lengthSums.description / docs.length,
          url: lengthSums.url / docs.length,
          content: lengthSums.content / docs.length,
        };

        const docFreq = new Map();
        postings.forEach((docMap, term) => {
          docFreq.set(term, docMap.size);
        });
        const vocabulary = Array.from(postings.keys());

        const edges = docs.map(() => new Set());
        const markdownLinkPattern = /\[[^\]]+\]\(([^)\s]+)\)/g;

        docs.forEach((doc) => {
          let match;
          while ((match = markdownLinkPattern.exec(doc.contentRaw)) !== null) {
            let target = match[1] || "";
            if (!target || target.startsWith("#") || target.startsWith("http") || target.startsWith("mailto:")) {
              continue;
            }
            if (target.includes("{{")) {
              const quoted = target.match(/['"]([^'"]+)['"]/);
              target = quoted ? quoted[1] : "";
            }
            if (!target) continue;
            const normalizedTarget = normalizeUrl(target);
            const targetId = urlToId.get(normalizedTarget);
            if (targetId != null && targetId !== doc.id) {
              edges[doc.id].add(targetId);
            }
          }
          markdownLinkPattern.lastIndex = 0;

          const parts = doc.urlNorm.split("/").filter(Boolean);
          if (parts.length > 1) {
            for (let i = 1; i < parts.length; i += 1) {
              const parentPath = `/${parts.slice(0, i).join("/")}/`;
              const parentId = urlToId.get(parentPath);
              if (parentId != null && parentId !== doc.id) {
                edges[doc.id].add(parentId);
              }
            }
          }
        });

        docs.forEach((doc) => {
          const parts = doc.urlNorm.split("/").filter(Boolean);
          if (!parts.length) return;
          const parentPath = parts.length > 1 ? `/${parts.slice(0, -1).join("/")}/` : "/";
          const parentId = urlToId.get(parentPath);
          if (parentId != null && parentId !== doc.id) {
            edges[parentId].add(doc.id);
          }
        });

        const n = docs.length;
        let rank = Array.from({ length: n }, () => 1 / n);
        const damping = 0.85;
        for (let iter = 0; iter < 24; iter += 1) {
          const next = Array.from({ length: n }, () => (1 - damping) / n);
          let danglingMass = 0;

          for (let i = 0; i < n; i += 1) {
            const out = edges[i];
            if (!out.size) {
              danglingMass += rank[i];
              continue;
            }
            const share = (damping * rank[i]) / out.size;
            out.forEach((targetId) => {
              next[targetId] += share;
            });
          }

          if (danglingMass > 0) {
            const shared = (damping * danglingMass) / n;
            for (let i = 0; i < n; i += 1) {
              next[i] += shared;
            }
          }

          rank = next;
        }

        const minRank = Math.min(...rank);
        const maxRank = Math.max(...rank);
        docs.forEach((doc) => {
          doc.authority = maxRank > minRank ? (rank[doc.id] - minRank) / (maxRank - minRank) : 0.5;
        });

        const prefixCache = new Map();
        function collectCandidateDocs(termGroup) {
          const direct = new Set();
          termGroup.forEach((term) => {
            const posting = postings.get(term);
            if (!posting) return;
            posting.forEach((_, docId) => direct.add(docId));
          });
          if (direct.size) return direct;

          const fallback = new Set();
          termGroup.forEach((term) => {
            if (term.length < 3) return;
            if (!prefixCache.has(term)) {
              const ids = new Set();
              let expansions = 0;
              for (let i = 0; i < vocabulary.length; i += 1) {
                const token = vocabulary[i];
                if (!token.startsWith(term) || token.length > term.length + 6) continue;
                const posting = postings.get(token);
                if (posting) {
                  posting.forEach((_, docId) => ids.add(docId));
                }
                expansions += 1;
                if (expansions > 100) break;
              }
              prefixCache.set(term, ids);
            }
            prefixCache.get(term).forEach((docId) => fallback.add(docId));
          });
          return fallback;
        }

        function computeIdf(term) {
          const df = docFreq.get(term) || 0;
          if (!df) return 0;
          return Math.log(1 + (n - df + 0.5) / (df + 0.5));
        }

        function phraseInOrder(sourceNorm, terms) {
          let idx = -1;
          for (let i = 0; i < terms.length; i += 1) {
            idx = sourceNorm.indexOf(terms[i], idx + 1);
            if (idx < 0) return false;
          }
          return true;
        }

        function runSearch() {
          const rawQuery = input.value || "";
          const queryNorm = normalizeText(rawQuery);
          if (queryNorm.length < 2) {
            results.classList.remove("is-open");
            results.innerHTML = "";
            return;
          }

          const baseTerms = tokenize(queryNorm);
          if (!baseTerms.length) {
            results.classList.remove("is-open");
            results.innerHTML = "";
            return;
          }

          const termGroups = baseTerms.map((term) => {
            const expanded = new Set([term]);
            const synonyms = synonymMap.get(term);
            if (Array.isArray(synonyms)) {
              synonyms.forEach((syn) => expanded.add(syn));
            }
            return Array.from(expanded);
          });

          const candidateSet = new Set();
          termGroups.forEach((group) => {
            collectCandidateDocs(group).forEach((docId) => candidateSet.add(docId));
          });

          if (!candidateSet.size) {
            docs.forEach((doc) => {
              if (doc.titleNorm.includes(queryNorm) || doc.headingsNorm.includes(queryNorm)) {
                candidateSet.add(doc.id);
              }
            });
          }

          const scored = [];
          candidateSet.forEach((docId) => {
            const doc = docs[docId];
            let score = 0;
            let matchedGroups = 0;
            let bestHeading = null;

            termGroups.forEach((group) => {
              let groupScore = 0;
              group.forEach((term) => {
                const posting = postings.get(term);
                const row = posting ? posting.get(doc.id) : null;
                if (!row) return;
                const idf = computeIdf(term);
                const termScore =
                  fieldWeights.title * bm25(row.title, doc.lengths.title, avgLens.title) * idf +
                  fieldWeights.headings * bm25(row.headings, doc.lengths.headings, avgLens.headings) * idf +
                  fieldWeights.description * bm25(row.description, doc.lengths.description, avgLens.description) * idf +
                  fieldWeights.url * bm25(row.url, doc.lengths.url, avgLens.url) * idf +
                  fieldWeights.content * bm25(row.content, doc.lengths.content, avgLens.content) * idf;
                groupScore = Math.max(groupScore, termScore);
              });
              if (groupScore > 0) {
                matchedGroups += 1;
                score += groupScore;
              }
            });

            const coverage = matchedGroups / termGroups.length;
            score += coverage * 4.2;
            if (coverage === 1) score += 5.6;

            if (doc.titleNorm === queryNorm) score += 16;
            if (doc.titleNorm.includes(queryNorm)) score += 10.5;
            if (doc.headingsNorm.includes(queryNorm)) score += 7.2;
            if (doc.descriptionNorm.includes(queryNorm)) score += 4.1;
            if (doc.urlNorm.includes(queryNorm.replace(/\s+/g, "-"))) score += 4.8;
            if (baseTerms.length > 1 && phraseInOrder(doc.contentNorm, baseTerms)) score += 2.7;

            if (Array.isArray(doc.headingEntries) && doc.headingEntries.length) {
              doc.headingEntries.forEach((entry) => {
                let headingScore = 0;
                const headingScope = entry.pathNorm || entry.norm || "";

                if (headingScope === queryNorm) {
                  headingScore += 18;
                } else if (headingScope.includes(queryNorm)) {
                  headingScore += 13;
                } else if (baseTerms.every((term) => headingScope.includes(term))) {
                  headingScore += 9;
                }

                const matchedTerms = baseTerms.filter((term) => headingScope.includes(term)).length;
                headingScore += matchedTerms * 2.2;

                if (headingScore > 0 && (!bestHeading || headingScore > bestHeading.score)) {
                  bestHeading = { ...entry, score: headingScore };
                }
              });
            }
            if (bestHeading) {
              score += bestHeading.score;
            }

            const titleHits = baseTerms.filter((term) => doc.titleTokensSet.has(term)).length;
            const headingHits = baseTerms.filter((term) => doc.headingTokensSet.has(term)).length;
            score += titleHits * 2.8;
            score += headingHits * 1.6;

            const urlHits = baseTerms.filter((term) => doc.urlNorm.includes(term)).length;
            if (baseTerms.length === 1 && titleHits + headingHits + urlHits === 0) {
              // Demote weak content-only matches for short queries to keep intent-focused results on top.
              score *= 0.35;
            }

            if (baseTerms.some((term) => rustPriorityTerms.has(term))) {
              if (doc.urlNorm.includes("/languages/language-specifics/rust-patterns/")) score += 6.5;
              if (doc.urlNorm.includes("/languages/language-features/rust/")) score += 2.5;
              if (bestHeading && rustPriorityTerms.has(baseTerms[0]) && bestHeading.norm.includes(baseTerms[0])) {
                score += 5.5;
              }
            }

            score += doc.authority * 2.9;
            if (doc.isIndex) score -= 0.2;

            scored.push({ doc, score, coverage, bestHeading });
          });

          const matches = scored
            .filter((row) => row.score > 0)
            .sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              if (b.coverage !== a.coverage) return b.coverage - a.coverage;
              return a.doc.title.localeCompare(b.doc.title);
            })
            .slice(0, 12);

          if (!matches.length) {
            results.innerHTML = '<a href="#" aria-disabled="true"><div class="search-title">No matches</div><div class="search-snippet">Try a broader term or a shorter query.</div></a>';
            results.classList.add("is-open");
            return;
          }

          results.innerHTML = matches
            .map(({ doc, bestHeading }) => {
              const snippet = bestHeading
                ? `Matched "${rawQuery.trim()}" in section: ${bestHeading.path || bestHeading.text}`
                : buildSnippet(doc, queryNorm, baseTerms);
              const href = bestHeading?.id ? `${doc.url}#${bestHeading.id}` : doc.url;
              const sectionLabel = bestHeading
                ? `<div class="search-context">Section: ${escapeHtml(bestHeading.path || bestHeading.text)}</div>`
                : "";
              return `<a href="${href}"><div class="search-title">${escapeHtml(doc.title)}</div>${sectionLabel}<div class="search-snippet">${escapeHtml(snippet)}</div></a>`;
            })
            .join("");
          results.classList.add("is-open");
        }

        let timer = null;
        input.addEventListener("input", () => {
          if (timer) window.clearTimeout(timer);
          timer = window.setTimeout(runSearch, 20);
        });

        input.addEventListener("focus", () => {
          if (results.innerHTML.trim()) {
            results.classList.add("is-open");
          }
        });

        input.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            results.classList.remove("is-open");
          }
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

  function setupOperationAnimations() {
    const blocks = document.querySelectorAll(".operation-anim");
    if (!blocks.length) return;

    blocks.forEach((block) => {
      const pagePath = window.location.pathname || "";
      const titleEl = block.querySelector(".operation-anim-title");
      const rawSteps = Array.from(block.querySelectorAll(".op-step"))
        .map((el) => (el.textContent || "").trim())
        .filter(Boolean);

      if (!rawSteps.length) return;

      const steps = rawSteps.map((text) => text.replace(/^\d+\.\s*/, "").trim());
      const title = titleEl?.textContent?.trim() || "Interactive Walkthrough";
      const autoplayMs = Number.parseInt(block.dataset.autoplayMs || "900", 10);
      const tickMs = Number.isFinite(autoplayMs) && autoplayMs >= 250 ? autoplayMs : 900;
      const example = getOperationExample(title, steps.length, pagePath);
      const vizFrames = Array.isArray(example?.viz?.frames) && example.viz.frames.length
        ? normalizeFrames(example.viz.frames, steps.length)
        : null;

      let activeStep = 0;
      let timer = null;

      block.innerHTML = "";
      block.classList.add("operation-anim-interactive");

      const titleNode = document.createElement("p");
      titleNode.className = "operation-anim-title";
      titleNode.textContent = title;
      block.append(titleNode);

      let vizContainer = null;
      if (vizFrames) {
        vizContainer = document.createElement("div");
        vizContainer.className = "operation-anim-viz";
        block.append(vizContainer);
      }

      const boardRows = [];
      const autoVizLanes = [];
      if (example?.rows?.length) {
        let autoVizContainer = null;
        if (!vizFrames) {
          autoVizContainer = document.createElement("div");
          autoVizContainer.className = "operation-anim-auto";
          block.append(autoVizContainer);
        }

        const board = document.createElement("div");
        board.className = "operation-anim-board";
        example.rows.forEach((row) => {
          const rowEl = document.createElement("div");
          rowEl.className = "operation-anim-state-row";

          const label = document.createElement("span");
          label.className = "operation-anim-state-label";
          label.textContent = row.label;

          const value = document.createElement("span");
          value.className = "operation-anim-state-value";

          rowEl.append(label, value);
          board.appendChild(rowEl);
          boardRows.push({ frames: row.frames, value });

          if (autoVizContainer) {
            const lane = document.createElement("div");
            lane.className = "operation-anim-auto-lane";
            const laneLabel = document.createElement("span");
            laneLabel.className = "operation-anim-auto-label";
            laneLabel.textContent = row.label;
            const laneTrack = document.createElement("div");
            laneTrack.className = "operation-anim-auto-track";
            lane.append(laneLabel, laneTrack);
            autoVizContainer.appendChild(lane);
            autoVizLanes.push({ frames: row.frames, track: laneTrack });
          }
        });
        block.append(board);
      }

      const stepList = document.createElement("ol");
      stepList.className = "op-step-list";
      const stepNodes = [];
      steps.forEach((text) => {
        const li = document.createElement("li");
        li.className = "op-step";
        li.textContent = text;
        stepList.appendChild(li);
        stepNodes.push(li);
      });

      const current = document.createElement("p");
      current.className = "operation-anim-current";

      const controls = document.createElement("div");
      controls.className = "operation-anim-controls";
      const prevBtn = opButton("Prev");
      const playBtn = opButton("Play");
      const nextBtn = opButton("Next");
      const resetBtn = opButton("Reset");
      const progress = document.createElement("span");
      progress.className = "operation-anim-progress";

      controls.append(prevBtn, playBtn, nextBtn, resetBtn, progress);
      block.append(stepList, current, controls);

      prevBtn.addEventListener("click", () => {
        stopPlayback();
        setStep(activeStep - 1);
      });
      nextBtn.addEventListener("click", () => {
        stopPlayback();
        setStep(activeStep + 1);
      });
      resetBtn.addEventListener("click", () => {
        stopPlayback();
        setStep(0);
      });
      playBtn.addEventListener("click", () => {
        if (timer) {
          stopPlayback();
          return;
        }
        if (activeStep >= stepNodes.length - 1) {
          setStep(0);
        }
        timer = window.setInterval(() => {
          if (activeStep >= stepNodes.length - 1) {
            stopPlayback();
            return;
          }
          setStep(activeStep + 1);
        }, tickMs);
        playBtn.textContent = "Pause";
      });

      function stopPlayback() {
        if (!timer) return;
        window.clearInterval(timer);
        timer = null;
        playBtn.textContent = "Play";
      }

      function setStep(index) {
        activeStep = Math.max(0, Math.min(index, stepNodes.length - 1));
        stepNodes.forEach((node, idx) => {
          node.classList.toggle("is-active", idx === activeStep);
          node.classList.toggle("is-complete", idx < activeStep);
        });

        boardRows.forEach((row) => {
          const frame = row.frames[activeStep];
          renderStateValue(row.value, frame);
        });

        if (vizContainer && vizFrames) {
          renderVizFrame(vizContainer, vizFrames[activeStep]);
        }

        if (autoVizLanes.length) {
          autoVizLanes.forEach((lane) => {
            const frame = lane.frames[activeStep];
            const prevFrame = lane.frames[Math.max(0, activeStep - 1)];
            renderAutoVizTrack(lane.track, frame, prevFrame, activeStep > 0);
          });
        }

        current.textContent = `Current step: ${steps[activeStep]}`;
        progress.textContent = `Step ${activeStep + 1}/${stepNodes.length}`;

        prevBtn.disabled = activeStep === 0;
        nextBtn.disabled = activeStep === stepNodes.length - 1;
      }

      setStep(0);
    });

    function opButton(label) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "operation-anim-btn";
      btn.textContent = label;
      return btn;
    }

    function renderStateValue(container, value) {
      container.innerHTML = "";

      if (value && typeof value === "object" && !Array.isArray(value) && Array.isArray(value.tokens)) {
        const wrap = document.createElement("span");
        wrap.className = "operation-anim-token-list";
        value.tokens.forEach((token, idx) => {
          const chip = document.createElement("span");
          chip.className = "operation-anim-token";
          chip.textContent = token;
          if (Array.isArray(value.highlight) && value.highlight.includes(idx)) {
            chip.classList.add("is-highlight");
          }
          wrap.appendChild(chip);
        });
        container.appendChild(wrap);
        return;
      }

      container.textContent = value == null ? "" : String(value);
    }

    function renderAutoVizTrack(container, value, prevValue, allowDelta) {
      container.innerHTML = "";

      const curr = parseAutoVizFrame(value);
      const prev = parseAutoVizFrame(prevValue);
      const prevTokens = prev.tokens.map((token) => token.text);

      if (!curr.tokens.length) {
        const empty = document.createElement("span");
        empty.className = "operation-anim-auto-empty";
        empty.textContent = "—";
        container.appendChild(empty);
        return;
      }

      curr.tokens.forEach((token, idx) => {
        const chip = document.createElement("span");
        chip.className = "operation-anim-auto-token";
        chip.textContent = token.text;

        if (token.highlight) {
          chip.classList.add("is-highlight");
        }
        if (allowDelta && (prevTokens[idx] !== token.text || token.highlight)) {
          chip.classList.add("is-change");
        }
        if (token.meta) {
          chip.classList.add("is-meta");
        }

        container.appendChild(chip);

        if (curr.connector && idx < curr.tokens.length - 1) {
          const conn = document.createElement("span");
          conn.className = "operation-anim-auto-connector";
          conn.textContent = curr.connector;
          container.appendChild(conn);
        }
      });
    }

    function parseAutoVizFrame(value) {
      if (value && typeof value === "object" && !Array.isArray(value) && Array.isArray(value.tokens)) {
        const highlighted = new Set(Array.isArray(value.highlight) ? value.highlight : []);
        const tokens = value.tokens.map((token, idx) => ({
          text: String(token),
          highlight: highlighted.has(idx),
          meta: false,
        }));
        return capAutoTokens({ tokens, connector: "" });
      }

      if (Array.isArray(value)) {
        const tokens = value.map((token) => ({
          text: String(token),
          highlight: false,
          meta: false,
        }));
        return capAutoTokens({ tokens, connector: "" });
      }

      const text = String(value == null ? "" : value).trim();
      if (!text || text === "-") {
        return { tokens: [], connector: "" };
      }

      if (text.includes("->")) {
        const parts = text
          .split(/\s*->\s*/)
          .map((part) => part.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          return capAutoTokens({
            tokens: parts.map((part) => ({ text: part, highlight: false, meta: false })),
            connector: "→",
          });
        }
      }

      if (/^\[[^\]]+\]$/.test(text) && text.includes(",")) {
        const inner = text.slice(1, -1);
        const parts = inner
          .split(/\s*,\s*/)
          .map((part) => part.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          return capAutoTokens({
            tokens: parts.map((part) => ({ text: part, highlight: false, meta: false })),
            connector: "",
          });
        }
      }

      if (text.includes(",") && text.length <= 80) {
        const parts = text
          .split(/\s*,\s*/)
          .map((part) => part.trim())
          .filter(Boolean);
        if (parts.length >= 2 && parts.every((part) => part.length <= 24)) {
          return capAutoTokens({
            tokens: parts.map((part) => ({ text: part, highlight: false, meta: false })),
            connector: "",
          });
        }
      }

      return capAutoTokens({
        tokens: [{ text, highlight: false, meta: false }],
        connector: "",
      });
    }

    function capAutoTokens(parsed) {
      const maxTokens = 12;
      if (parsed.tokens.length <= maxTokens) return parsed;

      const visible = parsed.tokens.slice(0, maxTokens - 1);
      visible.push({
        text: `+${parsed.tokens.length - (maxTokens - 1)} more`,
        highlight: false,
        meta: true,
      });
      return { ...parsed, tokens: visible };
    }

    function renderVizFrame(container, frame) {
      container.innerHTML = "";
      if (!frame || typeof frame !== "object") return;
      if (frame.kind !== "graph") return;

      const svgNs = "http://www.w3.org/2000/svg";
      const viewBox = frame.viewBox || "0 0 1000 420";
      const svg = document.createElementNS(svgNs, "svg");
      svg.classList.add("operation-anim-viz-svg");
      svg.setAttribute("viewBox", viewBox);
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", frame.ariaLabel || "Operation visual");

      const nodes = Array.isArray(frame.nodes) ? frame.nodes : [];
      const edges = Array.isArray(frame.edges) ? frame.edges : [];
      const nodeById = new Map();

      nodes.forEach((node) => {
        if (node?.id == null) return;
        nodeById.set(node.id, node);
      });

      function boundaryPoint(fromNode, toNode) {
        const fromW = (fromNode.w || 150) / 2;
        const fromH = (fromNode.h || 56) / 2;
        const dx = (toNode.x || 0) - (fromNode.x || 0);
        const dy = (toNode.y || 0) - (fromNode.y || 0);

        if (dx === 0 && dy === 0) {
          return { x: fromNode.x || 0, y: fromNode.y || 0 };
        }

        const denom = Math.max(Math.abs(dx) / Math.max(fromW, 1), Math.abs(dy) / Math.max(fromH, 1));
        const scale = denom > 0 ? 1 / denom : 0;

        return {
          x: (fromNode.x || 0) + dx * scale,
          y: (fromNode.y || 0) + dy * scale,
        };
      }

      edges.forEach((edge) => {
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        if (!from || !to) return;

        const start = boundaryPoint(from, to);
        const end = boundaryPoint(to, from);

        const line = document.createElementNS(svgNs, "line");
        line.setAttribute("x1", String(start.x));
        line.setAttribute("y1", String(start.y));
        line.setAttribute("x2", String(end.x));
        line.setAttribute("y2", String(end.y));
        line.classList.add("operation-anim-viz-edge");
        if (edge.active) line.classList.add("is-active");
        svg.appendChild(line);
      });

      nodes.forEach((node) => {
        const group = document.createElementNS(svgNs, "g");
        group.classList.add("operation-anim-viz-node");
        if (node.active) group.classList.add("is-active");
        if (node.muted) group.classList.add("is-muted");

        const w = node.w || 150;
        const h = node.h || 56;
        const rect = document.createElementNS(svgNs, "rect");
        rect.setAttribute("x", String(node.x - w / 2));
        rect.setAttribute("y", String(node.y - h / 2));
        rect.setAttribute("width", String(w));
        rect.setAttribute("height", String(h));
        rect.setAttribute("rx", String(node.rx || 12));
        rect.classList.add("operation-anim-viz-node-box");
        group.appendChild(rect);

        const text = document.createElementNS(svgNs, "text");
        text.setAttribute("x", String(node.x));
        text.setAttribute("text-anchor", "middle");
        text.classList.add("operation-anim-viz-node-text");

        const lines = String(node.label || "").split("\n");
        const lineHeight = node.lineHeight || 14;
        const firstY = node.y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, idx) => {
          const tspan = document.createElementNS(svgNs, "tspan");
          tspan.setAttribute("x", String(node.x));
          tspan.setAttribute("y", String(firstY + idx * lineHeight));
          tspan.textContent = line;
          text.appendChild(tspan);
        });

        group.appendChild(text);
        svg.appendChild(group);
      });

      container.appendChild(svg);
      if (frame.caption) {
        const caption = document.createElement("p");
        caption.className = "operation-anim-viz-caption";
        caption.textContent = frame.caption;
        container.appendChild(caption);
      }
    }

    function normalizeFrames(frames, count) {
      if (!Array.isArray(frames) || !frames.length) {
        return Array.from({ length: count }, () => "");
      }
      if (frames.length >= count) {
        return frames.slice(0, count);
      }
      const out = frames.slice();
      while (out.length < count) {
        out.push(frames[frames.length - 1]);
      }
      return out;
    }

    function getOperationExample(title, stepCount, pagePath) {
      const t = title.toLowerCase();
      const isTreeContext = pagePath.includes("/data-structures/trees/") || pagePath.includes("/algorithms/tree/");
      const isGraphContext = pagePath.includes("/data-structures/graphs/") || pagePath.includes("/algorithms/graph/");
      const token = (tokens, highlight = []) => ({ tokens, highlight });
      const rows = (defs) => {
        const normalizedDefs = defs.map((def) => ({ label: def.label, frames: normalizeFrames(def.frames, stepCount) }));
        const out = {
          rows: normalizedDefs,
        };
        const defaultVizFrames = inferDefaultTreeGraphViz(normalizedDefs);
        if (defaultVizFrames?.length) {
          out.viz = { frames: normalizeFrames(defaultVizFrames, stepCount) };
        }
        return out;
      };
      const withRowsAndViz = (defs, vizFrames) => ({
        rows: defs.map((def) => ({ label: def.label, frames: normalizeFrames(def.frames, stepCount) })),
        viz: { frames: normalizeFrames(vizFrames, stepCount) },
      });
      const graphFrame = (nodes, edges, caption, ariaLabel = "Operation visual") => ({
        kind: "graph",
        viewBox: "0 0 1000 460",
        nodes,
        edges,
        caption,
        ariaLabel,
      });
      const edgeList = (pairs, activePairs = []) => {
        const active = new Set(activePairs.map(([from, to]) => `${from}->${to}`));
        return pairs.map(([from, to]) => ({ from, to, active: active.has(`${from}->${to}`) }));
      };
      const nodeList = (layout, labels, activeIds = [], mutedIds = []) => {
        const active = new Set(activeIds);
        const muted = new Set(mutedIds);
        return layout.map((node) => ({
          ...node,
          label: labels[node.id] || node.label,
          active: active.has(node.id),
          muted: muted.has(node.id),
        }));
      };
      const frameToText = (frame) => {
        if (frame && typeof frame === "object" && !Array.isArray(frame) && Array.isArray(frame.tokens)) {
          return frame.tokens.join(" ");
        }
        if (Array.isArray(frame)) {
          return frame.join(" ");
        }
        return String(frame == null ? "" : frame);
      };
      const normalizeAlias = (raw) => String(raw == null ? "" : raw).toLowerCase().replace(/[^a-z0-9,]+/g, "");
      const toCaption = (rawText, fallback) => {
        const clean = String(rawText == null ? "" : rawText).replace(/\s+/g, " ").trim();
        if (!clean) return fallback;
        return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
      };
      const pathEdgesFromNodes = (path, edges) => {
        if (!Array.isArray(path) || path.length < 2) return [];
        const hasDirectedEdge = (from, to) => edges.some((edge) => edge[0] === from && edge[1] === to);
        const out = [];
        for (let i = 0; i < path.length - 1; i += 1) {
          const from = path[i];
          const to = path[i + 1];
          if (hasDirectedEdge(from, to)) {
            out.push([from, to]);
          } else if (hasDirectedEdge(to, from)) {
            out.push([to, from]);
          }
        }
        return out;
      };
      const connectedEdgesFromActive = (activeSet, edges) =>
        edges.filter(([from, to]) => activeSet.has(from) && activeSet.has(to));
      const parseHeapValues = (rawText) => {
        const matches = [...String(rawText == null ? "" : rawText).matchAll(/\[([0-9,\s-]+)\]/g)];
        if (!matches.length) return null;
        const inner = matches[matches.length - 1][1];
        const values = inner.split(",").map((part) => part.trim()).filter(Boolean);
        return values.length ? values : null;
      };
      const commonTreeLayout = [
        { id: "t15", x: 500, y: 58, w: 120, h: 52, label: "15" },
        { id: "t10", x: 320, y: 148, w: 110, h: 50, label: "10" },
        { id: "t21", x: 680, y: 148, w: 110, h: 50, label: "21" },
        { id: "t5", x: 220, y: 236, w: 104, h: 48, label: "5" },
        { id: "t12", x: 420, y: 236, w: 104, h: 48, label: "12" },
        { id: "t18", x: 580, y: 236, w: 104, h: 48, label: "18" },
        { id: "t24", x: 780, y: 236, w: 104, h: 48, label: "24" },
        { id: "t14", x: 480, y: 324, w: 98, h: 46, label: "14" },
      ];
      const commonTreeEdges = [
        ["t15", "t10"],
        ["t15", "t21"],
        ["t10", "t5"],
        ["t10", "t12"],
        ["t21", "t18"],
        ["t21", "t24"],
        ["t12", "t14"],
      ];
      const traversalTreeLayout = [
        { id: "b1", x: 500, y: 62, w: 106, h: 48, label: "1" },
        { id: "b2", x: 320, y: 154, w: 100, h: 46, label: "2" },
        { id: "b3", x: 680, y: 154, w: 100, h: 46, label: "3" },
        { id: "b4", x: 220, y: 246, w: 96, h: 44, label: "4" },
        { id: "b5", x: 420, y: 246, w: 96, h: 44, label: "5" },
        { id: "b6", x: 580, y: 246, w: 96, h: 44, label: "6" },
        { id: "b7", x: 780, y: 246, w: 96, h: 44, label: "7" },
      ];
      const traversalTreeEdges = [
        ["b1", "b2"],
        ["b1", "b3"],
        ["b2", "b4"],
        ["b2", "b5"],
        ["b3", "b6"],
        ["b3", "b7"],
      ];
      const heapLayout = [
        { id: "h1", x: 500, y: 62, w: 110, h: 48, label: "1" },
        { id: "h3", x: 340, y: 154, w: 102, h: 46, label: "3" },
        { id: "h5", x: 660, y: 154, w: 102, h: 46, label: "5" },
        { id: "h7", x: 250, y: 246, w: 96, h: 44, label: "7" },
        { id: "h9", x: 430, y: 246, w: 96, h: 44, label: "9" },
        { id: "h8", x: 570, y: 246, w: 96, h: 44, label: "8" },
        { id: "h4", x: 750, y: 246, w: 96, h: 44, label: "4" },
      ];
      const heapEdges = [
        ["h1", "h3"],
        ["h1", "h5"],
        ["h3", "h7"],
        ["h3", "h9"],
        ["h5", "h8"],
        ["h5", "h4"],
      ];
      const kdLayout = [
        { id: "k72", x: 500, y: 62, w: 138, h: 50, label: "(7,2)\nsplit x" },
        { id: "k54", x: 320, y: 154, w: 136, h: 50, label: "(5,4)\nsplit y" },
        { id: "k96", x: 680, y: 154, w: 136, h: 50, label: "(9,6)\nsplit y" },
        { id: "k23", x: 220, y: 246, w: 128, h: 48, label: "(2,3)\nsplit x" },
        { id: "k68", x: 420, y: 246, w: 128, h: 48, label: "(6,8)\nsplit x" },
        { id: "k81", x: 580, y: 246, w: 128, h: 48, label: "(8,1)\nsplit x" },
        { id: "k105", x: 780, y: 246, w: 128, h: 48, label: "(10,5)\nsplit x" },
      ];
      const kdEdges = [
        ["k72", "k54"],
        ["k72", "k96"],
        ["k54", "k23"],
        ["k54", "k68"],
        ["k96", "k81"],
        ["k96", "k105"],
      ];
      const traversalGraphLayout = [
        { id: "gA", x: 180, y: 208, w: 98, h: 44, label: "A" },
        { id: "gB", x: 360, y: 116, w: 98, h: 44, label: "B" },
        { id: "gC", x: 360, y: 300, w: 98, h: 44, label: "C" },
        { id: "gD", x: 560, y: 116, w: 98, h: 44, label: "D" },
        { id: "gE", x: 560, y: 300, w: 98, h: 44, label: "E" },
        { id: "gF", x: 760, y: 208, w: 98, h: 44, label: "F" },
      ];
      const traversalGraphEdges = [
        ["gA", "gB"],
        ["gA", "gC"],
        ["gB", "gC"],
        ["gB", "gD"],
        ["gC", "gD"],
        ["gC", "gE"],
        ["gD", "gF"],
        ["gE", "gF"],
      ];
      const dijkstraLayout = [
        { id: "dA", x: 170, y: 210, w: 112, h: 46, label: "A" },
        { id: "dB", x: 380, y: 112, w: 112, h: 46, label: "B" },
        { id: "dC", x: 380, y: 308, w: 112, h: 46, label: "C" },
        { id: "dD", x: 620, y: 210, w: 112, h: 46, label: "D" },
        { id: "dE", x: 850, y: 210, w: 112, h: 46, label: "E" },
      ];
      const dijkstraEdges = [
        ["dA", "dB"],
        ["dA", "dC"],
        ["dC", "dB"],
        ["dB", "dD"],
        ["dC", "dD"],
        ["dD", "dE"],
        ["dC", "dE"],
      ];
      const dagLayout = [
        { id: "m", x: 160, y: 210, w: 190, h: 52, label: "Math" },
        { id: "alg", x: 390, y: 112, w: 230, h: 52, label: "Algorithms" },
        { id: "ds", x: 390, y: 308, w: 230, h: 52, label: "DataStructures" },
        { id: "gr", x: 680, y: 210, w: 190, h: 52, label: "Graphs" },
        { id: "cmp", x: 900, y: 210, w: 190, h: 52, label: "Compilers" },
      ];
      const dagEdges = [
        ["m", "alg"],
        ["m", "ds"],
        ["alg", "gr"],
        ["ds", "gr"],
        ["gr", "cmp"],
      ];

      function buildTemplateAliases(template) {
        const aliasToId = new Map();

        template.layout.forEach((node) => {
          const aliases = new Set([node.id]);
          const label = String(node.label || "");
          const primaryLabel = label.split("\n")[0];
          label
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach((line) => aliases.add(line));

          const numericAliases = primaryLabel.match(/\d+/g) || [];
          numericAliases.forEach((value) => aliases.add(value));

          const coordinateAliases = primaryLabel.match(/\(\s*-?\d+\s*,\s*-?\d+\s*\)/g) || [];
          coordinateAliases.forEach((coord) => aliases.add(coord));

          const custom = template.aliases?.[node.id] || [];
          custom.forEach((alias) => aliases.add(alias));

          const list = Array.from(aliases).filter(Boolean);
          list.forEach((alias) => {
            const normalized = normalizeAlias(alias);
            if (!normalized || aliasToId.has(normalized)) return;
            aliasToId.set(normalized, node.id);
          });
        });

        const resolveAlias = (raw) => {
          const normalized = normalizeAlias(raw);
          if (!normalized) return null;
          return aliasToId.get(normalized) || null;
        };

        return { resolveAlias };
      }

      function resolveSegmentId(segment, resolveAlias) {
        if (!segment) return null;
        const coordMatch = segment.match(/\(\s*-?\d+\s*,\s*-?\d+\s*\)/);
        if (coordMatch) {
          const coordId = resolveAlias(coordMatch[0]);
          if (coordId) return coordId;
        }

        const tokens = segment.match(/[A-Za-z][A-Za-z0-9]*|\d+/g) || [];
        for (const tokenPart of tokens) {
          const id = resolveAlias(tokenPart);
          if (id) return id;
        }
        return null;
      }

      function mentionedIdsFromText(rawText, resolveAlias) {
        const text = String(rawText == null ? "" : rawText);
        const seen = new Set();
        const ids = [];
        const add = (id) => {
          if (!id || seen.has(id)) return;
          seen.add(id);
          ids.push(id);
        };

        const coordinateMatches = text.match(/\(\s*-?\d+\s*,\s*-?\d+\s*\)/g) || [];
        coordinateMatches.forEach((coord) => add(resolveAlias(coord)));

        const tokenMatches = text.match(/[A-Za-z][A-Za-z0-9]*|\d+/g) || [];
        tokenMatches.forEach((tokenPart) => add(resolveAlias(tokenPart)));

        return ids;
      }

      function pathIdsFromText(rawText, resolveAlias) {
        const text = String(rawText == null ? "" : rawText);
        if (!/(->|=>|→)/.test(text)) return [];

        const ids = [];
        text.split(/->|=>|→/).forEach((segment) => {
          const id = resolveSegmentId(segment, resolveAlias);
          if (!id) return;
          if (ids[ids.length - 1] !== id) {
            ids.push(id);
          }
        });

        return ids;
      }

      function pickTreeTemplate() {
        const isHeapTitle = /(heap|priority queue)/.test(t);
        const isKdTitle = /(k-d|nearest neighbor|high-dimension)/.test(t);
        const isTraversalTitle = /(recursive inorder|morris|bfs layer traversal|build \+ traverse \+ search|skewed tree)/.test(t);
        const isRedBlackTitle = /(red-black|ordered map|black-height)/.test(t);
        const isAvlTitle = /(avl|double rotation|rebalance)/.test(t);

        if (isHeapTitle) {
          return {
            kind: "heap",
            viewBox: "0 0 1000 400",
            layout: heapLayout,
            edges: heapEdges,
            rootId: "h1",
            leftBranch: ["h3", "h7", "h9"],
            rightBranch: ["h5", "h8", "h4"],
            fallbackPaths: [["h1"], ["h1", "h5", "h4"], ["h4", "h5"], ["h5", "h1"], ["h1", "h3"]],
            heapOrder: ["h1", "h3", "h5", "h7", "h9", "h8", "h4"],
            ariaLabel: "Heap operation visual",
          };
        }

        if (isKdTitle) {
          return {
            kind: "kd-tree",
            viewBox: "0 0 1000 410",
            layout: kdLayout,
            edges: kdEdges,
            rootId: "k72",
            leftBranch: ["k54", "k23", "k68"],
            rightBranch: ["k96", "k81", "k105"],
            fallbackPaths: [["k72"], ["k72", "k54"], ["k72", "k54", "k68"], ["k72", "k54", "k23"], ["k72", "k54"]],
            aliases: {
              k72: ["(7,2)", "7,2"],
              k54: ["(5,4)", "5,4"],
              k96: ["(9,6)", "9,6"],
              k23: ["(2,3)", "2,3"],
              k68: ["(6,8)", "6,8"],
              k81: ["(8,1)", "8,1"],
              k105: ["(10,5)", "10,5"],
            },
            ariaLabel: "K-D tree operation visual",
          };
        }

        if (isTraversalTitle) {
          return {
            kind: "binary-traversal",
            viewBox: "0 0 1000 400",
            layout: traversalTreeLayout,
            edges: traversalTreeEdges,
            rootId: "b1",
            leftBranch: ["b2", "b4", "b5"],
            rightBranch: ["b3", "b6", "b7"],
            fallbackPaths: [["b1"], ["b1", "b2"], ["b2", "b4", "b5"], ["b1", "b3"], ["b3", "b6", "b7"]],
            ariaLabel: "Binary tree traversal visual",
          };
        }

        if (isRedBlackTitle) {
          return {
            kind: "red-black",
            viewBox: "0 0 1000 420",
            layout: commonTreeLayout.map((node) => {
              if (node.id === "t14") return { ...node, label: "14(R)" };
              return { ...node, label: `${node.label}(B)` };
            }),
            edges: commonTreeEdges,
            rootId: "t15",
            leftBranch: ["t10", "t5", "t12", "t14"],
            rightBranch: ["t21", "t18", "t24"],
            rotationFocus: ["t15", "t10", "t12", "t14", "t21"],
            fallbackPaths: [["t15"], ["t15", "t21"], ["t15", "t10", "t12"], ["t10", "t12", "t14"], ["t15"]],
            ariaLabel: "Red-black tree operation visual",
          };
        }

        if (isAvlTitle) {
          return {
            kind: "avl",
            viewBox: "0 0 1000 420",
            layout: commonTreeLayout.map((node) => ({
              ...node,
              label: `${node.label}\nh=${node.id === "t15" ? "4" : node.id === "t10" || node.id === "t21" ? "3" : "2"}`,
            })),
            edges: commonTreeEdges,
            rootId: "t15",
            leftBranch: ["t10", "t5", "t12", "t14"],
            rightBranch: ["t21", "t18", "t24"],
            rotationFocus: ["t15", "t10", "t12", "t14"],
            fallbackPaths: [["t15"], ["t15", "t10"], ["t10", "t12", "t14"], ["t12", "t10", "t15"], ["t15"]],
            ariaLabel: "AVL tree operation visual",
          };
        }

        return {
          kind: "bst",
          viewBox: "0 0 1000 420",
          layout: commonTreeLayout,
          edges: commonTreeEdges,
          rootId: "t15",
          leftBranch: ["t10", "t5", "t12", "t14"],
          rightBranch: ["t21", "t18", "t24"],
          fallbackPaths: [["t15"], ["t15", "t21"], ["t21", "t18"], ["t15", "t10", "t12"], ["t10", "t5", "t14"]],
          ariaLabel: "Binary search tree operation visual",
        };
      }

      function pickGraphTemplate() {
        const isTopoTitle = /(kahn|in-degree|topological|cycle detection)/.test(t);
        const isDijkstraTitle = /(dijkstra|relaxation|negative edge)/.test(t);

        if (isTopoTitle) {
          return {
            kind: "graph-dag",
            viewBox: "0 0 1040 430",
            layout: dagLayout,
            edges: dagEdges,
            fallbackPaths: [["m"], ["m", "alg", "ds"], ["alg", "gr"], ["ds", "gr", "cmp"], ["cmp"]],
            aliases: {
              m: ["math"],
              alg: ["algorithms"],
              ds: ["datastructures", "data structures", "ds"],
              gr: ["graphs", "graphs"],
              cmp: ["compilers", "compiler"],
            },
            ariaLabel: "Topological sort graph visual",
          };
        }

        if (isDijkstraTitle) {
          return {
            kind: "graph-dijkstra",
            viewBox: "0 0 1020 430",
            layout: dijkstraLayout,
            edges: dijkstraEdges,
            fallbackPaths: [["dA"], ["dA", "dC", "dB"], ["dC", "dB", "dD"], ["dB", "dD", "dE"], ["dE"]],
            aliases: {
              dA: ["A"],
              dB: ["B"],
              dC: ["C"],
              dD: ["D"],
              dE: ["E"],
            },
            ariaLabel: "Dijkstra graph visual",
          };
        }

        return {
          kind: "graph-traversal",
          viewBox: "0 0 980 420",
          layout: traversalGraphLayout,
          edges: traversalGraphEdges,
          fallbackPaths: [["gA"], ["gA", "gB", "gC"], ["gB", "gD"], ["gC", "gE"], ["gD", "gF"]],
          aliases: {
            gA: ["A"],
            gB: ["B"],
            gC: ["C"],
            gD: ["D"],
            gE: ["E"],
            gF: ["F"],
          },
          ariaLabel: "Graph traversal visual",
        };
      }

      function buildFramesFromTemplate(template, stepTexts) {
        const { resolveAlias } = buildTemplateAliases(template);
        const allIds = template.layout.map((node) => node.id);
        const baseLabels = Object.fromEntries(template.layout.map((node) => [node.id, node.label]));
        const fallbackPaths = Array.isArray(template.fallbackPaths) ? template.fallbackPaths : [];

        return stepTexts.map((rawText, idx) => {
          const text = String(rawText == null ? "" : rawText);
          const lower = text.toLowerCase();
          const labels = { ...baseLabels };
          const activeSet = new Set(mentionedIdsFromText(text, resolveAlias));

          if (template.kind === "heap") {
            const values = parseHeapValues(text);
            if (values?.length) {
              template.heapOrder.forEach((id, nodeIdx) => {
                if (values[nodeIdx] != null) {
                  labels[id] = values[nodeIdx];
                }
              });
            }
          }

          if (template.kind === "graph-dijkstra") {
            const distEntries = [...text.matchAll(/\b([A-Za-z]+)\s*:\s*(-?\d+|inf)\b/gi)];
            distEntries.forEach((entry) => {
              const id = resolveAlias(entry[1]);
              if (!id) return;
              const base = String(baseLabels[id] || "").split("\n")[0];
              labels[id] = `${base}\nd=${entry[2]}`;
            });
          }

          if (/root/.test(lower) && template.rootId) {
            activeSet.add(template.rootId);
          }
          if (/left/.test(lower) && Array.isArray(template.leftBranch)) {
            template.leftBranch.forEach((id) => activeSet.add(id));
          }
          if (/right/.test(lower) && Array.isArray(template.rightBranch)) {
            template.rightBranch.forEach((id) => activeSet.add(id));
          }
          if (/(rotate|rebalance|fix-up|fixup|black-height)/.test(lower) && Array.isArray(template.rotationFocus)) {
            template.rotationFocus.forEach((id) => activeSet.add(id));
          }

          if (activeSet.size > Math.max(4, Math.floor(allIds.length * 0.8)) && fallbackPaths.length) {
            const fallback = fallbackPaths[Math.min(idx, fallbackPaths.length - 1)];
            activeSet.clear();
            fallback.forEach((id) => activeSet.add(id));
          }

          if (!activeSet.size && fallbackPaths.length) {
            const fallback = fallbackPaths[Math.min(idx, fallbackPaths.length - 1)];
            fallback.forEach((id) => activeSet.add(id));
          }

          let pathIds = pathIdsFromText(text, resolveAlias);
          if (!pathIds.length && fallbackPaths.length) {
            pathIds = fallbackPaths[Math.min(idx, fallbackPaths.length - 1)].slice();
          }
          if (!pathIds.length) {
            pathIds = Array.from(activeSet);
          }

          let activePairs = pathEdgesFromNodes(pathIds, template.edges);
          if (!activePairs.length && activeSet.size > 1) {
            activePairs = connectedEdgesFromActive(activeSet, template.edges);
          }

          const activeIds = Array.from(activeSet);
          const mutedIds = activeIds.length ? allIds.filter((id) => !activeSet.has(id)) : [];
          return {
            kind: "graph",
            viewBox: template.viewBox || "0 0 1000 460",
            nodes: nodeList(template.layout, labels, activeIds, mutedIds),
            edges: edgeList(template.edges, activePairs),
            caption: toCaption(text, `Step ${idx + 1}`),
            ariaLabel: template.ariaLabel || "Operation visual",
          };
        });
      }

      function inferDefaultTreeGraphViz(normalizedDefs) {
        if (!Array.isArray(normalizedDefs) || !normalizedDefs.length) return null;
        if (!isTreeContext && !isGraphContext) return null;

        const stepTexts = Array.from({ length: stepCount }, (_, idx) =>
          normalizedDefs
            .map((def) => frameToText(def.frames[idx]))
            .map((textPart) => textPart.trim())
            .filter(Boolean)
            .join(" | ")
        );

        const template = isTreeContext ? pickTreeTemplate() : pickGraphTemplate();
        if (!template) return null;

        return buildFramesFromTemplate(template, stepTexts);
      }

      const fenwickLayout = [
        { id: "f0", x: 500, y: 52, w: 118, h: 52, label: "i=0\nstop" },
        { id: "f8", x: 860, y: 110, w: 120, h: 52, label: "i=8\n[1..8]" },
        { id: "f4", x: 500, y: 168, w: 118, h: 52, label: "i=4\n[1..4]" },
        { id: "f2", x: 300, y: 228, w: 112, h: 52, label: "i=2\n[1..2]" },
        { id: "f6", x: 700, y: 228, w: 112, h: 52, label: "i=6\n[5..6]" },
        { id: "f1", x: 170, y: 320, w: 106, h: 52, label: "i=1\n[1..1]" },
        { id: "f3", x: 430, y: 320, w: 106, h: 52, label: "i=3\n[3..3]" },
        { id: "f5", x: 570, y: 320, w: 106, h: 52, label: "i=5\n[5..5]" },
        { id: "f7", x: 830, y: 320, w: 106, h: 52, label: "i=7\n[7..7]" },
      ];
      const fenwickQueryEdges = [
        ["f1", "f0"],
        ["f2", "f0"],
        ["f3", "f2"],
        ["f4", "f0"],
        ["f5", "f4"],
        ["f6", "f4"],
        ["f7", "f6"],
        ["f8", "f0"],
      ];
      const fenwickUpdateEdges = [
        ["f1", "f2"],
        ["f2", "f4"],
        ["f3", "f4"],
        ["f4", "f8"],
        ["f5", "f6"],
        ["f6", "f8"],
        ["f7", "f8"],
      ];

      const segmentLayout = [
        { id: "s0", x: 500, y: 58, w: 170, h: 56, label: "[0..7]\nsum=36" },
        { id: "s1", x: 270, y: 150, w: 160, h: 56, label: "[0..3]\nsum=11" },
        { id: "s2", x: 730, y: 150, w: 160, h: 56, label: "[4..7]\nsum=25" },
        { id: "s3", x: 155, y: 242, w: 148, h: 54, label: "[0..1]\nsum=3" },
        { id: "s4", x: 385, y: 242, w: 148, h: 54, label: "[2..3]\nsum=8" },
        { id: "s5", x: 615, y: 242, w: 148, h: 54, label: "[4..5]\nsum=11" },
        { id: "s6", x: 845, y: 242, w: 148, h: 54, label: "[6..7]\nsum=14" },
        { id: "l0", x: 95, y: 348, w: 102, h: 46, label: "[0]=2" },
        { id: "l1", x: 215, y: 348, w: 102, h: 46, label: "[1]=1" },
        { id: "l2", x: 325, y: 348, w: 102, h: 46, label: "[2]=5" },
        { id: "l3", x: 445, y: 348, w: 102, h: 46, label: "[3]=3" },
        { id: "l4", x: 555, y: 348, w: 102, h: 46, label: "[4]=4" },
        { id: "l5", x: 675, y: 348, w: 102, h: 46, label: "[5]=7" },
        { id: "l6", x: 785, y: 348, w: 102, h: 46, label: "[6]=6" },
        { id: "l7", x: 905, y: 348, w: 102, h: 46, label: "[7]=8" },
      ];
      const segmentEdges = [
        ["s0", "s1"], ["s0", "s2"],
        ["s1", "s3"], ["s1", "s4"],
        ["s2", "s5"], ["s2", "s6"],
        ["s3", "l0"], ["s3", "l1"],
        ["s4", "l2"], ["s4", "l3"],
        ["s5", "l4"], ["s5", "l5"],
        ["s6", "l6"], ["s6", "l7"],
      ];
      const segmentBefore = {
        s0: "[0..7]\nsum=36",
        s1: "[0..3]\nsum=11",
        s2: "[4..7]\nsum=25",
        s3: "[0..1]\nsum=3",
        s4: "[2..3]\nsum=8",
        s5: "[4..5]\nsum=11",
        s6: "[6..7]\nsum=14",
        l0: "[0]=2",
        l1: "[1]=1",
        l2: "[2]=5",
        l3: "[3]=3",
        l4: "[4]=4",
        l5: "[5]=7",
        l6: "[6]=6",
        l7: "[7]=8",
      };
      const segmentAfter = {
        ...segmentBefore,
        s0: "[0..7]\nsum=43",
        s1: "[0..3]\nsum=18",
        s4: "[2..3]\nsum=15",
        l3: "[3]=10",
      };

      if (t.includes("fenwick point update")) {
        return withRowsAndViz(
          [
            { label: "Operation", frames: ["add(3,+7)", "touch bit[4]", "touch bit[8]", "i becomes 16", "done"] },
            { label: "Update Path", frames: ["4", "4", "4 -> 8", "4 -> 8 -> stop", "all covering prefixes updated"] },
            { label: "Effect", frames: ["prepare", "local add", "propagated", "terminated", "ready for next query"] },
          ],
          [
            graphFrame(
              nodeList(fenwickLayout, {}, ["f4"], ["f1", "f2", "f3", "f5", "f6", "f7"]),
              edgeList(fenwickUpdateEdges),
              "Start at internal index i=4 (external idx=3).",
              "Fenwick point update start"
            ),
            graphFrame(
              nodeList(fenwickLayout, { f4: "i=4\nbit+=7" }, ["f4"], ["f1", "f2", "f3", "f5", "f6", "f7"]),
              edgeList(fenwickUpdateEdges, [["f4", "f8"]]),
              "Apply delta at node 4, then jump by lowbit(4)=4.",
              "Fenwick point update apply at i=4"
            ),
            graphFrame(
              nodeList(fenwickLayout, { f8: "i=8\nbit+=7" }, ["f4", "f8"], ["f1", "f2", "f3", "f5", "f6", "f7"]),
              edgeList(fenwickUpdateEdges, [["f4", "f8"]]),
              "Next affected node is i=8.",
              "Fenwick point update path to i=8"
            ),
            graphFrame(
              nodeList(fenwickLayout, {}, ["f8"], ["f1", "f2", "f3", "f4", "f5", "f6", "f7"]),
              edgeList(fenwickUpdateEdges),
              "After i=8, next index is 16 (> n), so the update stops.",
              "Fenwick point update stop condition"
            ),
            graphFrame(
              nodeList(fenwickLayout, {}, ["f4", "f8"]),
              edgeList(fenwickUpdateEdges, [["f4", "f8"]]),
              "Only nodes covering that index are updated: 4 and 8.",
              "Fenwick point update final touched nodes"
            ),
          ]
        );
      }

      if (t.includes("prefix and range sum")) {
        return withRowsAndViz(
          [
            { label: "Target", frames: ["prefix_sum(5)", "visit 6 then 4 then 0", "compute prefix(r) and prefix(l-1)", "subtract", "range result ready"] },
            { label: "Path", frames: ["6", "6 -> 4 -> 0", "right: 6->4->0, left: 2->0", "right - left", "done"] },
            { label: "Value", frames: ["start s=0", "s accumulates blocks", "right=22, left=3", "19", "range_sum(2,5)=19"] },
          ],
          [
            graphFrame(
              nodeList(fenwickLayout, {}, ["f6"], ["f1", "f3", "f5", "f7"]),
              edgeList(fenwickQueryEdges, [["f6", "f4"]]),
              "Prefix query starts at internal index 6.",
              "Fenwick prefix query start at i equals 6"
            ),
            graphFrame(
              nodeList(fenwickLayout, {}, ["f6", "f4", "f0"], ["f1", "f3", "f5", "f7"]),
              edgeList(fenwickQueryEdges, [["f6", "f4"], ["f4", "f0"]]),
              "Query path follows i -= lowbit(i): 6 -> 4 -> 0.",
              "Fenwick prefix query path from 6 to 0"
            ),
            graphFrame(
              nodeList(fenwickLayout, {}, ["f6", "f4", "f2", "f0"], ["f1", "f3", "f5", "f7"]),
              edgeList(fenwickQueryEdges, [["f6", "f4"], ["f4", "f0"], ["f2", "f0"]]),
              "Range sum uses two prefix paths: prefix(r) and prefix(l-1).",
              "Fenwick range query with two prefix paths"
            ),
            graphFrame(
              nodeList(fenwickLayout, { f6: "R", f2: "L", f4: "R", f0: "R/L" }, ["f6", "f4", "f2", "f0"], ["f1", "f3", "f5", "f7"]),
              edgeList(fenwickQueryEdges, [["f6", "f4"], ["f4", "f0"], ["f2", "f0"]]),
              "Subtract left-prefix contribution from right-prefix contribution.",
              "Fenwick range query subtraction stage"
            ),
            graphFrame(
              nodeList(fenwickLayout, { f6: "R=22", f2: "L=3", f0: "Ans=19" }, ["f6", "f2", "f0"]),
              edgeList(fenwickQueryEdges, [["f6", "f4"], ["f4", "f0"], ["f2", "f0"]]),
              "Final answer: range_sum(2,5) = 22 - 3 = 19.",
              "Fenwick range query final answer"
            ),
          ]
        );
      }

      if (t.includes("segment tree range sum query")) {
        return withRowsAndViz(
          [
            { label: "Query", frames: ["[2,5]", "[2,5] overlap scan", "take [2,3] and [4,5]", "merge partials", "answer"] },
            { label: "Taken Nodes", frames: ["none yet", "descending", "[2..3]=8 and [4..5]=11", "8 + 11", "19"] },
            { label: "Result", frames: ["pending", "pending", "pending", "19", "19"] },
          ],
          [
            graphFrame(
              nodeList(segmentLayout, segmentBefore, ["s0"], ["l0", "l1", "l2", "l3", "l4", "l5", "l6", "l7"]),
              edgeList(segmentEdges, [["s0", "s1"], ["s0", "s2"]]),
              "Start at root interval [0..7] for query [2..5].",
              "Segment tree query start at root"
            ),
            graphFrame(
              nodeList(segmentLayout, segmentBefore, ["s1", "s2", "s3", "s4", "s5", "s6"], ["l0", "l1", "l2", "l3", "l4", "l5", "l6", "l7"]),
              edgeList(segmentEdges, [["s0", "s1"], ["s0", "s2"], ["s1", "s3"], ["s1", "s4"], ["s2", "s5"], ["s2", "s6"]]),
              "Traverse only overlapping branches.",
              "Segment tree query traverse overlapping branches"
            ),
            graphFrame(
              nodeList(segmentLayout, segmentBefore, ["s4", "s5"], ["s3", "s6", "l0", "l1", "l2", "l3", "l4", "l5", "l6", "l7"]),
              edgeList(segmentEdges, [["s1", "s4"], ["s2", "s5"]]),
              "Full-overlap nodes are [2..3] and [4..5].",
              "Segment tree query full-overlap nodes"
            ),
            graphFrame(
              nodeList(segmentLayout, segmentBefore, ["s0", "s1", "s2", "s4", "s5"], ["s3", "s6", "l0", "l1", "l2", "l3", "l4", "l5", "l6", "l7"]),
              edgeList(segmentEdges, [["s0", "s1"], ["s0", "s2"], ["s1", "s4"], ["s2", "s5"]]),
              "Merge taken values upward: 8 + 11.",
              "Segment tree query merge upward"
            ),
            graphFrame(
              nodeList(segmentLayout, { ...segmentBefore, s0: "[0..7]\nquery=19" }, ["s0", "s4", "s5"], ["s3", "s6", "l0", "l1", "l2", "l3", "l4", "l5", "l6", "l7"]),
              edgeList(segmentEdges, [["s0", "s1"], ["s0", "s2"], ["s1", "s4"], ["s2", "s5"]]),
              "Final query result is 19.",
              "Segment tree query final result"
            ),
          ]
        );
      }

      if (t.includes("point update + query pipeline")) {
        return withRowsAndViz(
          [
            { label: "Operation", frames: ["build tree", "update idx=3 to 10", "recompute ancestors", "query [2,5]", "final"] },
            { label: "Changed Nodes", frames: ["none", "[3]", "[2..3], [0..3], [0..7]", "[2..3], [4..5]", "query done"] },
            { label: "Output", frames: ["initial query=19", "leaf updated", "tree root=43", "updated query=26", "26"] },
          ],
          [
            graphFrame(
              nodeList(segmentLayout, segmentBefore, ["s0", "s1", "s2"]),
              edgeList(segmentEdges),
              "Initial tree built from base array.",
              "Segment tree initial build"
            ),
            graphFrame(
              nodeList(segmentLayout, { ...segmentBefore, l3: "[3]=10*" }, ["l3", "s4"], ["l0", "l1", "l2", "l4", "l5", "l6", "l7"]),
              edgeList(segmentEdges, [["s4", "l3"]]),
              "Point update reaches leaf [3] first.",
              "Segment tree point update leaf change"
            ),
            graphFrame(
              nodeList(segmentLayout, segmentAfter, ["l3", "s4", "s1", "s0"], ["l0", "l1", "l2", "l4", "l5", "l6", "l7"]),
              edgeList(segmentEdges, [["s4", "l3"], ["s1", "s4"], ["s0", "s1"]]),
              "Recompute ancestors on the way back to root.",
              "Segment tree recompute ancestors after update"
            ),
            graphFrame(
              nodeList(segmentLayout, segmentAfter, ["s4", "s5"], ["s3", "s6", "l0", "l1", "l2", "l3", "l4", "l5", "l6", "l7"]),
              edgeList(segmentEdges, [["s1", "s4"], ["s2", "s5"]]),
              "Run query [2,5] on updated tree.",
              "Segment tree query path after update"
            ),
            graphFrame(
              nodeList(segmentLayout, { ...segmentAfter, s0: "[0..7]\nquery=26" }, ["s0", "s4", "s5"], ["s3", "s6", "l0", "l1", "l2", "l3", "l4", "l5", "l6", "l7"]),
              edgeList(segmentEdges, [["s0", "s1"], ["s0", "s2"], ["s1", "s4"], ["s2", "s5"]]),
              "Updated answer is 26.",
              "Segment tree final updated query answer"
            ),
          ]
        );
      }

      const arrTwoPointers = ["1", "2", "4", "6", "10"];
      if (t.includes("input not sorted")) {
        return rows([
          {
            label: "Array",
            frames: [
              token(["4", "1", "6", "2"], [0, 3]),
              token(["4", "1", "6", "2"], [0, 2]),
              token(["4", "1", "6", "2"], [1, 2]),
              "Invariant broken: elimination is unsafe",
              "Fix: sort first or switch approach",
            ],
          },
          {
            label: "Pointers",
            frames: ["L=0, R=3", "L=0, R=2", "L=1, R=2", "Possible pair skipped", "Result can be wrong"],
          },
          {
            label: "Output",
            frames: ["?", "?", "?", "False negative risk", "Use sorted input contract"],
          },
        ]);
      }

      if (t.includes("pointer move rule") || t.includes("pair search")) {
        return rows([
          {
            label: "Array",
            frames: [
              token(arrTwoPointers, [0, 4]),
              token(arrTwoPointers, [0, 3]),
              token(arrTwoPointers, [1, 3]),
              token(arrTwoPointers, [1, 3]),
              token(arrTwoPointers, [1, 3]),
            ],
          },
          {
            label: "State",
            frames: [
              "L=0, R=4, sum=11",
              "sum>8 => R--",
              "L=1, R=3, sum=8",
              "Match found",
              "Output indices: (1, 3)",
            ],
          },
          { label: "Output", frames: ["[]", "[]", "[]", "[(1,3)]", "[(1,3)]"] },
        ]);
      }

      if (t.includes("invalid k")) {
        return rows([
          { label: "Input", frames: ["nums=[2,1,5,1,3,2], k=0", "k <= 0", "No valid window", "Reject request", "Return error"] },
          { label: "Window", frames: ["-", "-", "-", "-", "-"] },
          { label: "Output", frames: ["pending", "invalid", "invalid", "error", "ValueError"] },
        ]);
      }

      if (t.includes("one window slide") || t.includes("max sum window scan")) {
        const arr = ["2", "1", "5", "1", "3", "2"];
        return rows([
          {
            label: "Array",
            frames: [
              token(arr, [0, 1, 2]),
              token(arr, [1, 2, 3]),
              token(arr, [2, 3, 4]),
              token(arr, [3, 4, 5]),
              token(arr, [3, 4, 5]),
            ],
          },
          {
            label: "Window",
            frames: [
              "[0..2] sum=8 best=8",
              "[1..3] sum=7 best=8",
              "[2..4] sum=9 best=9",
              "[3..5] sum=6 best=9",
              "Done",
            ],
          },
          { label: "Output", frames: ["8", "8", "9", "9", "9"] },
        ]);
      }

      if (t.includes("unequal length hamming")) {
        return rows([
          { label: "a", frames: ["karolin", "karolin", "karolin", "karolin", "karolin"] },
          { label: "b", frames: ["kathrinx", "len(a)!=len(b)", "Hamming undefined", "Raise error", "caller handles"] },
          { label: "Output", frames: ["pending", "invalid", "invalid", "ValueError", "ValueError"] },
        ]);
      }

      if (t.includes("hamming position check")) {
        return rows([
          { label: "a[i]", frames: ["k", "a", "r", "o", "l"] },
          { label: "b[i]", frames: ["k", "a", "t", "h", "r"] },
          { label: "mismatches", frames: ["0", "0", "1", "2", "3"] },
        ]);
      }

      if (t.includes("levenshtein dp fill")) {
        return rows([
          { label: "Strings", frames: ["a='ab', b='acb'", "init borders", "dp[1][1]", "dp[1][2], dp[1][3]", "dp[2][*] => answer=1"] },
          { label: "Cell", frames: ["dp[0][0]", "row0/col0 set", "dp[1][1]=0", "dp[1][2]=1", "dp[2][3]=1"] },
          { label: "Output", frames: ["-", "-", "-", "-", "Levenshtein=1"] },
        ]);
      }

      if (t.includes("hash collision")) {
        return rows([
          { label: "Window", frames: ["'abx'", "'bxy'", "'xyz'", "'yzq'", "'zqa'"] },
          { label: "Hash", frames: ["h=742", "h=742 (collision)", "verify chars", "mismatch", "continue scan"] },
          { label: "Output", frames: ["[]", "[]", "[]", "[]", "[]"] },
        ]);
      }

      if (t.includes("rolling hash update") || t.includes("hash scan + verify")) {
        return rows([
          { label: "Text Window", frames: ["abra", "brac", "raca", "acad", "cada"] },
          { label: "Hash", frames: ["init", "roll -> h1", "roll -> h2", "match hash => verify", "matches=[0,7]"] },
          { label: "Output", frames: ["[]", "[]", "[]", "[0]", "[0,7]"] },
        ]);
      }

      if (t.includes("lps table construction")) {
        return rows([
          { label: "Pattern", frames: [token(["a", "b", "a", "b", "d"], [0]), token(["a", "b", "a", "b", "d"], [1]), token(["a", "b", "a", "b", "d"], [2]), token(["a", "b", "a", "b", "d"], [3]), token(["a", "b", "a", "b", "d"], [4])] },
          { label: "Pointers", frames: ["i=1 len=0", "i=2 len=0", "i=3 len=1", "i=4 len=2", "i=5 len=0"] },
          { label: "LPS", frames: ["[0,0,0,0,0]", "[0,0,0,0,0]", "[0,0,1,0,0]", "[0,0,1,2,0]", "[0,0,1,2,0]"] },
        ]);
      }

      if (t.includes("overlapping matches")) {
        return rows([
          { label: "Text/Pattern", frames: ["text=banana, pat=ana", "match at 1", "set j=lps[2]=1", "continue at i=4", "match at 3"] },
          { label: "Pointers", frames: ["i=0,j=0", "i=4,j=3", "i=4,j=1", "i=6,j=3", "done"] },
          { label: "Output", frames: ["[]", "[1]", "[1]", "[1,3]", "[1,3]"] },
        ]);
      }

      if (t.includes("negative edge failure")) {
        return rows([
          { label: "Graph", frames: ["A->B(2), A->C(5), C->B(-10)", "pop B with dist=2", "later path A->C->B=-5 appears", "B was already finalized", "Result incorrect"] },
          { label: "Invariant", frames: ["assumed true", "broken", "broken", "broken", "use Bellman-Ford"] },
          { label: "Output", frames: ["dist[B]=2", "dist[B]=2", "better path exists", "wrong", "switch algorithm"] },
        ]);
      }

      if (t.includes("edge relaxation") || t.includes("one complete dijkstra run")) {
        return rows([
          { label: "PQ", frames: ["[(0,A)]", "pop A -> push B(4),C(1)", "pop C -> relax B(3),D(6)", "pop B -> relax D(4)", "pop D -> done"] },
          { label: "dist", frames: ["A:0 B:inf C:inf D:inf", "A:0 B:4 C:1 D:inf", "A:0 B:3 C:1 D:6", "A:0 B:3 C:1 D:4", "A:0 B:3 C:1 D:4"] },
          { label: "Output", frames: ["{}", "partial", "partial", "partial", "final distances"] },
        ]);
      }

      if (t.includes("cycle detection")) {
        return rows([
          { label: "Queue", frames: ["[A]", "[B]", "[]", "[]", "[]"] },
          { label: "InDegree", frames: ["B:1 C:1", "C:1", "B:1 C:1", "stuck", "cycle detected"] },
          { label: "Output", frames: ["[A]", "[A,B]", "[A,B]", "len<|V|", "error"] },
        ]);
      }

      if (t.includes("in-degree drain step") || t.includes("kahn end-to-end")) {
        return rows([
          { label: "Queue", frames: ["[Math]", "[Algorithms,DataStructures]", "[DataStructures]", "[Graphs]", "[Compilers]"] },
          { label: "Order", frames: ["[]", "[Math]", "[Math,Algorithms]", "[Math,Algorithms,DataStructures]", "[...,Compilers]"] },
          { label: "InDegree", frames: ["init", "after Math", "after Algorithms", "after DataStructures", "all zeroed"] },
        ]);
      }

      if (t.includes("missing visited guard")) {
        return rows([
          { label: "Queue/Stack", frames: ["[A]", "[B,C]", "[A,C,D]", "[A,B,C,D,...]", "non-terminating"] },
          { label: "Visited", frames: ["{}", "{}", "{}", "{}", "missing"] },
          { label: "Output", frames: ["A", "A,B", "A,B,C", "repeats", "infinite loop risk"] },
        ]);
      }

      if (t.includes("dfs backtracking")) {
        return rows([
          { label: "Call Stack", frames: ["[A]", "[A,B]", "[A,B,D]", "[A,B,D,F]", "[A,C,E]"] },
          { label: "Visited", frames: ["{A}", "{A,B}", "{A,B,D}", "{A,B,D,F}", "{A,B,C,D,E,F}"] },
          { label: "Output", frames: ["A", "A,B", "A,B,D", "A,B,D,F", "A,B,D,F,C,E"] },
        ]);
      }

      if (t.includes("disconnected components")) {
        return rows([
          { label: "Component", frames: ["start C1 at A", "finish C1", "pick unvisited X", "finish C2", "all covered"] },
          { label: "Visited", frames: ["{A,B}", "{A,B,C}", "{A,B,C,X}", "{A,B,C,X,Y}", "{all}"] },
          { label: "Output", frames: ["[A,B]", "[A,B,C]", "[A,B,C,X]", "[A,B,C,X,Y]", "[complete traversal]"] },
        ]);
      }

      if (t.includes("graph pipeline") || t.includes("bfs queue expansion")) {
        return rows([
          { label: "Queue", frames: ["[A]", "[B,C]", "[C,D]", "[D,E]", "[]"] },
          { label: "Visited", frames: ["{A}", "{A,B,C}", "{A,B,C,D}", "{A,B,C,D,E}", "{A,B,C,D,E}"] },
          { label: "Output", frames: ["[A]", "[A,B]", "[A,B,C]", "[A,B,C,D]", "[A,B,C,D,E]"] },
        ]);
      }

      if (t.includes("bfs layer traversal")) {
        if (pagePath.includes("/algorithms/graph/")) {
          return rows([
            { label: "Queue", frames: ["[A]", "[B,C]", "[C,D]", "[D,E]", "[]"] },
            { label: "Visited", frames: ["{A}", "{A,B,C}", "{A,B,C,D}", "{A,B,C,D,E}", "{A,B,C,D,E}"] },
            { label: "Output", frames: ["[A]", "[A,B]", "[A,B,C]", "[A,B,C,D]", "[A,B,C,D,E]"] },
          ]);
        }
        return rows([
          { label: "Queue", frames: ["[10]", "[6,14]", "[14,4,8]", "[4,8,12,16]", "[]"] },
          { label: "Level", frames: ["0", "1", "1->2", "2", "done"] },
          { label: "Output", frames: ["[10]", "[10,6]", "[10,6,14]", "[10,6,14,4,8,12,16]", "[complete]"] },
        ]);
      }

      if (t.includes("morris thread restoration")) {
        return rows([
          { label: "Node", frames: ["cur=1", "find pred of 1", "create pred.right=cur", "revisit via thread", "remove thread"] },
          { label: "Thread", frames: ["none", "2.right->1", "active", "used", "cleared"] },
          { label: "Output", frames: ["[]", "[]", "[4,2]", "[4,2,5,1]", "[4,2,5,1,3]"] },
        ]);
      }

      if (t.includes("recursive inorder visit") || t.includes("compare recursive, iterative, morris")) {
        return rows([
          { label: "Tree", frames: ["1(2,3)", "go left to 2", "visit 4,2,5", "visit 1", "visit 3"] },
          { label: "State", frames: ["start", "descent", "left subtree done", "root done", "complete"] },
          { label: "Output", frames: ["[]", "[]", "[4,2,5]", "[4,2,5,1]", "[4,2,5,1,3]"] },
        ]);
      }

      if (t.includes("missing key validation")) {
        return rows([
          { label: "Keys", frames: ["p=5, q=99", "descend by split logic", "candidate=20", "validate existence", "q missing => no answer"] },
          { label: "Found?", frames: ["p yes, q no", "p yes, q no", "p yes, q no", "run contains(q)", "false"] },
          { label: "Output", frames: ["pending", "pending", "candidate only", "invalid", "None/error"] },
        ]);
      }

      if (t.includes("bst split-point rule") || t.includes("lca query run")) {
        return rows([
          { label: "Current", frames: ["20", "10", "10", "split at 10", "return 10"] },
          { label: "Relation", frames: ["p,q < 20", "p=5<10, q=14>10", "diverge", "LCA found", "done"] },
          { label: "Output", frames: ["-", "-", "-", "10", "10"] },
        ]);
      }

      if (t.includes("accidental cycle bug")) {
        return rows([
          { label: "List", frames: ["12->20->35->None", "35.next->20 (bug)", "12->20->35->20...", "traversal loops", "fix 35.next=None"] },
          { label: "Termination", frames: ["yes", "broken", "no", "no", "yes"] },
          { label: "Output", frames: ["finite", "finite", "infinite", "infinite", "finite"] },
        ]);
      }

      if (t.includes("push front pointer rewrite") || t.includes("build + search flow")) {
        return rows([
          { label: "List", frames: ["None", "20->None", "12->20->None", "12->20->35->None", "find(20)=true"] },
          { label: "Head", frames: ["None", "20", "12", "12", "12"] },
          { label: "Output", frames: ["[]", "[20]", "[12,20]", "[12,20,35]", "true"] },
        ]);
      }

      if (t.includes("deleting the only node")) {
        return rows([
          { label: "List", frames: ["[29]", "delete(29)", "head=None", "tail=None", "empty list stable"] },
          { label: "Head/Tail", frames: ["29/29", "29/29", "None/29", "None/None", "None/None"] },
          { label: "Output", frames: ["[29]", "[]", "[]", "[]", "[]"] },
        ]);
      }

      if (t.includes("delete middle node") || t.includes("push back + delete + traverse")) {
        return rows([
          { label: "List", frames: ["5<->11<->29", "target=11", "rewire 5.next=29", "rewire 29.prev=5", "5<->29"] },
          { label: "Head/Tail", frames: ["5/29", "5/29", "5/29", "5/29", "5/29"] },
          { label: "Output", frames: ["[5,11,29]", "[5,11,29]", "[5,29]", "[5,29]", "[5,29]"] },
        ]);
      }

      if (t.includes("full buffer policy")) {
        return rows([
          { label: "Buffer", frames: ["[10,20,30,40]", "push 50 while full", "overwrite => [20,30,40,50]", "reject => [10,20,30,40]", "choose one policy"] },
          { label: "Head/Size", frames: ["0/4", "0/4", "1/4", "0/4", "documented"] },
          { label: "Output", frames: ["stable", "branch", "latest kept", "oldest kept", "predictable behavior"] },
        ]);
      }

      if (t.includes("wrap-around write") || t.includes("continuous stream cycle")) {
        return rows([
          { label: "Buffer", frames: ["[10,20,30,_]", "[10,20,30,40]", "[50,20,30,40]", "[50,60,30,40]", "[50,60,70,40]"] },
          { label: "Head/Size", frames: ["0/3", "0/4", "1/4", "2/4", "3/4"] },
          { label: "Logical View", frames: ["[10,20,30]", "[10,20,30,40]", "[20,30,40,50]", "[30,40,50,60]", "[40,50,60,70]"] },
        ]);
      }

      if (t.includes("top level shrink after delete")) {
        return rows([
          { label: "Levels", frames: ["L2: head->23", "delete 23", "L2 empty", "decrease currentLevel", "start searches at L1"] },
          { label: "Update Path", frames: ["recorded", "rewired", "rewired", "trimmed", "stable"] },
          { label: "Output", frames: ["ok", "ok", "ok", "ok", "ok"] },
        ]);
      }

      if (t.includes("search across levels") || t.includes("insert with random height")) {
        return rows([
          { label: "Lane", frames: ["L3 head", "move right on L3", "drop to L2", "drop to L1", "arrive at L0 target"] },
          { label: "Node", frames: ["head", "8", "16", "23", "found/not found"] },
          { label: "Output", frames: ["-", "-", "-", "-", "search result"] },
        ]);
      }

      if (t.includes("sorted inserts degrade height")) {
        return rows([
          { label: "Insert Order", frames: ["1", "1,2", "1,2,3", "1,2,3,4", "1,2,3,4,5"] },
          { label: "BST Shape", frames: ["1", "1->2", "1->2->3", "1->2->3->4", "linked-list-like"] },
          { label: "Cost", frames: ["O(1)", "O(2)", "O(3)", "O(4)", "O(n) worst-case"] },
        ]);
      }

      if (t.includes("bst search for key 18") || t.includes("insert + search + delete")) {
        return rows([
          { label: "Current Node", frames: ["15", "21", "18", "found", "return"] },
          { label: "Decision", frames: ["18>15 -> right", "18<21 -> left", "18==18", "stop", "done"] },
          { label: "Output", frames: ["-", "-", "-", "true", "true"] },
        ]);
      }

      if (t.includes("double rotation (lr)")) {
        return rows([
          { label: "Subtree", frames: ["30<-20->25", "left heavy at 30", "rotate left at 20", "rotate right at 30", "balanced rooted at 25"] },
          { label: "Balance", frames: ["+2/-1", "+2/-1", "+2/0", "0/0", "restored"] },
          { label: "Output", frames: ["unbalanced", "unbalanced", "partially fixed", "fixed", "fixed"] },
        ]);
      }

      if (t.includes("avl insert rebalance") || t.includes("avl update pipeline")) {
        return rows([
          { label: "Path", frames: ["insert key", "update heights", "detect bf=+2", "rotate", "recompute"] },
          { label: "Balance", frames: ["ok", "drifting", "violated", "repairing", "restored"] },
          { label: "Output", frames: ["BST valid", "BST valid", "unbalanced", "balanced", "balanced"] },
        ]);
      }

      if (t.includes("black-height violation on delete")) {
        return rows([
          { label: "Delete", frames: ["remove black node", "one path loses black count", "propagate fix-up", "rotate/recolor", "black-height equalized"] },
          { label: "Invariant", frames: ["ok", "broken", "repairing", "repairing", "ok"] },
          { label: "Output", frames: ["-", "-", "-", "-", "valid RB tree"] },
        ]);
      }

      if (t.includes("red-black insert fix-up") || t.includes("ordered map operation cycle")) {
        return rows([
          { label: "Operation", frames: ["insert red leaf", "rotate left if right-red", "rotate right for left-left red", "flip colors", "root black"] },
          { label: "Colors", frames: ["may violate", "improving", "improving", "split 4-node", "valid"] },
          { label: "Output", frames: ["unfixed", "partly fixed", "partly fixed", "nearly valid", "valid RB tree"] },
        ]);
      }

      if (t.includes("high-dimension pruning collapse")) {
        return rows([
          { label: "Dimension", frames: ["k=2", "k=10", "k=32", "k=128", "k very large"] },
          { label: "Pruning", frames: ["strong", "moderate", "weak", "very weak", "near linear scan"] },
          { label: "Output", frames: ["fast NN", "good", "slower", "slow", "consider approximate index"] },
        ]);
      }

      if (t.includes("nearest neighbor query") || t.includes("insert + query loop")) {
        return rows([
          { label: "Target", frames: ["(6,3)", "(6,3)", "(6,3)", "(6,3)", "(6,3)"] },
          { label: "Best", frames: ["inf", "(7,2)", "(5,4)", "(5,4)", "(5,4)"] },
          { label: "Branch", frames: ["descend near", "backtrack", "plane test", "maybe far branch", "return nearest"] },
        ]);
      }

      if (t.includes("equal priority tie handling")) {
        return rows([
          { label: "Items", frames: ["(p=5,A),(p=5,B)", "heap compares equal", "order unstable", "add seq: A#1,B#2", "stable order A then B"] },
          { label: "Comparator", frames: ["priority only", "priority only", "priority only", "(priority,seq)", "(priority,seq)"] },
          { label: "Output", frames: ["?", "?", "varies", "deterministic", "deterministic"] },
        ]);
      }

      if (t.includes("min-heap push(4)") || t.includes("priority queue cycle")) {
        return rows([
          { label: "Heap Array", frames: ["[1,3,5,7,9,8]", "append 4 => [1,3,5,7,9,8,4]", "swap with 5", "swap with 1? no", "heap valid"] },
          { label: "Action", frames: ["ready", "bubble-up start", "bubble-up continue", "stop", "done"] },
          { label: "Output", frames: ["peek=1", "peek=1", "peek=1", "peek=1", "peek=1"] },
        ]);
      }

      if (t.includes("union by rank merge")) {
        return rows([
          { label: "Roots", frames: ["ra=1 rb=4", "rank[1]=0, rank[4]=0", "attach rb->ra", "rank[1]++", "components--"] },
          { label: "Parent", frames: ["[0,1,2,3,4,5]", "[0,1,2,3,4,5]", "[0,1,2,3,1,5]", "[0,1,2,3,1,5]", "[merged]"] },
          { label: "Rank", frames: ["[0,0,0,0,0,0]", "[0,0,0,0,0,0]", "[0,0,0,0,0,0]", "[0,1,0,0,0,0]", "[stable]"] },
        ]);
      }

      if (t.includes("path compression find")) {
        return rows([
          { label: "Path", frames: ["7->6->5->0", "visit 7", "visit 6", "visit 5", "rewrite all ->0"] },
          { label: "Parent", frames: ["[0,0,0,0,5,0,5,6]", "[...]", "[...]", "[...]", "[0,0,0,0,5,0,0,0]"] },
          { label: "Result", frames: ["pending", "root=0", "root=0", "root=0", "future finds faster"] },
        ]);
      }

      if (t.includes("dynamic connectivity session")) {
        return rows([
          { label: "Unions", frames: ["init", "(0,1),(1,2)", "(3,4)", "(2,4)", "(6,7)"] },
          { label: "Components", frames: ["8", "6", "5", "4", "3"] },
          { label: "Query", frames: ["-", "same(0,4)? no", "-", "same(0,4)? yes", "same(5,7)? no"] },
        ]);
      }

      if (t.includes("skewed tree recursion risk")) {
        return rows([
          { label: "Tree Height", frames: ["h=1", "h=2", "h=4", "h=8", "h~n"] },
          { label: "DFS Stack", frames: ["1", "2", "4", "8", "risk overflow"] },
          { label: "Fix", frames: ["recursive ok", "recursive ok", "monitor depth", "consider iterative", "use explicit stack"] },
        ]);
      }

      if (t.includes("build + traverse + search")) {
        return rows([
          { label: "Tree", frames: ["build nodes", "run DFS", "run BFS", "search target", "return outputs"] },
          { label: "Traversal Output", frames: ["[]", "[inorder partial]", "[level partial]", "[found]", "[final sequences]"] },
          { label: "Output", frames: ["init", "dfs ready", "bfs ready", "search ready", "complete"] },
        ]);
      }

      return null;
    }
  }

  function setupKmpAnimations() {
    const containers = document.querySelectorAll(".kmp-anim");
    if (!containers.length) return;

    containers.forEach((container) => {
      const text = container.dataset.text || "ababcabcabababd";
      const pattern = container.dataset.pattern || "ababd";
      const autoplayMs = Number.parseInt(container.dataset.autoplayMs || "900", 10);
      const tickMs = Number.isFinite(autoplayMs) && autoplayMs >= 250 ? autoplayMs : 900;

      const lps = buildLps(pattern);
      const steps = buildKmpTrace(text, pattern, lps);
      const totalCols = Math.max(text.length, pattern.length, 1);

      let activeStep = 0;
      let timer = null;

      container.innerHTML = "";
      container.classList.add("kmp-viz");

      const title = document.createElement("p");
      title.className = "kmp-viz-title";
      title.textContent = "Interactive KMP Walkthrough";

      const subtitle = document.createElement("p");
      subtitle.className = "kmp-viz-subtitle";
      subtitle.textContent = `Text: "${text}"   Pattern: "${pattern}"`;

      const lpsWrap = document.createElement("div");
      lpsWrap.className = "kmp-lps";
      const lpsLabel = document.createElement("p");
      lpsLabel.className = "kmp-lps-label";
      lpsLabel.textContent = "Pattern LPS table";
      lpsWrap.appendChild(lpsLabel);

      const lpsGrid = document.createElement("div");
      lpsGrid.className = "kmp-lps-grid";
      const lpsCells = [];
      for (let i = 0; i < pattern.length; i += 1) {
        const cell = document.createElement("div");
        cell.className = "kmp-lps-cell";
        const ch = document.createElement("span");
        ch.className = "kmp-lps-char";
        ch.textContent = formatChar(pattern[i]);
        const val = document.createElement("span");
        val.className = "kmp-lps-val";
        val.textContent = String(lps[i]);
        cell.append(ch, val);
        lpsGrid.appendChild(cell);
        lpsCells.push(cell);
      }
      if (!pattern.length) {
        const empty = document.createElement("p");
        empty.className = "kmp-lps-empty";
        empty.textContent = "Pattern is empty; LPS table is not needed.";
        lpsWrap.appendChild(empty);
      } else {
        lpsWrap.appendChild(lpsGrid);
      }

      const board = document.createElement("div");
      board.className = "kmp-board";

      const indexRow = createRow("idx", totalCols, "kmp-index-cell");
      const textRow = createRow("txt", totalCols, "kmp-text-cell");
      const patternRow = createRow("pat", totalCols, "kmp-pattern-cell");

      board.append(indexRow.row, textRow.row, patternRow.row);

      const meta = document.createElement("div");
      meta.className = "kmp-meta";
      const pointer = document.createElement("p");
      pointer.className = "kmp-pointer";
      const matches = document.createElement("p");
      matches.className = "kmp-matches";
      meta.append(pointer, matches);

      const status = document.createElement("p");
      status.className = "kmp-status";

      const controls = document.createElement("div");
      controls.className = "kmp-controls";
      const prevBtn = button("Prev");
      const playBtn = button("Play");
      const nextBtn = button("Next");
      const resetBtn = button("Reset");
      const progress = document.createElement("span");
      progress.className = "kmp-progress";

      controls.append(prevBtn, playBtn, nextBtn, resetBtn, progress);
      container.append(title, subtitle, lpsWrap, board, meta, status, controls);

      prevBtn.addEventListener("click", () => {
        stopPlayback();
        setStep(activeStep - 1);
      });
      nextBtn.addEventListener("click", () => {
        stopPlayback();
        setStep(activeStep + 1);
      });
      resetBtn.addEventListener("click", () => {
        stopPlayback();
        setStep(0);
      });
      playBtn.addEventListener("click", () => {
        if (timer) {
          stopPlayback();
          return;
        }
        if (activeStep >= steps.length - 1) {
          setStep(0);
        }
        timer = window.setInterval(() => {
          if (activeStep >= steps.length - 1) {
            stopPlayback();
            return;
          }
          setStep(activeStep + 1);
        }, tickMs);
        playBtn.textContent = "Pause";
      });

      function stopPlayback() {
        if (!timer) return;
        window.clearInterval(timer);
        timer = null;
        playBtn.textContent = "Play";
      }

      function setStep(index) {
        activeStep = Math.max(0, Math.min(index, steps.length - 1));
        render(steps[activeStep]);
      }

      function render(step) {
        const removeHighlight = ["is-committed", "is-compare-match", "is-compare-mismatch", "is-found", "is-empty"];

        textRow.cells.forEach((cell, col) => {
          cell.classList.remove(...removeHighlight);
          const inText = col < text.length;
          cell.textContent = inText ? formatChar(text[col]) : "";
          cell.classList.toggle("is-empty", !inText);
        });

        patternRow.cells.forEach((cell, col) => {
          cell.classList.remove(...removeHighlight);
          const patIdx = col - step.offset;
          const showPattern = patIdx >= 0 && patIdx < pattern.length;
          cell.textContent = showPattern ? formatChar(pattern[patIdx]) : "";
          cell.classList.toggle("is-empty", !showPattern);
        });

        lpsCells.forEach((cell) => {
          cell.classList.remove("is-active", "is-prefix");
        });

        for (let k = 0; k < step.j; k += 1) {
          const col = step.offset + k;
          if (col >= 0 && col < totalCols) {
            patternRow.cells[col].classList.add("is-committed");
            if (col < text.length) {
              textRow.cells[col].classList.add("is-committed");
            }
          }
          if (k < lpsCells.length) {
            lpsCells[k].classList.add("is-prefix");
          }
        }

        if (step.compareTextIndex !== null && step.comparePatternIndex !== null) {
          const tCol = step.compareTextIndex;
          const pCol = step.offset + step.comparePatternIndex;
          const compareClass = step.compareResult === "match" ? "is-compare-match" : "is-compare-mismatch";
          if (tCol >= 0 && tCol < text.length && tCol < totalCols) {
            textRow.cells[tCol].classList.add(compareClass);
          }
          if (pCol >= 0 && pCol < totalCols) {
            patternRow.cells[pCol].classList.add(compareClass);
          }
          if (step.comparePatternIndex < lpsCells.length) {
            lpsCells[step.comparePatternIndex].classList.add("is-active");
          }
        }

        if (step.foundRange) {
          for (let col = step.foundRange[0]; col < step.foundRange[1]; col += 1) {
            if (col >= 0 && col < text.length && col < totalCols) {
              textRow.cells[col].classList.add("is-found");
            }
            if (col >= 0 && col < totalCols) {
              patternRow.cells[col].classList.add("is-found");
            }
          }
        }

        pointer.textContent = `i = ${step.i}, j = ${step.j}, shift = ${step.offset}`;
        matches.textContent = step.matches.length
          ? `Matches found so far: [${step.matches.join(", ")}]`
          : "Matches found so far: []";
        status.textContent = step.action;
        progress.textContent = `Step ${activeStep + 1}/${steps.length}`;

        prevBtn.disabled = activeStep === 0;
        nextBtn.disabled = activeStep === steps.length - 1;
      }

      setStep(0);
    });

    function button(label) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kmp-btn";
      btn.textContent = label;
      return btn;
    }

    function createRow(label, cols, cellClass) {
      const row = document.createElement("div");
      row.className = "kmp-row";

      const tag = document.createElement("span");
      tag.className = "kmp-row-label";
      tag.textContent = label;

      const track = document.createElement("div");
      track.className = "kmp-track";
      const cells = [];
      for (let i = 0; i < cols; i += 1) {
        const cell = document.createElement("span");
        cell.className = `kmp-cell ${cellClass}`;
        if (cellClass === "kmp-index-cell") {
          cell.textContent = String(i);
        }
        track.appendChild(cell);
        cells.push(cell);
      }

      row.append(tag, track);
      return { row, cells };
    }

    function buildLps(pattern) {
      const lps = Array.from({ length: pattern.length }, () => 0);
      let len = 0;
      let i = 1;
      while (i < pattern.length) {
        if (pattern[i] === pattern[len]) {
          len += 1;
          lps[i] = len;
          i += 1;
        } else if (len !== 0) {
          len = lps[len - 1];
        } else {
          lps[i] = 0;
          i += 1;
        }
      }
      return lps;
    }

    function buildKmpTrace(text, pattern, lps) {
      const matches = [];
      const steps = [];

      const pushStep = (step) => {
        steps.push({ ...step, matches: [...matches] });
      };

      if (!pattern.length) {
        const all = Array.from({ length: text.length + 1 }, (_, idx) => idx);
        pushStep({
          i: 0,
          j: 0,
          offset: 0,
          compareTextIndex: null,
          comparePatternIndex: null,
          compareResult: null,
          foundRange: null,
          action: `Empty pattern matches at every boundary: [${all.join(", ")}].`,
        });
        steps[0].matches = all;
        return steps;
      }

      let i = 0;
      let j = 0;

      while (i < text.length) {
        const offset = i - j;
        const isMatch = text[i] === pattern[j];
        const comparedText = formatChar(text[i]);
        const comparedPattern = formatChar(pattern[j]);

        pushStep({
          i,
          j,
          offset,
          compareTextIndex: i,
          comparePatternIndex: j,
          compareResult: isMatch ? "match" : "mismatch",
          foundRange: null,
          action: isMatch
            ? `Compare text[${i}] (${comparedText}) with pattern[${j}] (${comparedPattern}): match. Move both pointers.`
            : `Compare text[${i}] (${comparedText}) with pattern[${j}] (${comparedPattern}): mismatch.`,
        });

        if (isMatch) {
          i += 1;
          j += 1;

          if (j === pattern.length) {
            const start = i - j;
            matches.push(start);
            const fallback = lps[j - 1];
            pushStep({
              i,
              j,
              offset: start,
              compareTextIndex: null,
              comparePatternIndex: null,
              compareResult: null,
              foundRange: [start, start + pattern.length],
              action: `Pattern found at index ${start}. Continue by setting j = lps[${j - 1}] = ${fallback}.`,
            });
            j = fallback;
          }
        } else if (j !== 0) {
          const oldJ = j;
          j = lps[j - 1];
          pushStep({
            i,
            j,
            offset: i - j,
            compareTextIndex: null,
            comparePatternIndex: null,
            compareResult: null,
            foundRange: null,
            action: `Fallback with LPS: j changes from ${oldJ} to ${j}; i stays at ${i}.`,
          });
        } else {
          i += 1;
          pushStep({
            i,
            j,
            offset: i - j,
            compareTextIndex: null,
            comparePatternIndex: null,
            compareResult: null,
            foundRange: null,
            action: `No prefix matched (j = 0), so advance i to ${i}.`,
          });
        }
      }

      pushStep({
        i,
        j,
        offset: i - j,
        compareTextIndex: null,
        comparePatternIndex: null,
        compareResult: null,
        foundRange: null,
        action: matches.length
          ? `Search complete. Final matches: [${matches.join(", ")}].`
          : "Search complete. No matches found.",
      });

      return steps;
    }

    function formatChar(ch) {
      if (ch === " ") return "␠";
      if (ch === "\t") return "\\t";
      if (ch === "\n") return "\\n";
      return ch;
    }
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
      const existingId = (heading.id || "").trim();
      if (!existingId) {
        heading.id = uniqueId(slugify(heading.textContent || ""), usedIds);
        return;
      }
      if (!usedIds.has(existingId)) {
        usedIds.add(existingId);
      } else {
        heading.id = uniqueId(existingId, usedIds);
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
    while (usedIds.has(id)) {
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
  setupOperationAnimations();
  setupKmpAnimations();
  setupSectionNav();
})();
