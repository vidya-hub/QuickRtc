import { Worker as MediasoupWorker } from "mediasoup/types";
import * as mediasoup from "mediasoup";
import EventEmitter from "events";
import { MediasoupConfig } from "@simple-mediasoup/types";
export declare class WorkerService extends EventEmitter {
    private workers;
    private currentWorkerIndex;
    mediasoupConfig: MediasoupConfig;
    private routersPerWorker;
    private maxRoutersPerWorker;
    private workerStats;
    constructor(mediasoupConfig: MediasoupConfig);
    createWorkers(): Promise<MediasoupWorker[]>;
    getWorker(): Promise<{
        worker: MediasoupWorker;
        router: mediasoup.types.Router;
    }>;
    private updateWorkerStats;
    private selectOptimalWorker;
    private getOrCreateRouter;
    private removeRouterFromWorker;
    getWorkerStats(): Array<{
        workerId: string;
        routerCount: number;
        cpuUsage: number;
        lastUsed: number;
    }>;
    cleanupClosedRouters(): Promise<void>;
    getWorkers(): MediasoupWorker[];
}
export default WorkerService;
//# sourceMappingURL=WorkerService.d.ts.map