function initRenderer(){

  var type = PIXI.utils.isWebGLSupported() ? "WebGL" : "canvas";
  PIXI.utils.sayHello(type);
  PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;

  renderer = PIXI.autoDetectRenderer({width: 256, height: 256, roundPixels: false, antialias: false, resolution: window.devicePixelRatio || 1});
  rendererLight = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight);
  rendererLight.autoResize = true;

  document.body.insertBefore(renderer.view,document.body.firstChild);

  stage = new PIXI.Container();
  stageUI = new PIXI.Container();
  stageWorld = new PIXI.Container();
  stageTiles = new PIXI.Container();
  stageEntities = new PIXI.Container();
  stageFOV = new PIXI.Container();
  stageLight = new PIXI.Container();

  //Field of View setup
  grFOV = new PIXI.Graphics();

  //Light setup
  sprLight = new PIXI.Sprite(PIXI.Texture.fromCanvas(rendererLight.view));
  sprLight.blendMode = PIXI.BLEND_MODES.MULTIPLY;

  lc = new LightController(rendererLight);

  stage.addChild(stageWorld);
  stage.addChild(stageUI);
  stageWorld.addChild(stageTiles);
  stageWorld.addChild(stageEntities);
  stageWorld.addChild(stageLight);
  stageWorld.addChild(stageFOV);
  stageFOV.addChild(grFOV);
  stageLight.addChild(sprLight);

  for (var i = 0; i < 8; i++){ //layer
    stageEntities.addChild(new PIXI.Container());
  }

  renderer.render(stage);

  renderer.view.style.position = "absolute";
  renderer.view.style.display = "block";
  renderer.autoResize = true;
  renderer.resize(window.innerWidth, window.innerHeight);
  rendererLight.resize(window.innerWidth, window.innerHeight);
}

function renderLoop(){
  if (useLight){
    //lc.renderer.resize(window.innerWidth, window.innerWidth);
    lc.render();
    sprLight.x = view.x;
    sprLight.y = view.y;
    sprLight.scale.x = sprLight.scale.y = 1/view.zoom;
    sprLight.texture.update();
  }
  stageLight.visible = useLight;

  renderer.resize(window.innerWidth, window.innerHeight);
  rendererLight.resize(window.innerWidth, window.innerHeight);
  view.setZoom(2);
  world.updateView(view);
  player.updateFOV();
  renderer.render(stage);
}

textures = {};

function getTexture(source){
  if (source.split('/').pop() == "undefined"){
    console.error("Tries to get undefined sprite");
    return PIXI.Texture.EMPTY;
  }
  if (textures[source] != undefined){
    return textures[source];
  }
  var tex = PIXI.Texture.fromImage(source);
  textures[source] = tex;

  console.log("[Load]Texture: "+source);

  return textures[source];
}

function getTextureFrame(source,index,width,height){
  if (source.split('/').pop() == "undefined"){
    console.error("Tries to get undefined sprite");
    return PIXI.Texture.EMPTY;
  }
  if (textures[source+":"+index] != undefined){
    return textures[source+":"+index];
  }
  tex = getTexture(source);
  if (tex.baseTexture != undefined){
    if (tex.baseTexture.hasLoaded == true){
      textures[source+":"+index] = new PIXI.Texture(tex);
      textures[source+":"+index].frame = new PIXI.Rectangle(width*index, 0, width, height);
      return textures[source+":"+index];
    }
  }
  return PIXI.Texture.EMPTY;
}