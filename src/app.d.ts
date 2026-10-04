import type { KVNamespace } from "@cloudflare/workers-types";

declare global {
  namespace App {
    // Bindings available in server routes through `platform.env`. Declared here
    // rather than through a global `types` entry so Workers types do not leak
    // into client code.
    interface Platform {
      env: {
        FLEXYDAY_KV: KVNamespace;
      };
    }
  }
}

export {};
