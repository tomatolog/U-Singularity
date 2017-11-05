var fs = require("fs");
var path = require("path");
var yaml = require("js-yaml");
var item = require("./item.js");

var commands = {}; //object with a list of commands
//default loaded things, which make no sense to move in external files
var res = { //object with every dynamic loaded content, excepts maps and commands
  tiles: {},
  items: {
    "hand":{
      "actions":["hand"]
    }
  },
  actions: {},
  objects: {
    "item":{ //the item entity
      "sync":{item: null},
      "image":[{layer: 2, source: "items/item_crowbar.png", width:32, height: 32}],
      "onClick":function(user, _item){
        if(_item.type == "hand"){
          user.inventory[user.inventoryActive] = this.sync.item;
          user.shareSelf();
          user.update();
          this.destroy();
        }else{
          item.combine(this.sync.item, _item);
          this.sync.item = item.update(this.sync.item);
          this.update();
        }
      },
      "onUpdate":function(){
        if (this.sync.item == null){
          this.destroy();
        }else{
          for (var i = 0; i < this.sync.item.sprite.length; i++){
            this.sprites[i] = Object.assign({}, this.sync.item.sprite[i]);
          }
          this.share();
        }
      },
      "actions":{}
    },
    "player":{
      "draggable": true,
      "collision":true,
      "sync":{client: null, hp: 100},
      "layer": 3,
      "image":[
        {
          source: "chars/char_chemist_f.png",
          image: 0,
          width: 32,
          height: 32,
          animation: "jump"
        },
        {
          visible: false,
          source: "", //makes errors
          width: 32,
          height: 32,
          scale: 0.5,
          image: 0,
          animation: "jump",
          x: 8,
          y: 8
        }
      ],
      "actions": {
        "stab": function(){
          this.sync.hp -= 5;
          this.client.msg("Ouch!");
          this.client.shareSelf({hp: this.sync.hp});
        }
      },
      "onInit": function(){
        this.setLight(0, {color: 0xffffff, radius: 128, intensity: 1});
      },
      "onStep": function(delta){
        if (this.sync.hp <= 0){
          this.changeSprite(0, {angle: 90, animation: "none"});
          this.client.alive = false;
        }
      },
      "onUpdate": function(){
        if (this.client == undefined){
          this.destroy();
        }
      }
    }
  }
}

//this thing loads all content found in one file
function load(filename,callback){

  function logLoad(num,key,filename){
    if (num[key] > 0){
      console.log("[Loader]Loaded "+num[key]+" "+key+" from "+filename)
    }
  }

  function checkItem(item){
    var img = [];
    if (typeof item.image == "string"){
      img = [{source: item.image}];
    }else if(Array.isArray(item.image)){
      for (var i = 0; i < item.image; i++){
        var image = item.image[i];
        if (typeof image == "string"){
          img.push({source: image});
        }else if (typeof image == "object"){
          img.push(image);
        }
      }
    }

    item.image = img;
    return item;
  }

  function checkObject(obj){
    if (obj.extends){
      var parent = res.objects[obj.extends];
      if (!parent){
        console.error("Can't extend from not existing object: "+obj.extends);
        return false;
      }
      return Object.assign({}, parent, obj);
    }else{
      return obj;
    }
  }

  var ext = path.extname(filename);
  var num = {
    tiles: 0,
    items: 0,
    actions: 0,
    commands: 0,
    actions: 0,
    objects: 0
  };
  if (ext == ".js"){

    //Dangerous!!!
    try {
      delete require.cache[require.resolve("../content/"+filename)];
      var exp = require("../content/"+filename);
    }catch(e){
      console.error("Content file has errors or don't exists: "+filename+"\n", e);
      return false;
    }
    if (exp.tiles != undefined){
      Object.assign(res.tiles,exp.tiles);
      num.tiles = Object.keys(exp.tiles).length;
    }
    if (exp.items != undefined){
      for (var k in exp.items){
        exp.items[k] = checkItem(exp.items[k]);
      }
      Object.assign(res.items,exp.items);
      num.items = Object.keys(exp.items).length;
    }
    if (exp.commands != undefined){
      Object.assign(commands,exp.commands);
      num.commands = Object.keys(exp.commands).length;
    }
    if (exp.actions != undefined){
      Object.assign(res.actions,exp.actions);
      num.actions = Object.keys(exp.actions).length;
    }
    if (exp.objects != undefined){
      Object.assign(res.objects,exp.objects);
      num.objects = Object.keys(exp.objects).length;

      //extending and stuff
      for (var k in exp.objects){
        res.objects[k] = checkObject(exp.objects[k]);
      }
    }
    logLoad(num,"tiles",filename);
    logLoad(num,"items",filename);
    logLoad(num,"commands",filename);
    logLoad(num,"actions",filename);
    logLoad(num,"objects",filename);
  }
  if(callback){callback();}
}

//loads all the things of the modules directory
function auto(callback){
  var starttime = Date.now();
  fs.readdir( "./content", function( err, files ){
    if(err){
      console.error("[Loader]Can't list the modules directory.", err);
      return false;
    }
    var num = files.length;
    var ind = 0;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      load(file, function(){
        ind++
        if (ind >= num){
          console.log("[Loader]Loaded all content in " + (Date.now() - starttime) + "ms");
          if(callback){
            callback();
          }
        }
      });
    }
  });
}

function loadClasses(){
  try {
    var doc = yaml.safeLoad(fs.readFileSync('./config/classes.yml', 'utf8'));
    res.classes = doc;
  } catch (e) {
    console.log(e);
  }
}

function loadConfig(){
  try {
    var doc = yaml.safeLoad(fs.readFileSync('./config/config.yml', 'utf8'));
    config = doc;
  } catch (e) {
    console.log(e);
  }
}

function Tile(name, collision, image){ 
  //I don't know if this is called somewhere...
  //Ok, used the search function and it is not called anywhere.
  //There is a constructor which uses the name "Tile", but it is in the client code
  //As you see down below, this is not event exported
  this.collision = collision;
  this.image = image;
}

function Item(type){
  if (res.items[type] != undefined){
    this.type = type;
    this.sync = Object.assign({}, res.items[type].sync || {});
  }else{
    console.log("Item not found: " + type)
    return null;
  }
}

module.exports.auto = auto;
module.exports.load = load;
module.exports.res = res;
module.exports.commands = commands;
module.exports.loadConfig = loadConfig;
module.exports.loadClasses = loadClasses;