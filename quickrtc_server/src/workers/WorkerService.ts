import { Worker as MediasoupWorker } from "mediasoup/types";
import * as mediasoup from "mediasoup";
import EventEmitter from "events";
import { MediasoupConfig } from "quickrtc-types";
import { cpus } from "os";

export class WorkerService extends EventEmitter {
  private workers: MediasoupWorker[] = [];
  private currentWorkerIndex = 0;
  public mediasoupConfig: MediasoupConfig;
  private routersPerWorker: Map<MediasoupWorker, mediasoup.types.Router[]> =
    new Map();
  private maxRoutersPerWorker: number = 5;
  private workerStats: Map<
    MediasoupWorker,
    {
      routerCount: number;
      lastUsed: number;
      cpuUsage: number;
    }
  > = new Map();

  constructor(mediasoupConfig: MediasoupConfig) {
    super();
    this.mediasoupConfig = mediasoupConfig;
  }

  async createWorkers(): Promise<MediasoupWorker[]> {
    const totalThreads = cpus().length;
    console.log(`Creating ${totalThreads} mediasoup workers...`);

    for (let i = 0; i < totalThreads; i++) {
      const worker: MediasoupWorker = await mediasoup.createWorker(
        this.mediasoupConfig.workerConfig
      );
      worker.on("died", () => {
        this.emit("workerDied", worker);
      });

      this.workers.push(worker);
    }

    console.log(
      `Successfully created ${this.workers.length} mediasoup workers`
    );
    return this.workers;
  }

  async getWorker(): Promise<{
    worker: MediasoupWorker;
    router: mediasoup.types.Router;
  }> {
    // Update worker statistics
    await this.updateWorkerStats();

    // Find the best worker based on multiple criteria
    const selectedWorker = this.selectOptimalWorker();

    // Check if we can reuse an existing router or need to create a new one
    const router = await this.getOrCreateRouter(selectedWorker);

    return { worker: selectedWorker, router };
  }

  private async updateWorkerStats(): Promise<void> {
    const updatePromises = this.workers.map(async (worker) => {
      try {
        const stats = await worker.getResourceUsage();
        const cpuUsage = stats.ru_utime + stats.ru_stime;
        const routerCount = this.routersPerWorker.get(worker)?.length || 0;

        this.workerStats.set(worker, {
          routerCount,
          lastUsed: this.workerStats.get(worker)?.lastUsed || Date.now(),
          cpuUsage,
        });
      } catch (error) {
        console.error("Error updating worker stats:", error);
      }
    });

    await Promise.all(updatePromises);
  }

  private selectOptimalWorker(): MediasoupWorker {
    let bestWorker = this.workers[0];
    let bestScore = Infinity;

    for (const worker of this.workers) {
      const stats = this.workerStats.get(worker);
      if (!stats) continue;

      // Calculate a composite score based on router count and CPU usage
      const routerWeight = 0.6;
      const cpuWeight = 0.4;

      const normalizedRouterCount =
        stats.routerCount / this.maxRoutersPerWorker;
      const normalizedCpuUsage = Math.min(stats.cpuUsage / 100, 1); // Normalize to 0-1

      const score =
        normalizedRouterCount * routerWeight + normalizedCpuUsage * cpuWeight;

      if (score < bestScore) {
        bestScore = score;
        bestWorker = worker;
      }
    }

    // Update last used time
    const stats = this.workerStats.get(bestWorker);
    if (stats) {
      stats.lastUsed = Date.now();
    }

    return bestWorker;
  }

  private async getOrCreateRouter(
    worker: MediasoupWorker
  ): Promise<mediasoup.types.Router> {
    const existingRouters = this.routersPerWorker.get(worker) || [];

    // Check if we have available capacity on existing routers
    for (const router of existingRouters) {
      if (!router.closed) {
        // You can add more sophisticated logic here to check router capacity
        // For now, we'll create a new router for each conference for isolation
        break;
      }
    }

    // Create a new router
    const router = await worker.createRouter(this.mediasoupConfig.routerConfig);

    // Add event listeners for cleanup
    router.on("@close", () => {
      this.removeRouterFromWorker(worker, router);
    });

    // Track the router
    if (!this.routersPerWorker.has(worker)) {
      this.routersPerWorker.set(worker, []);
    }
    this.routersPerWorker.get(worker)!.push(router);

    return router;
  }

  private removeRouterFromWorker(
    worker: MediasoupWorker,
    router: mediasoup.types.Router
  ): void {
    const routers = this.routersPerWorker.get(worker);
    if (routers) {
      const index = routers.indexOf(router);
      if (index > -1) {
        routers.splice(index, 1);
      }
    }
  }

  public getWorkerStats(): Array<{
    workerId: string;
    routerCount: number;
    cpuUsage: number;
    lastUsed: number;
  }> {
    return this.workers.map((worker) => {
      const stats = this.workerStats.get(worker);
      return {
        workerId: worker.pid?.toString() || "unknown",
        routerCount: stats?.routerCount || 0,
        cpuUsage: stats?.cpuUsage || 0,
        lastUsed: stats?.lastUsed || 0,
      };
    });
  }

  public async cleanupClosedRouters(): Promise<void> {
    for (const [worker, routers] of this.routersPerWorker.entries()) {
      const activeRouters = routers.filter((router) => !router.closed);
      this.routersPerWorker.set(worker, activeRouters);
    }
  }

  getWorkers(): MediasoupWorker[] {
    return this.workers;
  }
}

export default WorkerService;
