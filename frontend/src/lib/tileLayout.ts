// Sizes for the room's video tiles. Every tile is 16:9, like Zoom's, and is
// sized here from the measured stage instead of stretching to fill it.

const ASPECT = 16 / 9;

/** The space between tiles, in pixels. */
export const TILE_GAP = 4;

export interface TileSize {
  width: number;
  height: number;
}

/** The largest 16:9 box that fits in `width` x `height`. */
export function fitAspect(width: number, height: number): TileSize {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const fittedWidth = Math.min(width, height * ASPECT);
  return { width: Math.floor(fittedWidth), height: Math.floor(fittedWidth / ASPECT) };
}

/** A tile in Speaker view's strip: about 240px wide on a desktop, smaller on a phone. */
export function stripTileSize(stageWidth: number): TileSize {
  const width = stageWidth < 768 ? 136 : 240;
  return { width, height: Math.round(width / ASPECT) };
}

export interface GridLayout extends TileSize {
  columns: number;
}

/**
 * Gallery view: tries every column count and keeps the one with the biggest
 * 16:9 tiles for `count` people in `width` x `height`.
 */
export function bestGrid(count: number, width: number, height: number): GridLayout {
  let best: GridLayout = { columns: 1, width: 0, height: 0 };
  for (let columns = 1; columns <= Math.max(count, 1); columns++) {
    const rows = Math.ceil(count / columns);
    const cellWidth = (width - TILE_GAP * (columns - 1)) / columns;
    const cellHeight = (height - TILE_GAP * (rows - 1)) / rows;
    const tile = fitAspect(cellWidth, cellHeight);
    if (tile.width > best.width) best = { columns, ...tile };
  }
  return best;
}

/** How wide a row of `columns` tiles is, gaps included. */
export function rowWidth(layout: GridLayout): number {
  return layout.columns * layout.width + (layout.columns - 1) * TILE_GAP;
}
