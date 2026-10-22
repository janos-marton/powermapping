const trim = (n: number) => String(Math.round(n * 10) / 10);

export const formatSupport = (x: number) => (x > 0 ? "+" : "") + trim(x);
export const formatPower = (y: number) => trim(y);
export const formatPos = (x: number, y: number) => `power ${formatPower(y)}, support ${formatSupport(x)}`;
