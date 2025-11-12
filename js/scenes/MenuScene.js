// js/scenes/MenuScene.js
 class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');
        // при заходе в меню останавливаем и прячем UI
        const ui = this.scene.get('UIScene');
        if (ui) {
            ui.hideUI();
            if (this.scene.isActive('UIScene')) {
                this.scene.stop('UIScene');
            }
        }

        // Получаем ссылки на HTML элементы
        this.menuContainer = document.getElementById('main-menu');
        this.skinInventory = document.getElementById('skinInventory');
        const startButton = document.getElementById('startBtn');
        const skinButton = document.getElementById('skinBtn');
        const closeInventoryBtn = document.getElementById('closeInventoryBtn');
        const skinChoiceButtons = document.querySelectorAll('.skin-choice');
        const bestScoreEl = document.getElementById('bestScoreValue');
const deathScreen = document.getElementById('death-screen');
const restartBtn = document.getElementById('restartBtn');
const finalScoreValue = document.getElementById('finalScoreValue');

// Проверяем, есть ли флаг "смерти"
const lastScore = localStorage.getItem('lastScore');
if (lastScore !== null) {
    // Показываем экран смерти
    deathScreen.classList.remove('hidden');
    finalScoreValue.textContent = lastScore;
    localStorage.removeItem('lastScore'); // чтобы не показывалось снова
} else {
    deathScreen.classList.add('hidden');
}

// Кнопка "Начать заново"
restartBtn.onclick = () => {
    deathScreen.classList.add('hidden');
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
};
        // Показываем главное меню
        this.menuContainer.classList.remove('hidden');
        this.skinInventory.classList.add('hidden');

        // Отображаем лучший счет
        bestScoreEl.textContent = localStorage.getItem('bestScore') || '0';

        // Обработчик кнопки "Играть"
        startButton.onclick = () => {
            document.getElementById('main-menu').style.display = 'none';
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
