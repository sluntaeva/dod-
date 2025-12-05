/*
 * PlatformManager (Rewritten)
 * - Robust platform generation and pooling
 * - Safe Matter.js integration (store gameObject, use scene.matter.setPosition)
 * - Clear handling of moving and breakable platforms
 * - Deterministic highestPlatformY tracking
 * - Register collision handler helper for player collisions
 * - Cleanup and resource-safe destruction
 *
 * Usage:
 * const pm = new PlatformManager(this, difficultyManager, config);
 * const start = pm.initialize(player.x, player.y);
 * // in scene.update(time, delta): pm.update(player.y, delta);
 * // To connect collisions: pm.registerPlayerBody(player.body, (res) => { ... });
 */

class PlatformManager {
    constructor(scene, difficultyManager, config = {}) {
        this.scene = scene;
        this.difficultyManager = difficultyManager;

        // Configurable parameters
        this.config = Object.assign({
            startPlatformOffsetY: 100,
            platformHeight: 28,
            platformPaddingX: 100,
            generationDistance: 1500,
            batchSize: 5,
            maxJumpDistance: 250,
            cleanupBuffer: 500,
            poolGrowStep: 10
        }, config);

        // State
        this.platforms = [];                 // active platforms (objects)
        this.platformPool = [];              // recycled platform objects
        this.platformIdCounter = 0;
        this.visitedPlatforms = new Set();   // for scoring
        this.highestPlatformY = Infinity;    // smallest y is highest on screen

        // Internal assets
        this._collisionCallback = null;
        this._playerBody = null;

        // Bind collision handler if needed
        this._onCollisionStart = this._onCollisionStart.bind(this);
        this.scene.matter.world.on('collisionstart', this._onCollisionStart);
    }

    /* ------------------- Public API ------------------- */

    initialize(playerStartX, playerStartY) {
        // Create a safe starting platform under player
        const startY = playerStartY + this.config.startPlatformOffsetY;
        const startPlatform = this._spawnPlatform(playerStartX, startY, {
            isBreakable: false,
            isMoving: false,
            width: 200
        });

        this.visitedPlatforms.add(startPlatform.id);

        // Generate initial set
        this._generateInitialPlatforms();

        return startPlatform;
    }

    registerPlayerBody(playerBody, callbackWhenLanding) {
        this._playerBody = playerBody;
        this._collisionCallback = callbackWhenLanding || null;
    }

    update(playerY, delta) {
        // Ensure generation ahead of player
        const generationThreshold = playerY - this.config.generationDistance;
        if (this.highestPlatformY > generationThreshold) {
            this._generatePlatformsAhead();
        }

        this._updateMovingPlatforms(delta);
        this._cleanupOldPlatforms();
    }

    getPlatformById(id) {
        return this.platforms.find(p => p.id === id) || null;
    }

    handlePlatformCollision(platformIdentifier) {
        // Find platform by various possible identifiers
        let platform = null;
        
        if (typeof platformIdentifier === 'string' && platformIdentifier.startsWith('platform_')) {
            // Label format: "platform_123"
            const id = parseInt(platformIdentifier.replace('platform_', ''));
            platform = this.platforms.find(p => p.id === id);
        } else if (typeof platformIdentifier === 'number') {
            // Direct platform ID
            platform = this.platforms.find(p => p.id === platformIdentifier);
        } else if (typeof platformIdentifier === 'object') {
            // Body object passed directly
            platform = this.platforms.find(p => p.body === platformIdentifier);
        }

        if (!platform) {
            console.warn('PlatformManager: Could not find platform for identifier:', platformIdentifier);
            return null;
        }

        // Check if this is a new platform visit
        const isNewPlatform = !this.visitedPlatforms.has(platform.id);
        if (isNewPlatform) {
            this.visitedPlatforms.add(platform.id);
        }

        // Handle breakable platform
        if (platform.isBreakable) {
            this._breakPlatform(platform);
        }

        // Calculate points
        const points = isNewPlatform ? (platform.isMoving ? 15 : 10) : 0;

        return {
            platform: platform,
            isNewPlatform: isNewPlatform,
            points: points
        };
    }

    cleanup() {
        // Remove collision listener
        this.scene.matter.world.off('collisionstart', this._onCollisionStart);

        // Destroy all active platforms
        while (this.platforms.length) {
            this._destroyPlatform(this.platforms.pop());
        }

        // Destroy pool objects
        while (this.platformPool.length) {
            const p = this.platformPool.pop();
            if (p.sprite && p.sprite.destroy) p.sprite.destroy();
        }

        this.visitedPlatforms.clear();
        this._playerBody = null;
        this._collisionCallback = null;
    }

    /* ------------------- Internal utilities ------------------- */

    _generateInitialPlatforms() {
        const screenWidth = this.scene.scale.width;
        let y = 700;

        // Tutorial safe platforms
        for (let i = 0; i < 5; i++) {
            const x = Phaser.Math.Between(this.config.platformPaddingX, screenWidth - this.config.platformPaddingX);
            this._spawnPlatform(x, y, { isBreakable: false, isMoving: false, width: 200 });
            y -= Phaser.Math.Between(120, 150);
        }

        // Progressive platforms until we reach generation distance
        while (y > -this.config.generationDistance) {
            const x = Phaser.Math.Between(this.config.platformPaddingX, screenWidth - this.config.platformPaddingX);
            this._spawnPlatform(x, y);

            const difficulty = this.difficultyManager.getDifficultyParams(y);
            y -= Phaser.Math.Between(difficulty.minGap, difficulty.maxGap);
        }

        // Recalculate exact highest platform
        this.highestPlatformY = this._getHighestPlatformY();
    }

    _generatePlatformsAhead() {
        const screenWidth = this.scene.scale.width;

        for (let i = 0; i < this.config.batchSize; i++) {
            const difficulty = this.difficultyManager.getDifficultyParams(this.highestPlatformY);
            const gap = Phaser.Math.Between(difficulty.minGap, difficulty.maxGap);
            const newY = this.highestPlatformY - gap;

            const newX = this._calculateReachableX(newY, gap, screenWidth);
            this._spawnPlatform(newX, newY);

            // Update highestPlatformY deterministically
            this.highestPlatformY = Math.min(this.highestPlatformY, newY);
        }
    }

    _calculateReachableX(newY, gap, screenWidth) {
        // pick a random candidate
        let candidateX = Phaser.Math.Between(this.config.platformPaddingX, screenWidth - this.config.platformPaddingX);

        // find platforms that are approximately at the previous height (newY + gap)
        const prevY = newY + gap;
        const prevPlatforms = this.platforms.filter(p => Math.abs(p.sprite.y - prevY) < 60);

        if (prevPlatforms.length > 0) {
            // choose the platform whose x is closest to a random candidate (more deterministic reachable)
            let closest = prevPlatforms[0];
            let bestDist = Math.abs(prevPlatforms[0].sprite.x - candidateX);
            for (let p of prevPlatforms) {
                const d = Math.abs(p.sprite.x - candidateX);
                if (d < bestDist) { bestDist = d; closest = p; }
            }

            const minX = Math.max(this.config.platformPaddingX, closest.sprite.x - this.config.maxJumpDistance);
            const maxX = Math.min(screenWidth - this.config.platformPaddingX, closest.sprite.x + this.config.maxJumpDistance);
            candidateX = Phaser.Math.Between(minX, maxX);
        }

        return candidateX;
    }

    _spawnPlatform(x, y, forced = null) {
        // Reuse from pool when possible
        let platform = null;
        if (this.platformPool.length) {
            platform = this.platformPool.pop();
            // reset properties
            platform.sprite.setPosition(x, y);
            platform.sprite.setActive(true).setVisible(true);
            // Re-add body to world if it was removed
            if (!platform.body || !platform.body.world) {
                const go = this.scene.matter.add.gameObject(platform.sprite, { isStatic: true });
                platform.body = go.body;
            } else {
                // update body position
                Phaser.Physics.Matter.Matter.Body.setPosition(platform.body, {
                    x: platform.sprite.x,
                    y: platform.sprite.y
                });
            }

            platform.isBreaking = false;
            platform.breakTween = null;
        }

        if (!platform) {
            platform = this._createPlatform(x, y, forced);
        } else {
            // override fields if forced params provided
            if (forced) {
                platform.isBreakable = forced.isBreakable ?? platform.isBreakable;
                platform.isMoving = forced.isMoving ?? platform.isMoving;
                platform.width = forced.width ?? platform.width;
                platform.sprite.displayWidth = platform.width;
            }
        }

        // configure moving platform after (might set boundaries based on current sprite position)
        if (platform.isMoving && !platform.hasMovementConfigured) {
            this._configureMovingPlatform(platform, this.difficultyManager.getDifficultyParams(y));
            platform.hasMovementConfigured = true;
        }

        this.platforms.push(platform);

        // Keep highestPlatformY accurate
        this.highestPlatformY = Math.min(this.highestPlatformY, y);

        return platform;
    }

    _createPlatform(x, y, forced = null) {
        const platformId = this.platformIdCounter++;
        const difficulty = this.difficultyManager.getDifficultyParams(y);

        const width = forced?.width || Phaser.Math.Between(difficulty.minWidth, difficulty.maxWidth);
        const height = this.config.platformHeight;
        const isBreakable = forced?.isBreakable ?? (Math.random() < difficulty.breakableChance);
        const isMoving = forced?.isMoving ?? (Math.random() < difficulty.movingChance);

        const color = this._getPlatformColor(isBreakable, isMoving);

        // create rectangle sprite (Phaser Game Object)
        const sprite = this.scene.add.rectangle(x, y, width, height, color);
        sprite.setOrigin(0.5, 0.5);

        // create matter body attached to sprite (gameObject)
        const gameObject = this.scene.matter.add.gameObject(sprite, {
            isStatic: true,
            restitution: 0,
            friction: 1,
            label: `platform_${platformId}`
        });

        const platform = {
            id: platformId,
            sprite: sprite,
            body: gameObject.body,   // keep the Matter Body
            isBreakable,
            isMoving,
            difficultyLevel: difficulty.difficultyLevel,
            width,
            height,
            isBreaking: false,
            breakTween: null,
            hasMovementConfigured: false
        };

        // configure movement if needed
        if (isMoving) this._configureMovingPlatform(platform, difficulty);

        return platform;
    }

    _getPlatformColor(isBreakable, isMoving) {
        if (isBreakable) return 0xff6666;
        if (isMoving) return 0xffaa00;
        return 0x00ff00;
    }

    _configureMovingPlatform(platform, difficulty) {
        platform.direction = Math.random() < 0.5 ? 1 : -1;
        platform.speed = Phaser.Math.FloatBetween(difficulty.minSpeed || 0.4, difficulty.maxSpeed || 1.2);

        const verticalChance = Math.min(0.2 + (platform.difficultyLevel || 0) * 0.05, 0.5);
        platform.axis = Math.random() < verticalChance ? 'y' : 'x';

        if (platform.axis === 'x') {
            platform.minX = this.config.platformPaddingX;
            platform.maxX = this.scene.scale.width - this.config.platformPaddingX;
        } else {
            platform.minY = platform.sprite.y - 100;
            platform.maxY = platform.sprite.y + 100;
        }
    }

    _updateMovingPlatforms(delta) {
        // delta in ms
        const dt = delta / 16.6667; // normalize to roughly 60fps steps

        for (let platform of this.platforms) {
            if (!platform || !platform.sprite || !platform.sprite.active) continue;
            if (!platform.isMoving) continue;

            if (platform.axis === 'x') {
                platform.sprite.x += platform.speed * platform.direction * dt;
                if (platform.sprite.x <= platform.minX || platform.sprite.x >= platform.maxX) {
                    platform.direction *= -1;
                }
            } else {
                platform.sprite.y += platform.speed * platform.direction * dt;
                if (platform.sprite.y <= platform.minY || platform.sprite.y >= platform.maxY) {
                    platform.direction *= -1;
                }
            }

            // Sync physics body safely
            try {
                if (platform.body && this.scene.matter) {
                    Phaser.Physics.Matter.Matter.Body.setPosition(platform.body, {
                        x: platform.sprite.x,
                        y: platform.sprite.y
                    });
                }
            } catch (e) {
                console.warn('PlatformManager: failed to set body position', e);
            }
        }
    }

    _cleanupOldPlatforms() {
        const cameraBottom = this.scene.cameras.main.scrollY + this.scene.cameras.main.height;
        const buffer = this.config.cleanupBuffer;

        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const p = this.platforms[i];
            if (!p || !p.sprite) {
                this.platforms.splice(i, 1);
                continue;
            }

            if (p.sprite.y > cameraBottom + buffer) {
                this._removePlatformFromList(p);
            }
        }
    }

    _breakPlatform(platform) {
        if (!platform || platform.isBreaking) return;
        platform.isBreaking = true;

        // play small break animation then destroy
        platform.breakTween = this.scene.tweens.add({
            targets: platform.sprite,
            alpha: { from: 1, to: 0.3 },
            scaleX: { from: 1, to: 0.85 },
            scaleY: { from: 1, to: 0.85 },
            duration: 250,
            yoyo: true,
            repeat: 0,
            onComplete: () => {
                this._removePlatformFromList(platform);
            }
        });
    }

    _destroyPlatform(platform) {
        if (!platform) return;

        // stop tweens
        if (platform.breakTween && platform.breakTween.isPlaying()) {
            platform.breakTween.stop();
        }

        try {
            // remove body from world
            if (platform.body && platform.body.world) {
                this.scene.matter.world.remove(platform.body);
            }
        } catch (e) {
            console.warn('PlatformManager: error removing body', e);
        }

        try {
            if (platform.sprite && platform.sprite.destroy) platform.sprite.destroy();
        } catch (e) {
            console.warn('PlatformManager: error destroying sprite', e);
        }
    }

    _removePlatformFromList(platform) {
        // remove from active array
        const idx = this.platforms.indexOf(platform);
        if (idx !== -1) this.platforms.splice(idx, 1);

        // fully destroy or recycle into pool
        if (platform.isBreakable || platform._doNotPool) {
            this._destroyPlatform(platform);
        } else {
            // recycle: hide and store
            try {
                if (platform.sprite) {
                    platform.sprite.setActive(false).setVisible(false);
                }
                if (platform.body && platform.body.world) {
                    // detach body from world in order to avoid duplicates; Phaser doesn't have "removeGameObject" for bodies, so remove body
                    this.scene.matter.world.remove(platform.body);
                    platform.body = null;
                }
            } catch (e) {
                console.warn('PlatformManager: recycle failed', e);
            }

            this.platformPool.push(platform);

            // ensure pool doesn't endlessly grow uncontrolled (optional)
            if (this.platformPool.length > this.config.poolGrowStep * 20) {
                // destroy extras
                const extra = this.platformPool.splice(0, this.config.poolGrowStep);
                for (let p of extra) {
                    if (p.sprite && p.sprite.destroy) p.sprite.destroy();
                }
            }
        }
    }

    _onCollisionStart(event) {
        if (!this._playerBody || !this._collisionCallback) return;

        const pairs = event.pairs;
        for (let pair of pairs) {
            const { bodyA, bodyB } = pair;
            if (bodyA === this._playerBody || bodyB === this._playerBody) {
                // identify the other body
                const other = bodyA === this._playerBody ? bodyB : bodyA;
                // find the platform object
                const platform = this.platforms.find(p => p.body === other);
                if (platform) {
                    const isNew = !this.visitedPlatforms.has(platform.id);
                    if (isNew) this.visitedPlatforms.add(platform.id);

                    if (platform.isBreakable) this._breakPlatform(platform);

                    const points = isNew ? (platform.isMoving ? 15 : 10) : 0;

                    // call user callback with result
                    try {
                        this._collisionCallback({ platform, isNew, points });
                    } catch (e) {
                        console.warn('PlatformManager: user collision callback error', e);
                    }
                }
            }
        }
    }

    _getHighestPlatformY() {
        if (!this.platforms.length) return Infinity;
        return this.platforms.reduce((minY, p) => Math.min(minY, p.sprite.y), Infinity);
    }
}
window.PlatformManager = PlatformManager;
