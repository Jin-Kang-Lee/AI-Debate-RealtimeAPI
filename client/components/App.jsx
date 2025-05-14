import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import { AudioLines, Bot } from "lucide-react";
import { Mic } from "lucide-react";
import SessionControls from "./SessionControls";
import Lottie from "lottie-react";
import Avatar from "./Avatar";
import idleAvatar from "../assets/Avatar.png";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false); //Check if session is active
  const [events, setEvents] = useState([]); //Stores a list of events that is exchanged with AI
  const [dataChannel, setDataChannel] = useState(null); //Stores the WebRTC data channel used for text message exchange
  const [topic, setTopic] = useState("AI in healthcare"); //Selected debate topic
  const [stance, setStance] = useState("for"); //Selected stance
  const peerConnection = useRef(null); //WebRTC connection instance reference
  const audioElement = useRef(null); //HTML audio element reference for playing AI audio
  const [aiResponse, setAiResponse] = useState(""); //State to store the AI's response text
  const [audioStream, setAudioStream] = useState(null); //MediaStream used to play only the AI audio
  const [aiIsTalking, setAiIsTalking] = useState(false); //Tracks if AI is currently speaking (used for avatar animation)

  //Delays the AI's reply after a prompt is sent to simulate more natural conversation timing
  function triggerAIResponseWithDelay(delayMs = 2000) {
    const triggerResponse = {
      type: "response.create",
      response: {
        conversation: "none",
      },
    };
  
    setTimeout(() => {
      // Ensure the data channel is ready
      if (!dataChannel || dataChannel.readyState !== "open") {
        console.error("⛔ Data channel is not open yet, cannot send trigger response.");
        return;
      }
  
      sendClientEvent(triggerResponse, dataChannel);
    }, delayMs);
  }

  //Starts the AI debate session, sets up WebRTC and handles message flow
  //Initializes full WebRTC Connection
  async function startSession() {
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    const pc = new RTCPeerConnection();
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;

    pc.ontrack = (e) => {
      const [remoteStream] = e.streams;
      audioElement.current.srcObject = remoteStream;
      const aiOnlyStream = new MediaStream();
      e.streams[0].getAudioTracks().forEach(track => {
        if (track.kind === "audio") {
          aiOnlyStream.addTrack(track);
        }
      });
      console.log("✅ AI Audio Tracks Set:", aiOnlyStream.getAudioTracks());
      setAudioStream(aiOnlyStream);
    };

    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(ms.getTracks()[0]);

    const dc = pc.createDataChannel("oai-events");

    //Handle data channel open: send debate prompt and trigger AI reply
    dc.addEventListener("open", () => {
      setIsSessionActive(true);
      setDataChannel(dc);

      //Custom prompt --> Can be changed anytime
      const prompt = `You're a witty, sharp-tongued college debater taking part in a spirited debate on the topic: "${topic}". 
      I will argue ${ stance === "for" ? "FOR" : "AGAINST" } the motion, so you must take the OPPOSITE stance. 
      Respond like a smart, confident student who loves intellectual back-and-forth. Be clever, quick on your feet, and use humor or sarcasm when it fits. 
      Keep each response to 2-3 sentences. Don't explain everything at once—make it a fun, punchy exchange. Only respond in English.`;

      const userMessage = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      };

      setTimeout(() => {
        sendClientEvent(userMessage, dc);
        triggerAIResponseWithDelay(3000); // Wait 3 seconds before AI responds
      }, 2000); // Delay initial message slightly as well
    });

    //Handle incoming messages from AI
    dc.addEventListener("message", (e) => {
      const event = JSON.parse(e.data);

      if (event.type === "response.delta") {
        const textDelta = event.delta?.content?.[0]?.text;
        if (textDelta) {
          setAiResponse((prev) => prev + textDelta);

          setTimeout(() => {
            setAiIsTalking(true);
          }, 300);
        }
      }

      if (event.type === "response.done") {
        setAiIsTalking(false);
        setAiResponse("");
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

  //Ends the debate session, cleans up media and WebRTC connection
  //Function safely closes the data channel, resetting the session state
  //Ensures proper resource cleanup to avoid any memory leaks or dangling streams
  function stopSession() {
    if (dataChannel) dataChannel.close();
    peerConnection.current?.getSenders().forEach((s) => s.track?.stop());
    peerConnection.current?.close();
    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  //Sends a structured message over the active data channel to the AI
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

  return (
    <div className="bg-[#FFECDB] text-white min-h-screen flex items-center justify-center p-4 ">
      <div className="flex w-full max-w-7xl gap-8 -translate-x-8">
        {/* LEFT PANEL */}
        <div className="flex-1 bg-[#EC6A39] rounded-2xl shadow-2xl p-6 space-y-6" style={{ transform: "scale(1)" }}>

          <div className="text-center pb-4">
            <div className="flex justify-center items-center gap-2 mb-2">
              <div className="bg-gray-800 p-2 rounded-full">
                <Bot className="text-white w-6 h-6" />
              </div>
              <h1 className="text-4xl font-extrabold text-white">AI Debator</h1>
            </div>
            <p className="text-sm text-white">Engage in a formal debate with AI</p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white mb-1">Debate Topic</label>
                <select
                  className="w-full rounded-lg px-4 py-2 bg-[#FFE8D0] text-[#2B2B2B] border border-[#E0B28A] focus:outline-none focus:ring"

                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option value="AI in healthcare">Allowing AI to override human decisions in healthcare</option>
                  <option value="Social media's impact on society">Social media's impact on society</option>
                  <option value="Climate change action urgency">Climate change action urgency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-white mb-1">Your Stance</label>
                <select
                  className="w-full rounded-lg px-4 py-2 bg-[#FFE8D0] text-[#2B2B2B] border border-[#E0B28A] focus:outline-none focus:ring"

                  value={stance}
                  onChange={(e) => setStance(e.target.value)}
                >
                  <option value="for">For the motion</option>
                  <option value="against">Against the motion</option>
                </select>
              </div>
            </div>

            <div className="bg-[#FFE8D0] text-[#2B2B2B] border border-[#E0B28A] p-4 rounded-lg flex items-center gap-4 shadow-inner">
              <div className="flex-shrink-0">
                <div className="bg-gray-800 p-2 rounded-full">
                  <AudioLines className="text-white w-6 h-6" />
                </div>
              </div>
              <div className="flex flex-col justify-center text-center w-full">
                <p className="text-black text-sm leading-relaxed">
                  {aiResponse || "Click 'Start Speaking' to begin the debate..."}
                </p>
              </div>
            </div>

            <div className="pt-4">
              <SessionControls
                startSession={startSession}
                stopSession={stopSession}
                sendClientEvent={sendClientEvent}
                isSessionActive={isSessionActive}
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-1/3 flex justify-center items-center -mt-12 " style={{ transform: "scale(1.6)" }}>
          {!isSessionActive ? (
            <img
              src={idleAvatar}
              alt="Idle Avatar"
              className="w-72 h-72 object-contain opacity-50 transition duration-500"
            />
          ) : (
            <Avatar
              audioSource={audioStream}
              isSessionActive={isSessionActive}
            />
          )}
        </div>
      </div>
    </div>
  );
}
