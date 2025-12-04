import "./App.css";
import StartScreen from "./components/StartScreen";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  return (
    <div className="App">
      <ThemeToggle />
      <StartScreen />
    </div>
  );
}

export default App;
