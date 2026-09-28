export interface UserProfile {
  userId: string;
  communicationStyle?: string;
  preferences: Record<string, string>;
  projectContext?: string;
  constraints: string[];
  updatedAt: number;
}

// Only stores what is appropriate: explicit preferences and task-relevant
// project context. Never auto-promotes arbitrary chat statements to memory.
export class UserProfiler {
  private profiles = new Map<string, UserProfile>();

  get(userId: string): UserProfile {
    let p = this.profiles.get(userId);
    if (!p) {
      p = { userId, preferences: {}, constraints: [], updatedAt: Date.now() };
      this.profiles.set(userId, p);
    }
    return p;
  }

  /** Explicit opt-in preference storage. */
  setPreference(userId: string, key: string, value: string): UserProfile {
    const p = this.get(userId);
    p.preferences[key] = value;
    p.updatedAt = Date.now();
    return p;
  }

  setProjectContext(userId: string, context: string): UserProfile {
    const p = this.get(userId);
    p.projectContext = context.slice(0, 4000);
    p.updatedAt = Date.now();
    return p;
  }

  addConstraint(userId: string, constraint: string): UserProfile {
    const p = this.get(userId);
    if (!p.constraints.includes(constraint)) p.constraints.push(constraint);
    p.updatedAt = Date.now();
    return p;
  }

  /** Memory controls: user can inspect and erase. */
  exportProfile(userId: string): UserProfile {
    return JSON.parse(JSON.stringify(this.get(userId))) as UserProfile;
  }

  erase(userId: string): void {
    this.profiles.delete(userId);
  }
}
