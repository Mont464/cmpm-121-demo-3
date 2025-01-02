import leaflet from "leaflet";
import "./leafletWorkaround.ts";
import "./cache.ts";
import { CoinCache } from "./cache.ts";
import { createCache } from "./cache.ts";
import luck from "./luck.ts";

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;
  readonly cacheSpawnProbability: number;

  private readonly knownCells: Map<string, CoinCache>;

  constructor(
    tileWidth: number,
    tileVisibilityRadius: number,
    initialCoordinates: leaflet.latLng,
    spawnProbability: number
  ) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.cacheSpawnProbability = spawnProbability;
    this.knownCells = new Map<string, CoinCache>();

    this.updateKnownCells(initialCoordinates);
  }

  private updateKnownCells(playerCoordinates: leaflet.LatLng) {
    //Determine which tiles should have caches
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
        const lat = playerCoordinates.lat + i * this.tileWidth;
        const lng = playerCoordinates.lng + j * this.tileWidth;
        const coords = leaflet.latLng(lat, lng);
        const key = coords.toString();
        if (luck(key) < this.cacheSpawnProbability) {
          if (!this.knownCells.has(key)) {
            const newCache = createCache(coords);
            this.knownCells.set(key, newCache);
          }
        }
      }
    }
  }

  /*
  private getCanonicalCell(cell: CoinCache): CoinCache {
    const { i, j } = cell;
    const key = [i, j].toString();
    // ...
    return this.knownCells.get(key)!;
  }*/

  getCellForPoint(point: leaflet.LatLng): CoinCache | null {
    const cell = this.knownCells.get(point.toString());
    if (cell == undefined) {
        return null;
    }
    return cell;
  }

  getCellBounds(cell: CoinCache): leaflet.LatLngBounds {
    const cacheCoords = cell.getCoords();
    const cacheBounds = leaflet.latLngBounds([
      cacheCoords,
      [cacheCoords.lat + this.tileWidth, cacheCoords.lng + this.tileWidth],
    ]);

    return cacheBounds;
  }

  /*
  getCellsNearPoint(point: leaflet.LatLng): CoinCache[] {
    const resultCells: CoinCache[] = [];
    const originCell = this.getCellForPoint(point);
    // ...
    return resultCells;
  }*/
}
