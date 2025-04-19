import { useState } from "react";
import { CloudLightning, CloudOff, MessageSquare } from "react-feather";
import { Mic } from "lucide-react";
import { MicOff } from "lucide-react";
import Button from "./Button";

//UI when session is inactive (User have not clicked on "Start Speaking")
function SessionStopped({ startSession }) {
  const [isActivating, setIsActivating] = useState(false);

  function handleStartSession() {
    if (isActivating) return;

    setIsActivating(true);
    startSession();
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <Button
        onClick={handleStartSession}
        className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white shadow-md transition-all ${
          isActivating
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gray-800 hover:bg-gray-900 active:scale-95"
        }`}
      >
        <Mic className="w-5 h-5" />
        {isActivating ? "Starting..." : "Start Speaking"}
      </Button>
    </div>

  );
}

//UI to change to when session is active (User clicked on "Start Speaking")
function SessionActive({ stopSession }) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <Button
        onClick={stopSession}
        className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-[#97463C] hover:bg-[#843f35] active:scale-95 shadow-md transition-all"
      >
        <MicOff className="w-5 h-5" />
        Disconnect
      </Button>
    </div>

  );
}


export default function SessionControls({
  startSession,
  stopSession,
  // sendClientEvent,
  // sendTextMessage,
  // serverEvents,
  isSessionActive,
}) {
  return (
    <div className="flex gap-4 border-gray-200 h-full rounded-md">
      {isSessionActive ? (
        <SessionActive
          stopSession={stopSession}
          // sendClientEvent={sendClientEvent}
          // sendTextMessage={sendTextMessage}
          // serverEvents={serverEvents}
        />
      ) : (
        <SessionStopped startSession={startSession} />
      )}
    </div>
  );
}
