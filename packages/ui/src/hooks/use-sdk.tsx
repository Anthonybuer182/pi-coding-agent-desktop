import { createContext, useContext } from 'react';
import type { PiSDKClient } from '@pi/sdk-wrapper';

const SDKContext = createContext<PiSDKClient | null>(null);

export const SDKProvider = SDKContext.Provider;

export function useSDK(): PiSDKClient {
  const sdk = useContext(SDKContext);
  if (!sdk) {
    throw new Error('useSDK must be used within an SDKProvider');
  }
  return sdk;
}
