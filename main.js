const carCanvas=document.getElementById("carCanvas");
carCanvas.width=185;
const networkCanvas=document.getElementById("networkCanvas");
networkCanvas.width=500;
let timeToLive = localStorage.getItem("timeToLive") || 300;
const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");
const road=new Road(carCanvas.width/2,carCanvas.width*0.9);
const numberOfSpawnedCars = parseInt(localStorage.getItem("numberOfStartingAgents")) || 200;
let hiddenLayerArchitecture = JSON.parse(localStorage.getItem("hiddenLayerArchitecture")) || [6];
let animationFrameId;
let lastSpawnTime = 0;
let mutationAmount = parseFloat(localStorage.getItem("mutationAmount")) || 0.5;
let cullDistance = parseInt(localStorage.getItem("cullDistance")) || 500;
let TRAFFIC_GRID_SPACING = 300; // The desired distance between traffic cars in pixels
let nextSpawnY = 0; // Tracks the y-coordinate for the next row of traffic
let isDiscard = false;
let networkArchitecture = JSON.parse(localStorage.getItem("networkArchitecture")) || [null, 6, 4];
let cars=generateCars(numberOfSpawnedCars);
let bestCar=cars[0];
let eraCount = parseInt(localStorage.getItem("eraCount")) || 0;
let eraPerformance = JSON.parse(localStorage.getItem("eraPerformance")) || [];
let topY = parseFloat(localStorage.getItem("topY")) || 100;

document.addEventListener("DOMContentLoaded", function() {
    updateLayerControls();
    updateDifficultyButtons();
    updateDifficultyButtons();
});



function updateEraGraph() {
    const eraGraph = document.getElementById("eraGraph");
    eraGraph.innerHTML = ''; // Clear existing squares
    const topDistance = 100 - topY;
    for (let i = eraCount; i > 0; i--) {
        const eraY = eraPerformance[i - 1];
        if (eraY === undefined) continue;
        const eraDistance = 100 - eraY;
        let ratio = 0;
        if (topDistance > 0) {
            ratio = Math.min(1, eraDistance / topDistance);
        }
        const lightness = 80 - (ratio * (80 - 41));
        const color = `hsl(139, 55%, ${lightness}%)`;
        const square = document.createElement('div');
        square.className = 'era-square';
        square.title = `Era ${i} | y: ${Math.round(eraY)}`;
        square.style.backgroundColor = color;
        eraGraph.appendChild(square);
    }
}

function updateLayerControls() {
    const networkControls = document.getElementById("network-controls");
    networkControls.innerHTML = ''; // Clear existing controls
    hiddenLayerArchitecture.forEach((neuronCount, index) => {
        const layerControl = document.createElement("div");
        layerControl.classList.add("layer-control");
        layerControl.innerHTML = `
            <label for="layer${index + 1}Input">Hidden Layer ${index + 1} Neurons</label>
            <input id="layer${index + 1}Input" type="number" value="${neuronCount}" />
        `;
        networkControls.appendChild(layerControl);
    });
}

function addLayer() {
    hiddenLayerArchitecture.push(6); // Add a new layer with 6 neurons
    updateLayerControls();
}

function removeLayer() {
    if (hiddenLayerArchitecture.length > 1) { // Keep at least one hidden layer
        hiddenLayerArchitecture.pop(); // Remove the last hidden layer
        updateLayerControls();
    }
}
function saveNetwork() {
    hiddenLayerArchitecture.forEach((_, index) => {
        const input = document.getElementById(`layer${index + 1}Input`);
        if (input) {
            hiddenLayerArchitecture[index] = parseInt(input.value);
        }
    });
    localStorage.setItem("hiddenLayerArchitecture", JSON.stringify(hiddenLayerArchitecture));
    isDiscard=true;
    eraCount = 0;
    localStorage.setItem("eraCount", "0");
    eraPerformance = [];
    localStorage.removeItem("eraPerformance");
    topY = 100;
    localStorage.setItem("topY", "100");
    resetSimulation();
}

if(localStorage.getItem("mutationAmount")){
    document.getElementById("mutationInput").value = parseFloat(localStorage.getItem("mutationAmount"));
}
if(localStorage.getItem("cullDistance")){
    document.getElementById("cullDistanceInput").value = parseInt(localStorage.getItem("cullDistance"));
}   
if(localStorage.getItem("timeToLive")){
    document.getElementById("ttlInput").value = parseInt(localStorage.getItem("timeToLive"));
}
if(localStorage.getItem("numberOfStartingAgents")){
    document.getElementById("numberOfStartingAgentsInput").value = parseInt(localStorage.getItem("numberOfStartingAgents"));
}
if(localStorage.getItem("rayCount")){
    document.getElementById("rayCountInput").value = parseInt(localStorage.getItem("rayCount"));
}
if(localStorage.getItem("raySpread")){
    document.getElementById("raySpreadInput").value = parseFloat(localStorage.getItem("raySpread"));
}
if(localStorage.getItem("rayLength")){
    document.getElementById("rayLengthInput").value = parseFloat(localStorage.getItem("rayLength"));
}   

if(localStorage.getItem("bestBrain")){
    for(let i=0;i<cars.length;i++){
        cars[i].brain=JSON.parse(localStorage.getItem("bestBrain"));
        if(i!=0){
            NeuralNetwork.mutate(cars[i].brain,mutationAmount);
        }  
    }
}

const traffic=[];


let currentDifficulty = localStorage.getItem("difficulty") || 'hard';

document.getElementById("ttlInput").value = timeToLive;
const ttlCounter = document.getElementById("ttlCounter");

function setDifficulty(level) {
    currentDifficulty = level;
    localStorage.setItem("difficulty", level);
    updateDifficultyButtons();
}

function updateDifficultyButtons() {
    const buttons = document.querySelectorAll('.Difficulty button');
    buttons.forEach(button => {
        if (button.dataset.level === currentDifficulty) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function saveSensor(){
    const rayCount = parseInt(document.getElementById("rayCountInput").value);
    const raySpread = parseFloat(document.getElementById("raySpreadInput").value);
    const rayLength = parseFloat(document.getElementById("rayLengthInput").value);
    localStorage.setItem("rayCount", rayCount);
    localStorage.setItem("raySpread", raySpread);
    localStorage.setItem("rayLength", rayLength);
}
function saveTTL() {
    timeToLive = document.getElementById("ttlInput").value;
    localStorage.setItem("timeToLive", timeToLive);
}

function saveMutation() {
    mutationAmount = parseFloat(document.getElementById("mutationInput").value);
    localStorage.setItem("mutationAmount", mutationAmount);
}

function saveCullDistance() {
    cullDistance = parseInt(document.getElementById("cullDistanceInput").value);
    localStorage.setItem("cullDistance", cullDistance);
}

function SaveNbOfStartingAgents(){
    numberOfStartingAgents = parseInt(document.getElementById("numberOfStartingAgentsInput").value);
    localStorage.setItem("numberOfStartingAgents", numberOfStartingAgents);
}


function save(){
    if(isDiscard){
        return;
    }
    document.getElementById("bestBrainTextarea").value = JSON.stringify(bestCar.brain);
    localStorage.setItem("bestBrain",JSON.stringify(bestCar.brain));
}

function discard(){
    localStorage.removeItem("bestBrain");
    isDiscard = true;
    eraPerformance = [];
    localStorage.removeItem("eraPerformance");
    topY = 100;
    localStorage.removeItem("topY");
    updateEraGraph();
    localStorage.setItem("eraCount", "0");
    eraCount = 0;
    resetSimulation()
}
function generateCars(N){
    const numberOfStartingAgents = parseInt(localStorage.getItem("numberOfStartingAgents")) || 200;
    const rayCount = parseInt(localStorage.getItem("rayCount")) || 40;
    const raySpread = parseFloat(localStorage.getItem("raySpread")) || 180;
    const rayLength = parseFloat(localStorage.getItem("rayLength")) || 150;
    const cars=[];
    const inputCount = rayCount + 1;
    const outputCount = 4;
    const networkArchitecture = [inputCount, ...hiddenLayerArchitecture, outputCount];
    for(let i=1;i<=numberOfStartingAgents;i++){
        cars.push(new Car(road.getLaneCenter(1),100,30,50,"NeuralNetwork", 5, timeToLive, rayCount, raySpread * Math.PI / 180, rayLength, networkArchitecture));
    }
    return cars;
}
function getTopOfScreen(followedCar) {
    // If there's no car to follow (e.g., at the very start), default to 0
    if (!followedCar) {
        return 0;
    }
    return followedCar.y - carCanvas.height * 0.7;
}

function resetSimulation() {
    localStorage.setItem("eraCount", eraCount.toString());
    eraCount++;
    updateEraGraph();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    traffic.length = 0; // Clear existing traffic
    cars = generateCars(numberOfSpawnedCars);
    bestCar = cars[0];
    nextSpawnY = bestCar.y - window.innerHeight*0.12; // Reset the spawn frontier

    if (localStorage.getItem("bestBrain") && !isDiscard) {
        for (let i = 0; i < cars.length; i++) {
            cars[i].brain = JSON.parse(localStorage.getItem("bestBrain"));
            if (i != 0) {
                NeuralNetwork.mutate(cars[i].brain, mutationAmount);
            }
        }
    }
    isDiscard = false;
    animationFrameId = requestAnimationFrame(animate);
}

const difficultySettings = {
    easy: { speed: 4, pixelDiff: 1000 },
    medium: { speed: 7, pixelDiff: 400 },
    hard: { speed: 13, pixelDiff: 200 }
};
TRAFFIC_GRID_SPACING = difficultySettings[currentDifficulty].pixelDiff;
resetSimulation();
updateDifficultyButtons();
function animate(time){
    // Time-based traffic spawning
    const { speed, spawnInterval } = difficultySettings[currentDifficulty];
    const spawnHorizon = getTopOfScreen(bestCar) - 200; // A line 200px above the viewport
    const aliveCars = cars.filter(c => !c.damaged);
    let leadCar = null;
    if (aliveCars.length > 0) {
        leadCar = aliveCars.reduce((best, current) => {
            return current.y < best.y ? current : best;
        }, aliveCars[0]);
    } else {
        // If no cars are alive, focus on the best one before reset.
        leadCar = bestCar;
    }
    while (nextSpawnY > spawnHorizon) {
        const spawnY = nextSpawnY;
        const availableLanes = Array.from(Array(road.laneCount).keys());
        const spawnCount = Math.floor(Math.random() * 2) + 1; // 1 or 2 cars

        for (let i = 0; i < spawnCount; i++) {
            if (availableLanes.length > 0) {
                const laneIndex = Math.floor(Math.random() * availableLanes.length);
                const lane = availableLanes[laneIndex];
                availableLanes.splice(laneIndex, 1); // Remove lane to avoid collision on spawn

                traffic.push(new Car(road.getLaneCenter(lane), spawnY, 30, 50, "AI", speed));
            }
        }
        // Move to the next grid line, further up the road
        nextSpawnY -= TRAFFIC_GRID_SPACING;
    }
    for(let i=0;i<traffic.length;i++){
        traffic[i].update(road.borders,[]);
    }
    for(let i=0;i<cars.length;i++){
        cars[i].update(road.borders,traffic);
        if (cars[i].y > bestCar.y + cullDistance) {
                
            cars[i].damaged = true;
        }
    }
    bestCar=cars.find(c=>c.y==Math.min(
            ...cars.map(c=>c.y)
        ));


    if (cars.every(c => c.damaged)) {
        if (!isDiscard) {
            save();
            const eraY = bestCar.y;
            eraPerformance.push(eraY);
            if (eraY < topY) {
                topY = eraY;
                localStorage.setItem("topY", topY.toString());
            }
            localStorage.setItem("eraPerformance", JSON.stringify(eraPerformance));
            eraCount++;
            localStorage.setItem("eraCount", eraCount.toString());
            updateEraGraph();
        }
        resetSimulation();
        return;
    }   



    carCanvas.height=window.innerHeight;
    networkCanvas.height=window.innerHeight;

    carCtx.save();
    carCtx.translate(0,-leadCar.y+carCanvas.height*0.7);

    road.draw(carCtx);
    for(let i=0;i<traffic.length;i++){
        traffic[i].draw(carCtx,"red");
    }
    carCtx.globalAlpha=0.2;
    for(let i=0;i<cars.length;i++){
        cars[i].draw(carCtx,"blue");
    }
    carCtx.globalAlpha=1;
    if (bestCar == leadCar) {
        bestCar.draw(carCtx, "green", true);
    } else {
        leadCar.draw(carCtx, "purple",true);
        bestCar.draw(carCtx, "green",false,true);
    }
    carCtx.restore();
    
    ttlCounter.innerText = Math.max(0, Math.round(leadCar.timeToLive - leadCar.lifeTime));
    networkCtx.lineDashOffset=-time/50;
    Visualizer.drawNetwork(networkCtx,bestCar.brain);
    animationFrameId = requestAnimationFrame(animate);
}