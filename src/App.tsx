import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ImagePlus,
  Settings,
  Dices,
  Trophy,
  Users,
  Edit3,
  Save,
  RefreshCcw,
  Medal,
  Check,
  Circle,
  XCircle,
  RotateCcw,
  Sparkles,
  Crown,
  Star,
  Loader2,
} from "lucide-react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./lib/firebase";
import FloatingMusicBg from "./components/FloatingMusicBg";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [participants, setParticipants] = useState<string[]>([]);
  const [targetCount, setTargetCount] = useState<number>(8);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [phase, setPhase] = useState<"PICKING" | "TOURNAMENT">(
    "PICKING",
  );
  const [qf, setQf] = useState<Match[]>([]);
  const [sf, setSf] = useState<Match[]>([]);
  const [final, setFinal] = useState<Match | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWinnersModal, setShowWinnersModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: "", onConfirm: () => {} });
  const [settingsTab, setSettingsTab] = useState<"PAGE" | "PARTICIPANT">(
    "PAGE",
  );

  // Custom Settings
  const [contentTitle, setContentTitle] = useState<string>("PICKER APP");
  const [tempContentTitle, setTempContentTitle] =
    useState<string>("PICKER APP");
  const [hideNames, setHideNames] = useState<boolean>(false);
  const [gridCols, setGridCols] = useState<number>(8);
  const [capsuleAspect, setCapsuleAspect] = useState<number>(2.4);
  const [fontSize, setFontSize] = useState<number>(13);

  const confirmAction = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  // Helper logic to dynamically obtain auto sizing based on participant counts
  const getAutoGridCols = (count: number) => {
    if (count <= 36) return 6;
    if (count <= 42) return 7;
    if (count <= 48) return 8;
    if (count <= 54) return 9;
    return 10;
  };

  const getAutoFontSize = (count: number) => {
    if (count <= 30) return 14;
    if (count <= 45) return 12;
    return 11;
  };

  // Sync with Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "sessions", "main"),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setParticipants(data.participants || []);
          setTargetCount(data.targetCount || 8);
          setTheme(data.theme || "light");
          setLogoImage(data.logoImage || null);
          setStatuses(data.statuses || {});
          setPhase(
            data.phase === "RANKINGS" ? "TOURNAMENT" : (data.phase || "PICKING")
          );
          setQf(data.qf || []);
          setSf(data.sf || []);
          setFinal(data.final || null);
          setRankings(data.rankings || []);

          // Load custom titling and sizing parameters
          setContentTitle(data.contentTitle || "PICKER APP");
          setTempContentTitle(data.contentTitle || "PICKER APP");
          setHideNames(data.hideNames !== undefined ? data.hideNames : false);
          setGridCols(
            data.gridCols || getAutoGridCols(data.participants?.length || 0),
          );
          setCapsuleAspect(data.capsuleAspect || 2.4);
          setFontSize(
            data.fontSize || getAutoFontSize(data.participants?.length || 0),
          );
        } else {
          // Initialize with defaults if not exists
          const defaultParticipants = Array.from(
            { length: 56 },
            (_, i) => `참가자 ${i + 1}`,
          );
          setParticipants(defaultParticipants);
          setTempListText(defaultParticipants.join("\n"));
        }
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "sessions/main");
        setIsLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const saveSession = useCallback(
    async (updates: any) => {
      try {
        const sessionDoc = doc(db, "sessions", "main");
        await setDoc(
          sessionDoc,
          {
            participants,
            targetCount,
            theme,
            logoImage,
            statuses,
            phase,
            qf,
            sf,
            final,
            rankings,
            contentTitle,
            hideNames,
            gridCols,
            capsuleAspect,
            fontSize,
            ...updates,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (err) {
        console.error("Save Error:", err);
        // Optional: show a small toast or non-blocking error
      }
    },
    [
      participants,
      targetCount,
      theme,
      logoImage,
      statuses,
      phase,
      qf,
      sf,
      final,
      rankings,
      contentTitle,
      hideNames,
      gridCols,
      capsuleAspect,
      fontSize,
    ],
  );

  const resetSession = async () => {
    confirmAction("진행상황을 초기화 하겠습니까(참가자 유지)", async () => {
      setIsLoading(true);
      try {
        const sessionDoc = doc(db, "sessions", "main");

        // We prepare a clean state while PRESERVING critical configuration like participants, contentTitle, hideNames etc.
        const resetData = {
          participants,
          targetCount,
          theme,
          logoImage,
          contentTitle,
          hideNames,
          gridCols,
          capsuleAspect,
          fontSize,
          statuses: {}, // Clear all pick statuses
          phase: "PICKING", // Reset to picking phase
          qf: [], // Clear brackets
          sf: [],
          final: null,
          rankings: [], // Clear rankings
          updatedAt: serverTimestamp(),
        };

        // Use setDoc without merge to ensure a totally clean wipe of progress fields
        await setDoc(sessionDoc, resetData);

        // Update local states immediately for snappy UI
        setStatuses({});
        setPhase("PICKING");
        setQf([]);
        setSf([]);
        setFinal(null);
        setRankings([]);
      } catch (err) {
        console.error("Reset Error:", err);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const hardResetParticipants = async () => {
    confirmAction(
      "진행상황 및 참가자, 설정을 모두 초기화 하겠습니까.",
      async () => {
        setIsLoading(true);
        const defaultParticipants = Array.from(
          { length: 56 },
          (_, i) => `참가자 ${i + 1}`,
        );
        try {
          const sessionDoc = doc(db, "sessions", "main");
          const fullResetData = {
            participants: defaultParticipants,
            targetCount: 8,
            theme: "light",
            logoImage: null,
            contentTitle: "PICKER APP",
            hideNames: false,
            gridCols: 8,
            capsuleAspect: 2.4,
            fontSize: 13,
            statuses: {},
            phase: "PICKING",
            qf: [],
            sf: [],
            final: null,
            rankings: [],
            updatedAt: serverTimestamp(),
          };
          await setDoc(sessionDoc, fullResetData);
          setTempListText(defaultParticipants.join("\n"));
          setShowSettings(false);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, "sessions/main");
        } finally {
          setIsLoading(false);
        }
      },
    );
  };

  type Status = "WAITING" | "PICKED" | "COMPLETE" | "PASS" | "FAIL";
  const getStatus = (p: string, index: number) =>
    statuses[`${p}_${index}`] || "WAITING";
  const setStatus = (p: string, index: number, status: Status) => {
    const newStatuses = { ...statuses, [`${p}_${index}`]: status };
    setStatuses(newStatuses);
    saveSession({ statuses: newStatuses });
  };

  const passedParticipants = participants
    .map((name, index) => ({ name, index }))
    .filter((item) => getStatus(item.name, item.index) === "PASS");
  const passedCount = passedParticipants.length;

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    participant: string;
    index: number;
  } | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [pickedResult, setPickedResult] = useState<{
    name: string;
    index: number;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings temp state
  const [tempListText, setTempListText] = useState(participants.join("\n"));
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Tournament States
  interface Match {
    id: number;
    p1: string;
    p2: string;
    winner: string | null;
  }

  // Rankings State
  interface Ranking {
    rank: number;
    name: string;
    score: string;
  }

  // ---- Image Uploads with Auto Resizing ----
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onComplete: (base64: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // 최대 해상도 600px 이하로 최적 리사이징 (Firestore 1MB 용량 제한 및 네트워크 전송 속도 최적화)
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // webp 포맷으로 압축 (투명도 지원 및 용량 최적화)
          const compressedBase64 = canvas.toDataURL("image/webp", 0.85);
          onComplete(compressedBase64);
        } else {
          onComplete(ev.target?.result as string);
        }
      };
      img.onerror = () => {
        onComplete(ev.target?.result as string);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ---- Picking Logic ----
  const startRandomPick = () => {
    if (isPicking) return;
    const availableItems = participants
      .map((name, index) => ({ name, index }))
      .filter((item) => getStatus(item.name, item.index) === "WAITING");

    if (availableItems.length === 0) {
      alert("모든 참가자가 추첨 또는 분류되었습니다. (남은 대기자 없음)");
      return;
    }

    setIsPicking(true);
    setPickedResult(null);

    let currentTick = 0;
    const totalTicks = 38; // 총 38단계로 전개하여 묵직하고 웅장한 감속감 제공
    const startDelay = 40; // 초반에는 눈부실 정도로 빠르게 회전 (40ms)
    const endDelay = 600;  // 마지막에는 멈출 듯 말 듯 아주 쫄깃하게 감속 (600ms)

    const runTick = () => {
      const randIdx = Math.floor(Math.random() * availableItems.length);
      const currentCandidate = availableItems[randIdx];
      
      setAnimatingIndex(currentCandidate.index);
      currentTick++;

      if (currentTick >= totalTicks) {
        // 마지막 픽 완료 후, 극적인 긴장감을 위해 멈춘 상태에서 100ms 추가 유지 후 최종 당선 확정
        setTimeout(() => {
          setStatus(currentCandidate.name, currentCandidate.index, "PICKED");
          setPickedResult(currentCandidate);
          setAnimatingIndex(null);
          setIsPicking(false);
        }, endDelay + 100);
        return;
      }

      // 2.5승의 exponential ease-out 곡선을 사용하여 마찰에 의해 서서히 부드럽게 멈추는 물리적 회전 효과 모사
      const t = currentTick / totalTicks;
      const easeOutT = Math.pow(t, 2.5);
      const nextDelay = startDelay + (endDelay - startDelay) * easeOutT;

      setTimeout(runTick, nextDelay);
    };

    // 정교한 재귀 호출형 타임아웃 룰렛 애니메이션 시작
    setTimeout(runTick, startDelay);
  };

  // ---- Tournament Logic ----
  const startTournament = () => {
    if (passedCount !== targetCount) {
      alert(
        `통과된 인원이 정확히 ${targetCount}명이어야 대진표를 진행할 수 있습니다.`,
      );
      return;
    }

    // Shuffle logic
    const shuffled = [...passedParticipants].sort(() => Math.random() - 0.5);
    const mappedNames = shuffled.map((p) => `${p.index + 1}. ${p.name}`);

    if (targetCount === 8) {
      setQf([
        { id: 1, p1: mappedNames[0], p2: mappedNames[1], winner: null },
        { id: 2, p1: mappedNames[2], p2: mappedNames[3], winner: null },
        { id: 3, p1: mappedNames[4], p2: mappedNames[5], winner: null },
        { id: 4, p1: mappedNames[6], p2: mappedNames[7], winner: null },
      ]);
      setSf([
        { id: 5, p1: "", p2: "", winner: null },
        { id: 6, p1: "", p2: "", winner: null },
      ]);
    } else if (targetCount === 4) {
      setQf([]);
      setSf([
        { id: 5, p1: mappedNames[0], p2: mappedNames[1], winner: null },
        { id: 6, p1: mappedNames[2], p2: mappedNames[3], winner: null },
      ]);
    }

    setFinal({ id: 7, p1: "", p2: "", winner: null });
    const tournamentState = {
      qf:
        targetCount === 8
          ? [
              { id: 1, p1: mappedNames[0], p2: mappedNames[1], winner: null },
              { id: 2, p1: mappedNames[2], p2: mappedNames[3], winner: null },
              { id: 3, p1: mappedNames[4], p2: mappedNames[5], winner: null },
              { id: 4, p1: mappedNames[6], p2: mappedNames[7], winner: null },
            ]
          : [],
      sf:
        targetCount === 8
          ? [
              { id: 5, p1: "", p2: "", winner: null },
              { id: 6, p1: "", p2: "", winner: null },
            ]
          : [
              { id: 5, p1: mappedNames[0], p2: mappedNames[1], winner: null },
              { id: 6, p1: mappedNames[2], p2: mappedNames[3], winner: null },
            ],
      final: { id: 7, p1: "", p2: "", winner: null },
      phase: "TOURNAMENT" as const,
    };
    saveSession(tournamentState);
  };

  const shuffleTournament = () => {
    confirmAction("현재 대진표 순서를 무작위로 섞으시겠습니까?", () => {
      const shuffled = [...passedParticipants].sort(() => Math.random() - 0.5);
      const mappedNames = shuffled.map((p) => `${p.index + 1}. ${p.name}`);

      let updates: any = {};
      if (targetCount === 8) {
        const newQf = [
          { id: 1, p1: mappedNames[0], p2: mappedNames[1], winner: null },
          { id: 2, p1: mappedNames[2], p2: mappedNames[3], winner: null },
          { id: 3, p1: mappedNames[4], p2: mappedNames[5], winner: null },
          { id: 4, p1: mappedNames[6], p2: mappedNames[7], winner: null },
        ];
        setQf(newQf);
        updates.qf = newQf;
      } else if (targetCount === 4) {
        const newSf = [
          { id: 5, p1: mappedNames[0], p2: mappedNames[1], winner: null },
          { id: 6, p1: mappedNames[2], p2: mappedNames[3], winner: null },
        ];
        setSf(newSf);
        updates.sf = newSf;
      }
      saveSession(updates);
    });
  };

  const advancePlayer = (
    matchPhase: "qf" | "sf" | "f",
    matchId: number,
    player: string,
  ) => {
    if (!player) return;

    let updates: any = {};
    
    if (matchPhase === "qf") {
      const idx = matchId - 1;
      const updatedQf = [...qf];
      const updatedSf = [...sf];
      const updatedFinal = final ? { ...final } : null;
      
      if (updatedQf[idx].winner === player) {
        // 이미 해당 자가 승자이면 승자 지정 전면 취소 (Rollback)
        updatedQf[idx].winner = null;
        
        // 4강(세미파이널)의 해당 슬롯 대기상태 처리 및 4강 승자였을 경우 4강 승자도 자동 취소
        if (matchId === 1) {
          if (updatedSf[0].winner === updatedSf[0].p1) updatedSf[0].winner = null;
          updatedSf[0].p1 = "";
        } else if (matchId === 2) {
          if (updatedSf[0].winner === updatedSf[0].p2) updatedSf[0].winner = null;
          updatedSf[0].p2 = "";
        } else if (matchId === 3) {
          if (updatedSf[1].winner === updatedSf[1].p1) updatedSf[1].winner = null;
          updatedSf[1].p1 = "";
        } else if (matchId === 4) {
          if (updatedSf[1].winner === updatedSf[1].p2) updatedSf[1].winner = null;
          updatedSf[1].p2 = "";
        }
        
        // 결승(파이널)의 해당 슬롯 대기상태 처리 및 결승 승자도 자동 취소
        if (updatedFinal) {
          if (matchId === 1 || matchId === 2) {
            if (updatedFinal.winner === updatedFinal.p1) updatedFinal.winner = null;
            updatedFinal.p1 = "";
          } else {
            if (updatedFinal.winner === updatedFinal.p2) updatedFinal.winner = null;
            updatedFinal.p2 = "";
          }
        }
      } else {
        // 새로 승자 지정
        updatedQf[idx].winner = player;
        if (matchId === 1) updatedSf[0].p1 = player;
        else if (matchId === 2) updatedSf[0].p2 = player;
        else if (matchId === 3) updatedSf[1].p1 = player;
        else if (matchId === 4) updatedSf[1].p2 = player;
      }
      
      setQf(updatedQf);
      updates.qf = updatedQf;
      setSf(updatedSf);
      updates.sf = updatedSf;
      if (updatedFinal) {
        setFinal(updatedFinal);
        updates.final = updatedFinal;
      }
    } 
    else if (matchPhase === "sf") {
      const idx = matchId - 5;
      const updatedSf = [...sf];
      const updatedFinal = final ? { ...final } : null;
      
      if (updatedSf[idx].winner === player) {
        // 이미 승자이면 취소
        updatedSf[idx].winner = null;
        
        if (updatedFinal) {
          if (matchId === 5) {
            if (updatedFinal.winner === updatedFinal.p1) updatedFinal.winner = null;
            updatedFinal.p1 = "";
          } else if (matchId === 6) {
            if (updatedFinal.winner === updatedFinal.p2) updatedFinal.winner = null;
            updatedFinal.p2 = "";
          }
        }
      } else {
        // 새로 승자 지정
        updatedSf[idx].winner = player;
        if (updatedFinal) {
          if (matchId === 5) updatedFinal.p1 = player;
          else if (matchId === 6) updatedFinal.p2 = player;
        }
      }
      
      setSf(updatedSf);
      updates.sf = updatedSf;
      if (updatedFinal) {
        setFinal(updatedFinal);
        updates.final = updatedFinal;
      }
    } 
    else if (matchPhase === "f") {
      if (!final) return;
      const updatedFinal = { ...final };
      
      if (updatedFinal.winner === player) {
        // 이미 챔피언 우승자이면 취소
        updatedFinal.winner = null;
        setRankings([]);
        updates.rankings = [];
      } else {
        // 우승 처리 및 랭킹 부여
        updatedFinal.winner = player;
        const secondPlace = final.p1 === player ? final.p2 : final.p1;
        const newRankings = [
          { rank: 1, name: player, score: "우승" },
          { rank: 2, name: secondPlace || "", score: "준우승" },
          { rank: 3, name: "", score: "" },
        ];
        setRankings(newRankings);
        updates.rankings = newRankings;
      }
      
      setFinal(updatedFinal);
      updates.final = updatedFinal;
    }
    
    saveSession(updates);
  };

  // ---- Sub-components ----
  const renderBracketMatch = (
    match: Match | null,
    phaseLabel: "qf" | "sf" | "f",
  ) => {
    if (!match) return null;
    const isDark = theme === "dark";
    const isFinal = phaseLabel === "f";

    const PlayerButton = ({
      player,
      side,
    }: {
      player: string;
      side: "p1" | "p2";
    }) => {
      const isWinner = match.winner === player;
      const isLoser = match.winner && match.winner !== player;
      
      // 앞단의 "숫자 + 점 + 공백"(예: "14. 루다") 패턴을 정교하게 걸러내어 숫자 번호 제거
      const cleanedName = player ? player.replace(/^\d+\.\s*/, "") : "";

      return (
        <motion.button
          whileHover={player && !isLoser ? { scale: 1.02 } : {}}
          whileTap={player && !isLoser ? { scale: 0.98 } : {}}
          disabled={!player}
          onClick={() => advancePlayer(phaseLabel, match.id, player)}
          className={`relative w-full px-4 ${isFinal ? "py-4 text-sm" : "py-3 text-xs"} font-black rounded-xl overflow-hidden transition-all duration-300 pointer-events-auto flex items-center justify-between border ${
            isWinner
              ? "bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-[0_8px_25px_rgba(99,102,241,0.4)] border-indigo-400/30 z-20"
              : player && !match.winner
                ? isDark
                  ? "bg-white/5 hover:bg-white/10 hover:text-indigo-400 text-white border-white/10 hover:border-indigo-500/50 cursor-pointer"
                  : "bg-gray-100/70 hover:bg-gray-200/90 hover:text-indigo-600 text-gray-800 border-gray-200 hover:border-indigo-500/50 cursor-pointer"
                : player && isLoser
                  ? isDark
                    ? "bg-black/30 text-white/20 border-transparent scale-95 opacity-40 grayscale"
                    : "bg-gray-50/70 text-gray-300 border-transparent scale-95 opacity-40 grayscale"
                  : isDark
                    ? "bg-black/10 text-white/5 border-white/5 pointer-events-none"
                    : "bg-gray-50/30 text-gray-200 border-gray-100 pointer-events-none"
          }`}
        >
          <span className="truncate max-w-[85%] font-sans pr-1 text-left block w-full">
            {cleanedName || "대기중..."}
          </span>
          {isWinner && (
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`px-1.5 py-0.5 ${isFinal ? "text-[10px] bg-yellow-400 text-black" : "text-[8px] bg-white text-indigo-600"} rounded font-black tracking-widest shrink-0 shadow-sm border border-indigo-200/30 font-sans`}
            >
              WIN
            </motion.span>
          )}
        </motion.button>
      );
    };

    return (
      <div
        className={`flex flex-col gap-2 w-full ${isFinal ? "w-[210px] md:w-[250px] p-[18px] rounded-[32px] ring-2 ring-indigo-500/30 shadow-[0_30px_70px_rgba(99,102,241,0.25)]" : "max-w-[170px] p-3 rounded-[24px] border shadow-2xl"} relative z-10 transition-all duration-300 hover:-translate-y-1 ${
          isDark 
            ? isFinal 
              ? "bg-gradient-to-b from-gray-900 via-indigo-950/20 to-black border-indigo-500/30 shadow-indigo-950/50 backdrop-blur-3xl"
              : "bg-gradient-to-b from-gray-900/90 to-black/85 border-white/5 shadow-black/80 backdrop-blur-2xl" 
            : isFinal
              ? "bg-gradient-to-b from-white via-indigo-50/20 to-gray-50 border-indigo-200/50 shadow-indigo-100/40 backdrop-blur-3xl"
              : "bg-gradient-to-b from-white/95 to-gray-50/90 border-black/[0.04] shadow-gray-200/40 backdrop-blur-md"
        }`}
      >
        <PlayerButton player={match.p1} side="p1" />
        <div className="flex items-center justify-center gap-2 px-1 py-0.5">
          <div className={`h-[1px] flex-1 ${isDark ? isFinal ? "bg-indigo-500/20" : "bg-white/5" : isFinal ? "bg-indigo-200/50" : "bg-black/[0.03]"}`}></div>
          <span className={`text-[8px] font-black tracking-widest uppercase shrink-0 select-none ${isDark ? isFinal ? "text-indigo-400" : "text-white/10" : isFinal ? "text-indigo-600" : "text-black/15"}`}>
            VS
          </span>
          <div className={`h-[1px] flex-1 ${isDark ? isFinal ? "bg-indigo-500/20" : "bg-white/5" : isFinal ? "bg-indigo-200/50" : "bg-black/[0.03]"}`}></div>
        </div>
        <PlayerButton player={match.p2} side="p2" />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-950 text-white font-black italic text-4xl gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        LOADING CLOUD DATA...
      </div>
    );
  }

  return (
    <div
      className={`w-screen h-screen flex flex-col font-sans overflow-hidden transition-colors duration-500 relative ${
        theme === "dark" ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Elegant floating line and music animated background */}
      <FloatingMusicBg theme={theme} />

      {/* 1. TOP HEADER & NAVIGATION BAR (이제 absolute로 띄워서 로고 영역과 아름답게 겹치도록 설정) */}
      <div className="absolute top-0 left-0 w-full flex items-center justify-between px-10 py-3 shrink-0 z-50 border-b border-black/[0.04] dark:border-white/[0.04]">
        {/* Left: Title */}
        <h1
          className={`text-2xl lg:text-4xl font-black tracking-tighter shrink-0 ${theme === "dark" ? "text-white" : "text-black"}`}
        >
          {contentTitle.split(" ")[0]}{" "}
          <span className="text-indigo-500">
            {contentTitle.split(" ").slice(1).join(" ") || ""}
          </span>
        </h1>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={resetSession}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs transition-all border shadow-lg active:scale-95 ${theme === "dark" ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20" : "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100"}`}
          >
            <RefreshCcw className="w-4 h-4" />
            <span>초기화</span>
          </button>
          <button
            onClick={() => {
              setTempListText(participants.join("\n"));
              setShowSettings(true);
            }}
            className={`p-3 rounded-2xl transition-all border shadow-lg hover:rotate-90 ${theme === "dark" ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/10 text-black hover:bg-black/10"}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC LOGO BANNER AREA (헤더 뒷편으로 정교하게 겹치며, 우주 플로팅 효과 및 10% 확장 적용) */}
      <div className="h-[31vh] w-full flex items-center justify-center p-4 pt-10 shrink-0 relative z-10 select-none">
        {logoImage ? (
          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: [0, 0.6, -0.6, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-full w-full flex items-center justify-center pointer-events-none"
          >
            <img
              src={logoImage}
              alt="Main Logo"
              className="h-full max-h-[28vh] w-auto max-w-[80vw] object-contain drop-shadow-2xl"
            />
          </motion.div>
        ) : (
          <div
            className={`text-4xl lg:text-7xl font-black tracking-tighter italic opacity-10 select-none uppercase ${theme === "dark" ? "text-white" : "text-gray-900"}`}
          >
            {contentTitle}
          </div>
        )}
      </div>

      {/* 3. MAIN CONTENT AND INTERFACES CONTAINER */}
      <div
        className={`flex-1 w-full relative z-20 flex flex-col overflow-visible min-h-0 ${theme === "dark" ? "bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" : "bg-gradient-to-t from-gray-50/80 via-transparent to-transparent"}`}
      >
        {/* Shared Phase Navigation & Controls (마진 조정을 통해 전체 본문 영역을 적절한 위상으로 더 내려 공간적 안정감 확보) */}
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-10 mb-12 shrink-0 -mt-6 pt-1 z-30">
          {/* Left: Phase Navigation Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/5">
            {[
              {
                id: "PICKING",
                label: "추첨",
                icon: <Dices className="w-4 h-4" />,
              },
              {
                id: "TOURNAMENT",
                label: `${targetCount}강 대진표`,
                icon: <Trophy className="w-4 h-4" />,
              },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  const newPhase = p.id as any;
                  setPhase(newPhase);
                  saveSession({ phase: newPhase });
                }}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-xs transition-all duration-300 ${phase === p.id ? "bg-indigo-600 text-white shadow-[0_10px_20px_rgba(79,70,229,0.3)] scale-105" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>

          {/* Right: Action Buttons (Only in Picking) */}
          {phase === "PICKING" && (
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={() => setShowWinnersModal(true)}
                className={`flex items-center gap-4 px-6 h-[52px] rounded-2xl backdrop-blur-xl border shadow-xl transition-all hover:scale-105 active:scale-95 ${theme === "dark" ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white/90 border-gray-200 hover:bg-white"}`}
              >
                <div className="flex items-baseline gap-2">
                  <Users
                    className={`w-5 h-5 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`}
                  />
                  <span
                    className={`font-black text-sm tracking-tight ${theme === "dark" ? "text-white/40" : "text-gray-500"}`}
                  >
                    {targetCount}강 진출자
                  </span>
                  <span
                    className={`${theme === "dark" ? "text-yellow-400" : "text-indigo-600"} text-3xl font-black`}
                  >
                    {passedCount}
                  </span>
                  <span className="opacity-20 text-xs font-light">
                    / {targetCount}
                  </span>
                </div>
              </button>

              {passedCount >= targetCount ? (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={startTournament}
                  className="group relative flex items-center justify-center gap-2.5 w-[145px] h-[52px] bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-[0_15px_30px_rgba(79,70,229,0.3)] hover:bg-indigo-500 transition-all overflow-hidden"
                >
                  <Trophy className="w-4 h-4 group-hover:rotate-12 transition-transform decoration-transparent shrink-0" />
                  <span className="truncate">{targetCount}강 스타트</span>
                </motion.button>
              ) : (
                <button
                  onClick={startRandomPick}
                  disabled={isPicking || participants.length === 0}
                  className={`relative group w-[145px] h-[52px] rounded-2xl font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
                    theme === "dark"
                      ? "bg-white/10 text-white hover:bg-white/20 disabled:bg-gray-900 disabled:text-gray-700"
                      : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-gray-200 disabled:text-gray-400 shadow-indigo-200"
                  }`}
                >
                  <Dices
                    className={`w-4 h-4 flex-shrink-0 ${isPicking ? "animate-spin" : ""}`}
                  />
                  <span className="truncate">{isPicking ? "선발 중..." : "1명 랜덤 선발"}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Picking Interface */}
        {phase === "PICKING" && (
          <div className="flex-1 flex flex-col overflow-hidden w-full max-w-7xl mx-auto">
            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-20 px-6 md:px-10 lg:px-14">
              <div
                className="grid gap-3 auto-rows-max place-items-center w-full pb-10"
                style={{
                  gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                }}
              >
                <AnimatePresence mode="popLayout">
                  {participants.map((participant, i) => {
                    const displayName =
                      hideNames && getStatus(participant, i) === "WAITING"
                        ? `참가자 ${i + 1}`
                        : participant;
                    const status = getStatus(participant, i);
                    const isAnimate = animatingIndex === i;

                    let statusClasses = "";
                    if (status === "PICKED") {
                      statusClasses =
                        theme === "dark"
                          ? "bg-yellow-400 border-yellow-300 text-black shadow-[0_0_25px_rgba(250,204,21,0.5)] scale-105 z-20"
                          : "bg-indigo-600 border-indigo-500 text-white shadow-xl scale-105 z-20";
                    } else if (status === "PASS") {
                      statusClasses =
                        "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-105 z-10";
                    } else if (status === "FAIL") {
                      statusClasses =
                        theme === "dark"
                          ? "bg-gray-900 border-white/5 text-white/30 scale-90 grayscale"
                          : "bg-gray-200 border-gray-300 text-gray-400 scale-90 grayscale";
                    } else if (status === "COMPLETE") {
                      statusClasses =
                        theme === "dark"
                          ? "bg-blue-600 border-blue-500 text-white shadow-md"
                          : "bg-blue-100 border-blue-200 text-blue-700 shadow-sm";
                    } else {
                      // WAITING
                      statusClasses =
                        theme === "dark"
                          ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                          : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300 shadow-sm";
                    }

                    return (
                      <motion.div
                        key={`${participant}_${i}`}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: 1,
                          scale:
                            status === "FAIL"
                              ? 0.9
                              : (status === "PICKED" || status === "PASS")
                                ? 1.05
                                : 1,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                        }}
                        className="w-full"
                      >
                        <div
                          style={{
                            aspectRatio: capsuleAspect,
                            fontSize: `${fontSize}px`,
                          }}
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            // 좌클릭 시 대기 -> 선택 -> 통과 -> 탈락 상태로 4단계 순환 토글
                            const currentStatus = getStatus(participant, i);
                            let nextStatus: "WAITING" | "PICKED" | "PASS" | "FAIL" = "WAITING";
                            if (currentStatus === "WAITING") {
                              nextStatus = "PICKED";
                            } else if (currentStatus === "PICKED") {
                              nextStatus = "PASS";
                            } else if (currentStatus === "PASS") {
                              nextStatus = "FAIL";
                            } else if (currentStatus === "FAIL") {
                              nextStatus = "WAITING";
                            } else {
                              nextStatus = "WAITING";
                            }
                            setStatus(participant, i, nextStatus);
                          }}
                          onContextMenu={(e: React.MouseEvent) => {
                            e.preventDefault();
                          }}
                          className={`
                                   w-full flex items-center justify-center px-1 rounded-xl border font-black cursor-pointer select-none
                                   ${isPicking ? "transition-all duration-75" : "transition-all duration-300"}
                                   ${
                                     isAnimate
                                       ? "bg-yellow-300 border-yellow-200 text-black scale-112 z-30 shadow-[0_0_45px_rgba(250,204,21,0.9)] ring-2 ring-yellow-400"
                                       : statusClasses
                                   }
                                 `}
                        >
                          <span className="truncate max-w-full text-center px-2 font-sans uppercase">
                            {displayName}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {participants.length === 0 && (
                  <div className="col-span-full py-20 text-white/50 text-xl font-bold flex flex-col items-center gap-4">
                    <Users className="w-16 h-16" />
                    참가자가 없습니다. 관리자 설정에서 참가자를 등록해주세요.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- PHASE: TOURNAMENT --- */}
        {phase === "TOURNAMENT" && (
          <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4 overflow-hidden relative">
            <div className="flex-1 flex items-center justify-between w-full h-full pb-12">
              {/* Left Bracket */}
              {targetCount === 8 && (
                <div className="flex flex-col justify-around h-full w-[25%] relative z-10 px-2 lg:px-6">
                  <div
                    className={`text-center font-black uppercase mb-4 pb-2 border-b tracking-widest text-[10px] lg:text-xs ${theme === "dark" ? "text-white/20 border-white/5" : "text-gray-300 border-gray-100"}`}
                  >
                    {targetCount}강 (Group A)
                  </div>
                  {renderBracketMatch(qf[0], "qf")}
                  <div className="h-10"></div>
                  {renderBracketMatch(qf[1], "qf")}
                </div>
              )}

              {/* Left Semi */}
              <div
                className={`flex flex-col justify-around h-[60%] relative z-10 ${targetCount === 4 ? "w-[40%] flex-1 items-center px-10" : "w-[20%]"}`}
              >
                <div className="text-center font-black text-indigo-500 mb-4 pb-2 tracking-widest text-[10px] lg:text-xs uppercase">
                  Semifinals
                </div>
                {renderBracketMatch(sf[0], "sf")}
              </div>

              {/* Final */}
              <div
                className={`flex flex-col justify-center h-full relative z-20 items-center ${targetCount === 4 ? "w-[25%]" : "w-[30%]"}`}
              >
                <div
                  className={`text-center font-black mb-6 text-xl lg:text-3xl tracking-tighter flex flex-col items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  <Trophy className="w-10 h-10 text-indigo-500 drop-shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
                  <span className="tracking-widest text-xs font-sans text-indigo-500">FINALS</span>
                </div>
                <div className="relative z-30">
                  {renderBracketMatch(final, "f")}
                </div>
                {final?.winner && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mt-8 text-center"
                  >
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                      👑 Champion
                    </div>
                    <div
                      className={`text-3xl lg:text-5xl font-black drop-shadow-sm uppercase ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                    >
                      {final.winner.replace(/^\d+\.\s*/, "")}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Semi */}
              <div
                className={`flex flex-col justify-around h-[60%] relative z-10 items-end ${targetCount === 4 ? "w-[40%] flex-1 items-center px-10" : "w-[20%]"}`}
              >
                <div className="text-center font-black text-indigo-500 mb-4 pb-2 tracking-widest text-[10px] lg:text-xs uppercase w-full">
                  Semifinals
                </div>
                {renderBracketMatch(sf[1], "sf")}
              </div>

              {/* Right Bracket */}
              {targetCount === 8 && (
                <div className="flex flex-col justify-around h-full w-[25%] relative z-10 px-2 lg:px-6 items-end">
                  <div
                    className={`text-center font-black uppercase mb-4 pb-2 border-b tracking-widest text-[10px] lg:text-xs w-full ${theme === "dark" ? "text-white/20 border-white/5" : "text-gray-300 border-gray-100"}`}
                  >
                    {targetCount}강 (Group B)
                  </div>
                  {renderBracketMatch(qf[2], "qf")}
                  <div className="h-10"></div>
                  {renderBracketMatch(qf[3], "qf")}
                </div>
              )}

              {/* Visual Lines between brackets (Simplified presentation structure behind) */}
              <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-5">
                <Trophy
                  className={`w-[60vh] h-[60vh] ${theme === "dark" ? "text-white" : "text-black"}`}
                />
              </div>
            </div>
          </div>
        )}


      </div>

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-4xl border p-8 rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] ${theme === "dark" ? "bg-gray-900 border-white/10" : "bg-white border-black/10"}`}
          >
            <div className="flex items-center justify-between mb-8">
              <h3
                className={`text-2xl font-black flex items-center gap-3 ${theme === "dark" ? "text-white" : "text-black"}`}
              >
                <Settings className="w-7 h-7 text-indigo-500" /> 관리자 설정
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className={`p-2 rounded-full transition-colors ${theme === "dark" ? "bg-white/10 text-white/50 hover:text-white" : "bg-black/5 text-black/50 hover:text-black"}`}
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 mb-6 shrink-0">
              <button
                onClick={() => setSettingsTab("PAGE")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settingsTab === "PAGE" ? "bg-indigo-600 text-white" : theme === "dark" ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80" : "bg-black/5 text-black/50 hover:bg-black/10 hover:text-black/80"}`}
              >
                페이지 설정
              </button>
              <button
                onClick={() => setSettingsTab("PARTICIPANT")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settingsTab === "PARTICIPANT" ? "bg-indigo-600 text-white" : theme === "dark" ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80" : "bg-black/5 text-black/50 hover:bg-black/10 hover:text-black/80"}`}
              >
                참가자 설정
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-2">
              {settingsTab === "PAGE" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6 pb-6">
                  {/* Content Title Input */}
                  <section className="col-span-2">
                    <div
                      className={`flex flex-col h-full p-5 rounded-[20px] justify-center ${theme === "dark" ? "bg-black/40" : "bg-black/5"} space-y-3`}
                    >
                      <label className="block text-xs font-bold opacity-60">
                        콘텐츠 제목
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tempContentTitle}
                          onChange={(e) => setTempContentTitle(e.target.value)}
                          className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${theme === "dark" ? "bg-black/50 border-white/10 text-white" : "bg-white border-black/10 text-black"}`}
                          placeholder="PICKER APP"
                        />
                        <button
                          onClick={() => {
                            setContentTitle(tempContentTitle);
                            saveSession({ contentTitle: tempContentTitle });
                          }}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-indigo-500/20 shrink-0"
                        >
                          적용
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Name Obfuscation & Security Option */}
                  <section className="col-span-2">
                    <div
                      className={`h-full p-5 rounded-[20px] ${theme === "dark" ? "bg-black/40" : "bg-black/5"} flex items-center justify-between`}
                    >
                      <div className="pr-4">
                        <label className="block text-xs font-bold opacity-60 mb-1">
                          참가자 실제 이름 가리기
                        </label>
                        <span className="text-[10px] opacity-40 leading-relaxed block">
                          추첨 전 대기자들의 본명을 숨깁니다.
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !hideNames;
                          setHideNames(nextVal);
                          saveSession({ hideNames: nextVal });
                        }}
                        className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-300 shrink-0 ${hideNames ? "bg-indigo-600" : "bg-gray-300 dark:bg-white/10"}`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${hideNames ? "translate-x-6" : "translate-x-0"}`}
                        />
                      </button>
                    </div>
                  </section>

                  {/* Theme Selection */}
                  <section className="col-span-2">
                    <div
                      className={`p-5 rounded-[20px] ${theme === "dark" ? "bg-black/40" : "bg-black/5"}`}
                    >
                      <label className="block text-xs font-bold mb-3 opacity-60">
                        테마 전환
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            const newTheme =
                              theme === "light" ? "dark" : "light";
                            setTheme(newTheme);
                            saveSession({ theme: newTheme });
                          }}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${theme === "light" ? "bg-indigo-600 text-white shadow-lg" : "bg-transparent text-gray-400 hover:bg-black/5"}`}
                        >
                          라이트
                        </button>
                        <button
                          onClick={() => {
                            const newTheme =
                              theme === "dark" ? "light" : "dark";
                            setTheme(newTheme);
                            saveSession({ theme: newTheme });
                          }}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${theme === "dark" ? "bg-indigo-600 text-white shadow-lg" : "bg-transparent text-gray-400 hover:bg-black/5"}`}
                        >
                          다크
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Tournament Goal */}
                  <section className="col-span-2">
                    <div
                      className={`p-5 rounded-[20px] ${theme === "dark" ? "bg-black/40" : "bg-black/5"}`}
                    >
                      <label className="block text-xs font-bold mb-3 opacity-60">
                        대진표 목표 (강)
                      </label>
                      <div className="flex gap-1">
                        {[4, 8, 16].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              setTargetCount(num);
                              saveSession({ targetCount: num });
                            }}
                            className={`flex-1 py-2 rounded-lg font-bold text-[10px] border-2 transition-all ${targetCount === num ? "bg-indigo-600 border-indigo-600 text-white" : "bg-transparent border-transparent text-gray-400 hover:bg-black/5"}`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Layout Custom Sliders */}
                  <section className="col-span-2">
                    <div
                      className={`p-5 rounded-[20px] ${theme === "dark" ? "bg-black/40" : "bg-black/5"} space-y-4`}
                    >
                      <label className="block text-xs font-bold opacity-60 mb-2">
                        그리드 및 캡슐 미세조정
                      </label>
                      {/* Columns count slider */}
                      <div>
                        <div className="flex justify-between text-xs font-bold opacity-70 mb-1.5">
                          <span>그리드 열 수 ({gridCols}열)</span>
                          <span className="text-[10px] opacity-50">
                            범위: 6 - 10
                          </span>
                        </div>
                        <input
                          type="range"
                          min="6"
                          max="10"
                          step="1"
                          value={gridCols}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setGridCols(val);
                            saveSession({ gridCols: val });
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      {/* Capsule Aspect ratio slider */}
                      <div>
                        <div className="flex justify-between text-xs font-bold opacity-70 mb-1.5">
                          <span>
                            캡슐 형태 비율 ({capsuleAspect.toFixed(1)})
                          </span>
                          <span className="text-[10px] opacity-50">
                            가로 대 세로
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.5"
                          max="3.5"
                          step="0.1"
                          value={capsuleAspect}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCapsuleAspect(val);
                            saveSession({ capsuleAspect: val });
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      {/* Font size slider */}
                      <div>
                        <div className="flex justify-between text-xs font-bold opacity-70 mb-1.5">
                          <span>텍스트 폰트 크기 ({fontSize}px)</span>
                        </div>
                        <input
                          type="range"
                          min="9"
                          max="20"
                          step="1"
                          value={fontSize}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setFontSize(val);
                            saveSession({ fontSize: val });
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Image Settings */}
                  <section className="col-span-2">
                    <div
                      className={`h-full p-5 rounded-[20px] ${theme === "dark" ? "bg-black/40" : "bg-black/5"} flex flex-col justify-center`}
                    >
                      <label className="block text-xs font-bold mb-3 opacity-60">
                        로고 이미지 (중앙)
                      </label>
                      <div className="flex flex-col gap-2">
                        <label
                          className={`w-full h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer hover:bg-indigo-500/10 transition-all ${theme === "dark" ? "border-white/10" : "border-black/10"}`}
                        >
                          {logoImage ? (
                            <img
                              src={logoImage}
                              className="h-16 object-contain"
                            />
                          ) : (
                            <div className="text-center opacity-30 scale-75">
                              <ImagePlus className="mx-auto mb-1.5 w-5 h-5" />
                              <span>로고 업로드</span>
                            </div>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              handleImageUpload(e, (base64) => {
                                setLogoImage(base64);
                                saveSession({ logoImage: base64 });
                              });
                            }}
                          />
                        </label>
                        {logoImage && (
                          <button
                            onClick={() => {
                              setLogoImage(null);
                              saveSession({ logoImage: null });
                            }}
                            className="text-[9px] text-red-500 font-bold hover:underline self-end"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {settingsTab === "PARTICIPANT" && (
                <div className="flex flex-col h-full min-h-[400px] w-full pb-4">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h4
                      className={`text-sm font-black uppercase tracking-widest ${theme === "dark" ? "text-white/40" : "text-black/40"}`}
                    >
                      참가자 명단
                    </h4>
                    <span className="text-xs font-bold px-3 py-1 bg-indigo-500 text-white rounded-lg">
                      {tempListText.split("\n").filter(Boolean).length}명
                    </span>
                  </div>
                  <div
                    className={`relative flex-1 w-full rounded-[32px] border overflow-hidden min-h-[300px] ${theme === "dark" ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"}`}
                  >
                    <textarea
                      ref={textareaRef}
                      onScroll={handleScroll}
                      className="absolute inset-0 w-full h-full p-8 text-base font-medium resize-none focus:outline-none font-sans leading-relaxed bg-transparent overflow-y-auto"
                      value={tempListText}
                      onChange={(e) => setTempListText(e.target.value)}
                      placeholder="참가자 이름을 한 줄에 하나씩 입력하세요..."
                    />
                  </div>
                  <p
                    className={`mt-3 text-[10px] font-medium opacity-40 italic shrink-0 ${theme === "dark" ? "text-white" : "text-black"}`}
                  >
                    * 한 줄에 한 명씩 입력해주세요 (예: 참가자1)
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-8 mt-4 border-t border-gray-100 dark:border-white/5 shrink-0">
              <button
                onClick={hardResetParticipants}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${theme === "dark" ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50"}`}
              >
                <RefreshCcw className="w-5 h-5" /> 설정 초기화
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className={`px-8 py-3 rounded-2xl font-bold transition-colors ${theme === "dark" ? "bg-white/5 hover:bg-white/10 text-white/70" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    const newList = tempListText
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setParticipants(newList);
                    saveSession({ participants: newList });
                    setShowSettings(false);
                  }}
                  className="px-10 py-3 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2"
                >
                  <Check className="w-5 h-5" /> 저장 및 적용
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- WINNERS LIST MODAL --- */}
      <AnimatePresence>
        {showWinnersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 md:p-10"
            onClick={() => setShowWinnersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className={`w-full max-w-4xl max-h-[80vh] flex flex-col rounded-[48px] border shadow-2xl overflow-hidden ${theme === "dark" ? "bg-gray-950 border-white/10" : "bg-white border-gray-100"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                <h3 className="text-3xl font-black italic tracking-tighter flex items-center gap-3">
                  <Users className="w-8 h-8 text-indigo-500" />
                  CURRENT LINEUP
                </h3>
                <span className="bg-indigo-600 text-white px-5 py-2 rounded-full font-black text-xl shadow-lg">
                  {passedCount} / {targetCount}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-8 pt-4 no-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {passedParticipants.map((p, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-6 rounded-[24px] border flex flex-col items-center gap-2 shadow-sm transition-all hover:scale-105 ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-100 text-gray-800"}`}
                    >
                      <span className="text-[10px] font-black opacity-30 italic">
                        {p.index + 1}
                      </span>
                      <span className="text-xl font-black uppercase tracking-tight text-center">
                        {p.name}
                      </span>
                    </motion.div>
                  ))}
                  {passedCount === 0 && (
                    <div className="col-span-full py-20 text-center opacity-20 font-black text-4xl italic tracking-tighter">
                      NO ONE SELECTED YET
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 pt-0 flex justify-end">
                <button
                  onClick={() => setShowWinnersModal(false)}
                  className={`px-10 py-4 rounded-3xl font-black text-lg transition-all ${theme === "dark" ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PREMIUM NEON SPARK REVEAL OVERLAY --- */}
      <AnimatePresence>
        {pickedResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md select-none"
            onClick={() => setPickedResult(null)}
          >
            {/* Ambient background glowing spot */}
            <div className="absolute inset-0 bg-radial-gradient from-indigo-900/20 via-transparent to-transparent pointer-events-none" />

            {/* Orbiting Background Stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[
                { top: "15%", left: "20%", delay: 0.1, duration: 4 },
                { top: "25%", left: "75%", delay: 0.5, duration: 6 },
                { top: "70%", left: "15%", delay: 0.8, duration: 5 },
                { top: "80%", left: "80%", delay: 0.3, duration: 7 },
              ].map((star, sIdx) => (
                <motion.div
                  key={sIdx}
                  className="absolute"
                  style={{ top: star.top, left: star.left }}
                  animate={{
                    scale: [0.6, 1.2, 0.6],
                    opacity: [0.15, 0.6, 0.15],
                    rotate: 360,
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: star.duration,
                    delay: star.delay,
                    ease: "easeInOut",
                  }}
                >
                  <Star className="w-6 h-6 text-indigo-400 opacity-60" />
                </motion.div>
              ))}
            </div>

            {/* Exploding Micro Celebration Sparks (16 radial points) */}
            <div className="absolute w-1 h-1 pointer-events-none">
              {Array.from({ length: 24 }).map((_, idx) => {
                const angle = (idx * 360) / 24;
                const radians = (angle * Math.PI) / 180;
                const distMultiplier = 160 + Math.random() * 120;
                const xDest = Math.cos(radians) * distMultiplier;
                const yDest = Math.sin(radians) * distMultiplier;
                const colors = [
                  "#38bdf8",
                  "#818cf8",
                  "#a78bfa",
                  "#f472b6",
                  "#34d399",
                  "#fbbf24",
                  "#2dd4bf",
                ];
                const randColor = colors[idx % colors.length];
                const pSize = 3 + Math.random() * 5;
                const duration = 1.2 + Math.random() * 0.8;

                return (
                  <motion.div
                    key={idx}
                    className="absolute rounded-full"
                    style={{
                      background: randColor,
                      width: pSize,
                      height: pSize,
                      boxShadow: `0 0 12px ${randColor}`,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                    animate={{
                      x: xDest,
                      y: yDest,
                      opacity: [1, 1, 0],
                      scale: [0, 2, 0.4],
                    }}
                    transition={{
                      duration: duration,
                      ease: [0.1, 0.8, 0.3, 1],
                    }}
                  />
                );
              })}
            </div>

            {/* Rotating Ambient Halo behind Card */}
            <motion.div
              className="absolute w-[450px] h-[450px] rounded-full border border-dashed border-indigo-500/20 pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
            />
            <motion.div
              className="absolute w-[400px] h-[400px] rounded-full border border-double border-cyan-500/10 pointer-events-none"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 35, ease: "linear" }}
            />

            {/* Main Luxury Reveal Card */}
            <motion.div
              initial={{ scale: 0.3, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.7, y: -20, opacity: 0 }}
              transition={{ type: "spring", damping: 14, stiffness: 150 }}
              className={`relative overflow-hidden w-full max-w-[480px] p-8 lg:p-10 rounded-[32px] border transition-all text-center ${theme === "dark" ? "bg-[#0f172a]/95 border-indigo-400/40 text-white shadow-[0_0_80px_rgba(99,102,241,0.5)]" : "bg-white border-indigo-200 text-gray-900 shadow-[0_20px_60px_rgba(79,70,229,0.15)]"}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sci-Fi Decorative Corner Lines */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-500/50 rounded-tl-xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-500/50 rounded-tr-xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-500/50 rounded-bl-xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-500/50 rounded-br-xl pointer-events-none" />

              {/* Shimmer glare swept overlay across the card */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full pointer-events-none"
                animate={{ x: "200%" }}
                transition={{
                  repeat: Infinity,
                  repeatDelay: 4,
                  duration: 1.6,
                  ease: "easeInOut",
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                {/* Crown Badge */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.2,
                    ease: "easeInOut",
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 dark:text-indigo-300 border border-indigo-500/20 text-[10px] font-black tracking-widest uppercase mb-6 font-mono shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                >
                  <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/30 animate-pulse" />
                  <span>CONGRATULATIONS</span>
                </motion.div>

                {/* Name Reveal Strategy based on hideNames setting */}
                {hideNames ? (
                  <>
                    {/* Masked Participant identifier moving up and scaling down */}
                    <motion.div
                      initial={{ y: 56, scale: 2.2, opacity: 0.9 }}
                      animate={{ y: 0, scale: 1, opacity: 1 }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                      className="mb-2"
                    >
                      <span
                        className={`text-[12px] font-black uppercase px-3 py-1 rounded-md tracking-wider ${theme === "dark" ? "bg-white/10 text-white/70" : "bg-indigo-50 text-indigo-600 border border-indigo-100"}`}
                      >
                        참가자 {pickedResult.index + 1}
                      </span>
                    </motion.div>

                    {/* Big Winner Real Name with blurred fade-in following layout animation */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, filter: "blur(8px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      transition={{
                        duration: 0.9,
                        delay: 0.9,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className={`text-5xl lg:text-6xl font-black uppercase tracking-tight py-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${theme === "dark" ? "text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-100" : "text-gray-900"}`}
                    >
                      {pickedResult.name}
                    </motion.div>
                  </>
                ) : (
                  <>
                    {/* Direct instant reveal with clean scale and fade-in */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className={`text-5xl lg:text-6xl font-black uppercase tracking-tight py-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${theme === "dark" ? "text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-100" : "text-gray-900"}`}
                    >
                      {pickedResult.name}
                    </motion.div>
                  </>
                )}

                {/* Particle description design lines */}
                <div className="w-[100px] h-[3px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent my-6" />

                {/* Celebration Action Confirmation Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPickedResult(null)}
                  className="group relative inline-flex items-center justify-center gap-2 px-10 py-3.5 rounded-2xl text-white font-black text-sm bg-indigo-600 hover:bg-indigo-500 shadow-[0_10px_25px_rgba(79,70,229,0.3)] transition-all overflow-hidden"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-bounce group-hover:rotate-12 transition-transform" />
                  <span>확인했습니다</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu for Picking */}
      {contextMenu && phase === "PICKING" && (
        <div
          className={`fixed z-[150] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-2 flex gap-2 overflow-hidden backdrop-blur-2xl border transition-all ${theme === "dark" ? "bg-gray-800/90 border-white/10" : "bg-white/90 border-black/5"}`}
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 100),
            left: Math.min(contextMenu.x, window.innerWidth - 240),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setStatus(contextMenu.participant, contextMenu.index, "PASS");
              setContextMenu(null);
            }}
            className="flex-1 px-4 py-2 flex flex-col items-center justify-center gap-1 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all font-bold text-[10px]"
          >
            <Check className="w-4 h-4" />
            <span>통과</span>
          </button>
          <button
            onClick={() => {
              setStatus(contextMenu.participant, contextMenu.index, "FAIL");
              setContextMenu(null);
            }}
            className={`flex-1 px-4 py-2 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all font-bold text-[10px] ${theme === "dark" ? "bg-white/5 text-red-400 hover:bg-white/10" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
          >
            <XCircle className="w-4 h-4" />
            <span>탈락</span>
          </button>
          <button
            onClick={() => {
              setStatus(contextMenu.participant, contextMenu.index, "WAITING");
              setContextMenu(null);
            }}
            className={`flex-1 px-4 py-2 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all font-bold text-[10px] ${theme === "dark" ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-black hover:bg-gray-200"}`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>리셋</span>
          </button>
        </div>
      )}

      {/* Custom Confirm Dialog Modal */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-[30px] p-8 shadow-2xl ${theme === "dark" ? "bg-gray-900 border border-white/10 text-white" : "bg-white border border-black/10 text-black"}`}
            >
              <h3 className="text-xl font-black mb-4">확인</h3>
              <p className="text-sm opacity-80 whitespace-pre-wrap leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="mt-8 flex gap-3">
                <button
                  onClick={() =>
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
                  }
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${theme === "dark" ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                    confirmDialog.onConfirm();
                  }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
