const carCanvas=document.getElementById("carCanvas");
carCanvas.width=185;
const networkCanvas=document.getElementById("networkCanvas");
networkCanvas.width=500;
let timeToLive = localStorage.getItem("timeToLive") || 300;
const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");
const road=new Road(carCanvas.width/2,carCanvas.width*0.9);
const numberOfSpawnedCars = parseInt(localStorage.getItem("numberOfStartingAgents")) || 200;
let cars=generateCars(numberOfSpawnedCars);
let bestCar=cars[0];
let animationFrameId;
let lastSpawnTime = 0;
let mutationAmount = parseFloat(localStorage.getItem("mutationAmount")) || 0.5;
let cullDistance = parseInt(localStorage.getItem("cullDistance")) || 500;
let TRAFFIC_GRID_SPACING = 300; // The desired distance between traffic cars in pixels
let nextSpawnY = 0; // Tracks the y-coordinate for the next row of traffic
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
    localStorage.setItem("bestBrain",JSON.stringify(bestCar.brain));
}

function discard(){
    localStorage.removeItem("bestBrain");
}
function generateCars(N){
    const numberOfStartingAgents = parseInt(localStorage.getItem("numberOfStartingAgents")) || 200;
    const rayCount = parseInt(localStorage.getItem("rayCount")) || 40;
    const raySpread = parseFloat(localStorage.getItem("raySpread")) || 180;
    const rayLength = parseFloat(localStorage.getItem("rayLength")) || 150;
    const cars=[];
    for(let i=1;i<=numberOfStartingAgents;i++){
        cars.push(new Car(road.getLaneCenter(1),100,30,50,"NeuralNetwork", 5, timeToLive, rayCount, raySpread * Math.PI / 180, rayLength));
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
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    traffic.length = 0; // Clear existing traffic
    cars = generateCars(numberOfSpawnedCars);
    bestCar = cars[0];
    nextSpawnY = bestCar.y - window.innerHeight*0.12; // Reset the spawn frontier

    if (localStorage.getItem("bestBrain")) {
        for (let i = 0; i < cars.length; i++) {
            cars[i].brain = JSON.parse(localStorage.getItem("bestBrain"));
            if (i != 0) {
                NeuralNetwork.mutate(cars[i].brain, mutationAmount);
            }
        }
    }
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
        save();
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
    
    ttlCounter.innerText = Math.max(0, Math.round(bestCar.timeToLive - bestCar.lifeTime));
    networkCtx.lineDashOffset=-time/50;
    Visualizer.drawNetwork(networkCtx,bestCar.brain);
    animationFrameId = requestAnimationFrame(animate);
}