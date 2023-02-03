const canvas=document.getElementById('carCanvas');
canvas.height=window.innerHeight;
canvas.width=200;

const ctx = canvas.getContext('2d');
const car = new Car(100,100,30,50);
car.draw(ctx);

// can you point towards a part of the code if i tell you what it does ?

animate();

function animate() {
    car.update();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    car.draw(ctx);
    requestAnimationFrame(animate);
}   