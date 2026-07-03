/** Rectángulo con esquinas redondeadas solo arriba (barra vertical apoyada en la base). */
export function roundedTopRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height);
  if (height <= 0) return "";
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
}

/** Rectángulo con esquinas redondeadas solo a la derecha (barra horizontal apoyada a la izquierda). */
export function roundedRightRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, height / 2, width);
  if (width <= 0) return "";
  return `M${x},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height - r} Q${x + width},${y + height} ${x + width - r},${y + height} L${x},${y + height} Z`;
}
