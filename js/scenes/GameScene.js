class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerColor = parseInt(localStorage.getItem('playerColor')) || 0xff3366;
        this.platforms = [];
        this.platformIdCounter = 0;
        this.enemies = [];

        // Флаги для мобильных кнопок
        this.leftPressed = false;
        this.rightPressed = false;
        this.jumpPressed = false;
    }

    create() {
        // --- Инициализация ---
        this.platforms = [];
        this.enemies = [];
        this.platformIdCounter = 0;

        this.score = 0;
        this.visitedPlatforms = new Set();
        this.lastHeightScore = 0;
        this.isDead = false;
        this.highestPlatformY = 800;
        this.canJump = false;

        this.setupMobileControls();

        // Границы мира
        this.matter.world.setBounds(0, 0, 2000, 10000, 64, false, true, false, false);

        // Игрок
        const playerStartX = 150;
        const playerStartY = 800;
        this.playerSprite = this.add.rectangle(playerStartX, playerStartY, 40, 60, this.playerColor);
        this.player = this.matter.add.gameObject(this.playerSprite, {
            restitution: 0.2,
            friction: 0.05,
            label: 'player',
            inertia: Infinity
        });

        // Начальные платформы
        const startPlatform = this.addPlatform(playerStartX, playerStartY + 100);
        this.visitedPlatforms.add(startPlatform.id);
        this.generateInitialPlatforms();
        this.generateInitialEnemies();

        // Камера
        this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
        this.cameras.main.setBackgroundColor('#87ceeb');

        // Клавиши
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // Коллизии
        this.setupCollisionHandlers();

        // Обновление UI
        this.events.emit('updateScore', this.score);

        // Запуск UIScene, если ещё не активна
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
    }

    setupMobileControls() {
        const btnLeft = document.getElementById('btnLeft');
        const btnRight = document.getElementById('btnRight');
        const btnJump = document.getElementById('btnJump');

        if (!btnLeft || !btnRight || !btnJump) return;

        // Влево
        btnLeft.addEventListener('touchstart', () => this.leftPressed = true);
        btnLeft.addEventListener('touchend', () => this.leftPressed = false);
        btnLeft.addEventListener('mousedown', () => this.leftPressed = true);
        btnLeft.addEventListener('mouseup', () => this.leftPressed = false);
        btnLeft.addEventListener('mouseleave', () => this.leftPressed = false);

        // Вправо
        btnRight.addEventListener('touchstart', () => this.rightPressed = true);
        btnRight.addEventListener('touchend', () => this.rightPressed = false);
        btnRight.addEventListener('mousedown', () => this.rightPressed = true);
        btnRight.addEventListener('mouseup', () => this.rightPressed = false);
        btnRight.addEventListener('mouseleave', () => this.rightPressed = false);

        // Прыжок
        btnJump.addEventListener('touchstart', () => this.jumpPressed = true);
        btnJump.addEventListener('touchend', () => this.jumpPressed = false);
        btnJump.addEventListener('mousedown', () => this.jumpPressed = true);
        btnJump.addEventListener('mouseup', () => this.jumpPressed = false);
        btnJump.addEventListener('mouseleave', () => this.jumpPressed = false);
    }

    update() {
        if (this.isDead) return;

        this.handlePlayerMovement();
        this.checkDeathCondition();
        this.checkHeightScore();
        this.managePlatforms();
        this.updateEnemies();
    }

    // --- Платформы ---
    addPlatform(x, y) {
        const platformId = this.platformIdCounter++;
        const width = Phaser.Math.Between(100, 300);
        const height = 30;
        const isBreakable = Math.random() < 0.2;
        const color = isBreakable ? 0xff6666 : 0x00ff00;

        const platformSprite = this.add.rectangle(x, y, width, height, color);
        const platformObj = this.matter.add.gameObject(platformSprite, {
            isStatic: true,
            label: `platform_${platformId}` // важная метка для прыжков
        });

        const platform = { id: platformId, sprite: platformSprite, body: platformObj.body, isBreakable };
        this.platforms.push(platform);
        return platform;
    }

    generateInitialPlatforms() {
        const startY = 700;
        const endY = -1000;
        let y = startY;
        const screenWidth = this.scale.width;
        while (y > endY) {
            const x = Phaser.Math.Between(100, screenWidth - 100);
            this.addPlatform(x, y);
            y -= Phaser.Math.Between(100, 160);
        }
        this.highestPlatformY = endY;
    }

    managePlatforms() {
        const cameraBottom = this.cameras.main.scrollY + this.cameras.main.height;

        this.platforms = this.platforms.filter(platform => {
            if (!platform || !platform.sprite || !platform.sprite.body) return false;
            if (platform.sprite.y > cameraBottom + 300) {
                if (platform.body && this.matter.world) this.matter.world.remove(platform.body);
                if (platform.sprite && platform.sprite.destroy) platform.sprite.destroy();
                return false;
            }
            return true;
        });
    }

    // --- Игрок ---
    handlePlayerMovement() {
        const isLeft = this.cursors.left.isDown || this.keyA.isDown || this.leftPressed;
        const isRight = this.cursors.right.isDown || this.keyD.isDown || this.rightPressed;
        const isJump = (this.cursors.up.isDown || this.keyW.isDown || this.jumpPressed);

        let targetVelocityX = 0;
        if (isLeft) targetVelocityX = -5;
        else if (isRight) targetVelocityX = 5;
        else targetVelocityX = this.player.body.velocity.x * 0.9;

        this.matter.body.setVelocity(this.player.body, { x: targetVelocityX, y: this.player.body.velocity.y });

        if (isJump) this.jump();
    }

    jump() {
        if (this.canJump && !this.isDead) {
            this.matter.body.setVelocity(this.player.body, { x: this.player.body.velocity.x, y: -15 });
            this.canJump = false; // сбрасываем возможность прыжка
        }
    }

    setupCollisionHandlers() {
        this.matter.world.on('collisionstart', (event) => {
            for (const pair of event.pairs) {
                const playerBody = this.player.body;
                let platformBody = pair.bodyA === playerBody ? pair.bodyB : pair.bodyA;

                if (platformBody.label?.startsWith('platform_')) {
                    const relativeY = playerBody.position.y - platformBody.position.y;
                    if (relativeY < 30 && playerBody.velocity.y >= 0) {
                        this.canJump = true;
                        const platform = this.platforms.find(p => p.body.id === platformBody.id);
                        if (platform && !this.visitedPlatforms.has(platform.id)) {
                            this.visitedPlatforms.add(platform.id);
                            this.addScore(10);
                        }
                    }
                }
            }
        });
    }

    addScore(points) {
        this.score += points;
        this.events.emit('updateScore', this.score);
    }

    checkHeightScore() {
        const heightScore = Math.max(0, Math.floor((800 - this.playerSprite.y) / 500));
        if (heightScore > this.lastHeightScore) {
            this.lastHeightScore = heightScore;
            this.addScore(50);
        }
    }

    checkDeathCondition() {
        if (this.playerSprite.y > 9500) this.death();
    }

    death() {
        if (this.isDead) return;
        this.isDead = true;
        if (this.player && this.player.setAlpha) this.player.setAlpha(0.3);

        const deathScreen = document.getElementById('death-screen');
        const finalScore = document.getElementById('finalScoreValue');
        const restartBtn = document.getElementById('restartBtn');

        if (deathScreen && finalScore && restartBtn) {
            finalScore.textContent = this.score || 0;
            deathScreen.classList.remove('hidden');
            restartBtn.onclick = () => {
                deathScreen.classList.add('hidden');
                this.isDead = false;
                if (this.player && this.player.setAlpha) this.player.setAlpha(1);
                this.scene.restart();
            };
        }
    }

    // --- Враги ---
    generateInitialEnemies() {
        this.platforms.forEach(platform => {
            if (Math.random() < 0.3) this.addEnemyOnPlatform(platform);
        });
    }

    addEnemyOnPlatform(platform) {
        if (!platform || !platform.sprite) return;
        const enemyX = Phaser.Math.Between(platform.sprite.x - platform.sprite.width / 2 + 20, platform.sprite.x + platform.sprite.width / 2 - 20);
        const enemyY = platform.sprite.y - 25;
        const enemySprite = this.add.circle(enemyX, enemyY, 20, 0xff00ff);
        const enemy = this.matter.add.gameObject(enemySprite, { isStatic: false, restitution: 0.2, friction: 0.1 });
        enemy.setVelocityX(Phaser.Math.Between(-1, 1));
        enemy.body.frictionAir = 0.05;

        this.enemies.push({ sprite: enemySprite, body: enemy.body, platformId: platform.id, direction: Math.random() < 0.5 ? -1 : 1, speed: Phaser.Math.Between(1, 2) });
    }

    updateEnemies() {
        this.enemies.forEach(enemy => {
            if (!enemy.sprite || !enemy.sprite.active) return;
            enemy.sprite.x += enemy.direction * enemy.speed;

            const platform = this.platforms.find(p => p.id === enemy.platformId);
            if (platform && platform.sprite) {
                const halfWidth = platform.sprite.width / 2;
                if (enemy.sprite.x < platform.sprite.x - halfWidth + 10) enemy.direction = 1;
                if (enemy.sprite.x > platform.sprite.x + halfWidth - 10) enemy.direction = -1;
            }
        });
    }
}

// Глобально
window.GameScene = GameScene;
