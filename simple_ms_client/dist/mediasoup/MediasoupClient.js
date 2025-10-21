import { Device } from "mediasoup-client";
class MediasoupClient extends EventTarget {
    constructor(socketClient, config = {}) {
        super();
        this.socketClient = socketClient;
        this.config = {
            enableAudio: true,
            enableVideo: true,
            ...config
        };
        this.device = new Device();
        this.mediaState = {
            audioMuted: false,
            videoMuted: false,
            producers: new Map(),
            consumers: new Map()
        };
        this.remoteStreams = new Map();
        this.setupSocketEventListeners();
    }
    setupSocketEventListeners() {
        // Listen for participant events
        this.socketClient.addEventListener('participantLeft', (event) => {
            this.handleParticipantLeft(event.detail);
        });
        this.socketClient.addEventListener('producerClosed', (event) => {
            this.handleProducerClosed(event.detail);
        });
        this.socketClient.addEventListener('consumerClosed', (event) => {
            this.handleConsumerClosed(event.detail);
        });
        this.socketClient.addEventListener('audioMuted', (event) => {
            this.handleAudioMuted(event.detail);
        });
        this.socketClient.addEventListener('audioUnmuted', (event) => {
            this.handleAudioUnmuted(event.detail);
        });
        this.socketClient.addEventListener('videoMuted', (event) => {
            this.handleVideoMuted(event.detail);
        });
        this.socketClient.addEventListener('videoUnmuted', (event) => {
            this.handleVideoUnmuted(event.detail);
        });
    }
    async joinConference() {
        try {
            // Join conference and get router capabilities
            const routerCapabilities = await this.socketClient.joinConference();
            if (!routerCapabilities) {
                throw new Error('Failed to get router capabilities');
            }
            // Load device with router capabilities
            await this.device.load({ routerRtpCapabilities: routerCapabilities });
            // Create transports
            const transports = await this.socketClient.createTransports();
            if (!transports) {
                throw new Error('Failed to create transports');
            }
            // Create mediasoup transports
            this.sendTransport = this.device.createSendTransport(transports.sendTransport);
            this.recvTransport = this.device.createRecvTransport(transports.recvTransport);
            // Setup transport listeners
            this.socketClient.addSendTransportListener({
                sendTransport: this.sendTransport,
                onProduce: this.handleProducerCreated.bind(this)
            });
            this.socketClient.addConsumeTransportListener({
                recvTransport: this.recvTransport,
                onConsume: this.handleConsumerCreated.bind(this)
            });
            this.dispatchEvent(new CustomEvent('connected'));
        }
        catch (error) {
            console.error('Error joining conference:', error);
            this.dispatchEvent(new CustomEvent('error', { detail: error }));
            throw error;
        }
    }
    async enableMedia(audio = true, video = true) {
        try {
            if (!this.sendTransport) {
                throw new Error('Send transport not available');
            }
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: audio && this.config.enableAudio ? this.config.audioConstraints || true : false,
                video: video && this.config.enableVideo ? this.config.videoConstraints || true : false
            });
            this.localStream = stream;
            // Produce audio if enabled
            if (audio && stream.getAudioTracks().length > 0) {
                const audioTrack = stream.getAudioTracks()[0];
                const audioProducer = await this.sendTransport.produce({
                    track: audioTrack,
                    codecOptions: {
                        opusStereo: true,
                        opusDtx: true
                    }
                });
                this.mediaState.producers.set(audioProducer.id, audioProducer);
                this.mediaState.audioProducerId = audioProducer.id;
            }
            // Produce video if enabled
            if (video && stream.getVideoTracks().length > 0) {
                const videoTrack = stream.getVideoTracks()[0];
                const videoProducer = await this.sendTransport.produce({
                    track: videoTrack,
                    codecOptions: {
                        videoGoogleStartBitrate: 1000
                    }
                });
                this.mediaState.producers.set(videoProducer.id, videoProducer);
                this.mediaState.videoProducerId = videoProducer.id;
            }
            this.dispatchEvent(new CustomEvent('localStreamReady', {
                detail: { stream: this.localStream }
            }));
        }
        catch (error) {
            console.error('Error enabling media:', error);
            this.dispatchEvent(new CustomEvent('error', { detail: error }));
            throw error;
        }
    }
    async muteAudio() {
        if (this.mediaState.audioProducerId && !this.mediaState.audioMuted) {
            const producer = this.mediaState.producers.get(this.mediaState.audioProducerId);
            if (producer) {
                producer.pause();
                this.mediaState.audioMuted = true;
                this.dispatchEvent(new CustomEvent('audioMuted'));
            }
        }
    }
    async unmuteAudio() {
        if (this.mediaState.audioProducerId && this.mediaState.audioMuted) {
            const producer = this.mediaState.producers.get(this.mediaState.audioProducerId);
            if (producer) {
                producer.resume();
                this.mediaState.audioMuted = false;
                this.dispatchEvent(new CustomEvent('audioUnmuted'));
            }
        }
    }
    async muteVideo() {
        if (this.mediaState.videoProducerId && !this.mediaState.videoMuted) {
            const producer = this.mediaState.producers.get(this.mediaState.videoProducerId);
            if (producer) {
                producer.pause();
                this.mediaState.videoMuted = true;
                this.dispatchEvent(new CustomEvent('videoMuted'));
            }
        }
    }
    async unmuteVideo() {
        if (this.mediaState.videoProducerId && this.mediaState.videoMuted) {
            const producer = this.mediaState.producers.get(this.mediaState.videoProducerId);
            if (producer) {
                producer.resume();
                this.mediaState.videoMuted = false;
                this.dispatchEvent(new CustomEvent('videoUnmuted'));
            }
        }
    }
    async consumeMedia(producerId) {
        try {
            if (!this.recvTransport) {
                throw new Error('Receive transport not available');
            }
            // Get consumer parameters from server
            const consumerData = await this.socketClient.consumeMedia(producerId, this.device.rtpCapabilities);
            if (!consumerData) {
                throw new Error('Failed to get consumer data from server');
            }
            const consumer = await this.recvTransport.consume(consumerData);
            this.mediaState.consumers.set(consumer.id, consumer);
            // Resume consumer
            await consumer.resume();
            // Create media stream
            const stream = new MediaStream([consumer.track]);
            this.remoteStreams.set(consumer.id, stream);
            this.dispatchEvent(new CustomEvent('remoteStreamAdded', {
                detail: { consumerId: consumer.id, stream, producerId }
            }));
        }
        catch (error) {
            console.error('Error consuming media:', error);
            this.dispatchEvent(new CustomEvent('error', { detail: error }));
        }
    }
    getLocalStream() {
        return this.localStream;
    }
    getRemoteStreams() {
        return this.remoteStreams;
    }
    getMediaState() {
        return { ...this.mediaState };
    }
    isAudioMuted() {
        return this.mediaState.audioMuted;
    }
    isVideoMuted() {
        return this.mediaState.videoMuted;
    }
    handleProducerCreated(params) {
        this.dispatchEvent(new CustomEvent('producerCreated', { detail: params }));
    }
    handleConsumerCreated(params) {
        // Create media stream from consumer track
        const stream = new MediaStream([params.track]);
        this.remoteStreams.set(params.id, stream);
        this.dispatchEvent(new CustomEvent('remoteStreamAdded', {
            detail: {
                consumerId: params.id,
                stream,
                producerId: params.producerId,
                kind: params.kind
            }
        }));
    }
    handleParticipantLeft(data) {
        const { participantId, closedConsumerIds } = data;
        // Remove remote streams for closed consumers
        closedConsumerIds?.forEach((consumerId) => {
            this.remoteStreams.delete(consumerId);
            this.mediaState.consumers.delete(consumerId);
        });
        this.dispatchEvent(new CustomEvent('participantLeft', { detail: data }));
    }
    handleProducerClosed(data) {
        const { producerId } = data;
        this.mediaState.producers.delete(producerId);
        this.dispatchEvent(new CustomEvent('producerClosed', { detail: data }));
    }
    handleConsumerClosed(data) {
        const { consumerId } = data;
        this.remoteStreams.delete(consumerId);
        this.mediaState.consumers.delete(consumerId);
        this.dispatchEvent(new CustomEvent('consumerClosed', { detail: data }));
    }
    handleAudioMuted(data) {
        this.dispatchEvent(new CustomEvent('remoteAudioMuted', { detail: data }));
    }
    handleAudioUnmuted(data) {
        this.dispatchEvent(new CustomEvent('remoteAudioUnmuted', { detail: data }));
    }
    handleVideoMuted(data) {
        this.dispatchEvent(new CustomEvent('remoteVideoMuted', { detail: data }));
    }
    handleVideoUnmuted(data) {
        this.dispatchEvent(new CustomEvent('remoteVideoUnmuted', { detail: data }));
    }
    async leaveConference() {
        try {
            // Close all producers
            for (const producer of this.mediaState.producers.values()) {
                producer.close();
            }
            // Close all consumers
            for (const consumer of this.mediaState.consumers.values()) {
                consumer.close();
            }
            // Close transports
            this.sendTransport?.close();
            this.recvTransport?.close();
            // Stop local media
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            // Clear state
            this.mediaState.producers.clear();
            this.mediaState.consumers.clear();
            this.remoteStreams.clear();
            this.localStream = undefined;
            this.sendTransport = undefined;
            this.recvTransport = undefined;
            this.dispatchEvent(new CustomEvent('disconnected'));
        }
        catch (error) {
            console.error('Error leaving conference:', error);
            this.dispatchEvent(new CustomEvent('error', { detail: error }));
        }
    }
}
export default MediasoupClient;
