/**
 * Builds an attachment that paints a canvas gradient.
 *
 * Reading reactive state inside `render` makes this attachment re-run on
 * change; that is the whole reason gradients use an attachment rather than an
 * `onMount`. A `ResizeObserver` repaints on element resize and is disconnected
 * on cleanup.
 */
export function gradientAttachment(render: (canvas: HTMLCanvasElement) => void) {
  return (node: HTMLCanvasElement): (() => void) => {
    render(node);
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => render(node))
      : undefined;
    observer?.observe(node);
    return () => observer?.disconnect();
  };
}
