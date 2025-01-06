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

//Movement buttons
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

//Move to geolocation button
const sensorButton = document.createElement("button");
sensorButton.innerHTML = "🌐";
app.append(sensorButton);

//Erase game state button
const eraseButton = document.createElement("button");
eraseButton.innerHTML = "🚮";
app.append(eraseButton);

const gameSettings = new settings();

const mapDiv = document.createElement("div");
mapDiv.style.height = "80vh";
mapDiv.style.width = "95vw";
app.append(mapDiv);

let playerInventory: Coin[];
let playerCoordinates: leaflet.LatLng; //for later use when adding movement
let cacheMememtos: Map<string, string>;
let playerPath: leaflet.LatLng[] = [];

function initializeState() {
  playerInventory = [];
  playerCoordinates = gameSettings.oakesLocation; //for later use when adding movement
  cacheMememtos = new Map<string, string>();
  playerPath = [leaflet.latLng(playerCoordinates.lat, playerCoordinates.lng)];
}

initializeState();
loadState();

//Create map visual using Leaflet framework
const leafletMap = leaflet.map(mapDiv, {
  center: playerCoordinates,
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

const playerPin = leaflet.marker(playerCoordinates);
playerPin.bindTooltip("Current Location<br>Inventory:<br>Empty");
updatePlayerText();
playerPin.addTo(leafletMap);

const playerPathVisual = leaflet.polyline(playerPath, { color: "purple" })
  .addTo(leafletMap);

const gameBoard = new Board(
  gameSettings.tileSize,
  gameSettings.maxCacheDistance,
);
let boxArray: leaflet.Rectangle = [];

interface gameState {
  cacheMementos: [k: string, v: string][];
  playerCoordinates: leaflet.LatLng;
  playerInventory: Coin[];
  playerPath: leaflet.LatLng[];
}

function saveState() {
  const cacheMementos = [...cacheMememtos]; //Maps cannot be serialized as is, need to be converted to lists of key value pairs
  const currentState: gameState = {
    cacheMementos,
    playerCoordinates,
    playerInventory,
    playerPath,
  };
  const saveEntry = JSON.stringify(currentState);
  localStorage.setItem("gameState", saveEntry);
}

self.addEventListener("beforeunload", () => {
  saveState();
});

function loadState() {
  const latestSave = localStorage.getItem("gameState");
  if (latestSave) {
    const newState: gameState = JSON.parse(latestSave);
    cacheMememtos = new Map(newState.cacheMementos);
    playerCoordinates = newState.playerCoordinates;
    playerInventory = newState.playerInventory;
    playerPath = newState.playerPath;
  }
}

refreshBoard();

function cellToString(cell: Cell) {
  return `${cell.i},${cell.j}`;
}

function refreshBoard() {
  gameBoard.clear();
  for (const box of boxArray) {
    box.remove();
  }
  boxArray = [];
  const cells = gameBoard.getCellsNearPoint(playerCoordinates);
  for (const cell of cells) {
    const key = cellToString(cell);
    if (luck(key) < gameSettings.cacheSpawnProbability) {
      createCacheVisual(cell);
    }
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
  boxArray.push(cacheBox);
}

function openCachePopup(coords: leaflet.LatLng): void {
  const cell = gameBoard.getCellForPoint(coords)!;
  const newPopup = leaflet.popup();
  let newCache = createCache(cell);
  if (cacheMememtos.has(cellToString(cell))) {
    newCache = JSON.parse(cacheMememtos.get(cellToString(cell))!);
  }
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
            cacheMememtos.set(cellToString(cell), JSON.stringify(cache));
            popup.close();
            updatePlayerText();
          }
        })(i));
  }

  //Implements click of deposit button
  popupDiv
    .querySelector<HTMLButtonElement>(`[id=\'deposit\']`)!
    .addEventListener("click", () => depositCoin(cache, popup, cell));
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

  playerPin.bindTooltip(
    "Current Location<br>Inventory:<br>" + inventoryText,
  );
}

//Creates a prompt for the player to choose which coin to deposit
function depositCoin(cache: CoinCache, popup: leaflet.Popup, cell: Cell) {
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
      cacheMememtos.set(cellToString(cell), JSON.stringify(cache));
      playerInventory.splice(choiceInt, 1);

      updatePlayerText();
      popup.close();
    } else {
      alert("Invalid entry: Choice out of range");
      return;
    }
  }
}

function updatePlayerVisual() {
  playerPin.setLatLng(playerCoordinates);
  playerPath.push(leaflet.latLng(playerCoordinates.lat, playerCoordinates.lng));
  playerPathVisual.addLatLng(playerCoordinates);
  leafletMap.setView(playerCoordinates, gameSettings.mapZoom);
  refreshBoard();
}

function movePlayer(lat: number, lng: number) {
  playerCoordinates.lat += lat * gameSettings.tileSize;
  playerCoordinates.lng += lng * gameSettings.tileSize;
  updatePlayerVisual();
}

function changeGeolocation(location: GeolocationPosition) {
  playerCoordinates.lat = location.coords.latitude;
  playerCoordinates.lng = location.coords.longitude;
  updatePlayerVisual();
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

sensorButton.onclick = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(changeGeolocation);
  }
};

eraseButton.onclick = () => {
  if (confirm("Are you sure you want to erase your current save?")) {
    initializeState();
    saveState(); //overrides previous save with empty save
    updatePlayerText();
    updatePlayerVisual();
    playerPathVisual.setLatLngs(playerPath);
  }
};
