import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";
import animationData from "../assets/lottie-Avatar.json";

export default function Avatar({ audioSource, isSessionActive }) {
  const lottieRef = useRef();
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isTalking, setIsTalking] = useState(false);

  useEffect(() => {
    if (!audioSource || !isSessionActive) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(audioSource);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyserRef.current = analyser;

    source.connect(analyser);

    const updateVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const speaking = avg > 10;
      setIsTalking(speaking);
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      analyser.disconnect();
      source.disconnect();
    };
  }, [audioSource, isSessionActive]);

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
