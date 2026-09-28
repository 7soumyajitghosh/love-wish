// Backend client — same-origin /api. Every call fails soft (returns null)
// so the story works perfectly even as a static site with no backend.
export type Note = { id: string; name: string; message: string; at: string };

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

export const recordVisit = (): Promise<number | null> =>
  safe(
    fetch('/api/visits')
      .then((r) => r.json())
      .then((d) => d.visits as number),
  );

export const fetchNotes = (): Promise<Note[] | null> =>
  safe(
    fetch('/api/notes')
      .then((r) => r.json())
      .then((d) => d.notes as Note[]),
  );

export const postNote = (name: string, message: string): Promise<{ note: Note } | null> =>
  safe(
    fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message }),
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    }),
  );
