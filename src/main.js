import Phaser from 'phaser';
import '@fontsource/press-start-2p';
import Boot from './scenes/Boot.js';
import Title from './scenes/Title.js';
import Game from './scenes/Game.js';
import UI from './scenes/UI.js';
import { W, H } from './ui.js';
import { controls } from './controls.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#120c18',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [Boot, Title, Game, UI],
};

// Wait for the pixel font so canvas text renders with it
const fontReady = document.fonts ? document.fonts.load('16px "Press Start 2P"') : Promise.resolve();
Promise.race([fontReady, new Promise(r => setTimeout(r, 2500))]).finally(() => {
  window.game = new Phaser.Game(config);
  window.controls = controls;
});
