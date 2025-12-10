    function inputOnChange(e: React.FormEvent<HTMLInputElement>) {
        // const event = e.nativeEvent as any as InputEvent<HTMLInputElement>;
        // const text = (event.target as HTMLInputElement).value.trim();
        // const letter: string | null = event.data;

        // // console.clear();
        // console.log(`letter: ${event.data}, text: ${text}`);
        // console.log(`matchLetter: ${JSON.stringify(matchLetter.steps)}`);

        // const nextLetter = matchLetter.block[matchLetter.next];

        // if (letter == nextLetter){
        //     console.log("letter == nextLetter");
        //     console.log(letter, "==", nextLetter);            
        // }

        // inputDom.current.value = text;


        // var isCorrectInput = false;


        // if (text.length < matchLetter.block.length) {
        //     console.log("text.length < matchLetter.block.length");
        //     steps = new Set(decomposeWord(matchLetter.block));
        //     setMatchLetter(x => { return { ...x, steps: steps } });
        // };

        // if (steps.has(text)) {
        //     console.log("1: matchLetter.steps.has(text)");
        //     isCorrectInput = true;

        //     const stepsArray = Array.from(matchLetter.steps);
        //     const nextLetterI = stepsArray.indexOf(letter) + 1;
        //     if (nextLetterI > steps.size - 1) {
        //         console.error("last letter?");
        //         throw new Error("Last letter?");
        //     }
        //     const nextLetter = stepsArray[nextLetterI];
        //     steps.delete(letter);
        //     console.log(matchLetter.steps);

        //     setMatchLetter(x => { return { ...x, value: text + nextLetter, steps: steps } });
        // } else {
        //     console.log("1 X: matchLetter.steps.has(text)");
        //     console.log("1 X: Steps = ", Array.from(steps));
        //     isCorrectInput = false;
        //     setMatchLetter(x => x ? { ...x, value: x.block } : x)
        // };

        // if (text.length == 1 && !isCorrectInput && text != matchLetter.block) {
        //     console.log("2: text.length == 1 && text != matchLetter.block");
        //     // matchLetter is 가 and input is anything not 가
        //     updateInputValue(inputValue);
        //     return
        // } else if (text.length == 0) {
        //     console.log("3: text.length == 0")
        //     // empty input; backspace
        //     updateInputValue(text);
        //     return
        // } else if (text.length > 1 && text[0] !== matchLetter.block) {
        //     console.log("4: text.length > 1")
        //     updateInputValue(inputValue);
        //     return
        // }

        // updateInputValue(ko_pattern.test(text) ? text : inputValue);
    }

    async function onInputKeyDown(e: React.KeyboardEvent) {
        // e.preventDefault();
        if (e.repeat) return;
        inputKey.current = e.key;
        if (e.key == "Enter") {
            if (!(await inputIsValid(inputValue))) return
            buttonDom.current?.click();
            return
        }
    }

    function updateInputValue(updatedValue: string) {
        setInputValue(updatedValue);
        if (inputDom.current)
            inputDom.current.value = updatedValue;
    }

    async function inputIsValid(input: string): Promise<boolean> {
        // TODO: Add debounce to this
        if (!(input.length > 0)) return false;

        // TODO: move url to constants or something
        const res = await fetch("/dictionary/word/" + input);
        if (res.ok) {
            const data = await res.json();
            if (Object.keys(data).length == 0) {
                return false;
            }
            return true;
        } else {
            return false;
        }
    }

    async function buttonOnSubmit(e: React.FormEvent<HTMLButtonElement>) {
        e.preventDefault();
        const valid_input = await inputIsValid(inputValue);
        if (valid_input) {
            nextTurn();
            playerLastValue.current = inputValue;
            updateInputValue("");
            inputDom.current?.focus();
            updateMatchLetter(inputValue.split("").pop()!);
        } else {
            inputDom.current?.classList.add("invalid");
        }

    }

    function updateMatchLetter(block: string) {
        throw new Error("look at this later")
        // const steps = new Set(buildSyllableSteps(block));
        // setMatchLetter({
        //     block: block,
        //     steps: steps,
        //     value: block
        // });
    }

    function nextTurn() {
        setTurn(t => (t + 1) % connected_players);
    }