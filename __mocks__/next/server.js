/**
 * Jest stub for next/server.
 *
 * Implements the subset of the Next.js NextResponse API used by the test suite:
 *   - NextResponse.json(body, init?)
 *   - NextResponse.redirect(url, init?)
 *   - response.cookies.set(name, value, options?) — writes Set-Cookie header
 *   - response.headers  — mutable Headers object
 *   - response.status   — HTTP status code
 *   - response.json()   — reads the body as parsed JSON
 *
 * The standard `Response` class has immutable headers after construction, so we
 * extend it with a tracked cookie API that keeps a mutable internal Headers copy.
 */

class NextResponse {
  constructor(body, init = {}) {
    this._bodyText = body ?? "";
    this._status   = (init && init.status) || 200;
    // Build a mutable Headers from whatever was passed in
    this._headers  = new Headers(init && init.headers ? init.headers : {});
    this._cookieStrings = [];
  }

  // ─── Standard Response-like accessors ────────────────────────────────────────

  get status()  { return this._status; }
  get headers() { return this._headers; }

  async json()  { return JSON.parse(this._bodyText); }
  async text()  { return this._bodyText; }

  // ─── Cookie API (subset used by setSessionCookie in auth.ts) ─────────────────

  get cookies() {
    const self = this;
    return {
      set(name, value, options = {}) {
        // Build a Set-Cookie string. Do NOT URL-encode name/value —
        // Next.js writes raw values (the session token is already base64).
        let cookie = `${name}=${value}`;
        if (options.httpOnly)              cookie += "; HttpOnly";
        if (options.secure)               cookie += "; Secure";
        if (options.sameSite)             cookie += `; SameSite=${options.sameSite}`;
        if (options.maxAge  !== undefined) cookie += `; Max-Age=${options.maxAge}`;
        if (options.path    !== undefined) cookie += `; Path=${options.path}`;
        // Append to the mutable Headers so tests can read it
        self._headers.append("set-cookie", cookie);
      },
      get(name) {
        // Minimal get() — not needed by tests but prevents runtime errors
        return undefined;
      },
      delete(name) {},
    };
  }

  // ─── Static factory helpers ───────────────────────────────────────────────────

  static json(body, init = {}) {
    const text = JSON.stringify(body);
    const res  = new NextResponse(text, {
      ...init,
      headers: Object.assign({ "content-type": "application/json" }, (init && init.headers) || {}),
    });
    return res;
  }

  static redirect(url, init = {}) {
    const res = new NextResponse(null, { status: 302, ...init });
    res._headers.set("location", String(url));
    return res;
  }
}

class NextRequest extends Request {
  constructor(url, init) {
    super(url, init);
  }
}

module.exports = { NextResponse, NextRequest };
