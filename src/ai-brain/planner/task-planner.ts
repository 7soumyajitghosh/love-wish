import type { TaskContext, TaskPlan, SubTask } from "../types";

let planSeq = 0;
let taskSeq = 0;

const BUILD_STEPS = [
  "Architecture", "Frontend", "Authentication", "Database",
  "AI gateway", "Model routing", "API integration", "Testing", "Deployment", "Monitoring",
];

function mkTask(title: string, description: string, priority: number, dependencies: string[] = [], parallelizable = true): SubTask {
  taskSeq += 1;
  return {
    id: `sub-${Date.now()}-${taskSeq}`,
    title, description,
    status: dependencies.length ? "pending" : "ready",
    priority, dependencies, parallelizable,
    attempts: 0, maxAttempts: 3,
  };
}

export class TaskPlanner {
  plan(task: TaskContext): TaskPlan {
    planSeq += 1;
    const goal = task.userInput;
    const t = goal.toLowerCase();
    let tasks: SubTask[];
    if (/website|app|platform|system|authentication.*database|model routing/.test(t) && goal.length > 80) {
      const created = BUILD_STEPS.map((s, i) => mkTask(s, `${s} for: ${goal.slice(0, 160)}`, 10 - i));
      for (let i = 1; i < created.length; i++) {
        if (!["Frontend", "Authentication", "Database", "AI gateway", "Model routing"].includes(created[i].title)) {
          created[i].dependencies = [created[i - 1].id];
          created[i].status = "pending";
        } else if (i > 1) {
          created[i].dependencies = [created[0].id]; // fan out from architecture
        }
      }
      tasks = created;
    } else if (task.complexity === "complex" || (/,/.test(goal) && goal.split(/\s+/).length > 25)) {
      tasks = this.decomposeGeneric(goal);
    } else if (task.complexity === "medium") {
      tasks = [mkTask("Analyze request", `Understand and scope: ${goal.slice(0, 200)}`, 10), mkTask("Execute", `Carry out: ${goal.slice(0, 200)}`, 9), mkTask("Verify", "Check result against requirements", 8)];
      tasks[1].dependencies = [tasks[0].id]; tasks[1].status = "pending";
      tasks[2].dependencies = [tasks[1].id]; tasks[2].status = "pending";
    } else {
      tasks = [mkTask("Execute", goal.slice(0, 300), 10)];
    }
    const now = Date.now();
    return { id: `plan-${Date.now()}-${planSeq}`, goal, tasks, createdAt: now, updatedAt: now };
  }

  private decomposeGeneric(goal: string): SubTask[] {
    const parts = goal.split(/(?:\band\b|\bthen\b|;|\+|\n|(?<=\.)\s+)/).map((s) => s.trim()).filter((s) => s.length > 8).slice(0, 8);
    const items = (parts.length >= 2 ? parts : [goal]).map((p, i) => mkTask(`Step ${i + 1}`, p.slice(0, 300), 10 - i));
    for (let i = 1; i < items.length; i++) {
      items[i].dependencies = [items[i - 1].id];
      items[i].status = "pending";
    }
    items.push(mkTask("Verify", "Verify all steps completed and requirements satisfied", 1, [items[items.length - 1].id]));
    items[items.length - 1].status = "pending";
    return items;
  }

  readyTasks(plan: TaskPlan): SubTask[] {
    const done = new Set(plan.tasks.filter((t) => t.status === "done").map((t) => t.id));
    return plan.tasks
      .filter((t) => (t.status === "pending" || t.status === "ready") && t.dependencies.every((d) => done.has(d)))
      .sort((a, b) => b.priority - a.priority);
  }

  markDone(plan: TaskPlan, id: string, result?: unknown): TaskPlan {
    return this.setStatus(plan, id, "done", { result });
  }

  markFailed(plan: TaskPlan, id: string, error: string): TaskPlan {
    const task = plan.tasks.find((t) => t.id === id);
    if (!task) return plan;
    task.attempts += 1;
    task.error = error;
    task.status = task.attempts >= task.maxAttempts ? "failed" : "ready"; // retry
    return { ...plan, tasks: [...plan.tasks], updatedAt: Date.now() };
  }

  markNeedsInput(plan: TaskPlan, id: string, error: string): TaskPlan {
    return this.setStatus(plan, id, "needs_input", { error });
  }

  isComplete(plan: TaskPlan): boolean {
    return plan.tasks.length > 0 && plan.tasks.every((t) => t.status === "done" || t.status === "skipped");
  }

  completion(plan: TaskPlan): number {
    if (!plan.tasks.length) return 1;
    const done = plan.tasks.filter((t) => t.status === "done").length;
    return done / plan.tasks.length;
  }

  private setStatus(plan: TaskPlan, id: string, status: SubTask["status"], extra: Partial<SubTask> = {}): TaskPlan {
    const tasks = plan.tasks.map((t) => (t.id === id ? { ...t, status, ...extra } : t));
    const doneIds = new Set(tasks.filter((t) => t.status === "done").map((t) => t.id));
    for (const t of tasks) {
      if (t.status === "pending" && t.dependencies.every((d) => doneIds.has(d))) t.status = "ready";
    }
    return { ...plan, tasks, updatedAt: Date.now() };
  }
}
