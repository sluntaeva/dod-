/**
 * DifficultyManager - Handles difficulty progression and balancing
 * Responsibilities:
 * - Calculate difficulty parameters based on height/progress
 * - Manage difficulty curves
 * - Balance game progression
 * - Provide difficulty settings to other managers
 */
class DifficultyManager {
    constructor(scene) {
        this.scene = scene;
        
        // Base difficulty parameters
        this.baseDifficulty = {
            // Platform generation
            minPlatformGap: 100,
            maxPlatformGap: 180,
            minPlatformWidth: 100,
            maxPlatformWidth: 300,
            
            // Platform types
            breakableChance: 0.15,
            movingChance: 0.20,
            
            // Platform movement
            minPlatformSpeed: 1,
            maxPlatformSpeed: 2,
            
            // Enemy spawning
            enemyChance: 0.10,
            enemySpeed: 1,
            
            // Height intervals for difficulty increase
            difficultyInterval: 1000
        };
        
        // Difficulty scaling factors
        this.scaling = {
            // Per difficulty level increases
            gapIncrease: 5,           // Pixels per level
            gapMaxIncrease: 10,       // Max gap increase per level
            widthDecrease: 5,         // Width reduction per level
            widthMaxDecrease: 10,     // Max width reduction per level
            
            breakableIncrease: 0.05,  // Chance increase per level
            movingIncrease: 0.08,      // Chance increase per level
            enemyIncrease: 0.03,       // Chance increase per level
            
            speedIncrease: 0.3,        // Speed increase per level
            speedMaxIncrease: 0.5,     // Max speed increase per level
            
            // Maximum caps
            maxBreakableChance: 0.60,
            maxMovingChance: 0.75,
            maxEnemyChance: 0.40,
            maxSpeed: 6,
            minPlatformWidth: 60,
            maxGap: 250
        };
        
        // Current difficulty level
        this.currentLevel = 0;
        this.maxReachedLevel = 0;
        
        // Difficulty modes
        this.difficultyMode = this.loadDifficultyMode();
        this.applyDifficultyMode();
    }

    /**
     * Load difficulty mode from storage
     */
    loadDifficultyMode() {
        return localStorage.getItem('difficultyMode') || 'normal';
    }

    /**
     * Set difficulty mode
     * @param {string} mode - 'easy', 'normal', 'hard', 'extreme'
     */
    setDifficultyMode(mode) {
        this.difficultyMode = mode;
        localStorage.setItem('difficultyMode', mode);
        this.applyDifficultyMode();
    }

    /**
     * Apply difficulty mode modifiers
     */
    applyDifficultyMode() {
        const modeModifiers = {
            easy: {
                gapMultiplier: 0.8,
                widthMultiplier: 1.2,
                breakableMultiplier: 0.5,
                movingMultiplier: 0.5,
                enemyMultiplier: 0.5,
                speedMultiplier: 0.7
            },
            normal: {
                gapMultiplier: 1.0,
                widthMultiplier: 1.0,
                breakableMultiplier: 1.0,
                movingMultiplier: 1.0,
                enemyMultiplier: 1.0,
                speedMultiplier: 1.0
            },
            hard: {
                gapMultiplier: 1.2,
                widthMultiplier: 0.9,
                breakableMultiplier: 1.5,
                movingMultiplier: 1.5,
                enemyMultiplier: 1.5,
                speedMultiplier: 1.3
            },
            extreme: {
                gapMultiplier: 1.5,
                widthMultiplier: 0.7,
                breakableMultiplier: 2.0,
                movingMultiplier: 2.0,
                enemyMultiplier: 2.0,
                speedMultiplier: 1.6
            }
        };
        
        this.modeModifiers = modeModifiers[this.difficultyMode] || modeModifiers.normal;
    }

    /**
     * Calculate difficulty parameters based on height
     * @param {number} y - Y position (height)
     * @returns {Object} Difficulty parameters
     */
    getDifficultyParams(y) {
        const height = Math.max(0, 800 - y); // Height from start
        const difficultyLevel = Math.floor(height / this.baseDifficulty.difficultyInterval);
        
        // Update current level
        this.currentLevel = difficultyLevel;
        this.maxReachedLevel = Math.max(this.maxReachedLevel, difficultyLevel);
        
        // Calculate parameters with progression
        const params = this.calculateProgressiveParams(difficultyLevel);
        
        // Apply difficulty mode modifiers
        return this.applyModeModifiers(params);
    }

    /**
     * Calculate progressive difficulty parameters
     */
    calculateProgressiveParams(level) {
        const base = this.baseDifficulty;
        const scale = this.scaling;
        
        // Platform gaps (increases with difficulty)
        const minGap = Math.min(
            base.minPlatformGap + (level * scale.gapIncrease),
            150 // Cap minimum gap
        );
        const maxGap = Math.min(
            base.maxPlatformGap + (level * scale.gapMaxIncrease),
            scale.maxGap
        );
        
        // Platform width (decreases with difficulty)
        const minWidth = Math.max(
            base.minPlatformWidth - (level * scale.widthDecrease),
            scale.minPlatformWidth
        );
        const maxWidth = Math.max(
            base.maxPlatformWidth - (level * scale.widthMaxDecrease),
            150 // Minimum max width
        );
        
        // Platform type chances
        const breakableChance = Math.min(
            base.breakableChance + (level * scale.breakableIncrease),
            scale.maxBreakableChance
        );
        const movingChance = Math.min(
            base.movingChance + (level * scale.movingIncrease),
            scale.maxMovingChance
        );
        
        // Enemy chance
        const enemyChance = Math.min(
            base.enemyChance + (level * scale.enemyIncrease),
            scale.maxEnemyChance
        );
        
        // Platform movement speed
        const minSpeed = Math.min(
            base.minPlatformSpeed + (level * scale.speedIncrease),
            scale.maxSpeed - 2
        );
        const maxSpeed = Math.min(
            base.maxPlatformSpeed + (level * scale.speedMaxIncrease),
            scale.maxSpeed
        );
        
        return {
            minGap,
            maxGap,
            minWidth,
            maxWidth,
            breakableChance,
            movingChance,
            enemyChance,
            minSpeed,
            maxSpeed,
            difficultyLevel: level
        };
    }

    /**
     * Apply difficulty mode modifiers to parameters
     */
    applyModeModifiers(params) {
        const mod = this.modeModifiers;
        
        return {
            ...params,
            minGap: Math.floor(params.minGap * mod.gapMultiplier),
            maxGap: Math.floor(params.maxGap * mod.gapMultiplier),
            minWidth: Math.floor(params.minWidth * mod.widthMultiplier),
            maxWidth: Math.floor(params.maxWidth * mod.widthMultiplier),
            breakableChance: params.breakableChance * mod.breakableMultiplier,
            movingChance: params.movingChance * mod.movingMultiplier,
            enemyChance: params.enemyChance * mod.enemyMultiplier,
            minSpeed: params.minSpeed * mod.speedMultiplier,
            maxSpeed: params.maxSpeed * mod.speedMultiplier
        };
    }

    /**
     * Get special event chances based on difficulty
     */
    getSpecialEventChances(level) {
        // Special events that can occur at certain difficulty levels
        return {
            // Power-ups (decrease with difficulty)
            powerUpChance: Math.max(0.05 - (level * 0.005), 0.01),
            
            // Bonus platforms (rare, fixed chance)
            bonusPlatformChance: 0.02,
            
            // Multi-enemy platforms (increase with difficulty)
            multiEnemyChance: Math.min(0.05 * level, 0.20),
            
            // Chain platforms (platforms in a sequence)
            chainPlatformChance: Math.min(0.10 + (level * 0.02), 0.30)
        };
    }

    /**
     * Get difficulty level display info
     */
    getDifficultyInfo() {
        const levelNames = [
            'Beginner',
            'Novice',
            'Intermediate',
            'Advanced',
            'Expert',
            'Master',
            'Legendary',
            'Mythical',
            'Impossible',
            'Godlike'
        ];
        
        const levelName = levelNames[Math.min(this.currentLevel, levelNames.length - 1)];
        
        return {
            level: this.currentLevel,
            name: levelName,
            mode: this.difficultyMode,
            nextLevelHeight: (this.currentLevel + 1) * this.baseDifficulty.difficultyInterval
        };
    }

    /**
     * Check if player should get a difficulty bonus
     */
    checkDifficultyBonus(height) {
        const milestones = [1000, 2500, 5000, 7500, 10000, 15000, 20000];
        
        for (const milestone of milestones) {
            const key = `milestone_${milestone}`;
            if (height >= milestone && !this[key]) {
                this[key] = true;
                return {
                    reached: true,
                    milestone,
                    bonus: milestone * 10 // Bonus points
                };
            }
        }
        
        return { reached: false };
    }

    /**
     * Get adaptive difficulty suggestions
     * Analyzes player performance and suggests difficulty adjustments
     */
    getAdaptiveDifficulty(playerStats) {
        const deathRate = playerStats.deaths / Math.max(playerStats.attempts, 1);
        const avgHeight = playerStats.totalHeight / Math.max(playerStats.attempts, 1);
        
        // Suggest difficulty changes based on performance
        if (deathRate > 0.8 && this.difficultyMode !== 'easy') {
            return {
                suggestion: 'decrease',
                reason: 'High death rate detected',
                currentMode: this.difficultyMode,
                suggestedMode: this.getPreviousDifficultyMode()
            };
        } else if (deathRate < 0.2 && avgHeight > 5000 && this.difficultyMode !== 'extreme') {
            return {
                suggestion: 'increase',
                reason: 'Excellent performance detected',
                currentMode: this.difficultyMode,
                suggestedMode: this.getNextDifficultyMode()
            };
        }
        
        return null;
    }

    /**
     * Get next difficulty mode
     */
    getNextDifficultyMode() {
        const modes = ['easy', 'normal', 'hard', 'extreme'];
        const currentIndex = modes.indexOf(this.difficultyMode);
        return modes[Math.min(currentIndex + 1, modes.length - 1)];
    }

    /**
     * Get previous difficulty mode
     */
    getPreviousDifficultyMode() {
        const modes = ['easy', 'normal', 'hard', 'extreme'];
        const currentIndex = modes.indexOf(this.difficultyMode);
        return modes[Math.max(currentIndex - 1, 0)];
    }

    /**
     * Reset difficulty progression
     */
    reset() {
        this.currentLevel = 0;
        // Keep max reached level for statistics
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            currentLevel: this.currentLevel,
            maxReachedLevel: this.maxReachedLevel,
            difficultyMode: this.difficultyMode,
            info: this.getDifficultyInfo()
        };
    }
}