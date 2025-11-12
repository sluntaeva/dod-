// js/scenes/GameScene.js
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerColor = parseInt(localStorage.getItem('playerColor')) || 0xff3366;
        this.platforms = [];
        this.platformIdCounter = 0;
    }

    create() {
        // Инициализация переменных
        this.score = 0;
        this.visitedPlatforms = new Set();
        this.lastHeightScore = 0;
        this.isDead = false;
        this.highestPlatformY = 800;

        // Настройка мира
        this.matter.world.setBounds(0, 0, 2000, 10000, 64, false, true, true, false);


        // Создание игрока
        const playerStartX = 150;
        const playerStartY = 800;
        this.playerSprite = this.add.rectangle(playerStartX, playerStartY, 40, 60, this.playerColor);
        this.player = this.matter.add.gameObject(this.playerSprite, {
            restitution: 0.2,
            friction: 0.05,
            label: 'player',
            inertia: Infinity  // Prevents rotation/deformation
        });

        // Начальные платформы
        const startPlatform = this.addPlatform(playerStartX, playerStartY + 100);
        this.visitedPlatforms.add(startPlatform.id);
        this.generateInitialPlatforms();

        // Камера
        this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
        this.cameras.main.setBackgroundColor('#87ceeb');

        // Управление
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // События физики
        this.setupCollisionHandlers();

        // Сообщаем UI сцене, что игра началась
        this.events.emit('updateScore', this.score);

        // Запустить/поднять UIScene (если ещё не запущена)
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        } else {
            // Если уже запущена — показать UI
            const ui = this.scene.get('UIScene');
            if (ui && ui.showUI) ui.showUI();
        }
    }

    update() {
        if (this.isDead) return;

        this.handlePlayerMovement();
        this.checkDeathCondition();
        this.checkHeightScore();
        this.managePlatforms();
    }

    // --- Методы вынесены для чистоты ---

    generateInitialPlatforms() {
        for (let y = 700; y > -500; y -= 150 + Math.random() * 100) {
            const x = 100 + Math.random() * 1800;
            this.addPlatform(x, y);
        }
        this.highestPlatformY = -500;
    }

managePlatforms() {
    // Динамическая генерация
    if (this.playerSprite.y < this.highestPlatformY + 600) {
        this.generateAdditionalPlatforms(this.highestPlatformY);
    }

    // Удаление старых платформ
    const cameraBottom = this.cameras.main.scrollY + this.cameras.main.height;

    this.platforms = this.platforms.filter(platform => {
        // Проверяем, что платформа существует и не уничтожена
        if (!platform || !platform.sprite || !platform.sprite.body) return false;

        if (platform.sprite.y > cameraBottom + 300) {
            // Сначала удаляем физическое тело, потом спрайт
            if (platform.sprite.body) {
                this.matter.world.remove(platform.sprite.body);
            }

            platform.sprite.destroy();
            return false;
        }

        return true;
    });
}


    generateAdditionalPlatforms(startY) {
        let y = startY;
        const endY = startY - 1000;
        for (; y > endY; y -= 150 + Math.random() * 100) {
            const x = 100 + Math.random() * 1800;
            this.addPlatform(x, y);
        }
        this.highestPlatformY = y;
    }

    addPlatform(x, y) {
        const platformId = this.platformIdCounter++;
        const platformSprite = this.add.rectangle(x, y, 200, 30, 0x00ff00);
        const platformGameObject = this.matter.add.gameObject(platformSprite, {
            isStatic: true, restitution: 0, friction: 1, label: `platform_${platformId}`
        });
        const platform = { id: platformId, sprite: platformSprite, body: platformGameObject.body };
        this.platforms.push(platform);
        return platform;
    }

    handlePlayerMovement() {
        const isLeftPressed = this.cursors.left.isDown || this.keyA.isDown || this.leftPressed;
        const isRightPressed = this.cursors.right.isDown || this.keyD.isDown || this.rightPressed;
        const isJumpPressed = this.cursors.space.isDown || this.cursors.up.isDown || this.keyW.isDown;

        const currentVelocity = this.player.body.velocity;
        let targetVelocityX = 0;

        if (isLeftPressed) {
            targetVelocityX = -5;
            this.playerSprite.scaleX = -1;
        } else if (isRightPressed) {
            targetVelocityX = 5;
            this.playerSprite.scaleX = 1;
        } else {
            targetVelocityX = currentVelocity.x * 0.9;
        }

        this.matter.body.setVelocity(this.player.body, { x: targetVelocityX, y: currentVelocity.y });

        if (isJumpPressed) {
            this.jump();
        }
    }

    jump() {
        if (this.canJump && !this.isDead) {
            this.matter.body.setVelocity(this.player.body, { x: this.player.body.velocity.x, y: -15 });
            this.canJump = false;
            // Анимации и эффекты прыжка...
        }
    }

    setupCollisionHandlers() {
        this.matter.world.on('collisionstart', (event) => {
            for (const pair of event.pairs) {
                const playerBody = this.player.body;
                let platformBody = null;
                if (pair.bodyA === playerBody) platformBody = pair.bodyB;
                else if (pair.bodyB === playerBody) platformBody = pair.bodyA;

                if (platformBody && pair.collision.normal.y < 0) {
                    this.canJump = true;
                    const platform = this.platforms.find(p => p.body === platformBody);
                    if (platform && !this.visitedPlatforms.has(platform.id)) {
                        this.visitedPlatforms.add(platform.id);
                        this.addScore(10);
                    }
                }
            }
        });

        this.matter.world.on('collisionend', (event) => {
            // ... логика проверки, если игрок покинул платформу
        });
    }

    addScore(points) {
        this.score += points;
        this.events.emit('updateScore', this.score); // Отправляем событие в UIScene
    }

    checkHeightScore() {
        const heightScore = Math.max(0, Math.floor((800 - this.playerSprite.y) / 500));
        if (heightScore > this.lastHeightScore) {
            this.lastHeightScore = heightScore;
            this.addScore(50);
            this.cameras.main.flash(200, 255, 255, 100);
        }
    }

    checkDeathCondition() {
    if (this.playerSprite.y > 9500) {
        this.death();
        }
    }

death() {
    if (this.isDead) return;
    this.isDead = true;
    console.log("death() вызвана"); // Проверка

    // Прозрачность игрока (если поддерживается)
    if (this.player && this.player.setAlpha) {
        this.player.setAlpha(0.3);
    }

    // Остановка физики
    if (this.matter && this.matter.world) {
        this.matter.world.enabled = false; // вместо pause(), надёжнее
    }

    // DOM элементы
    const deathScreen = document.getElementById('death-screen');
    const finalScoreValue = document.getElementById('finalScoreValue');
    const restartBtn = document.getElementById('restartBtn');

    if (!deathScreen || !finalScoreValue || !restartBtn) {
        console.warn("⚠️ death-screen элементы не найдены!");
        return;
    }

    // Обновляем счёт
    finalScoreValue.textContent = this.score || 0;

    // Показываем экран смерти
    deathScreen.classList.remove('hidden');
    console.log("death-screen показан");

    // Слушатель кнопки "Начать заново"
    restartBtn.onclick = () => {
        console.log("Нажата кнопка 'Начать заново'");
        deathScreen.classList.add('hidden');
        if (this.player && this.player.setAlpha) {
            this.player.setAlpha(1);
        }
        this.isDead = false;

        // Возвращаем физику
        if (this.matter && this.matter.world) {
            this.matter.world.enabled = true;
        }

        // Перезапуск сцены
        this.scene.restart();
    };
}



submitScoreToTelegram() {
    const score = this.score;

    if (window.Telegram?.WebApp) {
        Telegram.WebApp.sendData(JSON.stringify({ score }));
        // НЕ закрываем окно Telegram
    }

    // Перезапуск игры после задержки
    this.time.delayedCall(1000, () => {
        this.scene.restart();
    });
}


}
