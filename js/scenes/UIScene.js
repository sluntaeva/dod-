// js/scenes/UIScene.js
 class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: false });
    }

    create() {
        // Получаем ссылки на HTML элементы
        this.scoreContainer = document.getElementById('scoreContainer');
        this.controlsContainer = document.getElementById('controls');
        this.scoreText = document.getElementById('score');

        // Показываем нужные элементы
        this.scoreContainer.classList.remove('hidden');
        this.controlsContainer.classList.remove('hidden');

        // Получаем ссылку на игровую сцену, чтобы слушать её события
        const gameScene = this.scene.get('GameScene');

        // Слушаем событие обновления счета
        gameScene.events.on('updateScore', (score) => {
            this.scoreText.textContent = score;
        }, this);

        // Слушаем событие нового рекорда
        gameScene.events.on('newBestScore', (score) => {
            // Можно показать красивое уведомление
            console.log(`Новый рекорд: ${score}!`);
        }, this);

        // Настройка кнопок управления
        this.setupMobileControls(gameScene);
    }

    setupMobileControls(gameScene) {
        const leftButton = document.getElementById('left');
        const rightButton = document.getElementById('right');
        const jumpButton = document.getElementById('jump');

        // Используем 'pointerdown' и 'pointerup' для универсальности (мышь и тач)
        leftButton.addEventListener('pointerdown', () => { gameScene.leftPressed = true; });
        leftButton.addEventListener('pointerup', () => { gameScene.leftPressed = false; });
        leftButton.addEventListener('pointerout', () => { gameScene.leftPressed = false; });

        rightButton.addEventListener('pointerdown', () => { gameScene.rightPressed = true; });
        rightButton.addEventListener('pointerup', () => { gameScene.rightPressed = false; });
        rightButton.addEventListener('pointerout', () => { gameScene.rightPressed = false; });

        jumpButton.addEventListener('pointerdown', () => { gameScene.jump(); });
    }
}
