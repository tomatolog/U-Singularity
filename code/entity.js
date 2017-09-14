//Entity constuctor
handy = require('./handy.js');

function Entity(world, type, tx, ty){
  this.id = world.nextEntId;
  this.ent = res.objects[type];
  if (this.ent == undefined){
    console.log("Unknown ent-type: "+type);
    return null;
  }
  this.type = type;
  this.image = this.ent.image;
  this.imageNumber = this.ent.imageNumber;
  this.imageIndex = this.ent.imageIndex;
  this.collision = this.ent.collision;
  this.eventOnClick = this.ent.onClick;
  this.x = tx * 32;
  this.y = ty * 32;
  this.tx = tx;
  this.ty = ty;
  this.moveSpeed = 1;
  this.animation = false;
  this.bucket = null;
  this.sync = {};
  this.layer = this.ent.layer || 10;
  this.dragger = null; //The thing this is dragged by
  this.drag = null; //The thing this is dragging
  this.world = world;
  this.isMoving = false;

  Object.assign(this.sync, this.ent.sync);
  this.fire("onInit");

  this.world.ents[this.world.nextEntId] = this;
  this.world.nextEntId ++;

  this.updateBucket();
}

//clear the thing that is dragging this thing
Entity.prototype.clearDragger = function(){
  if (this.dragger != null){
    this.dragger.drag = null;
    this.dragger = null;
  }
}

//set another thing which is now dragging this thing
Entity.prototype.setDragger = function(dragger){
  this.clearDragger();
  this.dragger = dragger;
  this.dragger.drag = this;
}

//called every step. Yes 60 times per second!
Entity.prototype.step = function(delta){
  if (this.ent.onStep != undefined){
    this.ent.onStep(this);
  }
  if (this.x != this.tx*32 || this.y != this.ty*32){
    this.x = handy.transition(this.x,this.tx*32,this.moveSpeed*(delta*100),0);
    this.y = handy.transition(this.y,this.ty*32,this.moveSpeed*(delta*100),0);
    if (Math.abs(this.x - this.tx*32)+Math.abs(this.y - this.ty*32) < this.moveSpeed){
      this.isMoving = false;
    }
    //this.share({x:this.x, y:this.y});
  }
}

//uhm... there is an animation system in here?
Entity.prototype.animate = function(){
  this.fire("onAnimation");
  /*if (this.ent.onAnimation != undefined){
    this.ent.onAnimation.call(this);
  }*/
}

//so you can interact with entitys. This happens if somebody dares to interact!
Entity.prototype.use = function(user,item){
  if (this.eventOnClick){
    this.eventOnClick.call(this, user);
  }
  var that = this;
  var itemType = res.items[item.type];
  if (itemType != undefined){
    if (itemType.actions != undefined && this.ent != undefined){
      itemType.actions.forEach(function(value){
        if (that.ent.actions != undefined)
          if (that.ent.actions[value] != undefined){
            that.ent.actions[value].call(that, user, item)
          }
        if (value == "destroy"){
          that.destroy();
        }
      });
    }
  }
}

//change your image when you old is ruined
Entity.prototype.changeImage = function(image){
  this.image = image;
  this.share({image: image, imageNumber: this.imageNumber, imageIndex: this.imageIndex, imageNumber: this.imageNumber});
}

//tell everybody near you how cool you are
Entity.prototype.share = function(data){
  if (data){
    var obj = Object.assign({id: this.id},data);
  }else{
    var obj = this.getClientData();
  }
  if (this.bucket != null){
    this.bucket.broadcastArea('ent_data',obj);
  }else{
    this.world.broadcast('ent_data',obj);
  }
}

//update because maybe something changed with you and you were not aware about that
Entity.prototype.update = function(){
  this.updateBucket();
  if (this.ent.onUpdate){
    this.fire("onUpdate");
    //this.ent.onUpdate.call(this);
  }
}

//suicide
Entity.prototype.destroy = function(){
  this.world.gridEntFree(this.tx,this.ty,this); //say the world you are not any more blocking your position
  delete this.world.ents[this.id]; //let the world forgot about you
  this.world.broadcast('ent_destroy',{id: this.id}); //let anybody know you are no longer existing
  if (this.bucket != null){
    this.bucket.removeObject(this); //free you from the bucket
  }
  //now you can go into entity heaven
}

//move in an direction with a specific speed. The distance is one tile
Entity.prototype.moveDir = function(direction,speed){
  var x = this.tx;
  var y = this.ty;
  switch (direction){
    case 0: x+= 1; break;
    case 1: y-= 1; break;
    case 2: x-= 1; break;
    case 3: y+= 1; break;
  }
  var c = this.world.collisionsGet(x, y);
  for (var i=0; i<c.length; i++){
    var ent = c[i];
    if (ent.ent.dragable){
      ent.moveDir(direction, speed);
      ent.clearDragger();
    }
  }
  return this.moveTo(x,y,speed);
}

//move onto a specific tile
Entity.prototype.moveTo = function(x,y,speed){
  this.moveSpeed = speed;
  return this.move(x,y);
}

//why are there so many move function!!?
Entity.prototype.move = function(x,y){
  if (!this.world.collisionCheck(x,y)){
    this.world.gridEntFree(this.tx,this.ty,this);
    this.world.gridEntAdd(x,y,this);
    var dx = this.tx;
    var dy = this.ty;
    this.tx = x;
    this.ty = y;
    this.share({tx: this.tx, ty: this.ty, speed: this.speed});
    this.updateBucket();
    this.isMoving = true;
    if (this.drag){
      this.drag.moveTo(dx, dy, this.moveSpeed);
    }
    return true;
  }else{
    var c = this.world.collisionsGet(x, y);
    for (var i=0; i < c.length; i++){
      ent = c[i];
      if (ent.ent.onPush){
        ent.ent.onPush.call(this, ent);
      }
    }
    return false;
  }
}

//reveal everything about you, the clients should know
Entity.prototype.getClientData = function(){
  if (this.ent.tile != {}){
    return {x:this.x, y:this.y, image: this.image, id: this.id, imageIndex: this.imageIndex, imageNumber: this.imageNumber, layer: this.layer, tile: this.ent.tile}
  }else{
    return {x:this.x, y:this.y, image: this.image, id: this.id, imageIndex: this.imageIndex, imageNumber: this.imageNumber, layer: this.layer} 
  }
}

//when you spawn send the things returning from the function above to the clients. This is obviously called when the ent spawns.
Entity.prototype.spawn = function(){
  this.bucket.broadcastArea('ent_spawn', this.getClientData());
}

//are you in same bucket as before or somewhere else? 
Entity.prototype.updateBucket = function(){
  this.changeBucket(this.world.buckets.cellGet(Math.floor(this.tx/config.bucket.width),Math.floor(this.ty/config.bucket.height)));
}

//this bucket is shit. Go anywhere else where you think you belong more to
Entity.prototype.changeBucket = function(bucket){
  if (bucket != undefined){
    if (this.bucket != bucket){
      bucket.addObject(this);
      if (this.bucket != null){
        this.bucket.removeObject(this);
      }
      this.bucket = bucket;
    }
  }
}

//Teleport this entity
Entity.prototype.teleport = function(tileX, tileY){
  this.tx = tileX;
  this.ty = tileY;
  this.x = tileX*32;
  this.y = tileY*32;
  this.updateBucket();
}

//Fires an event
Entity.prototype.fire = function(event){
  if (this.ent[event] != undefined){
    this.ent[event].call(this);
  }
}

module.exports = Entity;