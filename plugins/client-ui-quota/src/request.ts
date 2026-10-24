export interface BaseResponseBody {
  readonly error?: {
    readonly message?: string;
  };
}

export async function request<T>(url: string, key: string): Promise<T | undefined> {
  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${key}` },
    });

    const body = await response.json() as T | null;

    return body ?? undefined;
  }
  catch {
    return undefined;
  }
}
