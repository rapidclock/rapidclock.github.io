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

      let activeStep = 0;
      let timer = null;

      block.innerHTML = "";
      block.classList.add("operation-anim-interactive");

      const titleNode = document.createElement("p");
      titleNode.className = "operation-anim-title";
      titleNode.textContent = title;

      const boardRows = [];
      if (example?.rows?.length) {
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
        });
        block.append(titleNode, board);
      } else {
        block.append(titleNode);
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
      const token = (tokens, highlight = []) => ({ tokens, highlight });
      const rows = (defs) => ({
        rows: defs.map((def) => ({ label: def.label, frames: normalizeFrames(def.frames, stepCount) })),
      });

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
  setupOperationAnimations();
  setupKmpAnimations();
  setupSectionNav();
})();
