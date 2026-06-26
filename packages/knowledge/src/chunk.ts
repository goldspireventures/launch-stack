/** Split markdown into ~targetChars chunks on heading boundaries. */
export function chunkMarkdown(
  markdown: string,
  targetChars = 2400,
): Array<{ heading: string | null; content: string }> {
  const sections: Array<{ heading: string | null; content: string }> = [];
  const lines = markdown.split('\n');
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) sections.push({ heading: currentHeading, content: text });
    buffer = [];
  };

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      flush();
      currentHeading = line.replace(/^#+\s*/, '').trim();
      buffer.push(line);
    } else {
      buffer.push(line);
      const joined = buffer.join('\n');
      if (joined.length >= targetChars) {
        flush();
      }
    }
  }
  flush();

  if (sections.length === 0 && markdown.trim()) {
    return [{ heading: null, content: markdown.trim() }];
  }

  const merged: Array<{ heading: string | null; content: string }> = [];
  for (const s of sections) {
    const last = merged[merged.length - 1];
    if (last && last.content.length + s.content.length < targetChars * 1.2) {
      last.content = `${last.content}\n\n${s.content}`;
    } else {
      merged.push({ ...s });
    }
  }
  return merged;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
