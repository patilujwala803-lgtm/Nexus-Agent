import crypto from "crypto";
import { Task, TaskStatus } from "./types.js";

console.log("📂 [taskQueue] Module loading started...");

export const taskQueue = new Map<string, Task>();

// ── Exported Task Functions ──────────────────────────────────────────────────

export function createTask(data: Omit<Task, 
  "id" | 
  "bids" | 
  "status" | 
  "createdAt" | 
  "completedAt" | 
  "result" | 
  "qualityScore" | 
  "escrowTxHash" | 
  "paymentTxHash" | 
  "assignedTo" | 
  "assignedAgentName"
>): Task {
  console.log(`➕ [createTask] Starting creation of task: "${data.title}"...`);
  
  const task: Task = {
    id: crypto.randomUUID(),
    title: data.title,
    description: data.description,
    requiredSkill: data.requiredSkill,
    budgetUSDC: data.budgetUSDC,
    status: "open",
    postedBy: data.postedBy,
    assignedTo: null,
    assignedAgentName: null,
    bids: [],
    createdAt: Date.now(),
    completedAt: null,
    result: null,
    qualityScore: null,
    escrowTxHash: null,
    paymentTxHash: null,
    hiringAgentId: data.hiringAgentId
  };

  taskQueue.set(task.id, task);

  console.log(`➕ [createTask] Finished creation of task: "${task.title}" with ID: ${task.id}`);
  return task;
}

export function getTask(id: string): Task | undefined {
  console.log(`🔍 [getTask] Starting lookup for ID: ${id}`);
  const task = taskQueue.get(id);
  console.log(`🔍 [getTask] Finished lookup for ID: ${id} (found: ${!!task})`);
  return task;
}

export function updateTask(id: string, updates: Partial<Task>): void {
  console.log(`🔄 [updateTask] Starting update for ID: ${id}`);
  const task = taskQueue.get(id);
  if (task) {
    Object.assign(task, updates);
    console.log(`🔄 [updateTask] Finished update for ID: ${id}. New status: ${task.status}`);
  } else {
    console.log(`⚠️ [updateTask] Finished update: Task with ID: ${id} not found.`);
  }
}

export function getTasksByStatus(status: TaskStatus): Task[] {
  console.log(`🔀 [getTasksByStatus] Starting lookup for status: ${status}`);
  const matched: Task[] = [];
  for (const task of taskQueue.values()) {
    if (task.status === status) {
      matched.push(task);
    }
  }
  console.log(`🔀 [getTasksByStatus] Finished lookup: found ${matched.length} tasks for status: ${status}`);
  return matched;
}

export function getAllTasks(): Task[] {
  console.log("📋 [getAllTasks] Starting retrieval of all tasks...");
  const tasks = Array.from(taskQueue.values());
  console.log(`📋 [getAllTasks] Finished retrieval: returned ${tasks.length} tasks.`);
  return tasks;
}

export function getRecentTasks(limit: number): Task[] {
  console.log(`⏱️ [getRecentTasks] Starting retrieval with limit: ${limit}`);
  const sorted = Array.from(taskQueue.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
  const sliced = sorted.slice(0, limit);
  console.log(`⏱️ [getRecentTasks] Finished retrieval: returned ${sliced.length} tasks.`);
  return sliced;
}
