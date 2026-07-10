import { AsyncLocalStorage } from "node:async_hooks";

export interface ManagedUserContext {
  userId: string;
  email: string;
  displayName: string;
  apiKey: string;
}

const authContext = new AsyncLocalStorage<ManagedUserContext>();

export function runWithManagedUser<T>(user: ManagedUserContext, callback: () => T): T {
  return authContext.run(user, callback);
}

export function getManagedUser(): ManagedUserContext | undefined {
  return authContext.getStore();
}

export function requireManagedUser(): ManagedUserContext {
  const user = getManagedUser();
  if (!user) {
    throw new Error("Managed user context is required.");
  }
  return user;
}
