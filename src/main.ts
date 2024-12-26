import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

const APP_NAME = "Map Cache";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const gameTitle = document.createElement("h1");
gameTitle.innerHTML = APP_NAME;
app.append(gameTitle);

class settings {
  oakesLocation = leaflet.latLng(36.98967, -122.06283);
  mapZoom = 19;
  tileSize = 1e-4; //in degrees
  maxCacheDistance = 8;
  cacheSpawnProbability = 0.1;
  zoomable = false;
}

const gameSettings = new settings();

const mapDiv = document.createElement("div");
mapDiv.style.height = "80vh";
mapDiv.style.width = "95vw";
app.append(mapDiv);

const leafletMap = leaflet.map(mapDiv, {
  center: gameSettings.oakesLocation,
  zoom: gameSettings.mapZoom,
  minZoom: gameSettings.mapZoom,
  maxZoom: gameSettings.mapZoom,
  zoomControl: gameSettings.zoomable,
  scrollWheelZoom: gameSettings.zoomable,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: gameSettings.mapZoom,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(leafletMap);

const playerLocation = leaflet.marker(gameSettings.oakesLocation);
playerLocation.bindTooltip(
  "Current Location<br>Inventory:<br>No Coins Collected",
);
playerLocation.addTo(leafletMap);

const playerInventory: Coin[] = [];
const playerCoordinates = gameSettings.oakesLocation; //for later use when adding movement

for (
  let i = -gameSettings.maxCacheDistance;
  i < gameSettings.maxCacheDistance;
  i++
) {
  for (
    let j = -gameSettings.maxCacheDistance;
    j < gameSettings.maxCacheDistance;
    j++
  ) {
    if (luck([i, j].toString()) < gameSettings.cacheSpawnProbability) {
      createCoinCache(i, j);
    }
  }
}

interface Coin {
  id: string;
}

interface Cache {
  coinsHeld: Coin[];
  coordinates: number[];
}

function createCoinCache(i: number, j: number) {
  const cacheCoords = [
    playerCoordinates.lat + i * gameSettings.tileSize,
    playerCoordinates.lng + j * gameSettings.tileSize,
  ];

  const cacheBounds = leaflet.latLngBounds([
    cacheCoords,
    [
      cacheCoords[0] + gameSettings.tileSize,
      cacheCoords[1] + gameSettings.tileSize,
    ],
  ]);

  const cacheBox = leaflet.rectangle(cacheBounds);
  cacheBox.addTo(leafletMap);

  const popupDiv = document.createElement("div");
  const coinAmount = Math.ceil(luck([i, j, "firstCoins"].toString()) * 10);
  const newCacheCoins: Cache = { coinsHeld: [], coordinates: cacheCoords };
  for (let a = 0; a < coinAmount; a++) {
    const newCoin: Coin = {
      id: cacheCoords[0] +
        ":" +
        cacheCoords[1] +
        "#" +
        a,
    };
    newCacheCoins.coinsHeld.push(newCoin);
  }
  updateCacheText(newCacheCoins, popupDiv);
  cacheBox.bindPopup(popupDiv);
}

function updateCacheText(cache: Cache, cacheDiv: HTMLDivElement) {
  cacheDiv.innerHTML = "<div>Cache at " + cache.coordinates[0] + ": " +
    cache.coordinates[1] + "<br></div>";

  for (let i = 0; i < cache.coinsHeld.length; i++) {
    cacheDiv.innerHTML += `<div>${
      cache.coinsHeld[i].id
    }</div><button id=\"collect${i}\">collect</button>`;
  }

  for (let i = 0; i < cache.coinsHeld.length; i++) {
    cacheDiv.querySelector<HTMLButtonElement>(`[id=\'collect${i}\']`)!
      .addEventListener("click", () =>
        ((index) => {
          if (index >= 0) {
            playerInventory.push(cache.coinsHeld[index]);
            cache.coinsHeld.splice(index, 1);

            let inventoryText = "";
            for (const coin of playerInventory) {
              inventoryText += coin.id + "<br>";
            }
            playerLocation.bindTooltip(
              "Current Location<br>Inventory:<br>" + inventoryText,
            );
            updateCacheText(cache, cacheDiv);
          }
        })(i));
  }
}
