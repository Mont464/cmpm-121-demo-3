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

//Grouping aspects of the app to allow easy edits and reference
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

//Create map visual using Leaflet framework
const leafletMap = leaflet.map(mapDiv, {
  center: gameSettings.oakesLocation,
  zoom: gameSettings.mapZoom,
  minZoom: gameSettings.mapZoom,
  maxZoom: gameSettings.mapZoom,
  zoomControl: gameSettings.zoomable,
  scrollWheelZoom: gameSettings.zoomable,
});

//Make contribution
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: gameSettings.mapZoom,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(leafletMap);

const playerLocation = leaflet.marker(gameSettings.oakesLocation);
playerLocation.bindTooltip("Current Location<br>Inventory:<br>Empty");
playerLocation.addTo(leafletMap);

const playerInventory: Coin[] = [];
const playerCoordinates = gameSettings.oakesLocation; //for later use when adding movement

//Determine which tiles should have caches
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

//Creates an interactible cashe rectangle at the tile coordinate given
function createCoinCache(i: number, j: number) {
  //finds coordinates of the cache based on the player
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

  //creates cache visual
  const cacheBox = leaflet.rectangle(cacheBounds);
  cacheBox.addTo(leafletMap);

  //Create a popup for the cache showing it's coins
  const popupDiv = document.createElement("div");

  //fill cache object with the respective coins
  const coinAmount = Math.ceil(luck([i, j, "firstCoins"].toString()) * 10);
  const newCacheCoins: Cache = { coinsHeld: [], coordinates: cacheCoords };
  for (let a = 0; a < coinAmount; a++) {
    const newCoin: Coin = {
      id: cacheCoords[0] + ":" + cacheCoords[1] + "#" + a,
    };
    newCacheCoins.coinsHeld.push(newCoin);
  }
  updateCacheText(newCacheCoins, popupDiv);
  cacheBox.bindPopup(popupDiv);
}

//fill the cache's popup with coin text and buttons to collect/deposit
function updateCacheText(cache: Cache, cacheDiv: HTMLDivElement) {
  cacheDiv.innerHTML = "<div>Cache at " +
    cache.coordinates[0] +
    ": " +
    cache.coordinates[1] +
    "<br></div>";

  //Make 'div' elements for the coin text and buttons below for collecting
  for (let i = 0; i < cache.coinsHeld.length; i++) {
    cacheDiv.innerHTML += `<div>${
      cache.coinsHeld[i].id
    }</div><button id=\"collect${i}\">collect</button>`;
  }
  cacheDiv.innerHTML += `<br><button id=\"deposit\">deposit</button>`; //deposit button

  //Implements click of collect buttons
  for (let i = 0; i < cache.coinsHeld.length; i++) {
    cacheDiv
      .querySelector<HTMLButtonElement>(`[id=\'collect${i}\']`)!
      .addEventListener("click", () =>
        ((index) => {
          if (index >= 0) {
            playerInventory.push(cache.coinsHeld[index]);
            cache.coinsHeld.splice(index, 1);

            updatePlayerText();
            updateCacheText(cache, cacheDiv);
          }
        })(i));
  }

  //Implements click of deposit button
  cacheDiv
    .querySelector<HTMLButtonElement>(`[id=\'deposit\']`)!
    .addEventListener("click", () => depositCoin(cache, cacheDiv));
}

//Updates the tooltip on the player marker to show the correct inventory contents
function updatePlayerText() {
  let inventoryText = "";
  for (const coin of playerInventory) {
    inventoryText += coin.id + "<br>";
  }

  if (inventoryText == "") {
    inventoryText = "Empty";
  }

  playerLocation.bindTooltip(
    "Current Location<br>Inventory:<br>" + inventoryText,
  );
}

//Creates a prompt for the player to choose which coin to deposit
function depositCoin(cache: Cache, cacheDiv: HTMLDivElement) {
  //check if the player has coins to deposit
  if (playerInventory.length < 1) {
    alert("No coins to deposit");
    return;
  }

  //Make prompt text with the prompt and coin options
  let promptText = "Deposit\nPlease enter the number of the coin to deposit:\n";
  for (let i = 0; i < playerInventory.length; i++) {
    promptText += i + " -- " + playerInventory[i].id + "\n";
  }

  //Gets the player's response and places it into the cache's inventory if the entry is proper
  const choice = prompt(promptText);
  if (choice != null && choice != "") {
    const choiceInt = Number(choice);
    if (choiceInt < playerInventory.length && choiceInt >= 0) {
      cache.coinsHeld.push(playerInventory[choiceInt]);
      playerInventory.splice(choiceInt, 1);

      updatePlayerText();
      updateCacheText(cache, cacheDiv);
    } else {
      alert("Invalid entry: Choice out of range");
      return;
    }
  }
}
