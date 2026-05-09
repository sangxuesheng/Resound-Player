export {};

declare global {
  interface Window {
    appEnv?: {
      apiBaseUrl: string;
      apiPort: number;
      unblockProxyUrl: string;
      unblockMatchUrl: string;
      isDesktop: boolean;
      platform: string;
      electronVersion: string;
      nodeVersion: string;
    };
  }
}
