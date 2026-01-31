import { StoreApi } from "zustand";
import { MatchLetter } from "../../shared/types";
import { blockInput as _blockInput, clearInput as _clearInput, continueInput as _continueInput, actionHandlers } from "../components/inputValidation";
import { decomposeSyllable } from "../hangul-decomposer";
import { InputState } from "../store/userStore";

const log = console.log;
const L = "Mock Logging: ";

const createMatchLetter = (block: string, steps: string[]): MatchLetter => ({
    block,
    steps,
    value: block,
    next: 0,
});



// const inputValues = ["ㄱ", "가", "갑", "가값"];
const inputValues = ["ㄱ", "가", "갇", "가다"];

const block = "가";
const steps = decomposeSyllable(block);
const composing = true;

// --------- Mocking for testing ---------

const mockStore = {
    value: "",
    highlightValue: "",
    setInputValue: (v: string) => {mockStore.value = v},
    setHighlightValue: (v: string) => {mockStore.highlightValue = v},
};

const mockStoreApi = {
    getState: () => mockStore,
} as any as StoreApi<InputState>;

const mockPrevInputRef = { current: "" };
const mockMatchLetter = createMatchLetter(block, steps);

const clearInput = () => {
    log(L, "[Clearing input]");
    _clearInput(mockStoreApi, mockPrevInputRef, mockMatchLetter);
}
const blockInput = () => {
    log(L, "[Blocking input]");
    _blockInput(mockStoreApi, mockPrevInputRef);
}
const continueInput = (input: string) => {
    log(L, "[Continuing input]");
    _continueInput(mockStoreApi, mockPrevInputRef, mockMatchLetter, input);
}
// -----------------------------------------
log(L, "MatchLetter:", mockMatchLetter);

inputValues.forEach(value => {
    actionHandlers(
        value,
        "",
        "input",
        composing,
        mockMatchLetter,
        clearInput,
        blockInput,
        continueInput
    );
    log(L, "------ VERBOSE LOGGING ------");
    log(L, "Input value:", value);
    log(L, "Store Input value:", mockStore.value);
    log(L, "Store Highlight value:", mockStore.highlightValue);
    log(L, "Prev Input value:", mockPrevInputRef.current);
    log(L, "Composing:", composing);
    log(L, "-----------------------------");
});

// Mock Logging:  MatchLetter: { block: '가', steps: [ 'ㄱ', 'ㅏ' ], value: '가', next: 0 }
// (State S_ㄱ, S_ㅏ) input includes match letter
// Mock Logging:  [Continuing input]
// Mock Logging:  ------ VERBOSE LOGGING ------  
// Mock Logging:  Input value: ㄱ
// Mock Logging:  Store Input value: ㄱ
// Mock Logging:  Store Highlight value: ㄱㅏ    
// Mock Logging:  Prev Input value: ㄱ
// Mock Logging:  Composing: true
// Mock Logging:  -----------------------------  
// (State S_ㄱ) input starts with block
// Mock Logging:  [Continuing input]
// Mock Logging:  ------ VERBOSE LOGGING ------  
// Mock Logging:  Input value: 가
// Mock Logging:  Store Input value: 가
// Mock Logging:  Store Highlight value:         
// Mock Logging:  Prev Input value: 가
// Mock Logging:  Composing: true
// Mock Logging:  -----------------------------  
// (State S_강, S_값) input is longer than block 
// Mock Logging:  [Continuing input]
// Mock Logging:  ------ VERBOSE LOGGING ------  
// Mock Logging:  Input value: 갇
// Mock Logging:  Store Input value: 갇
// Mock Logging:  Store Highlight value:         
// Mock Logging:  Prev Input value: 갇
// Mock Logging:  Composing: true
// Mock Logging:  -----------------------------  
// (State S_ㄱ) input starts with block
// Mock Logging:  [Continuing input]
// Mock Logging:  ------ VERBOSE LOGGING ------  
// Mock Logging:  Input value: 가다
// Mock Logging:  Store Input value: 가다        
// Mock Logging:  Store Highlight value:
// Mock Logging:  Prev Input value: 가다
// Mock Logging:  Composing: true
// Mock Logging:  -----------------------------