"use client";

import BusyOverlay from "@/app/components/game/BusyOverlay";
import DefinitionsPanel from "@/app/components/game/DefinitionsPanel";
import GameBoardLayout from "@/app/components/game/GameBoardLayout";
import GameOverlay from "@/app/components/game/GameOverlay";
import GameTopBar from "@/app/components/game/GameTopBar";
import PlayersRoster, {
    shouldShowPlayersBar,
} from "@/app/components/game/PlayersRoster";
import PlayFocusPanel from "@/app/components/game/PlayFocusPanel";
import PlayStatusGrid from "@/app/components/game/PlayStatusGrid";
import TimerBar from "@/app/components/game/TimerBar";
import { useRoomChannel } from "@/app/hooks/useRoomChannel";
import { useTypingDraft } from "@/app/hooks/useTypingDraft";
import { gameStrings } from "@/lib/client/ui/game-strings";
import type {
    DictionaryEntry,
    GameStateClient,
    GameStateEmit,
    PlayerWithId,
    Spectator,
} from "@/shared/types";
import { DEFAULT_HEALTH } from "@/shared/consts";
import { turnToPlayerIndex } from "@/shared/utils";
import type { TimerSyncPayload } from "@/shared/timerSync";
import type { TypingDraftPayload } from "@/shared/typingDraft";
import { appendDefinitionToHistory } from "@/shared/wordDefinition";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/client/logging";
import type { ActiveEmote, EmotePayload } from "@/shared/emote";
import EmoteBanner from "@/app/components/game/EmoteBanner";

type WordFeedEntry = {
    id: number;
    playerName: string;
    word: string;
};

interface SpectatorViewProps {
    roomId: string;
    roomName?: string | null;
    userId: string;
    /** Initial game state emit from the spectate endpoint. */
    initialEmit: GameStateEmit;
    language?: "en" | "ko";
    onRoomClosed?: () => void;
}

export default function SpectatorView({
    roomId,
    roomName = null,
    userId,
    initialEmit,
    language = "ko",
    onRoomClosed,
}: SpectatorViewProps) {
    const router = useRouter();
    const [emit, setEmit] = useState<GameStateEmit>(initialEmit);
    const [definitionHistory, setDefinitionHistory] = useState<
        DictionaryEntry[]
    >([]);
    const [spectatorCount, setSpectatorCount] = useState(0);
    const [wordFeed, setWordFeed] = useState<WordFeedEntry[]>([]);
    const [isLeavingLobby, setIsLeavingLobby] = useState(false);
    const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);

    const onTypingDraftRef = useRef<(payload: TypingDraftPayload) => void>(
        () => {},
    );
    const prevLastWordsRef = useRef<Map<number, string>>(new Map());
    const wordFeedIdRef = useRef(0);
    const wordFeedInitializedRef = useRef(false);
    const emitRef = useRef(emit);
    emitRef.current = emit;

    // Derive a GameStateClient so existing child components (PlayersRoster, TimerBar etc.) work
    const clientState: GameStateClient = {
        ...emit,
        thisPlayer: {
            uid: "",
            name: "",
            lastWord: "",
            health: DEFAULT_HEALTH,
        } as PlayerWithId,
        submitting: false,
    };

    const multiplayer = shouldShowPlayersBar(clientState);
    const turnSeat = emit.connectedPlayers > 0
        ? turnToPlayerIndex(emit.turn, emit.connectedPlayers)
        : 0;
    const turnPlayer = emit.players[turnSeat];
    const isGamePlaying = emit.status === "playing";

    // =========================================================================
    // spectator leave (debounced for Strict Mode)
    // =========================================================================
    const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const leaveCtxRef = useRef({ roomId });
    useEffect(() => {
        leaveCtxRef.current = { roomId };
    });

    const removeSpectator = useCallback(() => {
        logger.debug("SpectatorView", "removeSpectator");
        fetch(`/api/rooms/${roomId}/spectate`, { method: "DELETE" }).catch(
            () => {},
        );
    }, [roomId]);

    // Tab/window close
    useEffect(() => {
        const leave = () => {
            logger.debug("SpectatorView", "pagehide, removing spectator");
            removeSpectator();
        };
        window.addEventListener("pagehide", leave);
        return () => window.removeEventListener("pagehide", leave);
    }, [removeSpectator]);

    // Navigation away — debounced to ignore React Strict Mode remounts
    useEffect(() => {
        return () => {
            const { roomId: id } = leaveCtxRef.current;
            logger.debug("SpectatorView", "navigation away, scheduling remove");
            leaveTimeoutRef.current = setTimeout(() => {
                logger.debug("SpectatorView", "executing delayed remove");
                fetch(`/api/rooms/${id}/spectate`, {
                    method: "DELETE",
                    keepalive: true,
                }).catch(() => {});
            }, 100);
        };
    }, []);

    // Cancel pending leave on Strict Mode re-mount
    useEffect(() => {
        if (leaveTimeoutRef.current) {
            logger.debug("SpectatorView", "cancelling pending leave (strict mode remount)");
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }
    }, []);

    // =========================================================================
    // callbacks
    // =========================================================================
    const handleExit = useCallback(() => {
        if (isLeavingLobby) {
            logger.debug("SpectatorView", "handleExit blocked (already leaving)");
            return;
        }
        logger.info("SpectatorView", "handleExit");
        setIsLeavingLobby(true);
        removeSpectator();
        router.push("/lobby");
    }, [router, isLeavingLobby, removeSpectator]);

    const handleEmoteReceive = useCallback((payload: EmotePayload) => {
        logger.debug("SpectatorView", "handleEmoteReceive", { seat: payload.seat, value: payload.value });
        if (payload.userId === userId) return;
        setActiveEmotes((prev) => [...prev, { ...payload, id: crypto.randomUUID() }]);
    }, [userId]);

    const handleEmoteComplete = useCallback((id: string) => {
        setActiveEmotes((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const applyRemote = useCallback((next: GameStateEmit) => {
        logger.debug("SpectatorView", "applyRemote", { turn: next.turn, status: next.status, connectedPlayers: next.connectedPlayers });
        setEmit(next);
    }, []);

    const appendDefinition = useCallback(
        (definition: DictionaryEntry) => {
            logger.info("SpectatorView", "appendDefinition", { key: definition.key });
            setDefinitionHistory((current) =>
                appendDefinitionToHistory(current, definition),
            );
        },
        [],
    );

    // =========================================================================
    // room channel
    // =========================================================================
    const { sendTimerSyncRequest } = useRoomChannel(roomId, {
        userId,
        isHost: false,
        onUpdate: applyRemote,
        onRoomClosed,
        onTimerSync: (payload) => {
            logger.debug("SpectatorView", "onTimerSync", payload);
            lastServerRef.current = { at: Date.now(), remaining: payload.remaining };
            setTimerPaused(payload.paused);
        },
        onTypingDraft: (payload) => {
            onTypingDraftRef.current(payload);
        },
        onWordDefinition: appendDefinition,
        onSpectatorsUpdate: (spectators: Spectator[]) => {
            setSpectatorCount(spectators.length);
        },
        onEmote: handleEmoteReceive,
    });

    // Request timer sync from active player after channel is subscribed
    useEffect(() => {
        const t1 = setTimeout(() => {
            logger.debug("SpectatorView", "sending timerSyncRequest (first attempt)");
            sendTimerSyncRequest();
        }, 500);
        const t2 = setTimeout(() => {
            logger.debug("SpectatorView", "sending timerSyncRequest (retry)");
            sendTimerSyncRequest();
        }, 1200);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [sendTimerSyncRequest]);

    // Re-sync timer when tab comes back to foreground
    useEffect(() => {
        const handle = () => {
            if (document.visibilityState === "visible") {
                logger.debug("SpectatorView", "tab re-focused, requesting timer sync");
                sendTimerSyncRequest();
            }
        };
        document.addEventListener("visibilitychange", handle);
        return () => document.removeEventListener("visibilitychange", handle);
    }, [sendTimerSyncRequest]);

    // =========================================================================
    // typing draft (mirror current player's input)
    // =========================================================================
    const { remoteDraft, clearRemoteDraft, onTypingDraft } = useTypingDraft(
        roomId,
        {
            userId,
            broadcastEnabled: false,
            receiveEnabled: true,
            sendTypingDraft: () => {},
        },
    );
    onTypingDraftRef.current = onTypingDraft;

    const turnTypingText =
        remoteDraft?.text && remoteDraft.seat === turnSeat
            ? remoteDraft.text
            : undefined;

    useEffect(() => {
        clearRemoteDraft();
    }, [emit.turn, clearRemoteDraft]);

    // Debug: log every render so we can see what the spectator sees
    logger.debug("SpectatorView", "typing render", {
        hasRemoteDraft: !!remoteDraft,
        remoteSeat: remoteDraft?.seat,
        turnSeat,
        turnTypingText: turnTypingText ?? null,
        emitTurn: emit.turn,
        connectedPlayers: emit.connectedPlayers,
    });

    // =========================================================================
    // timer – derived from last server broadcast, no local countdown drift
    // =========================================================================
    const seat = emit.connectedPlayers > 0
        ? turnToPlayerIndex(emit.turn, emit.connectedPlayers)
        : 0;
    const serverTimeRemaining = emit.players[seat]?.timeRemaining;

    const lastServerRef = useRef({ at: Date.now(), remaining: emit.timerDuration });
    const [timerPaused, setTimerPaused] = useState(false);

    useEffect(() => {
        if (emit.status !== "playing") return;
        const remaining = serverTimeRemaining ?? emit.timerDuration;
        lastServerRef.current = { at: Date.now(), remaining };
    }, [serverTimeRemaining, emit.turn, emit.status]);

    const [tick, setTick] = useState(0);
    useEffect(() => {
        if (emit.status !== "playing") return;
        const id = setInterval(() => setTick((t) => t + 1), 100);
        return () => clearInterval(id);
    }, [emit.status]);

    const elapsed = isGamePlaying && !timerPaused ? (Date.now() - lastServerRef.current.at) / 1000 : 0;
    const displayedRemaining = Math.max(0, lastServerRef.current.remaining - elapsed);
    const timer = {
        remainingSeconds: Math.floor(displayedRemaining),
        remainingMilliSeconds: displayedRemaining * 1000,
        duration: lastServerRef.current.remaining,
        isPaused: !isGamePlaying || timerPaused,
        start: () => {},
        pause: () => {},
        reset: () => {},
    };

    // =========================================================================
    // live word feed — detect lastWord changes
    // =========================================================================
    useEffect(() => {
        if (emit.status !== "playing") return;

        // First run: just initialize the map without creating toasts
        if (!wordFeedInitializedRef.current) {
            wordFeedInitializedRef.current = true;
            const map = new Map<number, string>();
            emit.players.forEach((p, i) => {
                if (p) map.set(i, p.lastWord);
            });
            prevLastWordsRef.current = map;
            return;
        }

        const newMap = new Map<number, string>();
        for (let i = 0; i < emit.players.length; i++) {
            const p = emit.players[i];
            if (p) {
                const prev = prevLastWordsRef.current.get(i) ?? "";
                newMap.set(i, p.lastWord);
                if (p.lastWord && p.lastWord !== prev) {
                    const id = ++wordFeedIdRef.current;
                    setWordFeed((prev) => [
                        ...prev,
                        { id, playerName: p.name, word: p.lastWord },
                    ]);
                    setTimeout(() => {
                        setWordFeed((prev) =>
                            prev.filter((e) => e.id !== id),
                        );
                    }, 4000);
                }
            }
        }
        prevLastWordsRef.current = newMap;
    }, [emit.players, emit.status]);

    // =========================================================================
    // render
    // =========================================================================
    return (
        <>
            {emit.status === "playing" && isLeavingLobby && (
                <BusyOverlay message={gameStrings.leavingRoom} />
            )}
            <GameOverlay
                status={emit.status}
                players={emit.players}
                connectedPlayers={emit.connectedPlayers}
                isHost={false}
                onStartGame={undefined}
                onBackToLobby={handleExit}
                isStartingGame={false}
                isLeavingLobby={isLeavingLobby}
                roomId={roomId}
            />
            <GameBoardLayout
                topBar={
                    <GameTopBar
                        turn={emit.turn ?? 1}
                        roomName={roomName}
                        onExit={handleExit}
                        exitDisabled={isLeavingLobby}
                    />
                }
                playFocus={
                    <PlayFocusPanel
                        status={
                            <PlayStatusGrid
                                matchLetter={emit.matchLetter}
                                yourHealth={turnPlayer?.health ?? 0}
                                yourName={turnPlayer?.name ?? "—"}
                            />
                        }
                        input={
                            <section
                                className="g2 flex flex-col gap-3 border-t pt-4"
                                style={{
                                    borderColor: "var(--g2-border)",
                                }}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="g2-label">
                                        {gameStrings.watching}
                                    </span>
                                </div>
                                <div className="g2-input-legacy-host">
                                    <div
                                        className="flex items-center gap-2 rounded-[var(--g2-radius)] border px-3 py-2.5 min-h-[2.75rem] font-mono text-sm"
                                        style={{
                                            borderColor: "var(--g2-border)",
                                            background: "var(--g2-surface)",
                                            color: turnTypingText
                                                ? "var(--g2-accent)"
                                                : "var(--g2-muted)",
                                        }}
                                    >
                                        {turnTypingText ? (
                                            <>
                                                <span>{turnTypingText}</span>
                                                <span className="animate-pulse">
                                                    ▌
                                                </span>
                                            </>
                                        ) : (
                                            <span className="italic">
                                                {gameStrings.waitingForInput}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </section>
                        }
                        disabled={true}
                        timerBar={
                            <TimerBar
                                timer={timer}
                                isSubmitting={false}
                            />
                        }
                    />
                }
                wordHistory={
                    <DefinitionsPanel
                        definitions={definitionHistory}
                        language={language}
                    />
                }
                playersBar={
                    multiplayer ? (
                        <PlayersRoster
                            gameState={clientState}
                            turnTypingText={turnTypingText}
                            activeEmotes={activeEmotes}
                            onEmoteComplete={handleEmoteComplete}
                        />
                    ) : undefined
                }
                emoteArea={
                    <div className="g2-emote-area">
                        {!multiplayer &&
                            activeEmotes.map((em, idx) => (
                                <div
                                    key={em.id}
                                    className="g2-emote-banner-wrapper"
                                    style={{ bottom: `${4 + idx * 36}px` }}
                                >
                                    <EmoteBanner
                                        value={em.value}
                                        onComplete={() => handleEmoteComplete(em.id)}
                                    />
                                </div>
                            ))}
                    </div>
                }
            />

            {/* Spectator count badge */}
            {spectatorCount > 0 && (
                <div
                    className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg"
                    style={{
                        background: "var(--g2-surface-raised)",
                        border: "1px solid var(--g2-border)",
                        color: "var(--g2-muted)",
                    }}
                >
                    <span>👁</span>
                    <span>
                        {spectatorCount}{" "}
                        {spectatorCount === 1
                            ? gameStrings.watching
                            : gameStrings.watchingPlural}
                    </span>
                </div>
            )}

            {/* Word feed toasts */}
            <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-xs">
                {wordFeed.map((entry) => (
                    <div
                        key={entry.id}
                        className="animate-slide-up rounded-lg px-3 py-2 text-xs shadow-lg"
                        style={{
                            background: "var(--g2-surface-raised)",
                            border: "1px solid var(--g2-border)",
                            color: "var(--text-primary)",
                        }}
                    >
                        <span className="font-semibold">
                            {entry.playerName}
                        </span>{" "}
                        {gameStrings.submitted}{" "}
                        <span className="font-mono">{entry.word}</span>
                    </div>
                ))}
            </div>
        </>
    );
}
