import { createBrowserClient } from "@supabase/ssr";

import { applyRemember, REMEMBER_COOKIE } from "@/lib/supabase/remember";

function readCookies() {
  return document.cookie.split("; ").filter(Boolean).map((cookie) => {
    const index = cookie.indexOf("=");
    return { name: decodeURIComponent(cookie.slice(0, index)), value: decodeURIComponent(cookie.slice(index + 1)) };
  });
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: readCookies,
        setAll(cookiesToSet) {
          const remember = readCookies().find((cookie) => cookie.name === REMEMBER_COOKIE)?.value;
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = applyRemember(options, remember) ?? {};
            let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${opts.path ?? "/"}; samesite=${typeof opts.sameSite === "string" ? opts.sameSite : "lax"}`;
            if (opts.maxAge !== undefined) cookie += `; max-age=${opts.maxAge}`;
            if (opts.domain) cookie += `; domain=${opts.domain}`;
            if (opts.secure) cookie += "; secure";
            document.cookie = cookie;
          });
        },
      },
    },
  );
}
