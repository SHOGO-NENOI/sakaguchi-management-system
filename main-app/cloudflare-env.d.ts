export {};

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      BUCKET: R2Bucket;
      GOOGLE_OAUTH_ENCRYPTION_KEY?: string;
    }
  }

  interface Body {
    // Existing API callers validate the fields they consume at their boundaries.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json<T = any>(): Promise<T>;
  }
}
