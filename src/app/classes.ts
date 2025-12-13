import { Dispatch } from "react";

export class Player {

    public name: string
    public lastWord: string
    public setLastWord: Dispatch<string>
    
    constructor(name: string, lastWord:string, setLastWord: typeof this.setLastWord){
        this.name = name;
        this.lastWord = lastWord;
        this.setLastWord = setLastWord;
    }

    // toString(){
    //     return "Player name"
    // }

    toJson(){
        return JSON.stringify({
            player:{
                name: this.name
            }
        })
    }
};