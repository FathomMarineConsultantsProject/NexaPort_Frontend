export function scopeGenerationErrorMessage(error) {
  const code = error?.response?.data?.code;
  if (code === "AI_PROVIDER_PAYMENT_REQUIRED") return "The OpenRouter account needs credits to generate scopes. Contact your administrator or write your scope manually.";
  if (["AI_PROVIDER_PAYMENT_REQUIRED", "AI_PROVIDER_ACCESS_DENIED", "AI_PROVIDER_PROJECT_ACCESS_DENIED", "AI_PROVIDER_AUTH_FAILED", "AI_PROVIDER_KEY_REVOKED", "AI_PROVIDER_NOT_CONFIGURED", "AI_PROVIDER_MODEL_UNAVAILABLE", "AI_PROVIDER_API_KEY_INVALID", "AI_PROVIDER_API_KEY_EXPIRED", "AI_PROVIDER_API_KEY_NOT_FOUND", "AI_PROVIDER_API_KEY_SERVICE_BLOCKED", "AI_PROVIDER_API_KEY_HTTP_REFERRER_BLOCKED", "AI_PROVIDER_API_KEY_IP_ADDRESS_BLOCKED", "AI_PROVIDER_SERVICE_DISABLED", "AI_PROVIDER_CONSUMER_INVALID"].includes(code)) {
    return "AI scope generation is blocked by the backend OpenRouter configuration. Contact your administrator or write your scope manually.";
  }
  if (["AI_PROVIDER_RATE_LIMITED", "AI_SCOPE_RATE_LIMITED"].includes(code)) return "Scope generation limit reached. Please retry later or write your scope manually.";
  return "Scope generation is temporarily unavailable. Please retry or write your scope manually.";
}

export async function generateScopeDraft(generate, input, onChange) {
  const response = await generate(input);
  if (typeof response.scopeOfWork !== "string" || !response.scopeOfWork.trim()) throw new Error("AI returned an empty scope. Please retry.");
  onChange(response.scopeOfWork);
}

export function includeLegacyCertification(scope, certification) {
  const note = String(certification || "").trim();
  if (!note || String(scope || "").toLowerCase().includes(note.toLowerCase())) return scope || "";
  return [String(scope || "").trim(), `Certification requirements: ${note}`].filter(Boolean).join("\n\n");
}
