/**
 * PlayerManager - Handles all player-related logic
 * Responsibilities:
 * - Player creation and initialization
 * - Player movement and physics
 * - Player input handling
 * - Player state management (alive, dead, jumping, etc.)
 * - Player visual effects
 */
class PlayerManager {
    constructor(scene) {
        this.scene = scene;
        this.player = null;
        this.playerSprite = null;
        this.arrow = null;
        
        // Player state
        this.isDead = false;
        this.canJump = false;
        this.isJumping = false;
        
        // Input state
        this.leftPressed = false;
        this.rightPressed = false;
        
        // Player configuration
        this.playerColor = parseInt(localStorage.getItem('playerColor')) || 0xff3366;
        this.moveSpeed = 5;
        this.jumpForce = -15;
        this.playerWidth = 40;
        this.playerHeight = 60;
        
        // Input references
        this.cursors = null;
        this.keyW = null;
        this.keyA = null;
        this.keyD = null;
    }

    /**
     * Initialize the player
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     */
    initialize(startX, startY) {
        // Reset state
        this.isDead = false;
        this.canJump = false;
        this.isJumping = false;
        
        // Create player sprite
        this.playerSprite = this.scene.add.rectangle(
            startX,
            startY,
            this.playerWidth,
            this.playerHeight,
            this.playerColor
        );
        
        // Create direction arrow
        this.arrow = this.scene.add.triangle(
            startX,
            startY - 60,
            0, 30,
            15, 0,
            -15, 0,
            0xffcc00
        );
        this.arrow.setOrigin(0.5, 1);
        
        // Add physics body
        this.player = this.scene.matter.add.gameObject(this.playerSprite, {
            restitution: 0.2,
            friction: 0.05,
            label: 'player',
            inertia: Infinity // Prevent rotation
        });
        
        // Setup input handlers
        this.setupInputHandlers();
        
        return this.player;
    }

    /**
     * Setup keyboard and touch input handlers
     */
    setupInputHandlers() {
        // Keyboard controls
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.keyW = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        
        // Touch/mouse controls
        this.setupTouchControls();
    }

    /**
     * Setup touch control buttons
     */
    setupTouchControls() {
        const leftButton = document.getElementById('leftBtn');
        const rightButton = document.getElementById('rightBtn');
        const jumpButton = document.getElementById('jumpBtn');
        
        if (leftButton) {
            leftButton.onpointerdown = () => { this.leftPressed = true; };
            leftButton.onpointerup = () => { this.leftPressed = false; };
            leftButton.onpointerleave = () => { this.leftPressed = false; };
        }
        
        if (rightButton) {
            rightButton.onpointerdown = () => { this.rightPressed = true; };
            rightButton.onpointerup = () => { this.rightPressed = false; };
            rightButton.onpointerleave = () => { this.rightPressed = false; };
        }
        
        if (jumpButton) {
            jumpButton.onpointerdown = () => { this.jump(); };
        }
    }

    /**
     * Update player state and movement
     */
    update() {
        if (this.isDead) return;
        
        // Handle movement
        this.handleMovement();
        
        // Update arrow position and rotation
        this.updateArrow();
        
        // Check for death conditions
        this.checkDeathCondition();
        
        // Update visual effects
        this.updateVisualEffects();
    }

    /**
     * Handle player movement based on input
     */
    handleMovement() {
        const isLeftPressed = this.cursors.left.isDown || this.keyA.isDown || this.leftPressed;
        const isRightPressed = this.cursors.right.isDown || this.keyD.isDown || this.rightPressed;
        const isJumpPressed = this.cursors.space.isDown || this.cursors.up.isDown || this.keyW.isDown;
        
        const currentVelocity = this.player.body.velocity;
        let targetVelocityX = 0;
        
        // Horizontal movement
        if (isLeftPressed) {
            targetVelocityX = -this.moveSpeed;
            this.playerSprite.scaleX = -1; // Face left
        } else if (isRightPressed) {
            targetVelocityX = this.moveSpeed;
            this.playerSprite.scaleX = 1; // Face right
        } else {
            // Apply friction when no input
            targetVelocityX = currentVelocity.x * 0.9;
        }
        
        // Apply horizontal velocity
        this.scene.matter.body.setVelocity(this.player.body, {
            x: targetVelocityX,
            y: currentVelocity.y
        });
        
        // Jump
        if (isJumpPressed) {
            this.jump();
        }
        
        // Update jumping state
        this.isJumping = currentVelocity.y < -0.5;
    }

    /**
     * Make the player jump
     */
    jump() {
        if (this.isDead || !this.canJump) return;
        
        // Apply jump force
        this.scene.matter.body.setVelocity(this.player.body, {
            x: this.player.body.velocity.x,
            y: this.jumpForce
        });
        
        this.canJump = false;
        this.isJumping = true;
        
        // Jump animation
        this.playJumpAnimation();
    }

    /**
     * Play jump animation
     */
    playJumpAnimation() {
        // Squash and stretch effect
        this.scene.tweens.add({
            targets: this.playerSprite,
            scaleY: 1.2,
            scaleX: 0.8 * Math.sign(this.playerSprite.scaleX || 1),
            duration: 100,
            yoyo: true,
            ease: 'Power2'
        });
    }

    /**
     * Update arrow indicator
     */
    updateArrow() {
        if (!this.arrow || !this.playerSprite) return;
        
        // Position arrow above player
        this.arrow.x = this.playerSprite.x;
        this.arrow.y = this.playerSprite.y - 70;
        
        // Rotate based on input direction
        const isLeftPressed = this.cursors.left.isDown || this.keyA.isDown || this.leftPressed;
        const isRightPressed = this.cursors.right.isDown || this.keyD.isDown || this.rightPressed;
        
        if (isLeftPressed) {
            this.arrow.rotation = Phaser.Math.DegToRad(-150);
        } else if (isRightPressed) {
            this.arrow.rotation = Phaser.Math.DegToRad(-30);
        } else {
            this.arrow.rotation = Phaser.Math.DegToRad(-90);
        }
    }

    /**
     * Update visual effects based on player state
     */
    updateVisualEffects() {
        // Add trail effect when moving fast
        const speed = Math.abs(this.player.body.velocity.x);
        if (speed > 3) {
            // Could add particle trail here
        }
        
        // Landing effect
        if (!this.isJumping && this.canJump && this.player.body.velocity.y > 5) {
            this.playLandingEffect();
        }
    }

    /**
     * Play landing effect
     */
    playLandingEffect() {
        // Subtle squash effect
        this.scene.tweens.add({
            targets: this.playerSprite,
            scaleY: 0.8,
            scaleX: 1.2 * Math.sign(this.playerSprite.scaleX || 1),
            duration: 100,
            yoyo: true,
            ease: 'Power2'
        });
    }

    /**
     * Check if player should die
     */
    checkDeathCondition() {
        const cameraBottom = this.scene.cameras.main.scrollY + this.scene.cameras.main.height;
        
        // Die if fallen too far below camera
        if (this.playerSprite.y > cameraBottom + 200) {
            this.die();
        }
    }

    /**
     * Handle player death
     */
    die() {
        if (this.isDead) return;
        
        this.isDead = true;
        
        // Visual death effect
        if (this.playerSprite) {
            this.playerSprite.setAlpha(0.3);
            
            // Death animation
            this.scene.tweens.add({
                targets: this.playerSprite,
                rotation: Math.PI * 2,
                scale: 0.5,
                duration: 500,
                ease: 'Power2'
            });
        }
        
        // Hide arrow
        if (this.arrow) {
            this.arrow.setVisible(false);
        }
        
        // Disable physics
        if (this.scene.matter.world) {
            this.player.setStatic(true); 
            this.player.setIgnoreGravity(true);

        }
        
        // Emit death event
        this.scene.events.emit('playerDeath');
    }

    /**
     * Reset player after death
     */
    reset() {
        this.isDead = false;
        this.canJump = false;
        this.isJumping = false;
        
        if (this.playerSprite) {
            this.playerSprite.setAlpha(1);
            this.playerSprite.setScale(1);
            this.playerSprite.setRotation(0);
        }
        
        if (this.arrow) {
            this.arrow.setVisible(true);
        }
        
        if (this.scene.matter.world) {
            this.scene.matter.world.enabled = true;
        }
    }

    /**
     * Allow the player to jump (called when landing on platform)
     */
    enableJump() {
        this.canJump = true;
        this.isJumping = false;
    }

    /**
     * Get player position
     */
    getPosition() {
        return {
            x: this.playerSprite ? this.playerSprite.x : 0,
            y: this.playerSprite ? this.playerSprite.y : 0
        };
    }

    /**
     * Get player velocity
     */
    getVelocity() {
        return this.player ? this.player.body.velocity : { x: 0, y: 0 };
    }

    /**
     * Set player color
     */
    setColor(color) {
        this.playerColor = color;
        if (this.playerSprite) {
            this.playerSprite.setFillStyle(color);
        }
        localStorage.setItem('playerColor', color.toString());
    }

    /**
     * Clean up resources
     */
    cleanup() {
        // Remove input handlers
        const leftButton = document.getElementById('leftBtn');
        const rightButton = document.getElementById('rightBtn');
        const jumpButton = document.getElementById('jumpBtn');
        
        if (leftButton) {
            leftButton.onpointerdown = null;
            leftButton.onpointerup = null;
            leftButton.onpointerleave = null;
        }
        
        if (rightButton) {
            rightButton.onpointerdown = null;
            rightButton.onpointerup = null;
            rightButton.onpointerleave = null;
        }
        
        if (jumpButton) {
            jumpButton.onpointerdown = null;
        }
        
        // Destroy sprites
        if (this.playerSprite) this.playerSprite.destroy();
        if (this.arrow) this.arrow.destroy();
    }
}