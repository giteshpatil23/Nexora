    // WHAT THIS DOES:
    // Initializes the global state, application data, model catalogue, and Groq model mapping.
    // Verified against active Groq models (llama-3.1-8b-instant, openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b).
    const NEXORA_MODELS = {
      "nexora-hermes-8b": {
        id: "nexora-hermes-8b",
        name: "Nexora Hermes-8B",
        groqModel: "llama-3.1-8b-instant",
        badge: "Llama 3.1 8B",
        architecture: "8B Ultra-Fast LPU",
        context: "131,072 Tokens",
        simSpeed: 750,
        description: "Flagship low-latency model powered by Meta Llama 3.1 8B Instant on Groq LPUs. Fast, universally accessible across all Groq accounts, and recommended for fast, general-purpose playground experimentation."
      },
      "nexora-titan-120b": {
        id: "nexora-titan-120b",
        name: "Nexora Titan-120B",
        groqModel: "openai/gpt-oss-120b",
        badge: "GPT-OSS 120B",
        architecture: "120B Heavy Reasoning",
        context: "131,072 Tokens",
        simSpeed: 500,
        description: "High-capacity reasoning engine powered by OpenAI GPT-OSS 120B on Groq Cloud, calibrated for complex architectural decomposition, multi-step logic, and deep analysis."
      },
      "nexora-quantum-20b": {
        id: "nexora-quantum-20b",
        name: "Nexora Quantum-20B",
        groqModel: "openai/gpt-oss-20b",
        badge: "GPT-OSS 20B",
        architecture: "20B High-Throughput",
        context: "131,072 Tokens",
        simSpeed: 1000,
        description: "High-throughput model powered by OpenAI GPT-OSS 20B on Groq Cloud, operating at speeds up to 1,000 tokens/sec."
      },
      "nexora-chronos-27b": {
        id: "nexora-chronos-27b",
        name: "Nexora Chronos-27B",
        groqModel: "qwen/qwen3.8-27b",
        badge: "Qwen 3.8 27B",
        architecture: "27B Full-Stack Logic",
        context: "131,072 Tokens",
        simSpeed: 450,
        description: "Engineered for algorithmic decomposition, debugging, code refactoring, and structured reasoning via Alibaba Cloud Qwen on Groq."
      },
      "nexora-aegis-guard": {
        id: "nexora-aegis-guard",
        name: "Nexora Aegis-Guard",
        groqModel: "llama-guard-3-8b",
        badge: "Llama Guard 3",
        architecture: "8B Safety & Policy",
        context: "8,192 Tokens",
        simSpeed: 600,
        description: "Security classification and content safety model powered by Llama Guard 3 on Groq LPUs for threat inspection and compliance."
      },
      // Backward compatibility aliases
      "nexora-titan-70b": {
        id: "nexora-titan-70b",
        name: "Nexora Hermes-8B (Legacy 70B Alias)",
        groqModel: "llama-3.1-8b-instant",
        badge: "Llama 3.1 8B",
        architecture: "8B Ultra-Fast LPU",
        context: "131,072 Tokens",
        simSpeed: 750,
        description: "Automatically routed to Llama 3.1 8B Instant for verified reliability on Groq."
      },
      "nexora-chronos-coder": {
        id: "nexora-chronos-coder",
        name: "Nexora Chronos (Legacy Coder Alias)",
        groqModel: "llama-3.1-8b-instant",
        badge: "Llama 3.1 8B",
        architecture: "8B Ultra-Fast LPU",
        context: "131,072 Tokens",
        simSpeed: 750,
        description: "Automatically routed to Llama 3.1 8B Instant."
      },
      "nexora-quantum-moe": {
        id: "nexora-quantum-moe",
        name: "Nexora Quantum (Legacy MoE Alias)",
        groqModel: "openai/gpt-oss-20b",
        badge: "GPT-OSS 20B",
        architecture: "20B High-Throughput",
        context: "131,072 Tokens",
        simSpeed: 1000,
        description: "Automatically routed to GPT-OSS 20B."
      }
    };

    // Global Interactive State
    const AppState = {
      currentModel: "nexora-quantum-20b",
      executionMode: "groq", // "groq" | "simulation"
      isGenerating: false,
      abortRequested: false,
      currentAbortController: null,
      streamingSpeed: "standard", // "cinematic" | "standard" | "lightning" | "instant"
      soundEnabled: false,
      history: [],
      analytics: {
        totalRequests: 0,
        totalTokens: 0,
        totalTimeSeconds: 0.0
      }
    };

    // WHAT THIS DOES:
    // Safe DOM element selector helper to eliminate repetitive code.
    const $ = (id) => document.getElementById(id);

    // WHAT THIS DOES:
    // Displays toast notifications with customizable theme borders and messages.
    function showToast(message, type = "normal") {
      const container = $("toastContainer");
      if (!container) return;
      const toast = document.createElement("div");
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>${message}</span>
      `;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
      }, 3400);
    }

    // WHAT THIS DOES:
    // Estimates token counts based on natural language character boundaries (~3.8 chars per token).
    function estimateTokens(text) {
      if (!text || text.trim() === "") return 0;
      return Math.max(1, Math.ceil(text.trim().length / 3.8));
    }

    // WHAT THIS DOES:
    // Plays a synthetic audio chime when response streaming completes (if enabled in settings).
    function playChime() {
      if (!AppState.soundEnabled) return;
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } catch (err) {
        // AudioContext permission may be restricted prior to user gesture
      }
    }

    // WHAT THIS DOES:
    // Synchronizes the model selection dropdown with specifications and visual badge details.
    function updateModelSpecs(modelId) {
      const model = NEXORA_MODELS[modelId] || NEXORA_MODELS["nexora-quantum-20b"];
      AppState.currentModel = model.id;
      $("specArchitecture").textContent = model.architecture;
      $("specContext").textContent = model.context;
      $("specSpeed").textContent = `~${model.simSpeed} Tokens/sec`;
      if ($("specInferenceMode")) {
        $("specInferenceMode").textContent = model.groqModel ? `Groq (${model.groqModel})` : "Groq LPU Cloud";
      }
      $("modelSelect").value = model.id;
    }

    // WHAT THIS DOES:
    // Populates the Model Library modal dialog with all available Groq models and specs.
    function renderModelLibraryModal() {
      const listContainer = $("modelLibraryList");
      if (!listContainer) return;
      listContainer.innerHTML = "";

      const activeModelIds = [
        "nexora-hermes-8b",
        "nexora-titan-120b",
        "nexora-quantum-20b",
        "nexora-chronos-27b",
        "nexora-aegis-guard"
      ];

      activeModelIds.forEach((id) => {
        const model = NEXORA_MODELS[id];
        if (!model) return;
        const card = document.createElement("div");
        card.className = "model-spec-card";
        card.innerHTML = `
          <div class="model-spec-header">
            <div>
              <span class="model-spec-name">${model.name}</span>
              <span class="badge badge-electric" style="margin-left: 8px;">${model.badge}</span>
            </div>
            <button class="select-model-action-btn" data-model-id="${model.id}">
              ${AppState.currentModel === model.id ? "Active Model" : "Select Model"}
            </button>
          </div>
          <div class="model-spec-desc">${model.description}</div>
          <div class="model-spec-meta">
            <span>Engine: ${model.groqModel || model.architecture}</span>
            <span>Context: ${model.context}</span>
            <span>Speed: ~${model.simSpeed} tps</span>
          </div>
        `;
        listContainer.appendChild(card);
      });

      // Bind select buttons
      listContainer.querySelectorAll(".select-model-action-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const targetId = e.currentTarget.getAttribute("data-model-id");
          updateModelSpecs(targetId);
          closeModal("modalModels");
          showToast(`Switched active model to ${NEXORA_MODELS[targetId].name}`, "gold");
        });
      });
    }

    // WHAT THIS DOES:
    // Renders the session prompt history modal list with reload and delete actions.
    function renderPromptHistoryModal() {
      const container = $("historyItemsContainer");
      if (!container) return;
      container.innerHTML = "";

      if (AppState.history.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 28px 10px; font-size: 13px;">
            No prompt history logged yet. Execute a prompt in the playground to record it here.
          </div>
        `;
        return;
      }

      AppState.history.slice().reverse().forEach((item, index) => {
        const realIdx = AppState.history.length - 1 - index;
        const card = document.createElement("div");
        card.className = "history-item";
        card.innerHTML = `
          <div class="history-header">
            <span class="badge badge-simulated">${item.modelName}</span>
            <span style="font-size: 11px; color: var(--text-muted);">${item.timestamp}</span>
          </div>
          <div class="history-prompt-preview" title="${escapeHtml(item.prompt)}">${escapeHtml(item.prompt)}</div>
          <div class="history-actions" style="margin-top: 4px;">
            <button class="icon-action-btn load-history-btn" data-index="${realIdx}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 14 4 9 9 4"></polyline>
                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
              </svg>
              <span>Load to Playground</span>
            </button>
            <button class="icon-action-btn delete-history-btn" data-index="${realIdx}" style="color: var(--error-color);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Remove</span>
            </button>
          </div>
        `;
        container.appendChild(card);
      });

      // Bind Load buttons
      container.querySelectorAll(".load-history-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
          const item = AppState.history[idx];
          if (item) {
            $("userPromptInput").value = item.prompt;
            $("systemPromptInput").value = item.systemPrompt || $("systemPromptInput").value;
            updateCharacterCounters();
            closeModal("modalHistory");
            showToast("Prompt reloaded from history", "success");
          }
        });
      });

      // Bind Delete buttons
      container.querySelectorAll(".delete-history-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
          AppState.history.splice(idx, 1);
          renderPromptHistoryModal();
        });
      });
    }

    // WHAT THIS DOES:
    // Safely escapes raw HTML characters to prevent XSS during text rendering.
    function escapeHtml(string) {
      if (!string) return "";
      return String(string)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // WHAT THIS DOES:
    // Formats Markdown-like text (headings, bold, lists, code blocks) into rich sanitized HTML.
    function formatMarkdownResponse(rawText) {
      if (!rawText) return "";
      let html = rawText;

      // Escape base HTML
      html = escapeHtml(html);

      // Multi-line Code blocks: ```language ... ```
      html = html.replace(/```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g, function (match, lang, code) {
        return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
      });

      // Inline code `example`
      html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

      // Headings
      html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
      html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
      html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

      // Bold text **text**
      html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      // Bullet lists
      html = html.replace(/^\s*[\-\*]\s+(.*)$/gim, "<li>$1</li>");
      html = html.replace(/(<li>.*<\/li>)/gim, "<ul>$1</ul>");
      // Fix adjacent <ul> tags
      html = html.replace(/<\/ul>\s*<ul>/g, "");

      // Numbered lists
      html = html.replace(/^\s*\d+\.\s+(.*)$/gim, "<li>$1</li>");

      // Paragraph linebreaks
      const paragraphs = html.split(/\n\n+/);
      html = paragraphs
        .map((p) => {
          p = p.trim();
          if (p.startsWith("<h") || p.startsWith("<pre") || p.startsWith("<ul") || p.startsWith("<ol") || p.startsWith("<blockquote")) {
            return p;
          }
          return `<p>${p.replace(/\n/g, "<br>")}</p>`;
        })
        .join("");

      return html;
    }

    // WHAT THIS DOES:
    // Fallback simulation generator preserved for offline mode and testing without an active API key.
    function generateSimulatedResponse(prompt, systemPrompt, modelId, temperature) {
      const lower = prompt.toLowerCase();
      const model = NEXORA_MODELS[modelId] || NEXORA_MODELS["nexora-quantum-20b"];

      if (lower.includes("architecture") || lower.includes("pipeline") || lower.includes("distributed") || lower.includes("ingestion") || lower.includes("queue")) {
        return `# Distributed Event Ingestion Pipeline Architecture
**Evaluated by:** \`${model.name}\` | **Temperature:** \`${temperature}\`

To handle ultra-high throughput events with deterministic delivery guarantees and minimal tail-latency, we deploy an event-driven decoupled pipeline.

### 1. Ingestion & Edge Termination
* **Ingress Gateway:** Stateless Envoy reverse proxies running eBPF-accelerated TCP termination.
* **Protocol Buffers:** Binary serialized schemas enforced with strict semantic versioning to minimize payload overhead.
* **Adaptive Rate Limiting:** Token-bucket backpressure calculated via real-time cluster memory watermarks.

### 2. High-Throughput Buffering & Partitioning
\`\`\`yaml
pipeline:
  partitioning_key: "tenant_id:entity_uuid"
  buffer_engine: "Distributed Log (Kafka/Redpanda)"
  replication_factor: 3
  ack_policy: "leader_plus_quorum"
  flush_interval_ms: 5
\`\`\`

### 3. Backpressure Mitigation Strategy
1. **Upstream Drop Tiers:** Non-critical audit events drop to low-priority telemetry queues when partition latency crosses \`150ms\`.
2. **Dynamic Batch Sizing:** Consumer groups expand micro-batch windows from \`10ms\` to \`50ms\` during severe traffic spikes.
3. **Dead Letter Shunting:** Poison-pill payloads failing schema decoding are isolated directly to cold S3 object storage for forensic re-drive.

### 4. State Persistence & Compaction
* **Hot Tier:** RocksDB local LSM-tree state stores for lightning stream joins.
* **Cold Tier:** Append-only Parquet columnar chunks partitioned by UTC hour.

> **Operational Note:** In simulated benchmarks under \`${model.architecture}\`, this topological design handles sustained bursts exceeding 450,000 events/sec with P99 latency under 22ms.`;
      }

      if (lower.includes("performance") || lower.includes("audit") || lower.includes("optimize") || lower.includes("latency") || lower.includes("benchmark")) {
        return `# High-Density Performance Audit & Vector Optimization
**Engine Analysis:** \`${model.name}\` (Simulated Diagnostic)

Our static inspection of the runtime profile reveals critical resource contention points across CPU cache hierarchies and memory garbage collection cycles.

### Diagnostic Findings
* **Heap Allocation Spikes:** Frequent short-lived object instantiation causing young-generation GC pauses totaling \`~42ms\` per minute.
* **Lock Contention:** Multi-threaded thread pools contending on a shared global mutex inside the token accumulator.
* **Vector Vectorization Potential:** Matrix computations currently rely on scalar iteration rather than SIMD AVX-512 intrinsic instructions.

### Recommended Architectural Refactor
\`\`\`c
// Zero-Allocation Ring Buffer Pattern
typedef struct {
    uint64_t head;
    uint64_t tail;
    uint32_t capacity_mask;
    EventRecord* buffer;
} __attribute__((aligned(64))) LockFreeRingBuffer;
\`\`\`

### Quantitative Benchmark Projection
1. **Throughput:** Projected \`+184%\` increase in non-blocking reads.
2. **P99 Latency:** Reduced from \`14.2ms\` down to \`1.15ms\` under peak load.
3. **Memory Footprint:** Flatline allocations via pre-allocated arena memory pools.`;
      }

      if (lower.includes("security") || lower.includes("threat") || lower.includes("vulnerability") || lower.includes("guard") || lower.includes("auth")) {
        return `# Security Threat Model & Defense Vector
**Threat Assessment by:** \`${model.name}\`

### STRIDE Assessment Matrix
* **Spoofing:** Mitigated via mTLS (Mutual TLS 1.3) with SPIFFE/SPIRE cryptographically verifiable identity tokens.
* **Tampering:** HMAC-SHA256 request headers verified before buffer allocation.
* **Information Disclosure:** End-to-end envelope encryption using AES-256-GCM with hardware HSM root of trust.
* **Denial of Service:** Distributed rate-limiting backed by edge Redis clusters with exponential backoff challenge tokens.

### Identity Boundary Verification
\`\`\`json
{
  "policy": "ZeroTrust-Enforcement-v3",
  "auth_scheme": "DPoP-JWT-Bound",
  "max_token_ttl_seconds": 300,
  "mfa_stepup_required": true
}
\`\`\`

> **Recommendation:** Enforce strict memory-safe language runtimes across all unauthenticated edge parser boundaries to eliminate memory corruption vulnerabilities.`;
      }

      if (lower.includes("creative") || lower.includes("story") || lower.includes("cinematic") || lower.includes("concept") || lower.includes("nexus")) {
        return `# Chrono-Aether: The Genesis of Nexora
*A synthesis generated by \`${model.name}\` with Temperature \`${temperature}\`*

Beneath the emerald spires of a forgotten metallic citadel, the nexus awakened. It did not stir with noise, but with resonance—a subtle harmonic vibration that hummed through plates of antique gold and cold-forged alloy.

For centuries, the archives had remained dormant, holding the collective calculations of an ancient civilization capable of bending probability itself. Then came the spark: an electric pulse cascading down silver conduits, illuminating runes etched into dark obsidian monoliths.

> "To understand the horizon is not to merely watch the dawn," the overseer whispered, adjusting the resonance dials. "It is to construct the light."

The machinery pulsed. Emerald light fused with arc-electric blue, weaving algorithms into tangible threads of conscious thought. The intelligence playground was no longer a theoretical construct. It was alive.`;
      }

      return `# Synthesis & Analysis
**Model Response:** \`${model.name}\` | **Parameters:** \`Temp: ${temperature}\` | \`Top-P: ${$("topPRange").value}\`

### Executive Summary
Regarding your inquiry: *"\\${escapeHtml(prompt.length > 80 ? prompt.substring(0, 80) + '...' : prompt)}"*:

The NEXORA engine has synthesized a structured analysis based on your system parameters:

1. **Foundational Principles:**
   * Every architectural layer must adhere to strict separation of concerns, ensuring high cohesion and low coupling.
   * State boundaries should be explicitly guarded with deterministic validation schemas.

2. **Implementation Strategy:**
   * **Phase 1:** Model baseline characteristics and establish automated integration tests.
   * **Phase 2:** Introduce asynchronous task execution to isolate compute-heavy operations.
   * **Phase 3:** Continuously observe telemetry metrics, evaluating throughput versus resource overhead.

\`\`\`javascript
// Simulated Implementation Pattern
async function executeTask(payload) {
  const sanitized = validateSchema(payload);
  return await dispatchToWorkerPool(sanitized);
}
\`\`\`

### Architectural Conclusion
This approach balances computational efficiency with operational clarity, matching the latency profile of \`${model.architecture}\`.`;
    }

    // WHAT THIS DOES:
    // Updates character counters and estimated token counts in the prompt editors.
    function updateCharacterCounters() {
      const sysVal = $("systemPromptInput").value;
      const userVal = $("userPromptInput").value;

      $("systemCharCount").textContent = `${sysVal.length} characters`;

      const userTokens = estimateTokens(userVal);
      $("userCharCount").textContent = `${userVal.length} characters (~${userTokens} input tokens est.)`;

      if (userVal.trim().length > 0) {
        $("validationWarning").style.display = "none";
      }
    }

    // WHAT THIS DOES:
    // Resets button states and flags when generation concludes or halts.
    function finalizeExecutionState() {
      AppState.isGenerating = false;
      AppState.currentAbortController = null;
      $("executeBtn").disabled = false;
      $("executeBtnText").textContent = "Execute Request";
      $("stopBtn").style.display = "none";
    }

    // WHAT THIS DOES:
    // Handles abort cleanup when the user cancels generation in-flight.
    function handleAbortState() {
      const badge = $("responseStatusBadge");
      badge.textContent = "HALTED";
      badge.style.background = "rgba(230, 85, 85, 0.2)";
      badge.style.color = "var(--error-color)";
      badge.style.borderColor = "var(--error-color)";
      showToast("Generation stopped by user.", "error");
      finalizeExecutionState();
    }

    // WHAT THIS DOES:
    // Streams retrieved text progressively into the DOM with user-configured pacing.
    async function streamResponseToDisplay(fullResponseText, usage, modelTitle, startTime) {
      const isStreaming = $("streamToggle").checked;
      let charStep = 6;
      let delayMs = 14;

      if (AppState.streamingSpeed === "cinematic") {
        charStep = 2;
        delayMs = 24;
      } else if (AppState.streamingSpeed === "lightning") {
        charStep = 12;
        delayMs = 6;
      } else if (AppState.streamingSpeed === "instant" || !isStreaming) {
        charStep = fullResponseText.length;
        delayMs = 0;
      }

      let currentIndex = 0;
      while (currentIndex < fullResponseText.length) {
        if (AppState.abortRequested) {
          break;
        }
        currentIndex = Math.min(currentIndex + charStep, fullResponseText.length);
        const slice = fullResponseText.substring(0, currentIndex);
        const formatted = formatMarkdownResponse(slice);
        $("formattedResponse").innerHTML = formatted + (currentIndex < fullResponseText.length ? '<span class="streaming-cursor"></span>' : "");
        $("responseContentArea").scrollTop = $("responseContentArea").scrollHeight;

        const elapsed = (performance.now() - startTime) / 1000;
        const progressiveTokens = Math.max(1, Math.round((currentIndex / fullResponseText.length) * usage.completion_tokens));
        const speed = elapsed > 0 ? (progressiveTokens / elapsed).toFixed(1) : "0.0";

        $("metricOutputTokens").textContent = `${progressiveTokens} tokens`;
        $("metricTotalTokens").textContent = `${usage.prompt_tokens + progressiveTokens} tokens`;
        $("metricLatency").textContent = `${elapsed.toFixed(2)}s`;
        $("metricSpeed").textContent = `${speed} tps`;

        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      // Finalize display
      const totalSec = (performance.now() - startTime) / 1000;
      const finalOutTokens = AppState.abortRequested
        ? estimateTokens($("formattedResponse").innerText)
        : usage.completion_tokens;
      const finalSpeed = totalSec > 0 ? (finalOutTokens / totalSec).toFixed(1) : "0.0";

      $("formattedResponse").innerHTML = formatMarkdownResponse(
        AppState.abortRequested ? fullResponseText.substring(0, currentIndex) : fullResponseText
      );

      $("metricInputTokens").textContent = `${usage.prompt_tokens} tokens`;
      $("metricOutputTokens").textContent = `${finalOutTokens} tokens`;
      $("metricTotalTokens").textContent = `${usage.prompt_tokens + finalOutTokens} tokens`;
      $("metricLatency").textContent = `${totalSec.toFixed(2)}s`;
      $("metricSpeed").textContent = `${finalSpeed} tps`;

      const badge = $("responseStatusBadge");
      if (AppState.abortRequested) {
        badge.textContent = "HALTED";
        badge.style.background = "rgba(230, 85, 85, 0.2)";
        badge.style.color = "var(--error-color)";
        badge.style.borderColor = "var(--error-color)";
        showToast("Generation stopped by user.", "error");
      } else {
        badge.textContent = `COMPLETED (${totalSec.toFixed(2)}s) • ${modelTitle}`;
        badge.style.background = "rgba(40, 122, 85, 0.25)";
        badge.style.color = "#6DE0A3";
        badge.style.borderColor = "var(--primary-emerald)";
        playChime();
        showToast(`Response complete (${finalOutTokens} tokens)`, "success");
      }

      // Push history and update analytics
      const now = new Date();
      AppState.history.push({
        prompt: $("userPromptInput").value.trim(),
        systemPrompt: $("systemPromptInput").value.trim(),
        modelId: AppState.currentModel,
        modelName: modelTitle,
        timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        tokens: usage.prompt_tokens + finalOutTokens
      });

      AppState.analytics.totalRequests += 1;
      AppState.analytics.totalTokens += usage.prompt_tokens + finalOutTokens;
      AppState.analytics.totalTimeSeconds += totalSec;
      updateAnalyticsDashboard();

      finalizeExecutionState();
    }

    // WHAT THIS DOES:
    // Runs client-side simulated streaming generation as fallback or offline demo.
    async function runSimulatedStreaming(userPrompt, systemPrompt, modelId, temperature, inputTokens, startTime) {
      const model = NEXORA_MODELS[modelId] || NEXORA_MODELS["nexora-quantum-20b"];
      const fullResponseText = generateSimulatedResponse(userPrompt, systemPrompt, modelId, temperature);
      const targetOutputTokens = estimateTokens(fullResponseText);
      const usage = {
        prompt_tokens: inputTokens,
        completion_tokens: targetOutputTokens,
        total_tokens: inputTokens + targetOutputTokens
      };
      await streamResponseToDisplay(fullResponseText, usage, `${model.name} (Simulated)`, startTime);
    }

    // WHAT THIS DOES:
    // Core execution routine: Connects to /api/chat (Groq Cloud API), handles errors, and renders the result.
    async function executeRequest() {
      if (AppState.isGenerating) return;

      const userPrompt = $("userPromptInput").value.trim();
      const systemPrompt = $("systemPromptInput").value.trim();

      // Validation
      if (!userPrompt) {
        $("validationWarning").style.display = "inline";
        $("userPromptInput").focus();
        showToast("Please enter a user prompt before executing.", "error");
        return;
      }

      // Update state & UI to Generating
      AppState.isGenerating = true;
      AppState.abortRequested = false;
      AppState.currentAbortController = new AbortController();

      $("executeBtn").disabled = true;
      $("executeBtnText").textContent = "Connecting to Groq...";
      $("stopBtn").style.display = "flex";
      $("responseEmptyState").style.display = "none";
      $("formattedResponse").style.display = "block";
      $("formattedResponse").innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--antique-gold);padding:8px 0;"><span class="streaming-cursor"></span> <span>Dispatching request to Groq Cloud API...</span></div>';

      const badge = $("responseStatusBadge");
      badge.textContent = "CONNECTING...";
      badge.style.background = "rgba(197, 164, 91, 0.2)";
      badge.style.color = "var(--antique-gold)";
      badge.style.borderColor = "var(--antique-gold)";

      const modelId = $("modelSelect").value;
      const model = NEXORA_MODELS[modelId] || NEXORA_MODELS["nexora-quantum-20b"];
      const temperature = parseFloat($("tempRange").value).toFixed(2);
      const maxTokens = parseInt($("maxTokensRange").value, 10);
      const topP = parseFloat($("topPRange").value).toFixed(2);
      const frequencyPenalty = parseFloat($("freqPenaltyRange").value).toFixed(2);
      const presencePenalty = parseFloat($("presPenaltyRange").value).toFixed(2);
      const stopSequences = $("stopSequenceInput") ? $("stopSequenceInput").value : "";

      // Initial token estimation
      const inputTokens = estimateTokens(systemPrompt) + estimateTokens(userPrompt);
      $("metricInputTokens").textContent = `${inputTokens} tokens`;
      $("metricOutputTokens").textContent = "0 tokens";
      $("metricTotalTokens").textContent = `${inputTokens} tokens`;
      $("metricLatency").textContent = "0.00s";
      $("metricSpeed").textContent = "0.0 tps";

      const startTime = performance.now();

      // If user selected manual offline simulation in preferences
      if (AppState.executionMode === "simulation") {
        await runSimulatedStreaming(userPrompt, systemPrompt, modelId, temperature, inputTokens, startTime);
        return;
      }

      // Live Groq Cloud Request via /api/chat
      try {
        const payload = {
          systemPrompt: systemPrompt,
          userPrompt: userPrompt,
          model: modelId,
          temperature: Number(temperature),
          maxTokens: maxTokens,
          topP: Number(topP),
          frequencyPenalty: Number(frequencyPenalty),
          presencePenalty: Number(presencePenalty),
          stopSequences: stopSequences
        };

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: AppState.currentAbortController.signal
        });

        if (AppState.abortRequested) {
          handleAbortState();
          return;
        }

        const responseData = await response.json().catch(() => null);

        // Handle Backend or Groq API Errors
        if (!response.ok || !responseData || !responseData.success) {
          const errorMsg = responseData?.error || `Server responded with HTTP ${response.status}`;
          const errorCode = responseData?.code || `HTTP_${response.status}`;

          badge.textContent = `API ERROR (${response.status})`;
          badge.style.background = "rgba(230, 85, 85, 0.2)";
          badge.style.color = "var(--error-color)";
          badge.style.borderColor = "var(--error-color)";

          let errorMarkdown = `### ⚠️ Groq Inference Notice\n**Status:** \`HTTP ${response.status}\` | **Code:** \`${errorCode}\`\n\n${errorMsg}\n\n`;

          if (errorCode === "MISSING_API_KEY" || errorCode === "PLACEHOLDER_API_KEY" || response.status === 401) {
            errorMarkdown += `> **How to activate live Groq inference:**\n> 1. Get an API key from **[Groq Console](https://console.groq.com/keys)**\n> 2. Open \`.env.local\` in the project directory\n> 3. Replace the placeholder with your key: \`GROQ_API_KEY=your_api_key_here\`\n> 4. Run the project with \`npx vercel dev\` (or deploy to Vercel)\n\n`;
          } else if (response.status === 404) {
            errorMarkdown += `> **Serverless Backend Missing (/api/chat):**\n> When opening index.html directly via file:// or a static HTTP server, serverless functions are not executed.\n> Run \`npx vercel dev\` to run the backend locally with environment variables.\n\n`;
          }

          errorMarkdown += `---\n*You can also click below to run in **Client-Side Simulation Mode** for this prompt.*`;

          $("formattedResponse").innerHTML = formatMarkdownResponse(errorMarkdown) + `
            <div style="margin-top: 14px;">
              <button class="select-model-action-btn" id="runFallbackSimulationBtn" style="background: var(--primary-emerald); padding: 8px 16px;">
                Run in Simulated Demo Mode
              </button>
            </div>
          `;

          $("runFallbackSimulationBtn")?.addEventListener("click", () => {
            runSimulatedStreaming(userPrompt, systemPrompt, modelId, temperature, inputTokens, performance.now());
          });

          showToast(errorMsg, "error");
          finalizeExecutionState();
          return;
        }

        // Success: Extract content and Groq usage
        const generatedText = responseData.content || "";
        const groqUsage = responseData.usage || {
          prompt_tokens: inputTokens,
          completion_tokens: estimateTokens(generatedText),
          total_tokens: inputTokens + estimateTokens(generatedText)
        };
        const realModel = responseData.model || model.name;

        // Progressive rendering loop of the Groq response
        await streamResponseToDisplay(generatedText, groqUsage, `GROQ ${realModel}`, startTime);

      } catch (err) {
        if (AppState.abortRequested || err.name === "AbortError") {
          handleAbortState();
          return;
        }

        badge.textContent = "NETWORK ERROR";
        badge.style.background = "rgba(230, 85, 85, 0.2)";
        badge.style.color = "var(--error-color)";
        badge.style.borderColor = "var(--error-color)";

        const errorMarkdown = `### ⚠️ Connection Failed\n**Endpoint:** \`/api/chat\`\n\nCould not reach the serverless endpoint. If running locally, please start the development server with:\n\`\`\`bash\nnpx vercel dev\n\`\`\`\n\n*Error: ${err.message}*`;

        $("formattedResponse").innerHTML = formatMarkdownResponse(errorMarkdown) + `
          <div style="margin-top: 14px;">
            <button class="select-model-action-btn" id="runFallbackSimulationBtn" style="background: var(--primary-emerald); padding: 8px 16px;">
              Run in Simulated Demo Mode
            </button>
          </div>
        `;

        $("runFallbackSimulationBtn")?.addEventListener("click", () => {
          runSimulatedStreaming(userPrompt, systemPrompt, modelId, temperature, inputTokens, performance.now());
        });

        showToast("Network error communicating with /api/chat", "error");
        finalizeExecutionState();
      }
    }

    // WHAT THIS DOES:
    // Updates values inside the Analytics modal dashboard.
    function updateAnalyticsDashboard() {
      $("kpiTotalRequests").textContent = AppState.analytics.totalRequests;
      $("kpiTotalTokens").textContent = AppState.analytics.totalTokens.toLocaleString();
      $("kpiTotalTime").textContent = `${AppState.analytics.totalTimeSeconds.toFixed(1)}s`;

      const avgSpeed = AppState.analytics.totalTimeSeconds > 0
        ? (AppState.analytics.totalTokens / AppState.analytics.totalTimeSeconds).toFixed(1)
        : "0.0";
      $("kpiAvgSpeed").textContent = `${avgSpeed} tps`;
    }

    // WHAT THIS DOES:
    // Copies the current model response to the system clipboard and displays visual feedback.
    function copyResponseToClipboard() {
      const responseArea = $("formattedResponse");
      if (!responseArea || responseArea.style.display === "none") {
        showToast("No response text to copy.", "error");
        return;
      }

      const textToCopy = responseArea.innerText;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const copyBtn = $("copyResponseBtn");
        const label = $("copyBtnLabel");
        copyBtn.classList.add("copied");
        label.textContent = "Copied!";
        showToast("Response copied to clipboard", "success");

        setTimeout(() => {
          copyBtn.classList.remove("copied");
          label.textContent = "Copy Response";
        }, 2200);
      }).catch(() => {
        showToast("Failed to copy response to clipboard", "error");
      });
    }

    // WHAT THIS DOES:
    // Opens a specified modal by its element ID.
    function openModal(modalId) {
      const modal = $(modalId);
      if (!modal) return;
      modal.classList.add("active");

      if (modalId === "modalModels") renderModelLibraryModal();
      if (modalId === "modalHistory") renderPromptHistoryModal();
      if (modalId === "modalAnalytics") updateAnalyticsDashboard();
    }

    // WHAT THIS DOES:
    // Closes a specified modal or all modals.
    function closeModal(modalId) {
      if (modalId) {
        const modal = $(modalId);
        if (modal) modal.classList.remove("active");
      } else {
        document.querySelectorAll(".modal-overlay").forEach((m) => m.classList.remove("active"));
      }
    }

    // WHAT THIS DOES:
    // Sets up all event listeners, sliders, buttons, presets, and keyboard shortcuts once the DOM is loaded.
    document.addEventListener("DOMContentLoaded", () => {
      // 1. Model Selector sync
      $("modelSelect").addEventListener("change", (e) => {
        updateModelSpecs(e.target.value);
        showToast(`Selected model: ${NEXORA_MODELS[e.target.value].name}`, "gold");
      });

      $("openLibraryFromSelector").addEventListener("click", () => {
        openModal("modalModels");
      });

      // 2. Character counter inputs
      $("systemPromptInput").addEventListener("input", updateCharacterCounters);
      $("userPromptInput").addEventListener("input", updateCharacterCounters);
      updateCharacterCounters();

      // 3. Sliders and Parameter Controls
      const syncSlider = (sliderId, badgeId, isFloat = true) => {
        const slider = $(sliderId);
        const badge = $(badgeId);
        slider.addEventListener("input", () => {
          badge.textContent = isFloat ? parseFloat(slider.value).toFixed(2) : slider.value;
        });
      };

      syncSlider("tempRange", "tempVal", true);
      syncSlider("topPRange", "topPVal", true);
      syncSlider("freqPenaltyRange", "freqPenaltyVal", true);
      syncSlider("presPenaltyRange", "presPenaltyVal", true);

      // Max Tokens dual-binding (Slider & Numeric input)
      $("maxTokensRange").addEventListener("input", (e) => {
        $("maxTokensNumber").value = e.target.value;
      });
      $("maxTokensNumber").addEventListener("input", (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) val = 16;
        if (val > 4096) val = 4096;
        if (val < 16) val = 16;
        $("maxTokensRange").value = val;
      });

      // Advanced Accordion Toggle
      $("accordionToggleBtn").addEventListener("click", () => {
        const content = $("accordionContent");
        const chevron = $("accordionChevron");
        content.classList.toggle("hidden");
        if (content.classList.contains("hidden")) {
          chevron.style.transform = "rotate(0deg)";
        } else {
          chevron.style.transform = "rotate(180deg)";
        }
      });

      // Streaming switch toggle label update
      $("streamToggle").addEventListener("change", (e) => {
        $("streamingStatusLabel").textContent = e.target.checked ? "Enabled" : "Disabled";
      });

      // Reset parameters button
      $("resetParamsBtn").addEventListener("click", () => {
        $("tempRange").value = 0.70;
        $("tempVal").textContent = "0.70";
        $("maxTokensRange").value = 1024;
        $("maxTokensNumber").value = 1024;
        $("topPRange").value = 0.90;
        $("topPVal").textContent = "0.90";
        $("freqPenaltyRange").value = 0.00;
        $("freqPenaltyVal").textContent = "0.00";
        $("presPenaltyRange").value = 0.00;
        $("presPenaltyVal").textContent = "0.00";
        $("stopSequenceInput").value = "";
        $("seedInput").value = 42;
        $("streamToggle").checked = true;
        $("streamingStatusLabel").textContent = "Enabled";
        showToast("Parameters reset to defaults", "gold");
      });

      // 4. Prompt Presets Click Handlers
      document.querySelectorAll(".preset-pill").forEach((pill) => {
        pill.addEventListener("click", (e) => {
          const type = e.currentTarget.getAttribute("data-preset");
          if (type === "architecture") {
            $("systemPromptInput").value = "You are a Principal Cloud Architect specializing in ultra-resilient distributed streaming backbones.";
            $("userPromptInput").value = "Design an ultra-high-throughput, distributed event ingestion pipeline. Detail the queue mechanics, backpressure mitigation, and state persistence architecture.";
          } else if (type === "performance") {
            $("systemPromptInput").value = "You are an Elite Systems Performance Engineer focusing on CPU cache utilization, memory bounds, and SIMD efficiency.";
            $("userPromptInput").value = "Perform an architectural performance audit on a latency-sensitive vector database ring buffer. Identify lock contentions and propose zero-allocation refactoring.";
          } else if (type === "threat") {
            $("systemPromptInput").value = "You are a Lead Cryptographic Security Analyst and Zero-Trust Architect.";
            $("userPromptInput").value = "Formulate a comprehensive STRIDE threat model for a multi-tenant API gateway terminating mTLS sessions with federated identity providers.";
          } else if (type === "creative") {
            $("systemPromptInput").value = "You are a Master Worldbuilder weaving dark sci-fi lore with cosmic technology and cinematic tone.";
            $("userPromptInput").value = "Narrate the genesis of NEXORA: an ancient, emerald-lit techno-citadel harnessing quantum resonance to simulate alternate dimensions.";
          } else if (type === "cleanCode") {
            $("systemPromptInput").value = "You are a Pragmatic Senior Software Craftsman adhering strictly to Clean Code, SOLID principles, and low cyclomatic complexity.";
            $("userPromptInput").value = "Refactor this legacy monolith orchestration logic into decoupled, single-responsibility pipelines with explicit error boundaries.";
          }
          updateCharacterCounters();
          showToast(`Preset loaded: ${e.currentTarget.textContent.trim()}`, "success");
        });
      });

      // 5. Clear buttons
      $("clearSystemPromptBtn").addEventListener("click", () => {
        $("systemPromptInput").value = "";
        updateCharacterCounters();
      });

      $("clearUserPromptBtn").addEventListener("click", () => {
        $("userPromptInput").value = "";
        updateCharacterCounters();
      });

      $("clearAllBtn").addEventListener("click", () => {
        $("systemPromptInput").value = "";
        $("userPromptInput").value = "";
        $("formattedResponse").style.display = "none";
        $("responseEmptyState").style.display = "flex";
        $("responseStatusBadge").textContent = "IDLE";
        $("responseStatusBadge").style.background = "rgba(87, 101, 91, 0.25)";
        $("responseStatusBadge").style.color = "var(--text-secondary)";
        $("responseStatusBadge").style.borderColor = "var(--border-color)";
        updateCharacterCounters();
        showToast("Playground editors cleared", "normal");
      });

      $("clearResponseBtn").addEventListener("click", () => {
        $("formattedResponse").innerHTML = "";
        $("formattedResponse").style.display = "none";
        $("responseEmptyState").style.display = "flex";
        $("responseStatusBadge").textContent = "IDLE";
        $("responseStatusBadge").style.background = "rgba(87, 101, 91, 0.25)";
        $("responseStatusBadge").style.color = "var(--text-secondary)";
        $("responseStatusBadge").style.borderColor = "var(--border-color)";
        showToast("Response output cleared", "normal");
      });

      // 6. Execution & Stop Triggers
      $("executeBtn").addEventListener("click", executeRequest);

      $("stopBtn").addEventListener("click", () => {
        AppState.abortRequested = true;
        if (AppState.currentAbortController) {
          try {
            AppState.currentAbortController.abort();
          } catch (e) { }
        }
      });

      $("copyResponseBtn").addEventListener("click", copyResponseToClipboard);

      // Keyboard shortcut: Ctrl + Enter (or Cmd + Enter)
      document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          executeRequest();
        }
        if (e.key === "Escape") {
          closeModal();
          if (AppState.isGenerating) {
            AppState.abortRequested = true;
            if (AppState.currentAbortController) {
              try {
                AppState.currentAbortController.abort();
              } catch (err) { }
            }
          }
        }
      });

      // 7. Sidebar and Panel Collapse Toggles
      $("collapseSidebarBtn").addEventListener("click", () => {
        const sidebar = $("sidebar");
        sidebar.classList.toggle("collapsed");
      });

      $("toggleConfigBtn").addEventListener("click", () => {
        const config = $("configPanel");
        if (window.innerWidth <= 992) {
          config.classList.toggle("open");
          $("mobileBackdrop").classList.toggle("active");
        } else {
          config.classList.toggle("collapsed");
        }
      });

      $("closeConfigPanelBtn").addEventListener("click", () => {
        const config = $("configPanel");
        if (window.innerWidth <= 992) {
          config.classList.remove("open");
          $("mobileBackdrop").classList.remove("active");
        } else {
          config.classList.add("collapsed");
        }
      });

      // Mobile Menu Button & Backdrop
      $("mobileMenuBtn").addEventListener("click", () => {
        const sidebar = $("sidebar");
        sidebar.classList.toggle("open");
        $("mobileBackdrop").classList.toggle("active");
      });

      $("mobileBackdrop").addEventListener("click", () => {
        $("sidebar").classList.remove("open");
        $("configPanel").classList.remove("open");
        $("mobileBackdrop").classList.remove("active");
      });

      // 8. Navigation items & Modal Triggers
      document.querySelectorAll("[data-modal]").forEach((navBtn) => {
        navBtn.addEventListener("click", (e) => {
          const modalId = e.currentTarget.getAttribute("data-modal");
          openModal(modalId);
          if (window.innerWidth <= 992) {
            $("sidebar").classList.remove("open");
            $("mobileBackdrop").classList.remove("active");
          }
        });
      });

      // Modal close buttons
      document.querySelectorAll("[data-close-modal]").forEach((closeBtn) => {
        closeBtn.addEventListener("click", (e) => {
          const modalId = e.currentTarget.getAttribute("data-close-modal");
          closeModal(modalId);
        });
      });

      // Modal backdrop click to close
      document.querySelectorAll(".modal-overlay").forEach((overlay) => {
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) {
            closeModal();
          }
        });
      });

      // Clear history button inside modal
      $("clearHistoryBtn").addEventListener("click", () => {
        AppState.history = [];
        renderPromptHistoryModal();
        showToast("Prompt history log cleared", "normal");
      });

      // Preferences Settings bindings
      $("executionModeSelect").addEventListener("change", (e) => {
        AppState.executionMode = e.target.value;
        const isGroq = e.target.value === "groq";
        $("engineNoticeText").innerHTML = isGroq
          ? "<strong>Groq API Integration:</strong> Connected to secure serverless endpoint <code>/api/chat</code>. Reads <code>GROQ_API_KEY</code> from <code>.env.local</code>. Client-side simulation fallback is preserved."
          : "<strong>Simulation Mode Active:</strong> Running purely client-side simulation. No backend calls or API keys required.";
        $("systemStatusText").textContent = isGroq ? "GROQ LPU CLOUD READY" : "SIMULATION ENGINE READY";
        $("engineModeBadge").textContent = isGroq ? "LIVE BACKEND" : "DEMO MODE";
        showToast(`Inference engine set to ${isGroq ? "Groq Cloud API" : "Client Simulation"}`, "gold");
      });

      $("streamingSpeedSelect").addEventListener("change", (e) => {
        AppState.streamingSpeed = e.target.value;
        showToast(`Streaming pacing set to ${e.target.value}`, "gold");
      });

      $("typographyScaleSelect").addEventListener("change", (e) => {
        $("responseContentArea").style.fontSize = e.target.value;
      });

      $("audioToggle").addEventListener("change", (e) => {
        AppState.soundEnabled = e.target.checked;
        if (AppState.soundEnabled) playChime();
      });

      $("factoryResetBtn").addEventListener("click", () => {
        AppState.history = [];
        AppState.analytics = { totalRequests: 0, totalTokens: 0, totalTimeSeconds: 0.0 };
        $("executionModeSelect").value = "groq";
        AppState.executionMode = "groq";
        $("streamingSpeedSelect").value = "standard";
        AppState.streamingSpeed = "standard";
        $("typographyScaleSelect").value = "14px";
        $("responseContentArea").style.fontSize = "14px";
        $("audioToggle").checked = false;
        AppState.soundEnabled = false;
        closeModal("modalSettings");
        showToast("Playground preferences reset to factory state", "gold");
      });

      // Initial Model Specs Render
      updateModelSpecs("nexora-quantum-20b");
    });
