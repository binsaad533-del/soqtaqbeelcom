import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceChatOptions {
  onTranscript: (text: string) => void;
  lang?: string;
}

export function useVoiceChat({ onTranscript, lang = "ar-SA" }: UseVoiceChatOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const supportsRecognition = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const supportsSynthesis = typeof window !== "undefined" && "speechSynthesis" in window;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!supportsRecognition) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) onTranscript(transcript.trim());
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [supportsRecognition, lang, onTranscript]);

  const speak = useCallback((text: string) => {
    if (!supportsSynthesis || !voiceEnabled) return;
    
    // Stop any current speech
    synthRef.current.cancel();

    // Clean text for speech (remove emojis, special chars)
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/[⚠️✅✔️👀👋👌👍🤍💡🎯🧠💰🤝⚡✍️📊📋📷📝🔍🔔📄📈💪⚖️✨]/g, "")
      .replace(/\*\*/g, "")
      .replace(/\n+/g, ". ")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to find Arabic voice
    const voices = synthRef.current.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith("ar"));
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [supportsSynthesis, voiceEnabled, lang]);

  const stopSpeaking = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleVoice = useCallback(() => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next) {
      stopSpeaking();
      stopListening();
    }
  }, [voiceEnabled, stopSpeaking, stopListening]);

  // Preload voices
  useEffect(() => {
    if (supportsSynthesis) {
      synthRef.current.getVoices();
      synthRef.current.onvoiceschanged = () => synthRef.current.getVoices();
    }
  }, [supportsSynthesis]);

  // Cleanup
  useEffect(() => () => {
    synthRef.current.cancel();
    recognitionRef.current?.stop();
  }, []);

  return {
    isListening,
    isSpeaking,
    voiceEnabled,
    supportsRecognition,
    supportsSynthesis,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleVoice,
  };
}
