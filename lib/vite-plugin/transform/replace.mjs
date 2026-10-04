export function replaceOnce(source, needle, replacement, { file, patch }) {
  const found = source.split(needle).length - 1;
  if (found !== 1) {
    const preview = needle.length > 120 ? `${needle.slice(0, 120)}…` : needle;
    throw new Error(`${file} patch "${patch}" expected 1 match, found ${found}: ${preview}`);
  }
  return source.replace(needle, replacement);
}
