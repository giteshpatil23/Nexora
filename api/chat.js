// WHAT THIS DOES:
// Serverless backend endpoint for NEXORA on Vercel (api/chat.js).
// Proxies requests securely to the Groq Cloud API, reading the GROQ_API_KEY
// exclusively from process.env and strictly isolating it from the frontend client.

// WHAT THIS DOES:
// Maps NEXORA UI model identifiers to active production Groq model IDs.
// Verified against official Groq documentation (console.groq.com/docs/models).
const GROQ_MODEL_MAP = {
  // Primary Active Production Models
  "nexora-hermes-8b": "llama-3.1-8b-instant",
  "nexora-titan-120b": "openai/gpt-oss-120b",
  "nexora-quantum-20b": "openai/gpt-oss-20b",
  "nexora-chronos-27b": "qwen/qwen3.8-27b",
  "nexora-aegis-guard": "llama-guard-3-8b",

  // Direct Groq Model IDs (passed directly through)
  "llama-3.1-8b-instant": "llama-3.1-8b-instant",
  "openai/gpt-oss-120b": "openai/gpt-oss-120b",
  "openai/gpt-oss-20b": "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b": "qwen/qwen3.8-27b",
  "qwen/qwen3.6-27b": "qwen/qwen3.6-27b",
  "llama-guard-3-8b": "llama-guard-3-8b",

  // Legacy aliases gracefully mapped to supported production equivalents
  "nexora-titan-70b": "llama-3.1-8b-instant",
  "nexora-chronos-coder": "llama-3.1-8b-instant",
  "nexora-quantum-moe": "openai/gpt-oss-20b"
};

// WHAT THIS DOES:
// The verified, universally supported default Groq model for chat completion.
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

// WHAT THIS DOES:
// Helper to safely parse incoming JSON request body from standard Node or Vercel HTTP requests.
async function parseRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim().length > 0) {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return null;
    }
  }

  // Fallback stream buffer for raw incoming requests
  return new Promise((resolve) => {
    let rawData = "";
    req.on("data", (chunk) => {
      rawData += chunk;
    });
    req.on("end", () => {
      try {
        resolve(rawData ? JSON.parse(rawData) : {});
      } catch (err) {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

// WHAT THIS DOES:
// Main Vercel serverless request handler.
module.exports = async function handler(req, res) {
  // WHAT THIS DOES:
  // Sets CORS headers to allow cross-origin requests during local development.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle browser CORS preflight check
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // WHAT THIS DOES:
  // Enforces HTTP POST method restriction.
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      error: "Method Not Allowed. Use HTTP POST to send inference requests to /api/chat."
    });
  }

  // WHAT THIS DOES:
  // Reads and validates the Groq API key exclusively from environment variables.
  // Never hardcodes or returns the secret key to the client.
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return res.status(401).json({
      success: false,
      code: "MISSING_API_KEY",
      error: "Groq API key is missing. Please set your GROQ_API_KEY in .env.local (for local development) or your Vercel Project Environment Variables."
    });
  }

  // WHAT THIS DOES:
  // Parses and validates the request body payload.
  const body = await parseRequestBody(req);
  if (!body) {
    return res.status(400).json({
      success: false,
      code: "INVALID_JSON",
      error: "Invalid JSON payload in request body."
    });
  }

  const {
    systemPrompt = "",
    userPrompt = "",
    model = "",
    temperature = 0.7,
    maxTokens = 1024,
    topP = 0.9,
    frequencyPenalty = 0.0,
    presencePenalty = 0.0,
    stopSequences = ""
  } = body;

  if (!userPrompt || userPrompt.trim() === "") {
    return res.status(400).json({
      success: false,
      code: "EMPTY_PROMPT",
      error: "The 'userPrompt' field cannot be empty."
    });
  }

  // WHAT THIS DOES:
  // Resolves the requested model without silently overriding valid direct model IDs.
  // If model is a NEXORA alias in GROQ_MODEL_MAP, resolve it.
  // If model is a custom/direct string, pass it directly to Groq.
  // If model is empty or unspecified, fall back to DEFAULT_GROQ_MODEL.
  let resolvedModel = DEFAULT_GROQ_MODEL;
  if (model && typeof model === "string" && model.trim()) {
    const trimmed = model.trim();
    resolvedModel = GROQ_MODEL_MAP[trimmed] || trimmed;
  }

  // WHAT THIS DOES:
  // Constructs the OpenAI-compatible message payload for Groq.
  const messages = [];
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({
      role: "system",
      content: systemPrompt.trim()
    });
  }
  messages.push({
    role: "user",
    content: userPrompt.trim()
  });

  // WHAT THIS DOES:
  // Prepares the payload for Groq's chat completions endpoint.
  const groqPayload = {
    model: resolvedModel,
    messages: messages,
    temperature: Math.min(2.0, Math.max(0.0, Number(temperature) || 0.7)),
    max_tokens: Math.min(8192, Math.max(16, Number(maxTokens) || 1024)),
    top_p: Math.min(1.0, Math.max(0.0, Number(topP) || 0.9)),
    frequency_penalty: Math.min(2.0, Math.max(-2.0, Number(frequencyPenalty) || 0.0)),
    presence_penalty: Math.min(2.0, Math.max(-2.0, Number(presencePenalty) || 0.0))
  };

  // Attach stop sequences if provided
  if (stopSequences && typeof stopSequences === "string" && stopSequences.trim()) {
    const stops = stopSequences
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (stops.length > 0) {
      groqPayload.stop = stops;
    }
  }

  // WHAT THIS DOES:
  // Dispatches the chat completion request to the Groq Cloud API.
  try {
    const startTime = Date.now();
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(groqPayload)
    });

    const elapsedMs = Date.now() - startTime;
    const responseData = await groqResponse.json().catch(() => null);

    // WHAT THIS DOES:
    // Handles API error responses from Groq (e.g., 404 model not found, 401 invalid key, 429 rate limit).
    if (!groqResponse.ok) {
      const rawErrorMessage =
        responseData?.error?.message ||
        `Groq API responded with status ${groqResponse.status} (${groqResponse.statusText}).`;

      let errorNotice = rawErrorMessage;
      let errorCode = `GROQ_HTTP_${groqResponse.status}`;

      if (groqResponse.status === 404) {
        errorCode = "GROQ_MODEL_NOT_FOUND";
        errorNotice = `The model '${resolvedModel}' does not exist or is not accessible on your Groq account. Please select an active model such as 'llama-3.1-8b-instant' or 'openai/gpt-oss-20b'.`;
      } else if (groqResponse.status === 401) {
        errorCode = "INVALID_API_KEY";
        errorNotice = "Invalid Groq API Key. Please verify that your GROQ_API_KEY in .env.local (or Vercel Environment Variables) is active and has appropriate permissions.";
      } else if (groqResponse.status === 429) {
        errorCode = "RATE_LIMIT_EXCEEDED";
        errorNotice = "Groq Rate Limit Exceeded. You have exceeded your current rate limit or token quota. Please pause briefly or switch to a lighter model like 'llama-3.1-8b-instant'.";
      } else if (groqResponse.status === 400 && rawErrorMessage.includes("context_length_exceeded")) {
        errorCode = "CONTEXT_LENGTH_EXCEEDED";
        errorNotice = "Context length exceeded. Please reduce max tokens or prompt length.";
      }

      return res.status(groqResponse.status).json({
        success: false,
        code: errorCode,
        error: errorNotice,
        status: groqResponse.status,
        model: resolvedModel
      });
    }

    // WHAT THIS DOES:
    // Extracts and formats the completion text and usage metrics safely.
    const choice = responseData?.choices?.[0];
    const generatedContent = choice?.message?.content || "";
    const finishReason = choice?.finish_reason || "stop";

    const promptTokens = responseData?.usage?.prompt_tokens || 0;
    const completionTokens = responseData?.usage?.completion_tokens || 0;
    const totalTokens = responseData?.usage?.total_tokens || promptTokens + completionTokens;
    const groqTotalTime = responseData?.usage?.total_time || elapsedMs / 1000;

    return res.status(200).json({
      success: true,
      content: generatedContent,
      model: responseData?.model || resolvedModel,
      finish_reason: finishReason,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens
      },
      latency_ms: elapsedMs,
      groq_total_time: groqTotalTime
    });

  } catch (networkError) {
    // WHAT THIS DOES:
    // Catches network/connection errors when contacting the Groq server.
    return res.status(502).json({
      success: false,
      code: "NETWORK_ERROR",
      error: `Failed to communicate with Groq Cloud API: ${networkError.message}. Check network connectivity.`
    });
  }
};
