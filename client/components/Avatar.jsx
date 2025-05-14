import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";
import animationData from "../assets/lottie-Avatar.json";

export default function Avatar({ audioSource, isSessionActive }) {
  const lottieRef = useRef(); //Lottie animation instance
  const analyserRef = useRef(null); //Store web audio analyzer node
  const animationFrameRef = useRef(null); //Track the animation frame ID for cleanup
  const [isTalking, setIsTalking] = useState(false); //State to determine if avatar should be animated or not (AI is talking or not)

  //This useEffect sets up a Web Audio API analyser that checks the volume levels in the AI's audio stream to detect if the AI is speaking
  //It updates state accordingly
  useEffect(() => {
    if (!audioSource || !isSessionActive) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(audioSource);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyserRef.current = analyser;

    source.connect(analyser);

    //Continuously analyze the volume level and update isTalking
    const updateVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const speaking = avg > 10;
      setIsTalking(speaking);
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume(); //Call to start monitoring

    //return to cleanup component
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      analyser.disconnect();
      source.disconnect();
    };
  }, [audioSource, isSessionActive]);


  //This useEffect plays or stops the Lottie animation depending on the isTalking state (If AI is talking or not)
  useEffect(() => {
    if (!lottieRef.current) return;
    isTalking ? lottieRef.current.play() : lottieRef.current.stop();
  }, [isTalking]);

  return (
    <div className="w-72 h-72 mx-auto" style={{ transform: "scale(1.9)" }}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop
        autoplay={false}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
