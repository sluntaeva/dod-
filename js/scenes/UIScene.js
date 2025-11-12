// js/scenes/UIScene.jsclass UIScene extends Phaser.Scene
 
  class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: false });

        this.clouds = [];
        this._handlers = [];
        this._gameEvents = [];
    }

    create() {
        // DOM ссылки
        this.scoreContainer = document.getElementById('scoreContainer');
        this.controlsContainer = document.getElementById('controls');
        this.scoreText = document.getElementById('score');

        // Создаём облачный фон
        this.createCloudBackground();

        // Показать UI
        this.showUI();

        // Слушаем игровую сцену (если она уже есть)
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            // Обновление счёта
            const boundUpdate = this.updateScore.bind(this);
            const boundBest = this.onNewBestScore.bind(this);
            gameScene.events.on('updateScore', boundUpdate);
            gameScene.events.on('newBestScore', boundBest);
            this._gameEvents.push({ scene: gameScene, ev: 'updateScore', fn: boundUpdate });
            this._gameEvents.push({ scene: gameScene, ev: 'newBestScore', fn: boundBest });
        }

        // Настройка мобильных кнопок
        this.setupMobileControls(gameScene);

        // События для показа/скрытия
        this.events.on('showUI', this.showUI, this);
        this.events.on('hideUI', this.hideUI, this);
    }

    // 🌤️ Облака -----------------------------------------------------

createCloudBackground() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cloudLayer = this.add.container(0, 0).setDepth(-10);

    // Меньше слоёв и меньше облаков
    const layers = [
        { count: 2, speed: 0.3, scaleRange: [0.9, 1.3], alpha: 0.4 },
        { count: 2, speed: 0.7, scaleRange: [0.6, 1.0], alpha: 0.6 },
        // ↓ Убираем самый нижний слой (он был за платформами)
        // { count: 2, speed: 1.0, scaleRange: [0.4, 0.7], alpha: 0.8 }
    ];

    layers.forEach((layer, i) => {
        for (let j = 0; j < layer.count; j++) {
            const x = Phaser.Math.Between(-100, width + 100);
            // ⬆ Поднимаем облака выше (меньше шансов перекрыть платформы)
            const y = Phaser.Math.Between(50 + i * 100, height / 3 + i * 80);
            const s = Phaser.Math.FloatBetween(layer.scaleRange[0], layer.scaleRange[1]);
            const cloud = this.createCloud(x, y, s, layer.alpha);
            cloud.parallaxSpeed = layer.speed;
            this.cloudLayer.add(cloud);
            this.clouds.push(cloud);
            this.tweenCloud(cloud, width);
        }
    });
}


    createCloud(x, y, scale = 1, alpha = 0.7) {
        const cloudContainer = this.add.container(x, y);
        const g1 = this.add.ellipse(0, 0, 120 * scale, 70 * scale, 0xffffff).setAlpha(alpha);
        const g2 = this.add.ellipse(-40 * scale, 10 * scale, 90 * scale, 55 * scale, 0xffffff).setAlpha(alpha);
        const g3 = this.add.ellipse(40 * scale, 10 * scale, 90 * scale, 55 * scale, 0xffffff).setAlpha(alpha);
        const g4 = this.add.ellipse(0, -12 * scale, 100 * scale, 60 * scale, 0xffffff).setAlpha(alpha);
        const shadow = this.add.ellipse(0, 22 * scale, 140 * scale, 30 * scale, 0x000000).setAlpha(0.03);
        cloudContainer.add([shadow, g1, g2, g3, g4]);
        return cloudContainer;
    }

    tweenCloud(cloud, screenWidth) {
        const minDuration = 25000;
        const maxDuration = 70000;
        const duration = Phaser.Math.Between(minDuration, maxDuration) / cloud.parallaxSpeed;
        const goToX = (cloud.x < screenWidth / 2) ? screenWidth + 200 : -200;

        this.tweens.add({
            targets: cloud,
            x: goToX,
            duration,
            ease: 'Linear',
            onComplete: () => {
                cloud.x = (goToX < 0) ? screenWidth + 200 : -200;
                cloud.y += Phaser.Math.Between(-20, 20);
                this.tweenCloud(cloud, screenWidth);
            }
        });
    }

    // 🌈 UI / DOM -----------------------------------------------------

    showUI() {
        if (this.cloudLayer) this.cloudLayer.setVisible(true);
        this.scoreContainer?.classList.remove('hidden');
        this.controlsContainer?.classList.remove('hidden');
    }

    hideUI() {
        if (this.cloudLayer) this.cloudLayer.setVisible(false);
        this.scoreContainer?.classList.add('hidden');
        this.controlsContainer?.classList.add('hidden');
    }

    updateScore(score) {
        if (this.scoreText) this.scoreText.textContent = score;
    }

    onNewBestScore(score) {
        console.log('🎉 Новый рекорд:', score);
    }

    // 📱 Мобильные кнопки ----------------------------------------------

    setupMobileControls(gameScene) {
        const left = document.getElementById('left');
        const right = document.getElementById('right');
        const jump = document.getElementById('jump');
        if (!left || !right || !jump) return;

        const onLeftDown = () => gameScene && (gameScene.leftPressed = true);
        const onLeftUp = () => gameScene && (gameScene.leftPressed = false);
        const onRightDown = () => gameScene && (gameScene.rightPressed = true);
        const onRightUp = () => gameScene && (gameScene.rightPressed = false);
        const onJump = () => gameScene && gameScene.jump();

        const bind = (el, ev, fn) => { el.addEventListener(ev, fn); this._handlers.push({ el, ev, fn }); };

        bind(left, 'pointerdown', onLeftDown);
        bind(left, 'pointerup', onLeftUp);
        bind(left, 'pointerout', onLeftUp);

        bind(right, 'pointerdown', onRightDown);
        bind(right, 'pointerup', onRightUp);
        bind(right, 'pointerout', onRightUp);

        bind(jump, 'pointerdown', onJump);
    }

    // 🧹 Очистка --------------------------------------------------------

    shutdown() {
        this.hideUI();
        this.tweens.killAll();
        this.clouds.forEach(c => c.destroy(true));
        this.clouds = [];

        // Удаляем DOM слушатели
        for (const h of this._handlers) {
            try { h.el.removeEventListener(h.ev, h.fn); } catch {}
        }
        this._handlers = [];

        // Отписка от событий
        for (const ge of this._gameEvents) {
            ge.scene.events.off(ge.ev, ge.fn);
        }
        this._gameEvents = [];
    }

    stop() { this.shutdown(); }
}
