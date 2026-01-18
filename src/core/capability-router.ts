import type { AIConnection, GenerationProfile } from '@/types';

type CapabilityType = 'text' | 'image';

/**
 * 能力路由器：根据能力与配置选择合适的连接
 */
export class CapabilityRouter {
  private connections: AIConnection[];
  private profile: GenerationProfile;

  constructor(connections: AIConnection[], profile?: GenerationProfile) {
    this.connections = connections ?? [];
    this.profile = profile ?? { mode: 'auto' };
  }

  getTextConnection(): AIConnection | null {
    return this.resolveConnection('text');
  }

  getImageConnection(): AIConnection | null {
    return this.resolveConnection('image');
  }

  private resolveConnection(capability: CapabilityType): AIConnection | null {
    const candidates = this.connections.filter((connection) => !connection.disabled);

    if (this.profile.mode === 'manual') {
      const manualId = this.getManualProviderId(capability);
      if (manualId) {
        const manualConnection = candidates.find((connection) => connection.id === manualId);
        if (manualConnection && this.supportsCapability(manualConnection, capability)) {
          return manualConnection;
        }
        return null;
      }
    }

    return candidates.find((connection) => this.supportsCapability(connection, capability)) || null;
  }

  private getManualProviderId(capability: CapabilityType): string | undefined {
    switch (capability) {
      case 'text':
        return this.profile.textProvider;
      case 'image':
        return this.profile.imageProvider;
      default:
        return undefined;
    }
  }

  private supportsCapability(connection: AIConnection, capability: CapabilityType): boolean {
    if (capability === 'text') {
      return Boolean(connection.capabilities?.text?.model || connection.model);
    }
    if (capability === 'image') {
      return Boolean(connection.capabilities?.image?.model || connection.imageModel);
    }
    return false;
  }
}
