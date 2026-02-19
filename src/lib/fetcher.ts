/**
 * Shared SWR fetcher with proper HTTP error handling.
 * P2 #10: Replaces the duplicated inline fetcher that swallowed errors.
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Response body is not JSON
    }
    throw new Error(message);
  }

  const json = await res.json();
  return json.data as T;
}
