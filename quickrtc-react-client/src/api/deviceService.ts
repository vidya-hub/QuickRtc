import { Device } from "mediasoup-client";
import type { RtpCapabilities } from "mediasoup-client/lib/types";

/**
 * Service for managing MediaSoup Device
 * Handles device initialization and capability management
 */
export class DeviceService {
  private device: Device | null = null;

  /**
   * Initialize device with router RTP capabilities
   */
  public async loadDevice(
    routerRtpCapabilities: RtpCapabilities
  ): Promise<Device> {
    if (this.device) {
      return this.device;
    }

    this.device = new Device();
    await this.device.load({ routerRtpCapabilities });

    return this.device;
  }

  /**
   * Get current device instance
   */
  public getDevice(): Device | null {
    return this.device;
  }

  /**
   * Get device RTP capabilities
   */
  public getRtpCapabilities(): RtpCapabilities | undefined {
    return this.device?.rtpCapabilities;
  }

  /**
   * Check if device is loaded
   */
  public isLoaded(): boolean {
    return this.device !== null && this.device.loaded;
  }

  /**
   * Reset device (for cleanup)
   */
  public reset(): void {
    this.device = null;
  }
}

// Export singleton instance
export const deviceService = new DeviceService();
