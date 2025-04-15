import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [topic, setTopic] = useState("AI in healthcare"); //State variable for the Debate Topic drop down box
  const [stance, setStance] = useState("for"); //State variable for the Stance drop down box
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const [aiResponse, setAiResponse] = useState(""); // Live transcript for AI


  async function startSession() {
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;
  
    const pc = new RTCPeerConnection();
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);
  
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(ms.getTracks()[0]);
  
    const dc = pc.createDataChannel("oai-events");
  
    dc.addEventListener("open", () => {
      setIsSessionActive(true);
      setDataChannel(dc); // still keep state update for future use
    
      //Prompt for the AI
      const introMessage = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Let's begin a debate on the topic: "${topic}". I will argue ${
                stance === "for" ? "FOR" : "AGAINST"
              } the motion. You must take the opposing view. Respond concisely (2-3 sentences).`,
            },
          ],
        },
      };
    
      setTimeout(() => {
        sendClientEvent(introMessage, dc); // use local dc
        // sendClientEvent({ type: "response.create" }, dc); // use local dc
      }, 300);
    });
    
  
    dc.addEventListener("message", (e) => {
      const event = JSON.parse(e.data);
    
      // Capture delta updates
      if (event.type === "response.delta") {
        const textDelta = event.delta?.content?.[0]?.text;
        if (textDelta) {
          setAiResponse(prev => prev + textDelta);
        }
      }
    
      // Clear after final response
      if (event.type === "response.done") {
        setAiResponse(""); // Reset for the next message
      }
    
      if (!event.timestamp) {
        event.timestamp = new Date().toLocaleTimeString();
      }
      setEvents((prev) => [event, ...prev]);
    });
    
  
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
  
    const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });
  
    const answer = { type: "answer", sdp: await sdpResponse.text() };
    await pc.setRemoteDescription(answer);
  
    peerConnection.current = pc;
  }

  function stopSession() {
    if (dataChannel) dataChannel.close();
    peerConnection.current?.getSenders().forEach((s) => s.track?.stop());
    peerConnection.current?.close();
    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  function sendClientEvent(message, channelOverride = null) {
    const channel = channelOverride || dataChannel;
    if (channel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();
      channel.send(JSON.stringify(message));
      if (!message.timestamp) message.timestamp = timestamp;
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error("Failed to send message - no data channel available", message);
    }
  }
  

  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: message }],
      },
    };
    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="text-center border-b border-gray-700 pb-4">
          <h1 className="text-4xl font-extrabold text-white">AI Debator</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Debate Topic</label>
            <select
              className="w-full rounded-md p-2 text-black"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              <option value="AI in healthcare">Allowing AI to override human decisions in healthcare will lead to better patient outcome</option>
              <option value="Social media's impact on society">Social media's impact on society</option>
              <option value="Climate change action urgency">Climate change action urgency</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Your Stance</label>
            <select
              className="w-full rounded-md p-2 text-black"
              value={stance}
              onChange={(e) => setStance(e.target.value)}
            >
              <option value="for">For the motion</option>
              <option value="against">Against the motion</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-700 p-4 rounded-md min-h-[80px]">
          <h2 className="text-lg font-semibold mb-2">AI Response:</h2>
          <p className="text-white">{aiResponse || "Click start speaking"}</p>
        </div>


        <div className="pt-4">
          <SessionControls
            startSession={startSession}
            stopSession={stopSession}
            sendClientEvent={sendClientEvent}
            sendTextMessage={sendTextMessage}
            events={events}
            isSessionActive={isSessionActive}
          />
        </div>
      </div>
    </div>
  );
}
