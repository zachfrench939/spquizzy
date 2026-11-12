/**
 * Storage adapter with the same getItem / setItem / removeItem shape supabase-js
 * expects on `createClient(url, key, { auth: { storage, storageKey } })`.
 *
 * `dd_remember` lives in localStorage. "0" sends the session to sessionStorage.
 * Any other value, including a missing flag, keeps today's localStorage session.
 * Writing a session clears that key in the other store. Removing it clears both.
 */

export const REMEMBER_KEY = "dd_remember";
export const SESSION_KEY = "spquizzy.drop.session";

export function readRemember(localArea = globalThis.localStorage) {
  try {
    return localArea.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

export function clearLocalAuth(localArea = globalThis.localStorage, sessionArea = globalThis.sessionStorage) {
  try { localArea.removeItem(SESSION_KEY); } catch { /* private mode */ }
  try { sessionArea.removeItem(SESSION_KEY); } catch { /* private mode */ }
  try { localArea.removeItem(REMEMBER_KEY); } catch { /* private mode */ }
}

export function chooseRemember(remember, localArea = globalThis.localStorage, sessionArea = globalThis.sessionStorage) {
  try {
    localArea.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {
    /* private mode */
  }
  const spare = remember ? sessionArea : localArea;
  try {
    spare.removeItem(SESSION_KEY);
  } catch {
    /* the spare store can be blocked */
  }
}

export function createAuthStorage({
  localArea,
  sessionArea,
  rememberKey = REMEMBER_KEY,
} = {}) {
  const local = () => localArea || globalThis.localStorage;
  const session = () => sessionArea || globalThis.sessionStorage;
  const rememberOn = () => {
    try {
      return local().getItem(rememberKey) !== "0";
    } catch {
      return true;
    }
  };
  return {
    getItem(key) {
      try {
        return (rememberOn() ? local() : session()).getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      const primary = rememberOn() ? local() : session();
      const spare = rememberOn() ? session() : local();
      try {
        spare.removeItem(key);
      } catch {
        /* the spare store can be blocked */
      }
      primary.setItem(key, value);
    },
    removeItem(key) {
      try {
        local().removeItem(key);
      } catch {
        /* private mode */
      }
      try {
        session().removeItem(key);
      } catch {
        /* private mode */
      }
    },
  };
}

export const authStorage = createAuthStorage();
