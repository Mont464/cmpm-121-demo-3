import leaflet from "leaflet";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

interface Coin {
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
        [this.coordinates.lat, this.coordinates.lng, "firstCoins"].toString()
      ) * 5                                                                    //FIXME
    );
    for (let a = 0; a < coinAmount; a++) {
      const newCoin: Coin = {
        id: this.coordinates.lat + ":" + this.coordinates.lng + "#" + a,
      };
      this.coinsHeld.push(newCoin);
    }
  }

  getCoords(): leaflet.LatLng {
    return this.coordinates;
  }
}

export function createCache(coords: leaflet.LatLng): CoinCache {
  return new cacheImpl(coords);
}
