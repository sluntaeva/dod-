// js/main.js
window.addEventListener('DOMContentLoaded', () => {
    // --- 1. Находим все HTML-элементы ---
    const menuContainer = document.getElementById('main-menu');
    const skinInventory = document.getElementById('skinInventory');
    const startButton = document.getElementById('startBtn');
    const skinButton = document.getElementById('skinBtn');
    const closeInventoryBtn = document.getElementById('closeInventoryBtn');
    const skinChoiceButtons = document.querySelectorAll('.skin-choice');
    const bestScoreEl = document.getElementById('bestScoreValue');
    const scoreContainer = document.getElementById('scoreContainer');
    const controlsContainer = document.getElementById('controls');

    // --- 2. Настраиваем конфигурацию Phaser ---
    const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: 'game',
        backgroundColor: '#87ceeb', // Добавим фон по умолчанию
        render: { willReadFrequently: true },
        physics: {
            default: 'matter',
            matter: { gravity: { y: 1.1 }, debug: false }
        },
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        // Регистрируем все сцены, но не запускаем их автоматически
        scene: [PreloaderScene, MenuScene, GameScene, UIScene]
    };

    // --- 3. Создаем экземпляр игры ---
    const game = new Phaser.Game(config);

    // --- 4. Назначаем обработчики событий для HTML-элементов ---
    
    // Показываем лучший счет
    bestScoreEl.textContent = localStorage.getItem('bestScore') || '0';

    // Логика инвентаря
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
            localStorage.setItem('playerColor', button.dataset.color);
        };
    });

    // Логика старта игры
    startButton.onclick = () => {
        // Скрываем меню
        menuContainer.classList.add('hidden');
        skinInventory.classList.add('hidden'); // На всякий случай

        // Просто запускаем сцены, они сами управляют UI
        game.scene.start('GameScene');
        game.scene.launch('UIScene');
    };

});
