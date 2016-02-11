var intermedio = require('../../app/modeloIntermedio');
var fs = require('fs');

describe("Modelo", function() {


  beforeEach(function() {
    console.log();
  });


  it("Deberia agregar id", function() {
    console.log("--------->" + __dirname);
    var modelo = JSON.parse(fs.readFileSync( __dirname + "/parserOutput.txt").toString());
    modelo = intermedio.asignarId(modelo.sentencia);
    expect(intermedio.findById(3)).toBeDefined(); 
    expect(intermedio.findById(9393)).not.toBeDefined();
  });

  // describe("when song has been paused", function() {
  //   });
  //
  //
  // // demonstrates use of spies to intercept and test method calls
  // it("tells the current song if the user has made it a favorite", function() {
  //   spyOn(song, 'persistFavoriteStatus');
  //
  //   player.play(song);
  //   player.makeFavorite();
  //
  //   expect(song.persistFavoriteStatus).toHaveBeenCalledWith(true);
  // });
  //
  // //demonstrates use of expected exceptions
  // describe("#resume", function() {
  //   it("should throw an exception if song is already playing", function() {
  //     player.play(song);
  //
  //     expect(function() {
  //       player.resume();
  //     }).toThrowError("song is already playing");
  //   });
  // });
});
