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
let mutationAmount = parseFloat(localStorage.getItem("mutationAmount")) || 0.2;
if(localStorage.getItem("bestBrain")){
    for(let i=0;i<cars.length;i++){
        cars[i].brain=JSON.parse(localStorage.getItem("bestBrain"));
        if(i!=0){
            NeuralNetwork.mutate(cars[i].brain,0.05);
        }  
    }
}

const traffic=[];
let lastSpawnY = cars[0].y;

const difficultySettings = {
    easy: { speed: 2.5, obstacleSpacing: 500 },
    medium: { speed: 3.1, obstacleSpacing: 450 },
    hard: { speed: 3.7, obstacleSpacing: 300 }
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
    console.log('Updating buttons, current difficulty:', currentDifficulty);
    const buttons = document.querySelectorAll('.Difficulty button');
    buttons.forEach(button => {
        console.log('Checking button for level:', button.dataset.level);
        if (button.dataset.level === currentDifficulty) {
            button.classList.add('active');
            console.log(button.dataset.level,'active');
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
    lastSpawnY = cars[0].y;
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
    const { speed, obstacleSpacing } = difficultySettings[currentDifficulty];
    
    // Smart traffic generation
    const spawnY = bestCar.y - window.innerHeight - obstacleSpacing;
    if (lastSpawnY > spawnY) {
        const availableLanes = [0, 1, 2];
        const spawnLaneCount = Math.random() < 0.5 ? 1 : 2; // Spawn 1 or 2 cars
        
        for (let i = 0; i < spawnLaneCount; i++) {
            const laneIndex = Math.floor(Math.random() * availableLanes.length);
            const selectedLane = availableLanes.splice(laneIndex, 1)[0];
            traffic.push(new Car(road.getLaneCenter(selectedLane), lastSpawnY - obstacleSpacing, 30, 50, "AI", speed));
        }
        lastSpawnY -= obstacleSpacing;
    }

    for(let i=0;i<traffic.length;i++){
        traffic[i].update(road.borders,[]);
    }
    for(let i=0;i<cars.length;i++){
        cars[i].update(road.borders,traffic);
    }
    bestCar = cars.find(c=>c.y==Math.min(...cars.map(c=>c.y)));

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