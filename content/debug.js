module.exports = {
  commands:{
    burn: {
      permission: "master.player.burn",
      fun: function(sender,args){
        sender.burning = !sender.burning;
        sender.share();
      }
    },
    ents: {
      fun: function(sender,args){
        sender.msg(JSON.stringify(sender.world.ents));
      }
    },
    cellGet: {
      fun: function(sender, args){
        var index = sender.world.grid.cellGet(sender.tileX,sender.tileY);
        sender.msg("TileID: "+index);
        sender.msg("Collisions: "+sender.world.collisionsGet(sender.tileX, sender.tileY).length);
      }
    },
    help: {
      fun :function(sender,args){
        var str = "Commands:<br>"
        for (var k in loader.commands) {
          str += k + "<br>"
        }
        sender.msg(str)
      }
    },
    bucket: {
      fun: function(sender, args){
        var playernum = 0;
        var entnum = 0;
        for (k in sender.bucket.players){ playernum ++}
        for (k in sender.bucket.entities){ entnum ++}
        sender.msg(
          `Current Bucket
          <br>Position: ${sender.bucket.x}, ${sender.bucket.y}
          <br>Players: ${playernum}
          <br>Entities: ${entnum}
          `)
      }
    }
  }
}