/**
 * ScoreManager - Handles all scoring and achievement logic
 * Responsibilities:
 * - Score calculation and tracking
 * - High score management
 * - Achievement tracking
 * - Score multipliers and bonuses
 * - Score visual effects
 */
class ScoreManager {
    constructor(scene) {
        this.scene = scene;
        
        // Score tracking
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.lastHeightScore = 0;
        
        // Score configuration
        this.pointsPerPlatform = 10;
        this.pointsPerMovingPlatform = 15;
        this.heightBonusInterval = 500;
        this.heightBonusPoints = 50;
        
        // Combo system
        this.comboCount = 0;
        this.comboTimer = null;
        this.comboTimeout = 2000; // 2 seconds to maintain combo
        this.maxComboMultiplier = 5;
        
        // Achievement tracking
        this.achievements = {
            firstJump: false,
            height1000: false,
            height5000: false,
            height10000: false,
            combo10: false,
            combo25: false,
            score1000: false,
            score5000: false,
            platformsVisited100: false
        };
        
        // Statistics
        this.stats = {
            platformsVisited: 0,
            maxHeight: 0,
            enemiesDefeated: 0,
            totalJumps: 0,
            maxCombo: 0
        };
    }

    /**
     * Initialize or reset the score manager
     */
    initialize() {
        this.score = 0;
        this.lastHeightScore = 0;
        this.comboCount = 0;
        this.clearComboTimer();
        
        // Load high score
        this.highScore = parseInt(localStorage.getItem('bestScore')) || 0;
        
        // Reset session stats
        this.stats.platformsVisited = 0;
        this.stats.maxHeight = 0;
        this.stats.enemiesDefeated = 0;
        this.stats.totalJumps = 0;
        this.stats.maxCombo = 0;
        
        // Emit initial score
        this.scene.events.emit('updateScore', this.score);
    }

    /**
     * Add points to the score
     * @param {number} points - Base points to add
     * @param {string} reason - Reason for points (for visual feedback)
     */
    addScore(points, reason = 'platform') {
        // Apply combo multiplier
        const multiplier = this.getComboMultiplier();
        const totalPoints = Math.floor(points * multiplier);
        
        this.score += totalPoints;
        
        // Update combo
        if (reason === 'platform' || reason === 'moving_platform') {
            this.updateCombo();
        }
        
        // Check for new high score
        if (this.score > this.highScore) {
            this.setNewHighScore();
        }
        
        // Emit score update
        this.scene.events.emit('updateScore', this.score);
        
        // Show visual feedback
        this.showScorePopup(totalPoints, reason, multiplier > 1);
        
        // Check achievements
        this.checkScoreAchievements();
    }

    /**
     * Add points for reaching a new height
     * @param {number} currentHeight - Current player height
     */
    addHeightBonus(currentHeight) {
        const heightScore = Math.max(0, Math.floor(currentHeight / this.heightBonusInterval));
        
        if (heightScore > this.lastHeightScore) {
            this.lastHeightScore = heightScore;
            this.addScore(this.heightBonusPoints, 'height_bonus');
            
            // Visual effect for height bonus
            this.scene.cameras.main.flash(200, 255, 255, 100);
            
            // Update max height stat
            this.stats.maxHeight = Math.max(this.stats.maxHeight, currentHeight);
            
            // Check height achievements
            this.checkHeightAchievements(currentHeight);
        }
    }

    /**
     * Handle platform visit scoring
     * @param {Object} platform - The platform that was visited
     * @returns {number} Points earned
     */
    scorePlatformVisit(platform) {
        let points = 0;
        
        if (platform.isMoving) {
            points = this.pointsPerMovingPlatform;
            this.addScore(points, 'moving_platform');
        } else {
            points = this.pointsPerPlatform;
            this.addScore(points, 'platform');
        }
        
        // Update stats
        this.stats.platformsVisited++;
        
        // Check platform achievements
        if (this.stats.platformsVisited === 100) {
            this.unlockAchievement('platformsVisited100');
        }
        
        return points;
    }

    /**
     * Update combo system
     */
    updateCombo() {
        this.comboCount++;
        
        // Update max combo stat
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.comboCount);
        
        // Clear existing timer
        this.clearComboTimer();
        
        // Set new timer
        this.comboTimer = this.scene.time.delayedCall(this.comboTimeout, () => {
            this.resetCombo();
        });
        
        // Check combo achievements
        if (this.comboCount === 10) {
            this.unlockAchievement('combo10');
        } else if (this.comboCount === 25) {
            this.unlockAchievement('combo25');
        }
        
        // Show combo feedback
        if (this.comboCount > 1) {
            this.showComboFeedback();
        }
    }

    /**
     * Reset combo
     */
    resetCombo() {
        this.comboCount = 0;
        this.clearComboTimer();
    }

    /**
     * Clear combo timer
     */
    clearComboTimer() {
        if (this.comboTimer) {
            this.comboTimer.remove();
            this.comboTimer = null;
        }
    }

    /**
     * Get current combo multiplier
     */
    getComboMultiplier() {
        if (this.comboCount <= 1) return 1;
        return Math.min(1 + (this.comboCount - 1) * 0.2, this.maxComboMultiplier);
    }

    /**
     * Show score popup at player position
     */
    showScorePopup(points, reason, hasCombo) {
        const playerPos = this.scene.playerManager?.getPosition();
        if (!playerPos) return;
        
        // Create text
        let text = `+${points}`;
        if (hasCombo) {
            text += ` x${this.getComboMultiplier().toFixed(1)}`;
        }
        
        const color = reason === 'height_bonus' ? '#FFD700' : '#00FF00';
        
        const popup = this.scene.add.text(
            playerPos.x,
            playerPos.y - 80,
            text,
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: color,
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        
        // Animate popup
        this.scene.tweens.add({
            targets: popup,
            y: popup.y - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                popup.destroy();
            }
        });
    }

    /**
     * Show combo feedback
     */
    showComboFeedback() {
        const comboText = `COMBO x${this.comboCount}!`;
        
        const feedback = this.scene.add.text(
            this.scene.scale.width / 2,
            100,
            comboText,
            {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#FF6B6B',
                stroke: '#FFFFFF',
                strokeThickness: 4
            }
        );
        feedback.setOrigin(0.5);
        feedback.setScrollFactor(0); // Keep on screen
        
        // Animate
        this.scene.tweens.add({
            targets: feedback,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.scene.time.delayedCall(300, () => {
                    feedback.destroy();
                });
            }
        });
    }

    /**
     * Set new high score
     */
    setNewHighScore() {
        const wasNewRecord = this.highScore < this.score;
        this.highScore = this.score;
        localStorage.setItem('bestScore', this.highScore.toString());
        
        if (wasNewRecord) {
            // Show new record notification
            this.showNewRecordNotification();
        }
    }

    /**
     * Show new record notification
     */
    showNewRecordNotification() {
        const notification = this.scene.add.text(
            this.scene.scale.width / 2,
            150,
            'NEW RECORD!',
            {
                fontSize: '48px',
                fontFamily: 'Arial',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        notification.setOrigin(0.5);
        notification.setScrollFactor(0);
        
        // Animate
        this.scene.tweens.add({
            targets: notification,
            scale: { from: 0, to: 1 },
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.time.delayedCall(2000, () => {
                    this.scene.tweens.add({
                        targets: notification,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            notification.destroy();
                        }
                    });
                });
            }
        });
    }

    /**
     * Check score-based achievements
     */
    checkScoreAchievements() {
        if (this.score >= 1000 && !this.achievements.score1000) {
            this.unlockAchievement('score1000');
        }
        if (this.score >= 5000 && !this.achievements.score5000) {
            this.unlockAchievement('score5000');
        }
    }

    /**
     * Check height-based achievements
     */
    checkHeightAchievements(height) {
        if (height >= 1000 && !this.achievements.height1000) {
            this.unlockAchievement('height1000');
        }
        if (height >= 5000 && !this.achievements.height5000) {
            this.unlockAchievement('height5000');
        }
        if (height >= 10000 && !this.achievements.height10000) {
            this.unlockAchievement('height10000');
        }
    }

    /**
     * Unlock an achievement
     */
    unlockAchievement(achievementKey) {
        if (this.achievements[achievementKey]) return;
        
        this.achievements[achievementKey] = true;
        
        // Show achievement notification
        const achievementNames = {
            firstJump: 'First Jump!',
            height1000: 'Reached 1000m!',
            height5000: 'Reached 5000m!',
            height10000: 'Reached 10000m!',
            combo10: '10x Combo!',
            combo25: '25x Combo Master!',
            score1000: '1000 Points!',
            score5000: '5000 Points!',
            platformsVisited100: '100 Platforms!'
        };
        
        this.showAchievementNotification(achievementNames[achievementKey] || achievementKey);
    }

    /**
     * Show achievement notification
     */
    showAchievementNotification(achievementName) {
        const notification = this.scene.add.group([
            this.scene.add.rectangle(
                this.scene.scale.width / 2,
                50,
                300,
                60,
                0x000000,
                0.8
            ),
            this.scene.add.text(
                this.scene.scale.width / 2,
                50,
                `🏆 ${achievementName}`,
                {
                    fontSize: '20px',
                    fontFamily: 'Arial',
                    color: '#FFD700'
                }
            ).setOrigin(0.5)
        ]);
        
        notification.children.entries.forEach(child => {
            child.setScrollFactor(0);
        });
        
        // Slide in animation
        notification.children.entries.forEach(child => {
            child.y -= 100;
            this.scene.tweens.add({
                targets: child,
                y: child.y + 100,
                duration: 500,
                ease: 'Power2'
            });
        });
        
        // Remove after delay
        this.scene.time.delayedCall(3000, () => {
            notification.children.entries.forEach(child => {
                this.scene.tweens.add({
                    targets: child,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        child.destroy();
                    }
                });
            });
        });
    }

    /**
     * Get current score
     */
    getScore() {
        return this.score;
    }

    /**
     * Get high score
     */
    getHighScore() {
        return this.highScore;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            score: this.score,
            highScore: this.highScore,
            combo: this.comboCount,
            achievements: Object.keys(this.achievements).filter(key => this.achievements[key])
        };
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.clearComboTimer();
    }
}