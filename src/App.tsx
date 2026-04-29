import { useState } from 'react';
import { ChessBoard, BoardMode } from './components/ChessBoard';
import './App.css';

const AppView = {
  Home:     'home',
  Play:     'play',
  Practice: 'practice',
} as const;
type AppView = typeof AppView[keyof typeof AppView];

function App() {
  const [view, setView] = useState<AppView>(AppView.Home);

  if (view === AppView.Play) {
    return (
      <div className="app">
        <ChessBoard mode={BoardMode.Play} onBack={() => setView(AppView.Home)} />
      </div>
    );
  }

  if (view === AppView.Practice) {
    return (
      <div className="app">
        <ChessBoard mode={BoardMode.Practice} onBack={() => setView(AppView.Home)} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="home">
        <div className="home__icon">♟</div>
        <h1 className="home__title">Chess Trainer</h1>
        <p className="home__subtitle">Play a game or explore random positions</p>
        <div className="home__actions">
          <button className="home__btn home__btn--play" onClick={() => setView(AppView.Play)}>
            Play
          </button>
          <button className="home__btn home__btn--practice" onClick={() => setView(AppView.Practice)}>
            Practice
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
