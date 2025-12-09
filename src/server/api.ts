type Response = {
    key: string;
    data: Array<string>;
} | {};

export async function lookUpWord(word: String) : Promise<Response> {
    const res = await fetch("http://localhost:8000/lookup/" + word);
    if (res.ok){
        const data = await res.json();
        console.log("/server/api");
        console.log( data);
        return data;
    } else {
        return {};
    }
}