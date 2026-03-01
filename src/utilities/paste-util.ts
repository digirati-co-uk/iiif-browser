export function paste() {
  let cached = "";
  const fn = (val: string) => {
    cached = val;
    return val;
  };
  return {
    c(val: string) {
      cached = val;
      return val;
    },
    v(): string {
      return cached;
    },
  };
}
