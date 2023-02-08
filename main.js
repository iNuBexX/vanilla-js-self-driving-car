const carCanvas=document.getElementById("carCanvas");
carCanvas.width=200;
const networkCanvas=document.getElementById("networkCanvas");
networkCanvas.width=400;
let timeToLive = localStorage.getItem("timeToLive") || 300;
const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");
const road=new Road(carCanvas.width/2,carCanvas.width*0.9);
const numberOfSpawnedCars = 300;
let cars=generateCars(numberOfSpawnedCars);
let bestCar=cars[0];
let animationFrameId;
const spawnInterval = 2000; // Spawn a wave every 2 seconds
let lastSpawnTime = 0;
let mutationAmount = parseFloat(localStorage.getItem("mutationAmount")) || 0.2;
let cullDistance = parseInt(localStorage.getItem("cullDistance")) || 500;
if(localStorage.getItem("bestBrain")){
    for(let i=0;i<cars.length;i++){
        cars[i].brain=JSON.parse(localStorage.getItem("bestBrain"));
        if(i!=0){
            NeuralNetwork.mutate(cars[i].brain,0.05);
        }  
    }
}

const traffic=[];

const difficultySettings = {
    easy: { speed: 2.5, spawnInterval: 60 },
    medium: { speed: 3, spawnInterval: 50 },
    hard: { speed: 3.7, spawnInterval: 40 }
};
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

animate();
updateDifficultyButtons();
function save(){
    localStorage.setItem("bestBrain",JSON.stringify(bestCar.brain));
}

function discard(){
    localStorage.removeItem("bestBrain");
}
function generateCars(N){
    const cars=[];
    for(let i=1;i<=N;i++){
        cars.push(new Car(road.getLaneCenter(1),100,30,50,"NeuralNetwork", 8, timeToLive));
    }
    return cars;
}

function resetSimulation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    traffic.length = 0;

    cars = generateCars(numberOfSpawnedCars);
    bestCar = cars[0];

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

function animate(time){
    // Time-based traffic spawning
    const { speed, spawnInterval } = difficultySettings[currentDifficulty];

    // Time-based traffic spawning
    if (lastSpawnTime === 0 || time - lastSpawnTime > spawnInterval) {
        const spawnY = bestCar.y - window.innerHeight - 20; // Start well off-screen

        const availableLanes = Array.from(Array(road.laneCount).keys());
        const spawnCount = Math.floor(Math.random() * 2) + 1; // 1 or 2 cars

        for (let i = 0; i < spawnCount; i++) {
            if (availableLanes.length === 0) break;

            const laneIndex = Math.floor(Math.random() * availableLanes.length);
            const selectedLane = availableLanes.splice(laneIndex, 1)[0];
            
            traffic.push(new Car(road.getLaneCenter(selectedLane), spawnY, 30, 50, "AI", speed));
            lastSpawnTime = spawnInterval;
        }
        lastSpawnTime -= time;

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

    cars = cars.filter(c => !c.damaged);


    if (cars.every(c => c.damaged)) {
        save();
        resetSimulation();
        return;
    }   



    carCanvas.height=window.innerHeight;
    networkCanvas.height=window.innerHeight;

    carCtx.save();
    carCtx.translate(0,-bestCar.y+carCanvas.height*0.7);

    road.draw(carCtx);
    for(let i=0;i<traffic.length;i++){
        traffic[i].draw(carCtx,"red");
    }
    carCtx.globalAlpha=0.2;
    for(let i=0;i<cars.length;i++){
        cars[i].draw(carCtx,"blue");
    }
    carCtx.globalAlpha=1;
    bestCar.draw(carCtx,"blue",true);
    carCtx.restore();
    
    ttlCounter.innerText = Math.max(0, Math.round(bestCar.timeToLive - bestCar.lifeTime));
    networkCtx.lineDashOffset=-time/50;
    Visualizer.drawNetwork(networkCtx,bestCar.brain);
    animationFrameId = requestAnimationFrame(animate);
}