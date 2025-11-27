export class Player {

    public name: string
    
    constructor(name: string){
        this.name = name;
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