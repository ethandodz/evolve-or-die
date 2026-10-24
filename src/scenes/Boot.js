import Phaser from 'phaser';
import { generateTextures } from '../art.js';
import { CFG } from '../data.js';

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    generateTextures(this, CFG.sprites);
    this.scene.start('Title');
  }
}
