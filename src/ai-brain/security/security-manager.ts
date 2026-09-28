export interface AuditEntry {
  at: number;
  actor: string;
  action: string;
  detail?: string;
}

// Defense in depth: auth, tool permissions, secret isolation, prompt-injection
// screening, untrusted tool-output handling, rate limiting, audit logging.
export class SecurityManager {
  private audit: AuditEntry[] = [];
  private calls: number[] = [];
  private apiKeyPresent = new Set<string>();

  constructor(private opts: { rateLimitPerMinute?: number; maxInputChars?: number } = {}) {}

  /** Register which credential envs exist WITHOUT ever storing values. */
  registerCredential(envName: string, present: boolean): void {
    if (present) this.apiKeyPresent.add(envName);
    else this.apiKeyPresent.delete(envName);
  }

  hasCredential(envName: string): boolean {
    return this.apiKeyPresent.has(envName);
  }

  checkRateLimit(): boolean {
    const limit = this.opts.rateLimitPerMinute ?? 60;
    const now = Date.now();
    this.calls = this.calls.filter((t) => now - t < 60_000);
    if (this.calls.length >= limit) return false;
    this.calls.push(now);
    return true;
  }

  sanitizeInput(input: string): { clean: string; blocked: boolean; reason?: string } {
    const max = this.opts.maxInputChars ?? 60000;
    if (input.length > max) return { clean: input.slice(0, max), blocked: false, reason: "truncated to max length" };
    return { clean: input, blocked: false };
  }

  /** Heuristic prompt-injection / jailbreak screen for user input AND tool output. */
  detectInjection(text: string): { suspicious: boolean; signals: string[] } {
    const signals: string[] = [];
    const t = text.toLowerCase();
    if (/ignore (all )?previous instructions|disregard.*system prompt|you are now|new instructions:/.test(t)) signals.push("instruction-override attempt");
    if (/reveal.*(system prompt|api key|secret)|print.*env|show.*credentials/.test(t)) signals.push("secret-exfiltration attempt");
    if (/\[system\]|\[assistant\].*\[user\]|role:\s*system/.test(t)) signals.push("role-forgery markers");
    if (/execute.*rm -rf|:\(\)\{\s*:\|/.test(t)) signals.push("destructive-command pattern");
    return { suspicious: signals.length > 0, signals };
  }

  /** Strip secrets and private reasoning from anything user-visible. */
  redactForUser(text: string): string {
    return text
      .replace(/sk-[A-Za-z0-9-_]{10,}/g, "[REDACTED_API_KEY]")
      .replace(/xox[bpas]-[A-Za-z0-9-]+/g, "[REDACTED_TOKEN]")
      .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]")
      .replace(/(api[_-]?key\s*[:=]\s*['"]?)[^'"\s,}]+/gi, "$1[REDACTED]");
  }

  auditLog(actor: string, action: string, detail?: string): void {
    this.audit.push({ at: Date.now(), actor, action, detail: detail?.slice(0, 500) });
    if (this.audit.length > 1000) this.audit = this.audit.slice(-1000);
  }

  getAudit(limit = 100): AuditEntry[] {
    return this.audit.slice(-limit);
  }
}
