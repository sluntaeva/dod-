// js/scenes/UIScene.js
class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: false });
        this._handlers = [];
    }

    create() {
        // DOM ссылки
        this.scoreContainer = document.getElementById('scoreContainer');
        this.controlsContainer = document.getElementById('controls');
        this.scoreText = document.getElementById('score');

        // Показать UI
        this.showUI();

        // Слушаем игровую сцену (если она уже существует)
        const gameScene = this.scene.get('GameScene');

        if (gameScene) {
            // Обновление счёта
            gameScene.events.on('updateScore', this.updateScore, this);
            gameScene.events.on('newBestScore', this.onNewBestScore, this);

            // Сохраним ссылки, чтобы отписаться позже
            this._gameEvents = [{ scene: gameScene, ev: 'updateScore', fn: this.updateScore.bind(this) },
                                { scene: gameScene, ev: 'newBestScore', fn: this.onNewBestScore.bind(this) }];
        }

        // Настроим мобильные кнопки
        this.setupMobileControls(gameScene);
    }

    updateScore(score) {
        if (this.scoreText) this.scoreText.textContent = score;
    }

    onNewBestScore(score) {
        // можно вызвать анимацию/показ нового рекорда
        console.log('Новый рекорд:', score);
    }

    showUI() {
        this.scoreContainer && this.scoreContainer.classList.remove('hidden');
        this.controlsContainer && this.controlsContainer.classList.remove('hidden');
    }

    hideUI() {
        this.scoreContainer && this.scoreContainer.classList.add('hidden');
        this.controlsContainer && this.controlsContainer.classList.add('hidden');
    }

    setupMobileControls(gameScene) {
        const leftButton = document.getElementById('left');
        const rightButton = document.getElementById('right');
        const jumpButton = document.getElementById('jump');

        if (!leftButton || !rightButton || !jumpButton) return;

        // Универсальные обработчики (pointerdown/pointerup)
        const onLeftDown = () => { if (gameScene) gameScene.leftPressed = true; };
        const onLeftUp = () => { if (gameScene) gameScene.leftPressed = false; };

        const onRightDown = () => { if (gameScene) gameScene.rightPressed = true; };
        const onRightUp = () => { if (gameScene) gameScene.rightPressed = false; };

        const onJumpDown = () => { if (gameScene) gameScene.jump(); };

        leftButton.addEventListener('pointerdown', onLeftDown);
        leftButton.addEventListener('pointerup', onLeftUp);
        leftButton.addEventListener('pointerout', onLeftUp);

        rightButton.addEventListener('pointerdown', onRightDown);
        rightButton.addEventListener('pointerup', onRightUp);
        rightButton.addEventListener('pointerout', onRightUp);

        jumpButton.addEventListener('pointerdown', onJumpDown);

        // Сохраняем, чтобы отписаться при shutdown
        this._handlers.push({ el: leftButton, ev: 'pointerdown', fn: onLeftDown });
        this._handlers.push({ el: leftButton, ev: 'pointerup', fn: onLeftUp });
        this._handlers.push({ el: leftButton, ev: 'pointerout', fn: onLeftUp });

        this._handlers.push({ el: rightButton, ev: 'pointerdown', fn: onRightDown });
        this._handlers.push({ el: rightButton, ev: 'pointerup', fn: onRightUp });
        this._handlers.push({ el: rightButton, ev: 'pointerout', fn: onRightUp });

        this._handlers.push({ el: jumpButton, ev: 'pointerdown', fn: onJumpDown });
    }

    // Phaser lifecycle: когда сцена останавливается — очистим UI и слушатели
    shutdown() {
        this.hideUI();
        // удалить DOM-слушатели
        for (const h of this._handlers) {
            try { h.el.removeEventListener(h.ev, h.fn); } catch(e) {}
        }
        this._handlers = [];

        // отписка от игровых событий
        if (this._gameEvents) {
            for (const ge of this._gameEvents) {
                ge.scene.events.off(ge.ev, ge.fn);
            }
            this._gameEvents = null;
        }
    }

    // Phaser вызывает этот метод при остановке сцены (альтернатива shutdown, для безопасности)
    stop() { this.shutdown(); }
}
