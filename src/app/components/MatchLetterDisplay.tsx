import { MatchLetter } from "../../shared/types";
import { gameStrings } from "./gameStrings";

interface MatchLetterDisplayProps {
    matchLetter: MatchLetter;
}

export default function MatchLetterDisplay({ matchLetter }: MatchLetterDisplayProps) {
    return (
        <div className="panel w-full max-w-2xl" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
            <div className="flex flex-col items-center p-6">
                <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{gameStrings.matchLetter}</h2>
                <div className="text-8xl font-bold mb-4" style={{
                    color: 'var(--match-letter-color)',
                    textShadow: '1px 1px 3px var(--text-shadow-cyan)',
                }}>
                    {matchLetter.block}
                </div>
            </div>
        </div>
    );
}
