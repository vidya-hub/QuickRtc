import { Worker as MediasoupWorker } from "mediasoup/types";
import * as mediasoup from "mediasoup";
import EventEmitter from "events";
import { MediasoupConfig } from "../types";
import { cpus } from "os";

export class WorkerService extends EventEmitter {
  private workers: MediasoupWorker[] = [];
  private currentWorkerIndex = 0;
  public mediasoupConfig: MediasoupConfig;

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
    const selectedWorker = this.workers[this.currentWorkerIndex];
    const router = await selectedWorker.createRouter(
      this.mediasoupConfig.routerConfig
    );
    return { worker: selectedWorker, router: router };
  }

  getWorkers(): MediasoupWorker[] {
    return this.workers;
  }
}

export default WorkerService;
