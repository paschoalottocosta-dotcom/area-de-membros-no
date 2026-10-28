// "Manter conectado": quando o aluno NÃO marca a opção, os cookies de login
// viram cookies de sessão e somem quando o navegador é fechado.
export const REMEMBER_COOKIE = "po-remember";

interface CookieOptions { maxAge?: number; expires?: Date; [key: string]: unknown; }

export function applyRemember<T extends CookieOptions>(options: T | undefined, remember: string | undefined): T | undefined {
  if (remember !== "0" || !options || options.maxAge === 0) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest as T;
}
