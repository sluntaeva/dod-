// js/scenes/GameScene.js
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerColor = parseInt(localStorage.getItem('playerColor')) || 0xff3366;
        this.platforms = [];
        this.platformIdCounter = 0;
        this.enemies = [];
    }

    create() {
        // Инициализация переменных
        this.score = 0;
        this.visitedPlatforms = new Set();
        this.lastHeightScore = 0;
        this.isDead = false;
        this.highestPlatformY = 800;
        this.canJump = false;

        // Настройка мира
        this.matter.world.setBounds(0, 0, 2000, 10000, 64, false, true, false, false);

        // Создание игрока
        const playerStartX = 150;
        const playerStartY = 800;
        this.playerSprite = this.add.rectangle(playerStartX, playerStartY, 40, 60, this.playerColor);
        this.arrow = this.add.triangle(playerStartX, playerStartY - 60, 0, 30, 15, 0, -15, 0, 0xffcc00);
        this.arrow.setOrigin(0.5, 1);

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
        this.generateInitialEnemies(); // добавляем врагов

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

        // Запустить/поднять UIScene
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        } else {
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
        this.updateArrow();
        this.updateEnemies();
    }

    // --- Платформы ---
    generateInitialPlatforms() {
        const startY = 700;
        const endY = -1000;
        const spacingMin = 100;
        const spacingMax = 160;
        const screenWidth = this.scale.width;

        this.platforms = [];

        let y = startY;
        while (y > endY) {
            const x = Phaser.Math.Between(100, screenWidth - 100);
            this.addPlatform(x, y);
            y -= Phaser.Math.Between(spacingMin, spacingMax);
        }

        this.highestPlatformY = endY;
    }

    managePlatforms() {
        const cameraTop = this.cameras.main.scrollY;

        if (this.playerSprite.y < this.highestPlatformY + 800) {
            this.generateAdditionalPlatforms();
        }

        const cameraBottom = this.cameras.main.scrollY + this.cameras.main.height;

        this.platforms = this.platforms.filter(platform => {
            if (!platform || !platform.sprite || !platform.sprite.body) return false;

            if (platform.sprite.y > cameraBottom + 300) {
                if (platform.breakTween && platform.breakTween.isPlaying()) platform.breakTween.stop();
                if (platform.sprite.body && this.matter && this.matter.world) {
                    try { this.matter.world.remove(platform.sprite.body); } catch {}
                }
                if (platform.sprite && platform.sprite.destroy) platform.sprite.destroy();

                // Удаляем врагов на этой платформе
                this.enemies = this.enemies.filter(enemy => {
                    if (enemy.platformId === platform.id) {
                        if (enemy.sprite && enemy.sprite.destroy) enemy.sprite.destroy();
                        return false;
                    }
                    return true;
                });

                return false;
            }

            return true;
        });
    }

    addPlatform(x, y) {
        const platformId = this.platformIdCounter++;
        const minWidth = 100;
        const maxWidth = 300;
        const width = Phaser.Math.Between(minWidth, maxWidth);
        const height = 30;
        const isBreakable = Math.random() < 0.2;
        const color = isBreakable ? 0xff6666 : 0x00ff00;

        const platformSprite = this.add.rectangle(x, y, width, height, color);
        const platformGameObject = this.matter.add.gameObject(platformSprite, {
            isStatic: true,
            restitution: 0,
            friction: 1,
            label: `platform_${platformId}`
        });

        const platform = {
            id: platformId,
            sprite: platformSprite,
            body: platformGameObject.body,
            isBreakable
        };

        this.platforms.push(platform);
        return platform;
    }

    generateAdditionalPlatforms() {
        const platformSpacingMin = 100;
        const platformSpacingMax = 180;
        const screenWidth = this.scale.width;

        for (let i = 0; i < 5; i++) {
            const gap = Phaser.Math.Between(platformSpacingMin, platformSpacingMax);
            const newY = this.highestPlatformY - gap;
            if (newY < -10000) break;

            const newX = Phaser.Math.Between(100, screenWidth - 100);
            const newPlatform = this.addPlatform(newX, newY);
            this.highestPlatformY = newY;

            // С шансом 30% создаем врага на новой платформе
            if (Math.random() < 0.3) {
                this.addEnemyOnPlatform(newPlatform);
            }
        }
    }

    // --- Игрок ---
    handlePlayerMovement() {
        const isLeftPressed = this.cursors.left.isDown || this.keyA.isDown;
        const isRightPressed = this.cursors.right.isDown || this.keyD.isDown;
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

        if (isJumpPressed) this.jump();
    }

    jump() {
        if (this.canJump && !this.isDead) {
            this.matter.body.setVelocity(this.player.body, { x: this.player.body.velocity.x, y: -15 });
            this.canJump = false;
        }
    }

    setupCollisionHandlers() {
        this.matter.world.on('collisionstart', (event) => {
            for (const pair of event.pairs) {
                const playerBody = this.player.body;
                let platformBody = null;

                if (pair.bodyA === playerBody) platformBody = pair.bodyB;
                else if (pair.bodyB === playerBody) platformBody = pair.bodyA;

                if (platformBody && platformBody.label?.startsWith('platform_')) {
                    const vy = playerBody.velocity.y;
                    if (vy < 0) { pair.isActive = false; continue; }

                    const relativeY = playerBody.position.y - platformBody.position.y;
                    if (relativeY < 30 && playerBody.velocity.y > 0) {
                        this.canJump = true;
                        const platform = this.platforms.find(p => p.body && p.body.id === platformBody.id);
                        if (platform) {
                            if (platform.isBreakable) this.breakPlatform(platform);
                            if (!this.visitedPlatforms.has(platform.id)) {
                                this.visitedPlatforms.add(platform.id);
                                this.addScore(10);
                            }
                        }
                    } else {
                        pair.isActive = false;
                    }
                }
            }
        });
    }

    breakPlatform(platform) {
        if (!platform || !platform.sprite || !platform.sprite.active) return;
        if (platform.isBreaking) return;
        platform.isBreaking = true;

        const sprite = platform.sprite;

        const breakTween = this.tweens.add({
            targets: sprite,
            alpha: { from: 1, to: 0.3 },
            scaleX: { from: 1, to: 0.8 },
            scaleY: { from: 1, to: 0.8 },
            duration: 250,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                if (sprite && sprite.active && !sprite.scene?.sys?.isDestroyed) {
                    if (breakTween && breakTween.isPlaying()) breakTween.stop();
                    if (platform.body && this.matter && this.matter.world) {
                        try { this.matter.world.remove(platform.body); } catch {}
                    }
                    try { sprite.destroy(); } catch {}
                    this.platforms = this.platforms.filter(p => p.id !== platform.id);
                }
            }
        });

        platform.breakTween = breakTween;
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
            this.cameras.main.flash(200, 255, 255, 100);
        }
    }

    checkDeathCondition() {
        if (this.playerSprite.y > 9500) this.death();
    }

    death() {
        if (this.isDead) return;
        this.isDead = true;
        this.cleanupPlatforms();
        if (this.player && this.player.setAlpha) this.player.setAlpha(0.3);
        if (this.matter && this.matter.world) this.matter.world.enabled = false;

        const deathScreen = document.getElementById('death-screen');
        const finalScoreValue = document.getElementById('finalScoreValue');
        const restartBtn = document.getElementById('restartBtn');
        if (!deathScreen || !finalScoreValue || !restartBtn) return;

        finalScoreValue.textContent = this.score || 0;
        deathScreen.classList.remove('hidden');

        restartBtn.onclick = () => {
            deathScreen.classList.add('hidden');
            if (this.player && this.player.setAlpha) this.player.setAlpha(1);
            this.isDead = false;
            if (this.matter && this.matter.world) this.matter.world.enabled = true;
            this.scene.restart();
        };
    }

    submitScoreToTelegram() {
        const score = this.score;
        if (window.Telegram?.WebApp) Telegram.WebApp.sendData(JSON.stringify({ score }));
        this.time.delayedCall(1000, () => this.scene.restart());
    }

    cleanupPlatforms() {
        if (this.platforms && this.platforms.length > 0) {
            this.platforms.forEach(platform => {
                if (platform.breakTween && platform.breakTween.isPlaying()) platform.breakTween.stop();
            });
        }
        if (this.tweens) this.tweens.killAll();
    }

    shutdown() { this.cleanupPlatforms(); }

    // --- Вспомогательные методы ---
    updateArrow() {
        if (!this.arrow || !this.playerSprite) return;
        this.arrow.x = this.playerSprite.x;
        this.arrow.y = this.playerSprite.y - 70;

        const isLeftPressed = this.cursors.left.isDown || this.keyA.isDown;
        const isRightPressed = this.cursors.right.isDown || this.keyD.isDown;

        if (isLeftPressed) this.arrow.rotation = Phaser.Math.DegToRad(-150);
        else if (isRightPressed) this.arrow.rotation = Phaser.Math.DegToRad(-30);
        else this.arrow.rotation = Phaser.Math.DegToRad(-90);
    }

    // --- Враги ---
    generateInitialEnemies() {
        this.platforms.forEach(platform => {
            if (Math.random() < 0.3) this.addEnemyOnPlatform(platform);
        });
    }

    addEnemyOnPlatform(platform) {
        if (!platform || !platform.sprite) return;

        const enemyX = Phaser.Math.Between(platform.sprite.x - platform.sprite.width/2 + 20, platform.sprite.x + platform.sprite.width/2 - 20);
        const enemyY = platform.sprite.y - 25;

        const enemySprite = this.add.circle(enemyX, enemyY, 20, 0xff00ff);
        const enemy = this.matter.add.gameObject(enemySprite, {
            isStatic: false,
            restitution: 0.2,
            friction: 0.1,
            label: 'enemy'
        });
        enemy.setVelocityX(Phaser.Math.Between(-1, 1));
        enemy.body.frictionAir = 0.05;

        const enemyData = {
            sprite: enemySprite,
            body: enemy.body,
            platformId: platform.id,
            direction: Math.random() < 0.5 ? -1 : 1,
            speed: Phaser.Math.Between(1, 2)
        };

        this.enemies.push(enemyData);
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

window.GameScene = GameScene;

