import { validateInput } from "./components/inputValidation";
import { MatchLetter } from "../shared/types";
import { decomposeSyllable } from "./hangul-decomposer";

const createMatchLetter = (block: string, steps: string[]): MatchLetter => ({
    block,
    steps,
    value: block,
    next: 0,
});


const block = "값";
const steps = decomposeSyllable(block);
const composing = true;

const input = "씼";
const inputValues = ["ㄱ", "가", "갑", "가값"];
const letterValues = ["ㄱ", "가", "갑", "값"];
const prevInputValues = ["", "ㄱ", "가", "가"];



const result = validateInput(input, "", "input", composing, createMatchLetter(block, steps));

console.log(`Block: "${block}"`);
console.log(`Decomposed Steps: [${steps.map(s => `"${s}"`).join(", ")}]`);
console.log(`Current Input: "${input}"`);
console.log(`Block (syllables): ${decomposeSyllable(block).join(" / ")}`);
console.log(`Input (syllables): ${decomposeSyllable(input).join(" / ")}`);
console.log(result);

const ml = createMatchLetter(block, steps);
for (let i = 0; i < 4; i++) {
    const result = validateInput(inputValues[i], prevInputValues[i], letterValues[i], composing, ml);
    console.log(
        `Test Case #${i + 1}:\n` +
        `  Input Value:        "${inputValues[i]}"\n` +
        `  Previous Input:     "${prevInputValues[i]}"\n` +
        `  Current Letter:     "${letterValues[i]}"\n` +
        `  Composing:          ${composing}\n` +
        `  Result:             ${JSON.stringify(result)}\n`
    );
}