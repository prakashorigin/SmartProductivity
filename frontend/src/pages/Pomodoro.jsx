import PomodoroTimer from "../components/PomodoroTimer";

function Pomodoro() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
        ⏱️ Pomodoro Timer
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-8">
        Focus for 25 minutes, then take a 5-minute break
      </p>
      <PomodoroTimer />
    </div>
  );
}

export default Pomodoro;
