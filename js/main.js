window.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('main-menu');
    const skinInventory = document.getElementById('skinInventory');
    const startButton = document.getElementById('startBtn');
    const skinButton = document.getElementById('skinBtn');
    const closeInventoryBtn = document.getElementById('closeInventoryBtn');
    const skinChoiceButtons = document.querySelectorAll('.skin-choice');
    const bestScoreEl = document.getElementById('bestScoreValue');

    bestScoreEl.textContent = localStorage.getItem('bestScore') || '0';

    // ==========================
    // Инвентарь
    // ==========================
    skinButton.onclick = () => {
        menuContainer.classList.add('hidden');
        skinInventory.classList.remove('hidden');
    };

    closeInventoryBtn.onclick = () => {
        skinInventory.classList.add('hidden');
        menuContainer.classList.remove('hidden');
    };

    skinChoiceButtons.forEach(btn => {
        btn.onclick = () => {
            localStorage.setItem('playerColor', btn.dataset.color);
        };
    });

    // ==========================
    // Конфиг Phaser
    // ==========================
    const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: 'game',
        backgroundColor: '#87ceeb',
        physics: {
            default: 'matter',
            matter: {
                gravity: { y: 1.1 },
                debug: false
            }
        },
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [GameScene, UIScene]
    };

    const game = new Phaser.Game(config);

    // ==========================
    // Старт игры
    // ==========================
    startButton.onclick = () => {
        menuContainer.classList.add('hidden');
        skinInventory.classList.add('hidden');

        // Запускаем только GameScene
        // UIScene сама запустится внутри GameScene.create()
        game.scene.start('GameScene');
    };
});
