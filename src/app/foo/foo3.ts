// TODO: Figure out how implment a promise based queue or something to run the server gamestate modifying handlers in

class Foo{
    private prom = new Promise<null>((resolve) => resolve(null));

    async run(){
        await this.prom;
    }
}

function main(){

}
/*

process a -> update X
process b -> update X

*/