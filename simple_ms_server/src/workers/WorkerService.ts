import os from "os";
import * as mediasoup from "mediasoup";
import { WorkerSettings } from "mediasoup/types";
import { EventEmitter } from "stream";

export class WorkerService extends EventEmitter {
  private workers: mediasoup.types.Worker[] = [];
  private currentWorkerIndex = 0;
  private workersConfig: WorkerSettings;

  constructor(config: WorkerSettings) {
    super();
    this.workersConfig = config;
  }

  async createWorkers(): Promise<mediasoup.types.Worker[]> {
    const totalThreads = os.cpus().length;
    console.log(`Creating ${totalThreads} mediasoup workers...`);

    for (let i = 0; i < totalThreads; i++) {
      const worker = await mediasoup.createWorker(this.workersConfig);

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

  async getWorker(): Promise<mediasoup.types.Worker> {
    const workersLoad = await Promise.all(
      this.workers.map(async (worker) => {
        const stats = await worker.getResourceUsage();
        const cpuUsage = stats.ru_utime + stats.ru_stime; // Example calculation
        return cpuUsage;
      })
    );

    let leastLoadedWorkerIndex = 0;
    let leastWorkerLoad = workersLoad[0];

    for (let i = 1; i < workersLoad.length; i++) {
      if (workersLoad[i] < leastWorkerLoad) {
        leastLoadedWorkerIndex = i;
        leastWorkerLoad = workersLoad[i];
      }
    }

    this.currentWorkerIndex = leastLoadedWorkerIndex;
    return this.workers[leastLoadedWorkerIndex];
  }

  getWorkers(): mediasoup.types.Worker[] {
    return this.workers;
  }
}

export default WorkerService;
