/**
 * GameSceneRefactored - Main game scene using manager pattern
 * This refactored version delegates responsibilities to specialized managers
 * for better code organization and maintainability
 */
class GameSceneRefactored extends Phaser.Scene {
    constructor() {
        super('GameScene');
        
        // Initialize managers
        this.difficultyManager = null;
        this.platformManager = null;
        this.enemyManager = null;
        this.playerManager = null;
        this.scoreManager = null;
    }

    /**
     * Create the game scene and initialize all managers
     */
    create() {
        // Initialize the game world
        this.setupGameWorld();
        
        // Create all managers
        this.createManagers();
        
        // Initialize game
        this.initializeGame();
        
        // Setup collision handlers
        this.setupCollisionHandlers();
        
        // Setup camera
        this.setupCamera();
        
        // Launch UI scene
        this.launchUIScene();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup the game world physics
     */
    setupGameWorld() {
        // Configure Matter physics world with extended bounds for infinite gameplay
        this.matter.world.setBounds(0, 0, 2000, 100000, 64, false, true, false, false);
        
        // Set background color
        this.cameras.main.setBackgroundColor('#87ceeb');
    }

    /**
     * Create and initialize all manager instances
     */
    createManagers() {
        // Create managers in dependency order
        this.difficultyManager = new DifficultyManager(this);
        this.scoreManager = new ScoreManager(this);
        this.playerManager = new PlayerManager(this);
        this.platformManager = new PlatformManager(this, this.difficultyManager);
        this.enemyManager = new EnemyManager(this, this.difficultyManager);
    }

    /**
     * Initialize the game state
     */
    initializeGame() {
        // Player starting position
        const playerStartX = 150;
        const playerStartY = 800;
        
        // Initialize score manager
        this.scoreManager.initialize();
        
        // Initialize player
        this.playerManager.initialize(playerStartX, playerStartY);
        
        // Initialize platforms with starting platform
        const startPlatform = this.platformManager.initialize(playerStartX, playerStartY);
        
        // Initialize enemy manager
        this.enemyManager.initialize();
        
        // Spawn initial enemies
        const initialPlatforms = this.platformManager.platforms.slice(1, 10);
        this.enemyManager.spawnEnemiesOnPlatforms(initialPlatforms);
    }

    /**
     * Setup collision detection between game objects
     */
    setupCollisionHandlers() {
        this.matter.world.on('collisionstart', event => {
            this.handleCollisions(event);
        });
    }

    /**
     * Handle collision events
     */
    handleCollisions(event) {
        for (const pair of event.pairs) {
            const playerBody = this.playerManager.player?.body;
            if (!playerBody) continue;
            
            // Determine which body is the player and which is the other object
            const isPlayerA = pair.bodyA === playerBody;
            const otherBody = isPlayerA ? pair.bodyB : pair.bodyA;
            
            // Handle platform collisions
            if (otherBody.label?.startsWith('platform_')) {
                this.handlePlatformCollision(pair, playerBody, otherBody);
            }
            
            // Handle enemy collisions
            else if (otherBody.label?.startsWith('enemy_')) {
                this.handleEnemyCollision(otherBody);
            }
        }
    }

    /**
     * Handle collision between player and platform
     */
    handlePlatformCollision(pair, playerBody, platformBody) {
        // Check if player is landing on platform (not hitting from side/bottom)
        const relativeY = playerBody.position.y - platformBody.position.y;
        const isLanding = playerBody.velocity.y > 0 && relativeY < 30;
        
        if (isLanding) {
            // Enable jumping
            this.playerManager.enableJump();
            
            // Handle platform scoring and effects
            const result = this.platformManager.handlePlatformCollision(platformBody.label);
            
            if (result) {
                // Add score for new platforms
                if (result.isNewPlatform && result.points > 0) {
                    this.scoreManager.scorePlatformVisit(result.platform);
                }
                
                // Spawn enemy on this platform with small chance
                if (result.platform && !result.platform.isBreakable) {
                    const difficulty = this.difficultyManager.getDifficultyParams(result.platform.sprite.y);
                    if (Math.random() < difficulty.enemyChance * 0.5) {
                        this.time.delayedCall(100, () => {
                            this.enemyManager.addEnemyOnPlatform(result.platform);
                        });
                    }
                }
            }
        } else {
            // Cancel collision if not landing properly
            pair.isActive = false;
        }
    }

    /**
     * Handle collision between player and enemy
     */
    handleEnemyCollision(enemyBody) {
        const result = this.enemyManager.handleEnemyCollision(enemyBody.id);
        
        if (result) {
            // Player takes damage and dies (can be modified for health system)
            this.playerManager.die();
            this.onPlayerDeath();
        }
    }

    /**
     * Setup camera to follow player
     */
    setupCamera() {
        if (this.playerManager.playerSprite) {
            this.cameras.main.startFollow(
                this.playerManager.playerSprite,
                true,
                0.1,
                0.1
            );
        }
    }

    /**
     * Launch UI scene for score display
     */
    launchUIScene() {
        this.events.emit('updateScore', this.scoreManager.getScore());
        
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        } else {
            const ui = this.scene.get('UIScene');
            if (ui && ui.showUI) {
                ui.showUI();
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for player death event
        this.events.on('playerDeath', () => {
            this.onPlayerDeath();
        });
        
        // Listen for score updates
        this.events.on('updateScore', (score) => {
            // UI scene will handle this
        });
    }

    /**
     * Main update loop
     */
    update() {
        // Skip if player is dead
        if (this.playerManager.isDead) return;
        
        // Update player
        this.playerManager.update();
        
        // Update platforms based on player position
        const playerPos = this.playerManager.getPosition();
        this.platformManager.update(playerPos.y);
        
        // Update enemies
        this.enemyManager.update();
        
        // Check for height-based scoring
        const currentHeight = 800 - playerPos.y;
        this.scoreManager.addHeightBonus(currentHeight);
        
        // Check difficulty milestones
        const difficultyBonus = this.difficultyManager.checkDifficultyBonus(currentHeight);
        if (difficultyBonus.reached) {
            this.scoreManager.addScore(difficultyBonus.bonus, 'milestone');
        }
    }

    /**
     * Handle player death
     */
    onPlayerDeath() {
        // Save final score
        this.scoreManager.setNewHighScore();
        
        // Clean up platforms
        this.platformManager.cleanup();
        
        // Clean up enemies
        this.enemyManager.cleanup();
        
        // Show death screen
        this.showDeathScreen();
    }

    /**
     * Show death screen UI
     */
    showDeathScreen() {
        const deathScreen = document.getElementById('death-screen');
        const finalScoreValue = document.getElementById('finalScoreValue');
        const restartBtn = document.getElementById('restartBtn');
        
        if (!deathScreen || !finalScoreValue || !restartBtn) return;
        
        // Display final score and stats
        finalScoreValue.textContent = this.scoreManager.getScore();
        
        // Show death screen
        deathScreen.classList.remove('hidden');
        
        // Show additional stats
        this.displayGameStats();
        
        // Setup restart button
        restartBtn.onclick = () => {
            deathScreen.classList.add('hidden');
            this.restartGame();
        };
    }

    /**
     * Display game statistics on death screen
     */
    displayGameStats() {
        const stats = {
            ...this.scoreManager.getStats(),
            ...this.difficultyManager.getStats(),
            ...this.enemyManager.getStats()
        };
        
        // Create or update stats display
        let statsDisplay = document.getElementById('gameStats');
        if (!statsDisplay) {
            statsDisplay = document.createElement('div');
            statsDisplay.id = 'gameStats';
            statsDisplay.style.cssText = 'color: white; margin-top: 20px; font-size: 14px;';
            document.getElementById('death-screen')?.appendChild(statsDisplay);
        }
        
        statsDisplay.innerHTML = `
            <div>High Score: ${stats.highScore}</div>
            <div>Platforms Visited: ${stats.platformsVisited}</div>
            <div>Max Height: ${Math.floor(stats.maxHeight)}m</div>
            <div>Difficulty Level: ${stats.info.name} (${stats.info.level})</div>
            <div>Max Combo: ${stats.maxCombo}</div>
            <div>Achievements: ${stats.achievements.length}</div>
        `;
    }

    /**
     * Restart the game
     */
    restartGame() {
        // Reset player
        this.playerManager.reset();
        
        // Reset difficulty
        this.difficultyManager.reset();
        
        // Restart scene
        this.scene.restart();
    }

    /**
     * Clean up resources on scene shutdown
     */
    shutdown() {
        // Clean up all managers
        this.platformManager?.cleanup();
        this.enemyManager?.cleanup();
        this.playerManager?.cleanup();
        this.scoreManager?.cleanup();
        
        // Remove event listeners
        this.events.off('playerDeath');
        this.events.off('updateScore');
    }

    /**
     * Submit score to external systems (e.g., Telegram)
     */
    submitScoreToTelegram() {
        if (window.Telegram?.WebApp) {
            const finalStats = {
                score: this.scoreManager.getScore(),
                highScore: this.scoreManager.getHighScore(),
                level: this.difficultyManager.currentLevel,
                achievements: this.scoreManager.getStats().achievements
            };
            
            Telegram.WebApp.sendData(JSON.stringify(finalStats));
        }
        
        // Restart after submission
        this.time.delayedCall(1000, () => {
            this.scene.restart();
        });
    }
}