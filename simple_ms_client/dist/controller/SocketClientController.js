export class SocketClientController extends EventTarget {
    constructor(socket, joinParams) {
        super();
        this.socket = socket;
        this.joinParams = joinParams;
    }
    async joinConference() {
        const response = await this.socket.emitWithAck("joinConference", {
            ...this.joinParams,
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return undefined;
        }
        return response.routerCapabilities;
    }
    async createTransports() {
        const createSendTransportResponse = await this.socket.emitWithAck("createTransport", {
            conferenceId: this.joinParams.conferenceId,
            direction: "producer",
            participantId: this.joinParams.participantId,
            options: this.joinParams.webRtcTransportOptions,
        });
        if (createSendTransportResponse.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: createSendTransportResponse.data }));
            return;
        }
        const createRecvTransportResponse = await this.socket.emitWithAck("createTransport", {
            conferenceId: this.joinParams.conferenceId,
            direction: "consumer",
            participantId: this.joinParams.participantId,
            options: this.joinParams.webRtcTransportOptions,
        });
        if (createRecvTransportResponse.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: createRecvTransportResponse.data }));
            return;
        }
        return {
            sendTransport: createSendTransportResponse.data,
            recvTransport: createRecvTransportResponse.data,
        };
    }
    addSendTransportListener({ sendTransport, onProduce, }) {
        sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            try {
                const response = await this.socket.emitWithAck("connectTransport", {
                    conferenceId: this.joinParams.conferenceId,
                    participantId: this.joinParams.participantId,
                    transportId: sendTransport.id,
                    direction: "producer",
                    dtlsParameters,
                });
                if (response.status === "ok") {
                    callback();
                }
                else {
                    errback(new Error("Failed to connect transport"));
                }
            }
            catch (error) {
                console.log("Failed to connect to transport");
                errback(new Error("Failed to connect transport"));
            }
        });
        sendTransport.on("produce", async (params, callback, errback) => {
            try {
                const response = await this.socket.emitWithAck("produce", {
                    conferenceId: this.joinParams.conferenceId,
                    participantId: this.joinParams.participantId,
                    transportId: sendTransport.id,
                    kind: params.kind,
                    rtpParameters: params.rtpParameters,
                    appData: params.appData,
                });
                if (response.status === "ok") {
                    callback({ id: response.data.producerId });
                    onProduce({
                        kind: params.kind,
                        rtpParameters: params.rtpParameters,
                        appData: params.appData,
                        producerId: response.data.producerId,
                    });
                }
                else {
                    errback(new Error("Failed to produce"));
                }
            }
            catch (error) {
                errback(new Error("Failed to produce"));
            }
        });
    }
    async addConsumeTransportListener({ recvTransport, onConsume, }) {
        recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            try {
                const response = await this.socket.emitWithAck("connectTransport", {
                    conferenceId: this.joinParams.conferenceId,
                    participantId: this.joinParams.participantId,
                    transportId: recvTransport.id,
                    direction: "consumer",
                    dtlsParameters,
                });
                if (response.status === "ok") {
                    callback();
                }
                else {
                    errback(new Error("Failed to connect transport"));
                }
            }
            catch (error) {
                console.log("Failed to connect to transport");
                errback(new Error("Failed to connect transport"));
            }
        });
        recvTransport.on("consume", async (params, callback, errback) => {
            try {
                const response = await this.socket.emitWithAck("consume", {
                    conferenceId: this.joinParams.conferenceId,
                    participantId: this.joinParams.participantId,
                    transportId: recvTransport.id,
                    producerId: params.consumeOptions.producerId,
                    rtpCapabilities: params.consumeOptions.rtpCapabilities,
                });
                if (response.status === "ok") {
                    const { id, kind, rtpParameters, appData } = response.data;
                    callback({ id, kind, rtpParameters, appData });
                    onConsume({
                        producerId: params.consumeOptions.producerId,
                        id,
                        kind,
                        rtpParameters,
                        appData,
                    });
                }
                else {
                    errback(new Error("Failed to consume"));
                }
            }
            catch (error) {
                errback(new Error("Failed to consume"));
            }
        });
    }
    async consumeMedia(producerId, rtpCapabilities) {
        const response = await this.socket.emitWithAck("consume", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            producerId,
            rtpCapabilities,
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return undefined;
        }
        return response.data;
    }
    async getProducers() {
        const response = await this.socket.emitWithAck("getProducers", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return undefined;
        }
        return response.data.producerIds;
    }
    async resumeProducer(producerId) {
        const response = await this.socket.emitWithAck("resumeProducer", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            producerId: producerId,
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return;
    }
    async pauseProducer(producerId) {
        const response = await this.socket.emitWithAck("pauseProducer", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            extraData: { producerId }
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return;
    }
    async pauseConsumer(consumerId) {
        const response = await this.socket.emitWithAck("pauseConsumer", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            extraData: { consumerId }
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return;
    }
    async resumeConsumer(consumerId) {
        const response = await this.socket.emitWithAck("resumeConsumer", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            extraData: { consumerId }
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return;
    }
    async closeProducer(producerId) {
        const response = await this.socket.emitWithAck("closeProducer", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            extraData: { producerId }
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return;
    }
    async closeConsumer(consumerId) {
        const response = await this.socket.emitWithAck("closeConsumer", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId,
            extraData: { consumerId }
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return;
    }
    async muteAudio() {
        const response = await this.socket.emitWithAck("muteAudio", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return response.data;
    }
    async unmuteAudio() {
        const response = await this.socket.emitWithAck("unmuteAudio", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return response.data;
    }
    async muteVideo() {
        const response = await this.socket.emitWithAck("muteVideo", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return response.data;
    }
    async unmuteVideo() {
        const response = await this.socket.emitWithAck("unmuteVideo", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return response.data;
    }
    async getMediaStates() {
        const response = await this.socket.emitWithAck("getMediaStates", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return response.data;
    }
    async leaveConference() {
        const response = await this.socket.emitWithAck("leaveConference", {
            conferenceId: this.joinParams.conferenceId,
            participantId: this.joinParams.participantId
        });
        if (response.status == "error") {
            this.dispatchEvent(new CustomEvent("error", { detail: response.data }));
            return;
        }
        return;
    }
    // Setup socket event listeners for real-time events
    setupEventListeners() {
        this.socket.on('participantLeft', (data) => {
            this.dispatchEvent(new CustomEvent('participantLeft', { detail: data }));
        });
        this.socket.on('producerClosed', (data) => {
            this.dispatchEvent(new CustomEvent('producerClosed', { detail: data }));
        });
        this.socket.on('consumerClosed', (data) => {
            this.dispatchEvent(new CustomEvent('consumerClosed', { detail: data }));
        });
        this.socket.on('audioMuted', (data) => {
            this.dispatchEvent(new CustomEvent('audioMuted', { detail: data }));
        });
        this.socket.on('audioUnmuted', (data) => {
            this.dispatchEvent(new CustomEvent('audioUnmuted', { detail: data }));
        });
        this.socket.on('videoMuted', (data) => {
            this.dispatchEvent(new CustomEvent('videoMuted', { detail: data }));
        });
        this.socket.on('videoUnmuted', (data) => {
            this.dispatchEvent(new CustomEvent('videoUnmuted', { detail: data }));
        });
        this.socket.on('newProducer', (data) => {
            this.dispatchEvent(new CustomEvent('newProducer', { detail: data }));
        });
    }
}
