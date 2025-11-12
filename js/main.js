// js/main.js
window.addEventListener('DOMContentLoaded', () => {
    // --- Сначала настраиваем логику HTML меню ---

    const menuContainer = document.getElementById('main-menu');
    const skinInventory = document.getElementById('skinInventory');
    const startButton = document.getElementById('startBtn');
    const skinButton = document.getElementById('skinBtn');
    const closeInventoryBtn = document.getElementById('closeInventoryBtn');
    const skinChoiceButtons = document.querySelectorAll('.skin-choice');
    const bestScoreEl = document.getElementById('bestScoreValue');
    const scoreContainer = document.getElementById('scoreContainer');
    const controlsContainer = document.getElementById('controls');

    // Показываем лучший счет
    bestScoreEl.textContent = localStorage.getItem('bestScore') || '0';

    // Обработчики инвентаря
    skinButton.onclick = () => {
        menuContainer.classList.add('hidden');
        skinInventory.classList.remove('hidden');
    };

    closeInventoryBtn.onclick = () => {
        skinInventory.classList.add('hidden');
        menuContainer.classList.remove('hidden');
    };

    skinChoiceButtons.forEach(button => {
        button.onclick = () => {
            const colorValue = button.dataset.color;
            localStorage.setItem('playerColor', colorValue);
        };
    });

    // --- Теперь настраиваем Phaser ---

    const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: 'game',
        render: { willReadFrequently: true },
        physics: {
            default: 'matter',
            matter: { gravity: { y: 1.1 }, debug: false }
        },
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [PreloaderScene, MenuScene, GameScene, UIScene]
    };

    const game = new Phaser.Game(config);

    // --- Логика старта игры ---
    startButton.onclick = () => {
        // Скрываем меню и показываем игровой интерфейс
        menuContainer.classList.add('hidden');
        scoreContainer.classList.remove('hidden');
        controlsContainer.classList.remove('hidden');

        // Запускаем игровую сцену
        // Сцены уже созданы, мы просто "переключаемся" на нужную
        game.scene.getScene('MenuScene').scene.start('GameScene');
        game.scene.getScene('MenuScene').scene.launch('UIScene');
    };
});

