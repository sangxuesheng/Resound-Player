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
      cacheApi?: {
        getItem: () => Promise<string | null>;
        setItem: (data: string) => Promise<boolean>;
        clear: () => Promise<boolean>;
      };
    };
  }
}
