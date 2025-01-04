import leaflet from "leaflet";
import "./leafletWorkaround.ts";
import "./cache.ts";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;
  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const i = Math.floor(point.lat / this.tileWidth);
    const j = Math.floor(point.lng / this.tileWidth);
    const tempCell: Cell = { i, j };
    return this.getCanonicalCell(tempCell);
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const lat = cell.i * this.tileWidth;
    const lng = cell.j * this.tileWidth;
    const latLng = leaflet.latLng(lat, lng);
    const cellBounds = leaflet.latLngBounds([
      latLng,
      [latLng.lat + this.tileWidth, latLng.lng + this.tileWidth],
    ]);

    return cellBounds;
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell: Cell = this.getCellForPoint(point);
    for (
      let i = -this.tileVisibilityRadius;
      i < this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j < this.tileVisibilityRadius;
        j++
      ) {
        const tmpCell: Cell = { i: originCell.i + i, j: originCell.j + j };
        resultCells.push(this.getCanonicalCell(tmpCell));
      }
    }
    return resultCells;
  }

  clear() {
    this.knownCells.clear();
  }
}
