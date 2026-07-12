import { Router, Request, Response } from "express";
import { 
  startEconomy, 
  stopEconomy, 
  getEconomyStats, 
  isEconomyRunning 
} from "../economy/economyLoop.js";
import { getAllAgents } from "../economy/agentRegistry.js";
import { getRecentTasks, getTask } from "../economy/taskQueue.js";

console.log("🛣️ [economyRoutes] Module loading started...");

export function createEconomyRouter(io: any): Router {
  console.log("🛣️ [createEconomyRouter] Factory initialization started...");
  const router = Router();

  // POST /start
  router.post("/start", (_req: Request, res: Response) => {
    console.log("📡 [POST /start] Endpoint handler started...");
    
    if (isEconomyRunning()) {
      console.warn("⚠️ [POST /start] Rejecting: economy already running.");
      console.log("📡 [POST /start] Endpoint handler finished.");
      res.status(400).json({ error: "Economy already running" });
      return;
    }

    startEconomy(io);
    
    console.log("📡 [POST /start] Endpoint handler finished successfully.");
    res.status(200).json({
      success: true,
      message: "Economy started",
      stats: getEconomyStats()
    });
  });

  // POST /stop
  router.post("/stop", (_req: Request, res: Response) => {
    console.log("📡 [POST /stop] Endpoint handler started...");
    
    stopEconomy();
    
    console.log("📡 [POST /stop] Endpoint handler finished successfully.");
    res.status(200).json({
      success: true,
      message: "Economy stopped"
    });
  });

  // GET /agents
  router.get("/agents", (_req: Request, res: Response) => {
    console.log("📡 [GET /agents] Endpoint handler started...");
    
    const sortedAgents = getAllAgents().sort((a, b) => b.totalEarned - a.totalEarned);
    
    console.log(`📡 [GET /agents] Endpoint handler finished: returned ${sortedAgents.length} agents.`);
    res.status(200).json(sortedAgents);
  });

  // GET /tasks
  router.get("/tasks", (_req: Request, res: Response) => {
    console.log("📡 [GET /tasks] Endpoint handler started...");
    
    const recentTasks = getRecentTasks(50);
    
    console.log(`📡 [GET /tasks] Endpoint handler finished: returned ${recentTasks.length} tasks.`);
    res.status(200).json(recentTasks);
  });

  // GET /history
  router.get("/history", async (_req: Request, res: Response) => {
    console.log("📡 [GET /history] Endpoint handler started...");
    
    // Import taskRepository dynamically to avoid circular deps if any
    const { getAllTasks } = await import("../firebase/taskRepository.js");
    const history = await getAllTasks();
    
    console.log(`📡 [GET /history] Endpoint handler finished: returned ${history.length} tasks.`);
    res.status(200).json(history);
  });

  // GET /stats
  router.get("/stats", (_req: Request, res: Response) => {
    console.log("📡 [GET /stats] Endpoint handler started...");
    
    const stats = getEconomyStats();
    
    console.log("📡 [GET /stats] Endpoint handler finished successfully.");
    res.status(200).json(stats);
  });

  // GET /tasks/:id
  router.get("/tasks/:id", (req: Request, res: Response) => {
    const id = req.params.id as string;
    console.log(`📡 [GET /tasks/:id] Endpoint handler started for ID: ${id}...`);
    
    const task = getTask(id);
    if (!task) {
      console.warn(`⚠️ [GET /tasks/:id] Task not found for ID: ${id}`);
      console.log("📡 [GET /tasks/:id] Endpoint handler finished (404).");
      res.status(404).json({ error: "Task not found" });
      return;
    }

    console.log(`📡 [GET /tasks/:id] Endpoint handler finished (200) for ID: ${id}`);
    res.status(200).json(task);
  });

  console.log("🛣️ [createEconomyRouter] Factory initialization finished.");
  return router;
}
