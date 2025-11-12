// js/scenes/PreloaderScene.js
 class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('PreloaderScene');
    }

    preload() {
        // Здесь мы будем загружать изображения, спрайты, звуки и т.д.
        // Например:
        // this.load.image('player', 'assets/player.png');
        // this.load.image('platform', 'assets/platform.png');

        // Пока ассетов нет, просто покажем текст загрузки
        const { width, height } = this.scale;
        const loadingText = this.add.text(width / 2, height / 2, 'Загрузка...', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);
    }

    create() {
        // После завершения загрузки, запускаем сцену главного меню
        this.scene.start('MenuScene');
    }
}
