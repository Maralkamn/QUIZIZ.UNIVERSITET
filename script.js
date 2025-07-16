let allQuestions = [], currentBlock = [], mistakes = [], marked = [], favorites = [];
let currentIndex = 0, score = 0, timer, timeLeft = 15;

const uploadInput = document.getElementById('upload-file');
const uploadStatus = document.getElementById('upload-status');
const sectionSelect = document.getElementById('section-select');
const quizContainer = document.getElementById('quiz-container');
const quizQuestion = document.getElementById('quiz-question');
const quizOptions = document.getElementById('quiz-options');
const timerDisplay = document.getElementById('timer');
const feedback = document.getElementById('feedback');
const nextBtn = document.getElementById('next-btn');
const resultSection = document.getElementById('result');
const scoreDisplay = document.getElementById('score');
const blockButtons = document.getElementById('block-buttons');
const extrasDiv = document.getElementById('extras');

// Тақырып режімін сақтау
window.onload = () => {
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light');
  }
  marked = JSON.parse(localStorage.getItem('marked') || '[]');
  favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
};

function toggleTheme() {
  document.body.classList.toggle('light');
  const mode = document.body.classList.contains('light') ? 'light' : 'dark';
  localStorage.setItem('theme', mode);
}

uploadInput.addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileType = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();

  reader.onload = function () {
    if (fileType === 'docx') {
      mammoth.extractRawText({ arrayBuffer: reader.result }).then(res => {
        parseText(res.value);
      });
    } else if (fileType === 'pdf') {
      const typedArray = new Uint8Array(reader.result);
      pdfjsLib.getDocument({ data: typedArray }).promise.then(pdf => {
        let text = "";
        let readPage = (n) => {
          pdf.getPage(n).then(page => {
            return page.getTextContent().then(content => {
              content.items.forEach(item => text += item.str + "\n");
              if (n < pdf.numPages) readPage(n + 1);
              else setTimeout(() => parseText(text), 300);
            });
          });
        };
        readPage(1);
      });
    } else {
      alert("❌ Тек .docx немесе .pdf файл жүктеңіз.");
    }
  };

  reader.readAsArrayBuffer(file);
});

function parseText(text) {
  allQuestions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i += 6) {
    const question = lines[i];
    const rawOptions = lines.slice(i + 1, i + 6);
    if (rawOptions.length === 5) {
      const options = rawOptions.map(opt => opt.slice(2).trim());
      allQuestions.push({ question, options: shuffle([...options]), correct: options[0] });
    }
  }

  uploadStatus.textContent = '✅ Файл жүктелді!';
  const totalBlocks = Math.ceil(allQuestions.length / 50);
  let buttons = '';
  for (let i = 0; i < totalBlocks; i++) {
    buttons += `<button onclick="startQuiz(${i})">${i * 50 + 1} – ${(i + 1) * 50}</button>`;
  }
  blockButtons.innerHTML = buttons;
  sectionSelect.style.display = 'block';
}

function startQuiz(blockIndex, customQuestions = null) {
  currentIndex = 0;
  score = 0;
  timeLeft = 15;
  mistakes = [];
  currentBlock = customQuestions || allQuestions.slice(blockIndex * 50, blockIndex * 50 + 50);
  sectionSelect.style.display = 'none';
  resultSection.style.display = 'none';
  quizContainer.style.display = 'block';
  document.getElementById('top-controls').style.display = 'block';
  showQuestion();
}

function showQuestion() {
  const q = currentBlock[currentIndex];
  quizQuestion.textContent = `${currentIndex + 1}. ${q.question}`;
  quizOptions.innerHTML = '';
  feedback.innerHTML = '';
  extrasDiv.innerHTML = '';

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.onclick = () => handleAnswer(btn, opt === q.correct, q.correct);
    quizOptions.appendChild(btn);
  });

  const markBtn = document.createElement('button');
  markBtn.textContent = '🔁 Кейінге қалдыру';
  markBtn.onclick = () => {
    marked.push(q);
    localStorage.setItem('marked', JSON.stringify(marked));
    alert('Сұрақ кейінге сақталды ✅');
  };

  const favBtn = document.createElement('button');
  favBtn.textContent = '⭐ Таңдаулы';
  favBtn.onclick = () => {
    favorites.push(q);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    alert('Таңдаулыға қосылды ✅');
  };

  extrasDiv.appendChild(markBtn);
  extrasDiv.appendChild(favBtn);

  startTimer();
}

function startTimer() {
  timeLeft = 15;
  timerDisplay.textContent = `⏱️ ${timeLeft}`;
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `⏱️ ${timeLeft}`;
    if (timeLeft === 0) {
      clearInterval(timer);
      handleAnswer(null, false, currentBlock[currentIndex].correct);
    }
  }, 1000);
}

function handleAnswer(btn, isCorrect, correctAnswer) {
  clearInterval(timer);
  const buttons = document.querySelectorAll('#quiz-options button');
  buttons.forEach(b => b.disabled = true);
  const correctBtn = Array.from(buttons).find(b => b.textContent === correctAnswer);
  if (btn) btn.classList.add(isCorrect ? 'correct' : 'incorrect');
  if (!isCorrect && correctBtn) {
    correctBtn.classList.add('correct');
    mistakes.push(currentBlock[currentIndex]);
  } else {
    score++;
  }
  nextBtn.style.display = 'block';
}

function nextQuestion() {
  currentIndex++;
  nextBtn.style.display = 'none';
  if (currentIndex < currentBlock.length) {
    showQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  quizContainer.style.display = 'none';
  resultSection.style.display = 'block';
  scoreDisplay.textContent = `Сіз ${currentBlock.length} сұрақтың ${score}-іне дұрыс жауап бердіңіз.`;
}

function showMistakes() {
  if (!mistakes.length) return alert("Қате жауаптар жоқ 😊");
  startQuiz(0, mistakes);
}

function showMarked() {
  if (!marked.length) return alert("Кейінге сақталған сұрақ жоқ");
  startQuiz(0, marked);
}

function showFavorites() {
  if (!favorites.length) return alert("Таңдаулы сұрақтар жоқ");
  startQuiz(0, favorites);
}

function showStats() {
  const percent = Math.round((score / currentBlock.length) * 100);
  alert(`📊 ${currentBlock.length} сұрақтың ішінде ${score} дұрыс → ${percent}%`);
}

function goBackToSections() {
  quizContainer.style.display = 'none';
  resultSection.style.display = 'none';
  sectionSelect.style.display = 'block';
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
