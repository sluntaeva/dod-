// js/scenes/MenuScene.js
 class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        // Получаем ссылки на HTML элементы
        this.menuContainer = document.getElementById('main-menu');
        this.skinInventory = document.getElementById('skinInventory');
        const startButton = document.getElementById('startBtn');
        const skinButton = document.getElementById('skinBtn');
        const closeInventoryBtn = document.getElementById('closeInventoryBtn');
        const skinChoiceButtons = document.querySelectorAll('.skin-choice');
        const bestScoreEl = document.getElementById('bestScoreValue');

        // Показываем главное меню
        this.menuContainer.classList.remove('hidden');
        this.skinInventory.classList.add('hidden');

        // Отображаем лучший счет
        bestScoreEl.textContent = localStorage.getItem('bestScore') || '0';

        // Обработчик кнопки "Играть"
        startButton.onclick = () => {
            this.menuContainer.classList.add('hidden');
            // Запускаем игровую сцену и сцену интерфейса параллельно
            this.scene.start('GameScene');
            this.scene.launch('UIScene');
        };

        // Обработчики инвентаря
        skinButton.onclick = () => {
            this.menuContainer.classList.add('hidden');
            this.skinInventory.classList.remove('hidden');
        };

        closeInventoryBtn.onclick = () => {
            this.skinInventory.classList.add('hidden');
            this.menuContainer.classList.remove('hidden');
        };

        skinChoiceButtons.forEach(button => {
            button.onclick = () => {
                const colorValue = button.dataset.color;
                localStorage.setItem('playerColor', colorValue);
                // Можно добавить визуальный фидбек, например, рамку вокруг выбранного скина
            };
        });
    }
}
