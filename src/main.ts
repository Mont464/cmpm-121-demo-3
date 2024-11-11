// todo
const APP_NAME = "Map Cashe";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const button = document.createElement("button");
button.innerHTML = "Click Me";
app.append(button);

button.onclick = () => {
  alert("you clicked the button!");
};
