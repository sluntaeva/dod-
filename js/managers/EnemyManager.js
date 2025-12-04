/**
 * EnemyManager - Handles all enemy-related logic
 * Responsibilities:
 * - Enemy spawning on platforms
 * - Enemy movement patterns
 * - Enemy collision detection
 * - Enemy lifecycle management
 */
class EnemyManager {
    constructor(scene, difficultyManager) {
        this.scene = scene;
        this.difficultyManager = difficultyManager;
        this.enemies = [];
        this.enemyIdCounter = 0;
    }

    /**
     * Initialize the enemy manager
     */
    initialize() {
        this.enemies = [];
        this.enemyIdCounter = 0;
    }

    /**
     * Add an enemy on a specific platform
     * @param {Object} platform - The platform to spawn enemy on
     * @returns {Object} The created enemy
     */
    addEnemyOnPlatform(platform) {
        if (!platform || !platform.sprite || platform.isBreakable) {
            return null;
        }

        const enemyId = this.enemyIdCounter++;
        const enemyX = platform.sprite.x;
        const enemyY = platform.sprite.y - 25;
        const radius = 15;

        // Create enemy sprite
        const sprite = this.scene.add.circle(enemyX, enemyY, radius, 0x000000);
        
        // Add physics body
        const body = this.scene.matter.add.gameObject(sprite, {
            shape: 'circle',
            isStatic: false,
            friction: 0,
            frictionAir: 0.001,
            restitution: 0,
            label: `enemy_${enemyId}`
        });

        // Create enemy object
        const enemy = {
            id: enemyId,
            sprite,
            body: body.body,
            platform,
            speed: Phaser.Math.Between(1, 2),
            direction: Math.random() < 0.5 ? -1 : 1,
            active: true,
            type: 'basic' // Can be extended for different enemy types
        };

        // Add eye visual
        this.addEnemyVisuals(enemy);

        this.enemies.push(enemy);
        return enemy;
    }

    /**
     * Add visual details to enemy
     */
    addEnemyVisuals(enemy) {
        // Add simple eyes to make it look more like an enemy
        const eyeSize = 3;
        const eyeColor = 0xff0000;
        
        // Left eye
        const leftEye = this.scene.add.circle(
            enemy.sprite.x - 5,
            enemy.sprite.y - 3,
            eyeSize,
            eyeColor
        );
        
        // Right eye
        const rightEye = this.scene.add.circle(
            enemy.sprite.x + 5,
            enemy.sprite.y - 3,
            eyeSize,
            eyeColor
        );
        
        // Store references for cleanup
        enemy.leftEye = leftEye;
        enemy.rightEye = rightEye;
    }

    /**
     * Spawn enemies based on difficulty
     * @param {Array} platforms - Array of platforms to potentially spawn enemies on
     */
    spawnEnemiesOnPlatforms(platforms) {
        platforms.forEach(platform => {
            if (!platform || platform.isBreakable) return;
            
            const difficulty = this.difficultyManager.getDifficultyParams(platform.sprite.y);
            
            // Check if we should spawn an enemy
            if (Math.random() < difficulty.enemyChance) {
                // Delay spawn to ensure platform is properly created
                this.scene.time.delayedCall(100, () => {
                    this.addEnemyOnPlatform(platform);
                });
            }
        });
    }

    /**
     * Update all enemies
     */
    update() {
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            // Check if platform still exists
            if (!enemy.platform || !enemy.platform.sprite || !enemy.platform.sprite.active) {
                this.destroyEnemy(enemy);
                return;
            }
            
            // Update enemy position based on movement pattern
            this.updateEnemyMovement(enemy);
            
            // Update visual elements
            this.updateEnemyVisuals(enemy);
        });
        
        // Clean up inactive enemies
        this.cleanupInactiveEnemies();
    }

    /**
     * Update enemy movement
     */
    updateEnemyMovement(enemy) {
        // Basic patrol movement on platform
        enemy.sprite.x += enemy.speed * enemy.direction;
        
        // Get platform boundaries
        const platformLeft = enemy.platform.sprite.x - enemy.platform.width / 2;
        const platformRight = enemy.platform.sprite.x + enemy.platform.width / 2;
        
        // Reverse direction at platform edges
        if (enemy.sprite.x <= platformLeft + 15 || enemy.sprite.x >= platformRight - 15) {
            enemy.direction *= -1;
        }
        
        // Keep enemy on moving platforms
        if (enemy.platform.isMoving) {
            // Update Y position to follow platform
            enemy.sprite.y = enemy.platform.sprite.y - 25;
        }
        
        // Update physics body position
        if (enemy.body && this.scene.matter && this.scene.matter.body) {
            try {
                this.scene.matter.body.setPosition(enemy.body, {
                    x: enemy.sprite.x,
                    y: enemy.sprite.y
                });
            } catch (e) {
                console.warn('Error updating enemy position:', e);
            }
        }
    }

    /**
     * Update enemy visual elements
     */
    updateEnemyVisuals(enemy) {
        if (enemy.leftEye && enemy.rightEye) {
            // Update eye positions
            enemy.leftEye.x = enemy.sprite.x - 5;
            enemy.leftEye.y = enemy.sprite.y - 3;
            enemy.rightEye.x = enemy.sprite.x + 5;
            enemy.rightEye.y = enemy.sprite.y - 3;
            
            // Make eyes look in movement direction
            const offset = enemy.direction * 2;
            enemy.leftEye.x += offset;
            enemy.rightEye.x += offset;
        }
    }

    /**
     * Handle enemy collision with player
     */
    handleEnemyCollision(enemyId) {
        const enemy = this.enemies.find(e => e.body && e.body.id === enemyId);
        
        if (!enemy) return null;
        
        // Destroy the enemy on collision (player takes damage)
        this.destroyEnemy(enemy);
        
        return {
            enemy,
            damage: 1 // Can be adjusted based on enemy type
        };
    }

    /**
     * Destroy an enemy and clean up resources
     */
    destroyEnemy(enemy) {
        enemy.active = false;
        
        // Remove physics body
        if (enemy.body) {
            try {
                this.scene.matter.world.remove(enemy.body);
            } catch (e) {
                console.warn('Error removing enemy body:', e);
            }
        }
        
        // Destroy visual elements
        if (enemy.leftEye) enemy.leftEye.destroy();
        if (enemy.rightEye) enemy.rightEye.destroy();
        if (enemy.sprite) enemy.sprite.destroy();
    }

    /**
     * Clean up inactive enemies from the array
     */
    cleanupInactiveEnemies() {
        const cameraBottom = this.scene.cameras.main.scrollY + this.scene.cameras.main.height;
        
        this.enemies = this.enemies.filter(enemy => {
            // Remove enemies that are inactive or too far below
            if (!enemy.active || (enemy.sprite && enemy.sprite.y > cameraBottom + 500)) {
                this.destroyEnemy(enemy);
                return false;
            }
            
            // Remove enemies whose platforms were destroyed
            if (!enemy.platform || !enemy.platform.sprite || !enemy.platform.sprite.active) {
                this.destroyEnemy(enemy);
                return false;
            }
            
            return true;
        });
    }

    /**
     * Get all enemies on a specific platform
     */
    getEnemiesOnPlatform(platformId) {
        return this.enemies.filter(enemy => 
            enemy.active && enemy.platform && enemy.platform.id === platformId
        );
    }

    /**
     * Clean up all enemies
     */
    cleanup() {
        this.enemies.forEach(enemy => {
            this.destroyEnemy(enemy);
        });
        this.enemies = [];
    }

    /**
     * Get statistics about current enemies
     */
    getStats() {
        return {
            totalEnemies: this.enemies.length,
            activeEnemies: this.enemies.filter(e => e.active).length
        };
    }
}