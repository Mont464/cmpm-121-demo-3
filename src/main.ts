import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import { Board, Cell } from "./board.ts";
import { Coin, CoinCache, createCache } from "./cache.ts";
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

const northButton = document.createElement("button");
northButton.innerHTML = "⬆️";
app.append(northButton);
const southButton = document.createElement("button");
southButton.innerHTML = "⬇️";
app.append(southButton);
const westButton = document.createElement("button");
westButton.innerHTML = "⬅️";
app.append(westButton);
const eastButton = document.createElement("button");
eastButton.innerHTML = "➡️";
app.append(eastButton);

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

const gameBoard = new Board(
  gameSettings.tileSize,
  gameSettings.maxCacheDistance,
);

const cells = gameBoard.getCellsNearPoint(playerCoordinates);
for (const cell of cells) {
  const key = `${cell.i},${cell.j}`;
  if (luck(key) < gameSettings.cacheSpawnProbability) {
    createCacheVisual(cell);
  }
}

//Creates an interactible cache rectangle at the tile coordinate given
function createCacheVisual(cell: Cell) {
  //finds coordinates of the cache based on the player
  const cellBounds = gameBoard.getCellBounds(cell);

  //creates cache visual
  const cacheBox = leaflet.rectangle(cellBounds);
  cacheBox.addTo(leafletMap);
  cacheBox.on("click", () => openCachePopup(cellBounds.getCenter()));
}

function openCachePopup(coords: leaflet.LatLng): void {
  const cell = gameBoard.getCellForPoint(coords)!;
  const newPopup = leaflet.popup();
  const newCache = createCache(cell);
  updateCacheText(newCache, newPopup, cell);
}

function updateCacheText(cache: CoinCache, popup: leaflet.Popup, cell: Cell) {
  let cacheMessage = "<div>Cache at " + cell.i + ": " + cell.j + "<br></div>";

  for (let i = 0; i < cache.coinsHeld.length; i++) {
    cacheMessage += `<div>${
      cache.coinsHeld[i].id
    }</div><button id=\"collect${i}\">collect</button>`;
  }
  cacheMessage += `<br><button id=\"deposit\">deposit</button>`; //deposit button

  popup
    .setLatLng(gameBoard.getCellBounds(cell).getCenter())
    .setContent(cacheMessage)
    .openOn(leafletMap);

  const popupDiv = popup.getElement();

  //Implements click of collect buttons
  for (let i = 0; i < cache.coinsHeld.length; i++) {
    popupDiv
      .querySelector<HTMLButtonElement>(`[id=\'collect${i}\']`)!
      .addEventListener("click", () =>
        ((index) => {
          if (index >= 0) {
            playerInventory.push(cache.coinsHeld[index]);
            cache.coinsHeld.splice(index, 1);
            popup.close();
            updatePlayerText();
          }
        })(i));
  }

  //Implements click of deposit button
  popupDiv
    .querySelector<HTMLButtonElement>(`[id=\'deposit\']`)!
    .addEventListener("click", () => depositCoin(cache, popup));
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
function depositCoin(cache: CoinCache, popup: leaflet.Popup) {
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
      popup.close();
    } else {
      alert("Invalid entry: Choice out of range");
      return;
    }
  }
}

function movePlayer(lat: number, lng: number) {
  playerCoordinates.lat += lat * gameSettings.tileSize;
  playerCoordinates.lng += lng * gameSettings.tileSize;
  playerLocation.setLatLng(playerCoordinates);
  leafletMap.setView(playerCoordinates, gameSettings.mapZoom);
}

northButton.onclick = () => {
  movePlayer(1, 0);
};

southButton.onclick = () => {
  movePlayer(-1, 0);
};

westButton.onclick = () => {
  movePlayer(0, -1);
};

eastButton.onclick = () => {
  movePlayer(0, 1);
};
