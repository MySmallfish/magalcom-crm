const templateCache = new Map();

export async function loadTemplate(path) {
  if (templateCache.has(path)) {
    return templateCache.get(path);
  }

  const loadPromise = (async () => {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed loading template: ${path}`);
    }

    return response.text();
  })();

  templateCache.set(path, loadPromise);

  try {
    return await loadPromise;
  } catch (error) {
    templateCache.delete(path);
    throw error;
  }
}
