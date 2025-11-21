export interface Post {
    userId: number;
    id: number;
    title: string;
    body: string;
}

/**
 * Fetch initial data used by the app (JSONPlaceholder example).
 * 5s timeout is applied via AbortController.
 */
export async function fetchInitialData(): Promise<Post[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch('https://jsonplaceholder.typicode.com/posts', { signal: controller.signal });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
        const data = (await res.json()) as Post[];
        return data;
    } finally {
        clearTimeout(timeout);
    }
}