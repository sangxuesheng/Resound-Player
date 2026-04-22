export {};

declare global {
  interface Window {
    appEnv: {
      apiBaseUrl: string;
      apiPort: number;
    };
  }
}
