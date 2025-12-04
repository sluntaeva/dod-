class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: false });
        this._handlers = [];
        this._gameEvents = [];
    }

    create() {
        // DOM элементы
        this.scoreContainer = document.getElementById('scoreContainer');
        this.controlsContainer = document.getElementById('controls');
        this.scoreText = document.getElementById('score');

        // Показываем UI
        this.showUI();

        // Получаем ссылку на GameScene
        const gameScene = this.scene.get('GameScene');

        if (gameScene) {
            // Обновление счёта
            const boundUpdate = this.updateScore.bind(this);
            gameScene.events.on('updateScore', boundUpdate);
            this._gameEvents.push({ scene: gameScene, ev: 'updateScore', fn: boundUpdate });
        }

        // Настройка мобильных кнопок
        this.setupMobileControls(gameScene);

        // События показа/скрытия UI
        this.events.on('showUI', this.showUI, this);
        this.events.on('hideUI', this.hideUI, this);
    }

    // Показываем/скрываем UI
    showUI() {
        this.scoreContainer?.classList.remove('hidden');
        this.controlsContainer?.classList.remove('hidden');
    }

    hideUI() {
        this.scoreContainer?.classList.add('hidden');
        this.controlsContainer?.classList.add('hidden');
    }

    updateScore(score) {
        if (this.scoreText) this.scoreText.textContent = score;
    }

    // Мобильные кнопки
    setupMobileControls(gameScene) {
        if (!gameScene) return;

        const left = document.getElementById('left');
        const right = document.getElementById('right');
        const jump = document.getElementById('jump');

        if (!left || !right || !jump) return;

        const bind = (el, ev, fn) => { el.addEventListener(ev, fn); this._handlers.push({ el, ev, fn }); };

        // Влево
        bind(left, 'pointerdown', () => gameScene.leftPressed = true);
        bind(left, 'pointerup', () => gameScene.leftPressed = false);
        bind(left, 'pointerout', () => gameScene.leftPressed = false);

        // Вправо
        bind(right, 'pointerdown', () => gameScene.rightPressed = true);
        bind(right, 'pointerup', () => gameScene.rightPressed = false);
        bind(right, 'pointerout', () => gameScene.rightPressed = false);

        // Прыжок
        bind(jump, 'pointerdown', () => gameScene.jumpPressed = true);
        bind(jump, 'pointerup', () => gameScene.jumpPressed = false);
        bind(jump, 'pointerout', () => gameScene.jumpPressed = false);
    }

    // Очистка
    shutdown() {
        this.hideUI();

        // Удаляем DOM обработчики
        for (const h of this._handlers) {
            try { h.el.removeEventListener(h.ev, h.fn); } catch {}
        }
        this._handlers = [];

        // Отписка от событий GameScene
        for (const ge of this._gameEvents) {
            ge.scene.events.off(ge.ev, ge.fn);
        }
        this._gameEvents = [];
    }

    stop() { this.shutdown(); }
}

window.UIScene = UIScene;
