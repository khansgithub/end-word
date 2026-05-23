import { MatchLetter } from "../../shared/types";
import InputBox from "./InputBox";
import SubmitButton from "./SubmitButton";

interface InputSectionProps {
    matchLetter: MatchLetter;
    disabled: boolean;
    onSubmit: (...args: any[]) => void;
    language?: "en" | "ko";
}

export default function InputSection({ matchLetter, disabled, onSubmit, language = "ko" }: InputSectionProps) {
    const opacity = disabled ? 0.5 : 1;

    return (
        <div className="panel md:w-full">
            <div className="flex flex-col items-center p-4">
                <div className="flex md:flex-row md:w-full justify-center items-center gap-4">
                    <InputBox
                        matchLetter={matchLetter}
                        disabled={disabled}
                        onSubmit={onSubmit}
                        language={language}
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
