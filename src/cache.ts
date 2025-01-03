import leaflet from "leaflet";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

export interface Coin {
  id: string;
}

export interface CoinCache {
  coinsHeld: Coin[];
  getCoords(): leaflet.LatLng;
}

class cacheImpl implements CoinCache {
  coordinates: leaflet.LatLng;
  coinsHeld: Coin[];

  constructor(coords: leaflet.LatLng) {
    this.coordinates = coords;

    this.coinsHeld = [];
    const coinAmount = Math.ceil(
      luck(
        [this.coordinates.lat, this.coordinates.lng, "firstCoins"].toString(),
      ) * 5, //FIXME
    );
    for (let a = 0; a < coinAmount; a++) {
      const newCoin: Coin = {
        id: Math.floor(this.coordinates.lat * 1e4) + ":" +
          Math.floor(this.coordinates.lng * 1e4) + "#" + a,
      };
      this.coinsHeld.push(newCoin);
    }
  }

  getCoords(): leaflet.LatLng {
    return leaflet.latLng(this.coordinates.lat, this.coordinates.lng);
  }
}

export function createCache(coords: leaflet.LatLng): CoinCache {
  return new cacheImpl(coords);
}
