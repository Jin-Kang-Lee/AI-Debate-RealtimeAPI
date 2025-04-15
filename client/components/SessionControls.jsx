import { useState } from "react";
import { CloudLightning, CloudOff, MessageSquare } from "react-feather";
import Button from "./Button";

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
        className={isActivating ? "bg-gray-100" : "bg-green-600"}
        // icon={<CloudLightning height={16} />}
      >
        {isActivating ? "Starting session..." : "Start Speaking"}
      </Button>
    </div>
  );
}

function SessionActive({ stopSession }) {
  return (
    <div className="flex items-center justify-center  w-full h-full">
      <Button className="bg-red-600" onClick={stopSession} icon={<CloudOff height={16} />}>
        disconnect
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
