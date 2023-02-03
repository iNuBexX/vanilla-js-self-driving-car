class Car {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.speed = 0;
        this.acceleration = 0.2;
        this.friction = 0.05;
        this.controls = new Controls();
    }
    draw(ctx) {
        console.log("Drawing car at:", this.x, this.y);
        ctx.fillStyle = "blue"; // Set a color for the car
        ctx.beginPath();
        ctx.rect(
            this.x-this.width/2,
            this.y - this.height/2,
            this.width,
            this.height
        );
        ctx.fill();
    }  

    update() {
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration;
        }
        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        if (this.speed < -this.maxSpeed/2) {
            this.speed = -this.maxSpeed/2;
        }
        this.y -= this.speed;
    }

}
