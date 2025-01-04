import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Cell } from "./board.ts";

export interface Coin {
  id: string;
}

export interface CoinCache {
  coinsHeld: Coin[];
}

class cacheImpl implements CoinCache {
  coinsHeld: Coin[];

  constructor(cell: Cell) {
    this.coinsHeld = [];
    const coinAmount = Math.ceil(
      luck([cell.i, cell.j, "firstCoins"].toString()) * 5,
    );
    for (let a = 0; a < coinAmount; a++) {
      const newCoin: Coin = {
        id: cell.i + ":" + cell.j + "#" + a,
      };
      this.coinsHeld.push(newCoin);
    }
  }
}

export function createCache(cell: Cell): CoinCache {
  return new cacheImpl(cell);
}
