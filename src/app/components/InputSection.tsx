import { MatchLetter } from "../../shared/types";
import InputBox from "./InputBox";
import SubmitButton from "./SubmitButton";

interface InputSectionProps {
    matchLetter: MatchLetter;
    disabled: boolean;
    onSubmit: (...args: any[]) => void;
}

export default function InputSection({ matchLetter, disabled, onSubmit }: InputSectionProps) {
    const opacity = disabled ? 0.5 : 1;

    return (
        <div className="panel w-full max-w-2xl" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
            <div className="flex flex-col items-center p-4">
                <div className="flex flex-row w-full justify-center items-center gap-4">
                    <InputBox
                        matchLetter={matchLetter}
                        disabled={disabled}
                        onSubmit={onSubmit}
                    />
                </div>

                <SubmitButton
                    onClick={onSubmit}
                    disabled={disabled}
                    opacity={opacity}
                />
            </div>
        </div>
    );
}
