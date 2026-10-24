import Phaser from 'phaser';
import { generateTextures } from '../art.js';

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    generateTextures(this);
    this.scene.start('Title');
  }
}
