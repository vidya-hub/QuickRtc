"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerService = void 0;
const mediasoup = __importStar(require("mediasoup"));
const events_1 = __importDefault(require("events"));
const os_1 = require("os");
class WorkerService extends events_1.default {
    constructor(mediasoupConfig) {
        super();
        this.workers = [];
        this.currentWorkerIndex = 0;
        this.routersPerWorker = new Map();
        this.maxRoutersPerWorker = 5;
        this.workerStats = new Map();
        this.mediasoupConfig = mediasoupConfig;
    }
    async createWorkers() {
        const totalThreads = (0, os_1.cpus)().length;
        console.log(`Creating ${totalThreads} mediasoup workers...`);
        for (let i = 0; i < totalThreads; i++) {
            const worker = await mediasoup.createWorker(this.mediasoupConfig.workerConfig);
            worker.on("died", () => {
                this.emit("workerDied", worker);
            });
            this.workers.push(worker);
        }
        console.log(`Successfully created ${this.workers.length} mediasoup workers`);
        return this.workers;
    }
    async getWorker() {
        // Update worker statistics
        await this.updateWorkerStats();
        // Find the best worker based on multiple criteria
        const selectedWorker = this.selectOptimalWorker();
        // Check if we can reuse an existing router or need to create a new one
        const router = await this.getOrCreateRouter(selectedWorker);
        return { worker: selectedWorker, router };
    }
    async updateWorkerStats() {
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
            }
            catch (error) {
                console.error("Error updating worker stats:", error);
            }
        });
        await Promise.all(updatePromises);
    }
    selectOptimalWorker() {
        let bestWorker = this.workers[0];
        let bestScore = Infinity;
        for (const worker of this.workers) {
            const stats = this.workerStats.get(worker);
            if (!stats)
                continue;
            // Calculate a composite score based on router count and CPU usage
            const routerWeight = 0.6;
            const cpuWeight = 0.4;
            const normalizedRouterCount = stats.routerCount / this.maxRoutersPerWorker;
            const normalizedCpuUsage = Math.min(stats.cpuUsage / 100, 1); // Normalize to 0-1
            const score = normalizedRouterCount * routerWeight + normalizedCpuUsage * cpuWeight;
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
    async getOrCreateRouter(worker) {
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
        this.routersPerWorker.get(worker).push(router);
        return router;
    }
    removeRouterFromWorker(worker, router) {
        const routers = this.routersPerWorker.get(worker);
        if (routers) {
            const index = routers.indexOf(router);
            if (index > -1) {
                routers.splice(index, 1);
            }
        }
    }
    getWorkerStats() {
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
    async cleanupClosedRouters() {
        for (const [worker, routers] of this.routersPerWorker.entries()) {
            const activeRouters = routers.filter((router) => !router.closed);
            this.routersPerWorker.set(worker, activeRouters);
        }
    }
    getWorkers() {
        return this.workers;
    }
}
exports.WorkerService = WorkerService;
exports.default = WorkerService;
