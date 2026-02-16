const generateBtn = document.getElementById('generate-btn');
const lottoBallsContainer = document.querySelector('.lotto-balls-container');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

const THEME_STORAGE_KEY = 'lotto-theme';

const getInitialTheme = () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const updateThemeToggleText = (theme) => {
    themeToggleBtn.textContent = theme === 'dark' ? '☀️ 화이트모드' : '🌙 다크모드';
};

const applyTheme = (theme) => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateThemeToggleText(theme);
};

const getBallColor = (number) => {
    if (number <= 10) return '#fbc400'; // Yellow
    if (number <= 20) return '#69c8f2'; // Blue
    if (number <= 30) return '#ff7272'; // Red
    if (number <= 40) return '#aaa'; // Gray
    return '#b0d840'; // Green
};

applyTheme(getInitialTheme());

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

generateBtn.addEventListener('click', () => {
    lottoBallsContainer.innerHTML = '';
    const numbers = new Set();
    while (numbers.size < 6) {
        numbers.add(Math.floor(Math.random() * 45) + 1);
    }

    const sortedNumbers = Array.from(numbers).sort((a, b) => a - b);

    sortedNumbers.forEach(number => {
        const ball = document.createElement('div');
        ball.classList.add('lotto-ball');
        ball.style.backgroundColor = getBallColor(number);
        ball.textContent = number;
        lottoBallsContainer.appendChild(ball);
    });
});
