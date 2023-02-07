const carCanvas=document.getElementById("carCanvas");
carCanvas.width=200;
const networkCanvas=document.getElementById("networkCanvas");
networkCanvas.width=400;

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");
const road=new Road(carCanvas.width/2,carCanvas.width*0.9);
const N = 100;
const cars=generateCars(N);
let bestCar=cars[0];
if(localStorage.getItem("bestBrain")){
    for(let i=0;i<cars.length;i++){
        cars[i].brain=JSON.parse(localStorage.getItem("bestBrain"));
        if(i!=0){
            NeuralNetwork.mutate(cars[i].brain,0.2);
        }  
    }
}

const difficultySettings = {
    easy: { spawnInterval: 4000, speed: 1.8 },
    medium: { spawnInterval: 2500, speed: 2.2 },
    hard: { spawnInterval: 1000, speed: 3.7 }
};
let currentDifficulty = 'hard';
let lastSpawnTime = 0;

const traffic = [];
const initialTrafficCount = 15;
for(let i = 0; i < initialTrafficCount; i++){
    const laneIndex = Math.floor(Math.random() * road.laneCount);
    const y = -i * 250;
    traffic.push(new Car(road.getLaneCenter(laneIndex), y, 30, 50, "AI", difficultySettings[currentDifficulty].speed));
}

animate();

function save(){
    localStorage.setItem("bestBrain",JSON.stringify(bestCar.brain));
}

function discard(){
    localStorage.removeItem("bestBrain");
}
function generateCars(N){
    const cars=[];
    for(let i=1;i<=N;i++){
        cars.push(new Car(road.getLaneCenter(1),100,30,50,"NeuralNetwork", 8));
    }
    return cars;
}

function animate(time){

    const { spawnInterval, speed } = difficultySettings[currentDifficulty];
    const someCarIsAlive = cars.some(c => !c.damaged);

    if (someCarIsAlive && (time - lastSpawnTime > spawnInterval)) {
        const laneIndex = Math.floor(Math.random() * road.laneCount);
        const spawnY = bestCar.y - window.innerHeight - 100;
        traffic.push(new Car(road.getLaneCenter(laneIndex), spawnY, 30, 50, "AI", speed));
        lastSpawnTime = time;
    }

    for(let i=0;i<traffic.length;i++){
        traffic[i].update(road.borders,[]);
    }
    for(let i=0;i<cars.length;i++){
        cars[i].update(road.borders,traffic);
    }
    bestCar = cars.find(c=>c.y==Math.min(...cars.map(c=>c.y)));
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
    networkCtx.lineDashOffset=-time/50;
    Visualizer.drawNetwork(networkCtx,bestCar.brain);
    requestAnimationFrame(animate);
}