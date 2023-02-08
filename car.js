class Car {
    constructor(x, y, width, height, controlType, maxSpeed=3,timeToLive=300) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 0;
        this.acceleration = 0.2;
        this.maxSpeed = maxSpeed;
        this.friction = 0.1;
        this.controlType = controlType;
        this.useBrain = controlType == "NeuralNetwork";
        this.reverseTime = 0;
        this.stillTime = 0;
        this.lifeTime = 0;
        this.timeToLive = timeToLive; // Approx. 5 seconds at 60fps
        if(this.controlType!="AI"){
            this.sensor = new Sensor(this);
            this.brain = new NeuralNetwork([this.sensor.rayCount+1,9,4]);
        }
        this.controls = new Controls(controlType);
        this.angle = 0;
        this.damaged = false;
    }
    draw(ctx,color,drawSensor=false,isbest=false) {
        if(this.damaged) {
            if(!isbest) {
                ctx.fillStyle = "gray";
            }
        }  
        else {
            ctx.fillStyle = color;
        }
        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for(let i=1;i<this.polygon.length;i++){
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        }
        ctx.fill();
        if(this.sensor && drawSensor){
            this.sensor.draw(ctx);
        }
    }  

    update(roadBorders,traffic) {
        if(this.damaged)
            return;

        this.#move();
        this.polygon=this.#createPolygon();
        this.damaged=this.#assessDamage(roadBorders,traffic);
        //////////////////////
        // training plan
        //////////////////////

        this.lifeTime++;
        if (this.controlType === "NeuralNetwork") { 
            if (this.lifeTime > this.timeToLive) {
                this.damaged = true;
            }
        }
        if (this.speed <= 0) {
            this.reverseTime++;
        }

        if (this.reverseTime > 10 && this.controlType === "NeuralNetwork") { 
            this.damaged = true;
        }

        if (Math.abs(this.speed) < this.friction) {
            this.stillTime++;
        } else {
            this.stillTime = 0;
        }

        if (this.stillTime > 150 && this.controlType === "NeuralNetwork") {
            this.damaged = true;
        }
        //////////////////////
        // end of training plan
        //////////////////////
        if(this.sensor && !this.damaged){
            this.sensor.update(roadBorders,traffic);
            const offsets=this.sensor.readings.map(s=>s==null?0:1-s.offset); 
            const inputs = [...offsets, this.speed / this.maxSpeed];
            const outputs=NeuralNetwork.feedForward(inputs,this.brain);
            if(this.useBrain){
                this.controls.forward=outputs[0];
                this.controls.left=outputs[1];
                this.controls.right=outputs[2];
                this.controls.reverse=outputs[3];
            }
        }
    }

    #assessDamage(roadBorders,traffic) {
        for(let i=0;i<traffic.length;i++){
            if(polygonIntersect(this.polygon,traffic[i].polygon)){
                return true;
            }
        }
        for(let i=0;i<roadBorders.length;i++){
            if(polygonIntersect(this.polygon,roadBorders[i])){
                return true;
            }
        }
        return false;
    }

    #createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);
        points.push({
            x: this.x - Math.sin(this.angle - alpha) * rad,
            y: this.y - Math.cos(this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(this.angle + alpha) * rad,
            y: this.y - Math.cos(this.angle + alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad
        }); 
        return points;
    }

    #move() {
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
        if(Math.abs(this.speed) < this.friction) {
            this.speed = 0;
        }
        if (this.speed !== 0) {
            const flip = this.speed > 0 ? 1 : -1;
            if(this.controls.left) {
                this.angle += 0.03 * flip;
            }
            if(this.controls.right) {
                this.angle -= 0.03 * flip;
            }
        }
        if (this.speed > 0) {
            this.speed -= this.friction;
        }  
        if (this.speed < 0) {
            this.speed += this.friction;
        }
        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;    
    }

}
